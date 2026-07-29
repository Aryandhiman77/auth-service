import { Router } from "express";
import {
  getPermissions,
  getPermissionsByModulesGroup,
  getSinglePermissionById,
} from "../controllers/permissions.controller.js";
import { checkPermission } from "../middlewares/checkPermission.js";
import pagination from "../middlewares/filters/common/pagination.js";
import { permissionFilters } from "../middlewares/filters/permissionFilters.js";
import tokenVerification from "../middlewares/tokenVerification.js";

const permissionRoutes = Router();
permissionRoutes.use(tokenVerification);

permissionRoutes
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
