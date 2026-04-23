import { Router } from "express";
import {
  authenticateUser,
  authorizeRoles,
} from "../middlewares/validate.user.middleware.js";
import * as paymentController from "../controllers/payment.controller.js";
import { handleStripeWebhook } from "../controllers/webhook.controller.js";

const router = Router();

// =====================================================
// WEBHOOK — No auth, Stripe signs its own requests
// =====================================================
// NOTE: This route requires raw body — make sure the express.raw()
// middleware is registered for this path in app.js BEFORE express.json()
router.post("/webhook", handleStripeWebhook);

// =====================================================
// All routes below require authentication
// =====================================================
router.use(authenticateUser);

// =====================================================
// DONATION
// =====================================================

// Initiate a donation — creates PaymentIntent, returns client_secret
// Frontend completes payment with Stripe.js using the client_secret
router.post(
  "/donate",
  authorizeRoles("Donor"),
  paymentController.initiateDonation,
);

// =====================================================
// CREATOR ONBOARDING (Stripe Connect)
// =====================================================

// Start onboarding — generates Stripe Connect link, redirect creator to it
router.post(
  "/onboarding/start",
  authorizeRoles("Creator"),
  paymentController.startOnboarding,
);

// Complete onboarding — verify with Stripe, set payout_setup = true
// Called when Stripe redirects creator back to FRONTEND_URL/onboarding/complete
router.post(
  "/onboarding/complete",
  authorizeRoles("Creator"),
  paymentController.completeOnboarding,
);

// =====================================================
// ESCROW RELEASE & REFUNDS (Admin only)
// =====================================================

// Release escrow — transfer funds to creator after YES vote
router.post(
  "/release/:milestoneId",
  authorizeRoles("Admin"),
  paymentController.releaseEscrow,
);

// Process refunds — refund all donors after NO vote
router.post(
  "/refund/:milestoneId",
  authorizeRoles("Admin"),
  paymentController.processMilestoneRefunds,
);

export default router;
