import Joi from "joi";

// =====================================================
// AUTH & USER SCHEMAS
// =====================================================

export const userSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number.",
    )
    .required(),
}).unknown(false);

export const pendingUserSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number.",
    )
    .required(),
}).unknown(false);

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
  activeRole: Joi.string().valid("Donor", "Creator", "Admin").required(),
}).unknown(false);

export const switchRoleSchema = Joi.object({
  role: Joi.string().valid("Donor", "Creator", "Admin").required(),
}).unknown(false);

export const userUpdateSchema = Joi.object({
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number.",
    )
    .optional(),
}).unknown(false);

export const otpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .message("OTP must be exactly 6 digits")
    .required(),
}).unknown(false);

// =====================================================
// APPLICATION SCHEMAS
// =====================================================

export const applicationSchema = Joi.object({
  phone: Joi.string().trim().required(),
  work_email: Joi.string().trim().email().required(),
  address: Joi.string().trim().required(),
  facebook_url: Joi.string().trim().uri().optional().allow(null, ""),
  instagram_url: Joi.string().trim().uri().optional().allow(null, ""),
  linkedin_url: Joi.string().trim().uri().optional().allow(null, ""),
}).unknown(false);

export const applicationApprovalSchema = Joi.object({
  status: Joi.string().valid("Approved", "Rejected").required(),
  reviewed_by: Joi.string().optional().allow(null, ""),
}).unknown(false);

// =====================================================
// MILESTONE SCHEMAS
// =====================================================

export const milestoneSchema = Joi.object({
  title: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  target_amount: Joi.number().positive().required(),
  deadline: Joi.date().iso().required(),
}).unknown(false);

export const milestoneReviewSchema = Joi.object({
  action: Joi.string().valid("approve", "reject").required(),
}).unknown(false);

// =====================================================
// VOTING SCHEMAS
// =====================================================

export const voteSchema = Joi.object({
  vote: Joi.boolean().required(),
}).unknown(false);
