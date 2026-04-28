import {
  createPayment,
  transferToCreator,
  refundPayment,
  createConnectOnboardingLink,
  finalizeCreatorOnboarding,
} from "../services/payment.service.js";
import writePool, { readPool } from "../config/database.js";
import ResponseError from "../utils/customError.js";
import { invalidateMilestoneCollectedCache } from "../services/milestone.service.js";

// ─── Donation ─────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/donate
 * Body: { milestone_id, amount }
 *
 * Creates a Stripe PaymentIntent and returns client_secret to the frontend.
 * Frontend uses Stripe.js to complete the payment — card never touches our server.
 * Actual donation row is inserted by the webhook handler after Stripe confirms.
 */
const initiateDonation = async (req, res, next) => {
  try {
    const { milestone_id, amount } = req.body;
    const { id: userId, email } = req.user;

    if (!milestone_id || !amount) {
      throw new ResponseError("milestone_id and amount are required", 400);
    }

    if (amount <= 0) {
      throw new ResponseError("Amount must be greater than 0", 400);
    }

    // Verify milestone exists and is Active before creating PaymentIntent
    const { rows } = await readPool.query(
      `SELECT m.id, m.status, up.display_name
       FROM milestones m
       JOIN campaigns c ON c.id = m.campaign_id
       JOIN user_profiles up ON up.user_id = $1
       WHERE m.id = $2`,
      [userId, milestone_id],
    );

    if (!rows.length) {
      throw new ResponseError("Milestone not found", 404);
    }

    if (rows[0].status !== "Active") {
      throw new ResponseError("This milestone is not accepting donations", 400);
    }

    const { clientSecret, paymentIntentId } = await createPayment({
      amount,
      currency: "usd",
      userId,
      email,
      displayName: rows[0].display_name,
      milestoneId: milestone_id,
    });

    res.status(200).json({
      success: true,
      clientSecret,
      paymentIntentId,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Escrow Release / Creator Payout ─────────────────────────────────────────

/**
 * POST /api/payments/release/:milestoneId
 * Admin only — called after vote_results confirms YES outcome.
 *
 * The trg_on_vote_result trigger already marked escrow as Released in DB.
 * This endpoint handles the actual Stripe Transfer to the creator's account.
 */
const releaseEscrow = async (req, res, next) => {
  const client = await writePool.connect();
  try {
    const { milestoneId } = req.params;

    // Fetch all data needed for the transfer in one query
    const { rows } = await client.query(
      `SELECT
         ea.locked_amount,
         ea.status      AS escrow_status,
         cp.stripe_account_id,
         cp.payout_setup,
         cp.user_id     AS creator_id
       FROM escrow_accounts ea
       JOIN milestones m ON m.id = ea.milestone_id
       JOIN campaigns c ON c.id = m.campaign_id
       JOIN creator_profiles cp ON cp.user_id = c.creator_id
       WHERE ea.milestone_id = $1`,
      [milestoneId],
    );

    if (!rows.length) {
      throw new ResponseError(
        "Escrow account not found for this milestone",
        404,
      );
    }

    const { locked_amount, escrow_status, stripe_account_id, payout_setup } =
      rows[0];

    if (escrow_status !== "Released") {
      throw new ResponseError(
        "Escrow is not in Released state — vote may not be complete",
        400,
      );
    }

    if (!payout_setup || !stripe_account_id) {
      throw new ResponseError(
        "Creator has not completed Stripe onboarding",
        400,
      );
    }

    if (locked_amount <= 0) {
      throw new ResponseError("No funds to transfer", 400);
    }

    const transfer = await transferToCreator({
      amount: locked_amount,
      stripeAccountId: stripe_account_id,
      milestoneId,
    });
    await invalidateMilestoneCollectedCache(milestoneId);

    res.status(200).json({
      success: true,
      message: "Funds transferred to creator",
      transferId: transfer.id,
      amount: locked_amount,
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/refund/:milestoneId
 * Admin only — called after vote_results confirms NO outcome.
 *
 * The trg_on_vote_result trigger already created Pending refund rows.
 * This endpoint loops through them, calls Stripe, then calls process_refunds()
 * procedure to update each row with stripe_refund_id + final status.
 */
const processMilestoneRefunds = async (req, res, next) => {
  const client = await writePool.connect();
  try {
    const { milestoneId } = req.params;

    // Fetch all pending refunds for this milestone with their Stripe payment IDs
    const { rows: pendingRefunds } = await client.query(
      `SELECT r.id, r.amount, d.stripe_payment_id
       FROM refunds r
       JOIN donations d ON d.id = r.donation_id
       WHERE r.milestone_id = $1 AND r.status = 'Pending'`,
      [milestoneId],
    );

    if (!pendingRefunds.length) {
      throw new ResponseError(
        "No pending refunds found for this milestone",
        404,
      );
    }

    const results = [];

    // Process each refund individually — one failure shouldn't block others
    for (const refund of pendingRefunds) {
      try {
        const stripeRefund = await refundPayment({
          stripePaymentIntentId: refund.stripe_payment_id,
          amount: refund.amount,
        });

        // Call DB procedure to update the refund row
        await client.query(`CALL process_refunds($1, $2, $3, $4)`, [
          milestoneId,
          refund.id,
          stripeRefund.id,
          "Completed",
        ]);

        results.push({
          refundId: refund.id,
          status: "Completed",
          stripeRefundId: stripeRefund.id,
        });
      } catch (refundErr) {
        // Mark as Failed in DB — don't throw, continue with remaining refunds
        await client.query(`CALL process_refunds($1, $2, $3, $4)`, [
          milestoneId,
          refund.id,
          null,
          "Failed",
        ]);

        results.push({
          refundId: refund.id,
          status: "Failed",
          error: refundErr.message,
        });
      }
    }

    const failed = results.filter((r) => r.status === "Failed");
    await invalidateMilestoneCollectedCache(milestoneId);

    res.status(200).json({
      success: true,
      processed: results.length,
      failed: failed.length,
      results,
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

// ─── Creator Connect Onboarding ───────────────────────────────────────────────

/**
 * POST /api/payments/onboarding/start
 * Creator only — generates a Stripe Connect onboarding link.
 * Frontend redirects the creator to this URL.
 */
const startOnboarding = async (req, res, next) => {
  try {
    const { id: userId } = req.user;

    // Fetch creator's current stripe_account_id (may be null if first time)
    const { rows } = await readPool.query(
      `SELECT stripe_account_id, payout_setup FROM creator_profiles WHERE user_id = $1`,
      [userId],
    );

    if (!rows.length) {
      throw new ResponseError("Creator profile not found", 404);
    }

    if (rows[0].payout_setup) {
      throw new ResponseError("Payout setup is already complete", 400);
    }

    const { url, stripeAccountId } = await createConnectOnboardingLink({
      userId,
      stripeAccountId: rows[0].stripe_account_id,
    });

    res.status(200).json({
      success: true,
      onboardingUrl: url,
      stripeAccountId,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/payments/onboarding/complete
 * Creator only — called when Stripe redirects back after onboarding.
 * Verifies with Stripe that onboarding actually completed, then sets payout_setup = true.
 */
const completeOnboarding = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const result = await finalizeCreatorOnboarding(userId);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
};

export {
  initiateDonation,
  releaseEscrow,
  processMilestoneRefunds,
  startOnboarding,
  completeOnboarding,
};
