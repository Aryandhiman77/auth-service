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
  getSingleUserById,
} from "../controllers/auth.controller.js";
import {
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from "../validations/auth.validations.js";
import validate from "../helpers/validator.js";
import tokenVerification from "../middlewares/tokenVerification.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { checkPermission } from "../middlewares/checkPermission.js";
import { roleFilters } from "../middlewares/filters/roleFilters.js";

const authRoutes = Router();

authRoutes
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
  .get("/:id", getSingleUserById);

export default authRoutes;
