import asyncHandler from "../helpers/asyncHandler.js";
import ApiResponse from "../helpers/apiResponse.js";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../helpers/apiError.js";
import { prisma } from "../../lib/prisma.js";

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
