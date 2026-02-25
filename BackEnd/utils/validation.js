import Joi from "joi";

// =====================================================
// AUTH & USER SCHEMAS
// =====================================================

export const userSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .required(),
  picture: Joi.string().uri().optional(),
}).unknown(false);

export const pendingUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .required(),
}).unknown(false);

export const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
  activeRole: Joi.string()
    .valid("ADMIN", "USER")
    .optional(),
}).unknown(false);

export const switchRoleSchema = Joi.object({
  role: Joi.string()
    .valid("ADMIN", "USER")
    .required(),
}).unknown(false);

export const userUpdateSchema = Joi.object({
  name: Joi.string().trim().min(2).max(50).optional(),
  password: Joi.string()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/)
    .message(
      "Password must contain at least 1 uppercase, 1 lowercase letter, and 1 number."
    )
    .optional(),
  picture: Joi.string().uri().optional(),
}).unknown(false);

export const otpSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .message("OTP must be exactly 6 digits")
    .required(),
}).unknown(false);
