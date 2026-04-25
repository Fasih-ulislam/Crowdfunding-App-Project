import stripe from "../config/stripe.js";
import pool from "../config/database.js";
import ResponseError from "../utils/customError.js";
import { queueNotificationJob } from "../services/queueService.js";

// ─── Signature Verification ───────────────────────────────────────────────────

/**
 * Verifies the Stripe webhook signature and returns the parsed event.
 * req.rawBody must be set by Express middleware BEFORE json parsing.
 * If signature is invalid, Stripe throws — we catch and reject.
 */
const verifyStripeSignature = (req) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) throw new ResponseError("Missing Stripe signature", 400);

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    return event;
  } catch (err) {
    throw new ResponseError(
      `Webhook signature verification failed: ${err.message}`,
      400,
    );
  }
};

// ─── Event Handlers ───────────────────────────────────────────────────────────

/**
 * Handles payment_intent.succeeded
 *
 * Flow:
 * 1. Extract donor ID + milestone ID from PaymentIntent metadata
 * 2. Insert donation row
 * 3. trg_on_donation_created trigger fires automatically:
 *    - Updates escrow_accounts.locked_amount
 *    - Inserts transaction log row
 *    - Inserts platform_fee row
 *
 * We do NOT manually update escrow/fees here — the trigger owns that.
 */
const handlePaymentSucceeded = async (paymentIntent) => {
  const { trustfund_user_id, milestone_id } = paymentIntent.metadata;

  if (!trustfund_user_id || !milestone_id) {
    // Metadata missing — this PaymentIntent wasn't created by TrustFund
    console.warn(
      "payment_intent.succeeded received with missing metadata, skipping.",
    );
    return;
  }

  const donorId = trustfund_user_id;
  const milestoneId = milestone_id;
  const amount = paymentIntent.amount / 100; // convert cents back to dollars
  const stripePaymentId = paymentIntent.id; // pi_...

  // Check for duplicate — Stripe can retry webhooks, so be idempotent
  const { rows: existing } = await pool.query(
    `SELECT id FROM donations WHERE stripe_payment_id = $1`,
    [stripePaymentId],
  );

  if (existing.length) {
    console.log(
      `Duplicate webhook for PaymentIntent ${stripePaymentId}, skipping.`,
    );
    return;
  }

  // Verify milestone exists and is Active
  const { rows: milestoneRows } = await pool.query(
    `SELECT id, status FROM milestones WHERE id = $1`,
    [milestoneId],
  );

  if (!milestoneRows.length) {
    throw new ResponseError(`Milestone ${milestoneId} not found`, 404);
  }

  if (milestoneRows[0].status !== "Active") {
    // Milestone closed between PaymentIntent creation and webhook arrival
    // In production you'd trigger a refund here — for now log it
    console.warn(
      `Milestone ${milestoneId} is not Active (status: ${milestoneRows[0].status}). Payment received but milestone closed.`,
    );
    return;
  }

  // Insert donation — trigger fires from here
  await pool.query(
    `INSERT INTO donations (donor_id, milestone_id, amount, stripe_payment_id)
     VALUES ($1, $2, $3, $4)`,
    [donorId, milestoneId, amount, stripePaymentId],
  );

  console.log(
    `Donation inserted: donor=${donorId}, milestone=${milestoneId}, amount=${amount}`,
  );

  // Queue background notification & email
  await queueNotificationJob("DONATION_RECEIVED", {
    userId: donorId,
    type: "DONATION_RECEIVED",
    message: `Thank you! Your donation of $${amount} was successful.`,
    metadata: { amount, milestoneId, stripePaymentId },
  });
};

/**
 * Handles account.updated (Stripe Connect)
 *
 * Fires whenever a creator's Connect account changes.
 * We check charges_enabled — if true, onboarding is complete.
 * This is a backup to the redirect flow in finalizeCreatorOnboarding().
 *
 * Why both? The redirect URL fires when the creator returns to your site,
 * but they might close the tab. This webhook fires regardless.
 */
const handleAccountUpdated = async (account) => {
  if (!account.charges_enabled) {
    // Onboarding still incomplete — nothing to do yet
    return;
  }

  const userId = account.metadata?.trustfund_user_id;

  if (!userId) {
    console.warn(
      "account.updated received with no trustfund_user_id in metadata, skipping.",
    );
    return;
  }

  // Only update if not already marked as set up — avoid redundant writes
  await pool.query(
    `UPDATE creator_profiles
     SET payout_setup = true
     WHERE user_id = $1 AND payout_setup = false`,
    [userId],
  );

  console.log(`Creator onboarding complete via webhook: user=${userId}`);
};

// ─── Main Webhook Handler ─────────────────────────────────────────────────────

/**
 * POST /api/webhooks/stripe
 *
 * Entry point for all Stripe webhook events.
 * Stripe expects a 200 response quickly — do not await long operations here
 * in production (use a queue). For this project, direct await is fine.
 */
const handleStripeWebhook = async (req, res, next) => {
  let event;

  try {
    event = verifyStripeSignature(req);
  } catch (err) {
    return next(err);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object);
        break;

      case "account.updated":
        await handleAccountUpdated(event.data.object);
        break;

      default:
        // Acknowledge unhandled events — never ignore Stripe, just don't process
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    // Stripe requires 2xx to know you received the event
    // If you return anything else, Stripe will retry for 3 days
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
};

export { handleStripeWebhook };
