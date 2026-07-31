import asyncHandler from "../helpers/asyncHandler.js";
import ApiResponse from "../helpers/apiResponse.js";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../helpers/apiError.js";
import { prisma } from "../../lib/prisma.js";
import JWT from "jsonwebtoken";
import { PRIVATE_KEY } from "../configs/loadKeys.js";
import fs from "node:fs";
import * as argon2 from "argon2";

const IDENTITY_STATUSES = [
  "PROVISIONING",
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
  "ARCHIVED",
];

export const getServiceToken = asyncHandler(async (req, res) => {
  const payload = {
    iss: "identity-service", //Who issued the token
    sub: "user-service", // must be dynamic based on kafka request
    service_id: process.env.SERVICE_ID, //Unique token ID
    aud: process.env.SERVICE_NAME,
  };
  const serviceToken = JWT.sign(payload, PRIVATE_KEY, {
    expiresIn: "30m",
    algorithm: "RS256",
  });
  return res
    .status(200)
    .json(ApiResponse.success(`service token.`, serviceToken));
});

export const getSingleUserById = asyncHandler(async (req, res) => {
  if (!req.params.id) {
    throw new NotFoundError(
      "User not found.",
      "user not found",
      "USER_NOT_FOUND",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: {
      id: req.params.id,
    },
    include: {
      role: {
        select: {
          code: true,
          permissions: {
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  isActive: true,
                  isSystem: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (!identity) {
    throw new NotFoundError(
      "User not found.",
      "Invalid credentials",
      "USER_NOT_FOUND",
    );
  }
  if (identity.deletedAt) {
    throw new BadRequestError(
      "User is deleted.",
      "user is deleted",
      "USER_DELETED",
    );
  }

  const permissions =
    identity.role.permissions.map((item) => ({
      code: item.permission.code,
      id: item.permission.id,
      isActive: item.permission.isActive,
      isSystem: item.permission.isSystem,
    })) || [];

  const mutatedIdentity = {
    ...identity,
    role: identity.role.code,
    permissions,
  };
  delete mutatedIdentity.passwordHash;
  return res
    .status(200)
    .json(ApiResponse.success(`User found.`, mutatedIdentity));
});

export const createIdentityByRole = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    phoneNumber,
    gender,
    roleId,
  } = req.body;
  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !password ||
    !phoneNumber ||
    !gender ||
    !roleId
  ) {
    throw new BadRequestError(
      "Details are missing.",
      "details missing",
      "DETAILS_MISSING",
    );
  }
  const isRoleExists = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      isActive: true,
    },
  });
  if (!isRoleExists || !isRoleExists.isActive) {
    throw new NotFoundError(
      "Invalid role.",
      "Role not found.",
      "ROLE_NOT_FOUND",
    );
  }
  const isExists = await prisma.identity.findFirst({
    where: { OR: [{ email }, { username }, { phoneNumber }] },
  });
  if (isExists) {
    if (isExists.email === email.toLowerCase()) {
      throw new BadRequestError(
        "Email already exists.",
        "emails already exists",
        "EMAIL_ALREADY_EXISTS",
      );
    }
    if (isExists.identityname === username) {
      throw new BadRequestError(
        "Username already exists.",
        "Username already exists",
        "USERNAME_ALREADY_EXISTS",
      );
    }
    if (isExists.phoneNumber === phoneNumber) {
      throw new BadRequestError(
        "Phone Number already exists.",
        "Phone Number already exists",
        "PHONE_NUMBER_ALREADY_EXISTS",
      );
    }
  }
  const hashedPassword = await argon2.hash(password, {
    type: argon2.argon2id,
  });
  const created = await prisma.identity.create({
    firstName,
    lastName,
    username,
    email,
    passwordHash: hashedPassword,
    phoneNumber,
    gender,
    roleId,
  });
  return res
    .status(201)
    .json(
      ApiResponse.created("user registered successfully.", { id: created.id }),
    );
});

export const updateIdentity = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const { firstName, lastName, username, email, phoneNumber, gender } =
    req.body;
  if (
    !firstName ||
    !lastName ||
    !username ||
    !email ||
    !phoneNumber ||
    !gender
  ) {
    throw new BadRequestError(
      "Details are missing.",
      "details missing",
      "DETAILS_MISSING",
    );
  }
  const identityUpdationObj = {};
  const isIdentityExists = await prisma.identity.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email,
      phoneNumber,
    },
  });

  if (isIdentityExists.email !== email) {
    identityUpdationObj.email = email;
    identityUpdationObj.isEmailVerified = false;
    identityUpdationObj.lastEmailChangedAt = new Date();
  }
  if (isIdentityExists.phoneNumber !== phoneNumber) {
    identityUpdationObj.phoneNumber = phoneNumber;
    identityUpdationObj.isPhoneVerified = false;
    identityUpdationObj.lastPhoneNumberChangedAt = new Date();
  }
  identityUpdationObj.firstName = firstName;
  identityUpdationObj.lastName = lastName;
  identityUpdationObj.username = username;
  identityUpdationObj.gender = gender;

  const updated = await prisma.identity.update({
    where: {
      id: req.body.identityId,
    },
    data: identityUpdationObj,
  });
  if (!updated) {
    throw new BadRequestError(
      "failed to update identity.",
      "failed to update",
      "FAILED_TO_UPDATE_IDENTITY",
    );
  }
  const { passwordHash, otherDetails } = updated;
  return res
    .status(200)
    .json(ApiResponse.success("Identity updated successfully.", otherDetails));
});

export const changeIdentityStatus = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const { status } = req.body;
  if (!status || IDENTITY_STATUSES.includes(status.toUpperCase())) {
    throw new BadRequestError(
      `status can be either ${IDENTITY_STATUSES.toString()}.`,
      "invalid status",
      "INVALID_STATUS",
    );
  }
  const updated = await prisma.identity.update({
    where: { id: req.params.id },
    data: {
      status: status.toUpperCase(),
    },
  });
  return res.status(200).json(
    ApiResponse.success(`Identity status updated to ${status.toLowerCase()}.`, {
      id: updated.id,
    }),
  );
});

export const changeIdentityRole = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const { roleId } = req.body;
  const isRoleExists = await prisma.role.findUnique({
    where: { id: roleId },
    select: {
      id: true,
      isActive: true,
    },
  });
  if (!isRoleExists || !isRoleExists.isActive) {
    throw new NotFoundError(
      "Invalid role.",
      "Role not found.",
      "ROLE_NOT_FOUND",
    );
  }
  const updated = await prisma.identity.update({
    where: { id: req.params.id },
    data: {
      roleId: roleId,
      lastRoleChangedAt: new Date(),
    },
    include: {
      role: {
        select: {
          name: true,
        },
      },
    },
  });
  return res.status(200).json(
    ApiResponse.success(
      `Identity role updated to ${updated.role.name.toLowerCase()}.`,
      {
        id: updated.id,
      },
    ),
  );
});
