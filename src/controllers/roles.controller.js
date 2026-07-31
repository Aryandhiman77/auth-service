import { prisma } from "../../lib/prisma.js";
import logger from "../utils/logger.js";
import asyncHandler from "../helpers/asyncHandler.js";
import ApiResponse from "../helpers/apiResponse.js";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../helpers/apiError.js";

import { roleFilters } from "../middlewares/filters/roleFilters.js";
import { SYSTEM_ROLE_CODES } from "../configs/app.config.js";

export const createRole = asyncHandler(async (req, res) => {
  const created = await prisma.role.create({
    data: {
      code: req.data.code,
      name: req.data.name,
      description: req.data.description,
    },
  });
  if (!created) {
    throw new BadRequestError(
      "Failed to create role.",
      "failed to create role.",
      "FAILED_TO_CREATE_ROLE",
    );
  }
  return res.status(201).json(ApiResponse.created(`Role created.`, created));
});

export const getRoles = asyncHandler(async (req, res) => {
  const limit = req.pagination_query?.limit || 5;
  const skip = req.pagination_query?.skip || 0;
  const page = req.pagination_query?.page || 0;
  const sorting = { createdAt: "desc" };

  const [roles, count] = await Promise.all([
    prisma.role.findMany({
      where: {
        ...req.role_filters,
      },
      take: limit,
      skip,
      orderBy: sorting,
    }),
    prisma.role.count({ where: { ...req.role_filters } }),
  ]);
  return res
    .status(200)
    .json(ApiResponse.paginated(roles, page + 1, limit, count));
});

export const getRoleById = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  const role = await prisma.role.findUnique({
    where: { id: req.params.id },
  });
  if (!role) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  return res.status(200).json(ApiResponse.success(`Role found.`, role));
});

export const updateRole = asyncHandler(async (req, res) => {
  console.log("role updating ¯pi is hig");
  logger.info(`update role api is hit by ${req.identity.id}`);
  if (!req.params.id) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  const updated = await prisma.role.update({
    where: { id: req.params.id },
    data: {
      name: req.data.name,
      description: req.data.description,
    },
  });
  return res.status(200).json(ApiResponse.success(`Role updated.`, updated));
});

export const updateRoleStatus = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  if (!["active", "inactive"].includes(req.body?.status)) {
    throw new BadRequestError(
      "status can be either active or inactive.",
      "status can be either active/inactive",
      "INVALID_STATUS_RECEIVED",
    );
  }
  const updated = await prisma.role.update({
    where: {
      id: req.params.id,
    },
    data: {
      isActive: req.body.status === "active",
    },
  });
  return res
    .status(200)
    .json(
      ApiResponse.success(
        `Role status is ${req.body.status ? "active" : "inactive"} now.`,
        updated,
      ),
    );
});

export const getRolePermissions = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  const permissions = await prisma.rolePermission.findMany({
    where: {
      roleId: req.params.id,
    },
  });
  return res
    .status(200)
    .json(ApiResponse.success("Permissions found.", permissions));
});

export const assignRolePermission = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  if (!req.data?.permissionIds?.length) {
    throw new BadRequestError(
      "select atleast one permission.",
      "permissions missing",
      "PERMISSIONS_MISSING",
    );
  }
  const role = await prisma.role.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      code: true,
    },
  });
  if (!role) {
    throw new NotFoundError(
      "Role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
    );
  }
  if (role.code === SYSTEM_ROLE_CODES.SUPER_ADMIN) {
    throw new BadRequestError(
      "Super Admin permissions cannot be modified.",
      "Super Admin permissions cannot be modified.",
      "FAILED_TO_UPDATE_SUPER_ADMIN_PERMISSION",
    );
  }

  const updatedCount = await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: {
        roleId: role.id,
      },
    });

    await tx.rolePermission.createMany({
      data: req.data.permissionIds.map((permissionId) => ({
        roleId: role.id,
        permissionId: permissionId,
        assignedById: req.identity.id,
      })),
    });
  });
  if (!updatedCount) {
    throw new BadRequestError(
      "failed to update permissions.",
      "failed to update permissions",
      "FAILED_TO_UPDATE",
    );
  }
  return res
    .status(200)
    .json(
      ApiResponse.success(`${updatedCount} Permissions updated.`, permissions),
    );
});
