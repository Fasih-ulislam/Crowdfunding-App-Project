import stripe from "../config/stripe.js";
import pool from "../config/database.js";
import { ResponseError } from "../utils/customError.js";

// ─── Customer ─────────────────────────────────────────────────────────────────

/**
 * Fetches existing Stripe customer ID from DB.
 * If none exists, creates a new Stripe Customer and saves the ID.
 */
const getOrCreateCustomer = async (userId, email, displayName) => {
  const { rows } = await pool.query(
    `SELECT stripe_customer_id FROM users WHERE id = $1`,
    [userId],
  );

  if (!rows.length) throw new ResponseError("User not found", 404);

  if (rows[0].stripe_customer_id) {
    return rows[0].stripe_customer_id;
  }

  // First time — create customer on Stripe
  const customer = await stripe.customers.create({
    email,
    name: displayName,
    metadata: { trustfund_user_id: userId },
  });

  // Save to DB
  await pool.query(`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`, [
    customer.id,
    userId,
  ]);

  return customer.id;
};

// ─── Donations ────────────────────────────────────────────────────────────────

/**
 * Creates a Stripe PaymentIntent for a donation.
 * Returns the client_secret — frontend uses this with Stripe.js to collect card.
 * Actual donation row is inserted by the webhook handler (not here).
 */
const createPayment = async ({
  amount,
  currency = "usd",
  userId,
  email,
  displayName,
  milestoneId,
}) => {
  const customerId = await getOrCreateCustomer(userId, email, displayName);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe works in cents
    currency,
    customer: customerId,
    metadata: {
      trustfund_user_id: userId,
      milestone_id: milestoneId,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
};

// ─── Payouts ──────────────────────────────────────────────────────────────────

/**
 * Transfers released escrow funds to a creator's connected Stripe account.
 * Called after vote result confirms escrow release.
 */
const transferToCreator = async ({ amount, stripeAccountId, milestoneId }) => {
  if (!stripeAccountId) {
    throw new ResponseError("Creator has no connected Stripe account", 400);
  }

  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    destination: stripeAccountId,
    metadata: {
      milestone_id: milestoneId,
    },
  });

  return transfer;
};

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * Issues a refund for a single donation via its Stripe PaymentIntent ID.
 * After calling this, pass the result to process_refunds() DB procedure
 * to update the refunds table.
 */
const refundPayment = async ({ stripePaymentIntentId, amount }) => {
  if (!stripePaymentIntentId) {
    throw new ResponseError("No Stripe payment ID provided for refund", 400);
  }

  const refundParams = {
    payment_intent: stripePaymentIntentId,
  };

  // If amount is provided, do a partial refund — otherwise full refund
  if (amount) {
    refundParams.amount = Math.round(amount * 100);
  }

  const refund = await stripe.refunds.create(refundParams);

  return refund;
};

// ─── Creator Connect Onboarding ───────────────────────────────────────────────

/**
 * Creates a Stripe Connect Express account for a creator (if not already created),
 * then generates a one-time onboarding link.
 * After onboarding, Stripe redirects to FRONTEND_URL/onboarding/complete.
 */
const createConnectOnboardingLink = async ({ userId, stripeAccountId }) => {
  let accountId = stripeAccountId;

  // If creator has no Stripe account yet, create one
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      metadata: { trustfund_user_id: userId },
    });

    accountId = account.id;

    // Persist immediately — don't wait for onboarding to complete
    await pool.query(
      `UPDATE creator_profiles SET stripe_account_id = $1 WHERE user_id = $2`,
      [accountId, userId],
    );
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.FRONTEND_URL}/onboarding/refresh`,
    return_url: `${process.env.FRONTEND_URL}/onboarding/complete`,
    type: "account_onboarding",
  });

  return { url: accountLink.url, stripeAccountId: accountId };
};

/**
 * Marks payout_setup = true once creator completes Stripe onboarding.
 * Called from the onboarding complete endpoint.
 */
const finalizeCreatorOnboarding = async (userId) => {
  // Verify with Stripe that the account actually completed onboarding
  const { rows } = await pool.query(
    `SELECT stripe_account_id FROM creator_profiles WHERE user_id = $1`,
    [userId],
  );

  if (!rows.length || !rows[0].stripe_account_id) {
    throw new ResponseError("Creator profile or Stripe account not found", 404);
  }

  const account = await stripe.accounts.retrieve(rows[0].stripe_account_id);

  // charges_enabled = true means they completed onboarding properly
  if (!account.charges_enabled) {
    throw new ResponseError("Stripe onboarding not yet complete", 400);
  }

  await pool.query(
    `UPDATE creator_profiles SET payout_setup = true WHERE user_id = $1`,
    [userId],
  );

  return { payoutSetup: true };
};

export {
  getOrCreateCustomer,
  createPayment,
  transferToCreator,
  refundPayment,
  createConnectOnboardingLink,
  finalizeCreatorOnboarding,
};
