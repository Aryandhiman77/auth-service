import { Router } from "express";
import {
  changeIdentityRole,
  changeIdentityStatus,
  createIdentityByRole,
  getServiceToken,
  getSingleUserById,
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
  .patch("/identities/:id/role", changeIdentityRole);

export default internalRoutes;
