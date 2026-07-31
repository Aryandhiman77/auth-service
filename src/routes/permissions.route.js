import { Router } from "express";
import {
  createPermission,
  getPermissions,
  getPermissionsByModulesGroup,
  getSinglePermissionById,
} from "../controllers/permissions.controller.js";
import { checkPermission } from "../middlewares/checkPermission.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { permissionFilters } from "../middlewares/filters/permissionFilters.js";
import tokenVerification from "../middlewares/tokenVerification.js";
import { createPermissionValidation } from "../validations/permission.validation.js";
import validate from "../helpers/validator.js";

const permissionRoutes = Router();
permissionRoutes.use(tokenVerification);

permissionRoutes
  .post("/", validate(createPermissionValidation), createPermission)
  .get(
    "/",
    checkPermission("PERMISSION.VIEW"),
    pagination,
    permissionFilters,
    getPermissions,
  )
  .get(
    "/modules",
    checkPermission("PERMISSION.VIEW"),
    getPermissionsByModulesGroup,
  )
  .get("/:id", checkPermission("PERMISSION.VIEW"), getSinglePermissionById);

export default permissionRoutes;
