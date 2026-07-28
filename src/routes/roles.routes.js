import { Router } from "express";
import { checkPermission } from "../middlewares/checkPermission.js";
import validate from "../helpers/validator.js";
import {
  createRoleValidation,
  updateRoleDetails,
} from "../validations/role.validations.js";
import {
  createRole,
  getIdentityPermissions,
  getRoleById,
  getRoles,
  updateRole,
  updateRoleStatus,
} from "../controllers/auth.controller.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { roleFilters } from "../middlewares/filters/roleFilters.js";
import tokenVerification from "../middlewares/tokenVerification.js";
const roleRoutes = Router();
roleRoutes.use(tokenVerification);
roleRoutes
  .post(
    "/",
    checkPermission("ROLE.CREATE"),
    validate(createRoleValidation),
    createRole,
  )
  .get("/", checkPermission("ROLE.VIEW"), pagination, roleFilters, getRoles)
  .get("/:id", getRoleById)
  .patch(
    "/:id",
    checkPermission("ROLE.UPDATE"),
    validate(updateRoleDetails),
    updateRole,
  )
  .patch("/:id/status", checkPermission("ROLE.UPDATE"), updateRoleStatus)
  .get(
    "/:id/permissions",
    checkPermission("ROLE.VIEW"),
    getIdentityPermissions,
  );

export default roleRoutes;
