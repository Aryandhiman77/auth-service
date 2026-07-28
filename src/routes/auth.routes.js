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
  createRole,
  getRoles,
} from "../controllers/auth.controller.js";
import {
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from "../validations/auth.validations.js";
import validate from "../helpers/validator.js";
import tokenVerification from "../middlewares/tokenVerification.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { checkPermission } from "../middlewares/checkPermission.js";
import { roleFilters } from "../middlewares/filters/roleFilters.js";

const authRoutes = Router();

authRoutes
  .post("/login", validate(loginValidation), loginUser)
  .get("/refresh-session", refreshSession)
  .get("/logout", logoutUser)
  .post("/forgot-password", validate(forgotPasswordValidation), forgotPassword)
  .post("/reset-password", validate(resetPasswordValidation), resetPassword);

authRoutes.use(tokenVerification);
authRoutes
  .get("/me", getMe)
  .patch("/change-password", validate(resetPasswordValidation), changePassword);

// get all sessions
// authRoutes.
authRoutes
  .get("/sessions", pagination, getIdentitySessions)
  .delete("/sessions", revokeIdentitySessions);

export default authRoutes;
