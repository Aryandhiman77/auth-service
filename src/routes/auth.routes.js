import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  getIdentitySessions,
  loginUser,
  logoutUser,
  refreshSession,
  resetPassword,
  revokeIdentitySessions,
  registerUser,
  verifyEmail,
  verifyPhoneNumber,
} from "../controllers/auth.controller.js";
import {
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  registerUserValidations,
  otpSchema,
} from "../validations/auth.validations.js";
import validate from "../helpers/validator.js";
import tokenVerification from "../middlewares/tokenVerification.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { checkPermission } from "../middlewares/checkPermission.js";

const authRoutes = Router();

authRoutes
  .post("/register", validate(registerUserValidations), registerUser)
  .post("/login", validate(loginValidation), loginUser)
  .post("/refresh-session", refreshSession)
  .post("/logout", logoutUser)
  .post("/forgot-password", validate(forgotPasswordValidation), forgotPassword)
  .post("/reset-password", validate(resetPasswordValidation), resetPassword)
  .use(tokenVerification)
  .get("/me", getMe)
  .patch("/change-password", validate(changePasswordValidation), changePassword)
  .get("/sessions", pagination, getIdentitySessions)
  .delete("/sessions", revokeIdentitySessions)
  .post("/verify-email", validate(otpSchema), verifyEmail)
  .post("/verify-phone", validate(otpSchema), verifyPhoneNumber);

export default authRoutes;
