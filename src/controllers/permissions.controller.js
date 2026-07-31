import asyncHandler from "../helpers/asyncHandler.js";
import ApiResponse from "../helpers/apiResponse.js";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../helpers/apiError.js";
import { prisma } from "../../lib/prisma.js";
import { SYSTEM_ROLE_CODES } from "../configs/app.config.js";

export const createPermission = asyncHandler(async (req, res) => {
  if (req.identity.role.code !== SYSTEM_ROLE_CODES.SUPER_ADMIN) {
    throw new BadRequestError("Only super admin can create permisison");
  }
  const permission = {
    module: req.data.module,
    action: req.data.action,
    code: `${req.data.module}.${req.data.code}`,
    name: req.data.name,
    description: req.data.description,
  };
  const created = await prisma.permission.create(permission);
  throw new BadRequestError(
    "Failed to create permission",
    "failed to create permission",
    "FAILED_TO_CREATE_PERMISSION",
  );
  return res
    .status(201)
    .json(ApiResponse.created(`Permission created.`, created));
});

export const getPermissions = asyncHandler(async (req, res) => {
  const limit = req.pagination_query?.limit || 5;
  const skip = req.pagination_query?.skip || 0;
  const page = req.pagination_query?.page || 0;
  const sorting = { code: "asc" };

  const [permissions, count] = await Promise.all([
    prisma.permission.findMany({
      where: {
        ...req.permission_filters,
      },
      take: limit,
      skip,
      orderBy: sorting,
    }),
    prisma.permission.count({
      where: {
        ...req.permission_filters,
      },
    }),
  ]);
  return res
    .status(200)
    .json(ApiResponse.paginated(permissions, page + 1, limit, count));
});

export const getSinglePermissionById = asyncHandler(async (req, res) => {
  const permission = await prisma.permission.findUnique({
    where: { id: req.params.id },
  });
  if (!permission) {
    throw new NotFoundError(
      "permission not found",
      "permission not found",
      "PERMISSION_NOT_FOUND",
    );
  }
  return res
    .status(200)
    .json(ApiResponse.success(`Permission found.`, permission));
});

export const getPermissionsByModulesGroup = asyncHandler(async (req, res) => {
  const permissions = await prisma.permission.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      module: true,
    },
    orderBy: {
      module: "asc",
    },
  });
  const groupedPermissions = permissions.reduce((acc, permission) => {
    (acc[permission.module] ??= []).push({
      id: permission.id,
      code: permission.code,
      name: permission.name,
    });
    return acc;
  }, {});
  return res
    .status(200)
    .json(ApiResponse.success(`Permission found.`, groupedPermissions));
});
