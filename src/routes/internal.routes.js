import { Router } from "express";
import {
  archieveIdentity,
  changeIdentityRole,
  changeIdentityStatus,
  createIdentityByRole,
  getIdentityContext,
  getServiceToken,
  getSingleUserById,
  initiatePasswordResetFlow,
  revokeIdentitySessions,
  updateIdentity,
} from "../controllers/internal.controller.js";
import validate from "../helpers/validator.js";
import { verifyServiceKey } from "../middlewares/verifyServiceKey.js";

const internalRoutes = Router();

internalRoutes.get("/oauth/token", getServiceToken);

internalRoutes
  .use(verifyServiceKey)
  .post("/identities", createIdentityByRole)
  .get("/identities/:id", getSingleUserById)
  .patch("/identities/:id/identifiers", updateIdentity)
  .patch("/identities/:id/status", changeIdentityStatus)
  .patch("/identities/:id/role", changeIdentityRole)
  .get("/identities/:id/access-context", getIdentityContext)
  .post("/identities/:id/revoke-sessions", revokeIdentitySessions)
  .post("/identities/:id/password-reset", initiatePasswordResetFlow)
  .post("/identities/:id/cancel-provisioning", archieveIdentity);

export default internalRoutes;
