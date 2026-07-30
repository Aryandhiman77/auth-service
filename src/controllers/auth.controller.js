import { prisma } from "../../lib/prisma.js";
import JWT from "jsonwebtoken";
import * as argon2 from "argon2";
import logger from "../utils/logger.js";
import crypto from "crypto";
import os from "os";
import asyncHandler from "../helpers/asyncHandler.js";
import ApiResponse from "../helpers/apiResponse.js";
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "../helpers/apiError.js";
import mailSender from "../helpers/nodeMailer.js";
import { resetPasswordEmail } from "../html/resetPasswordEmail.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/tokenGenerator.js";
import { appConfig, JWT_TOKEN } from "../configs/app.config.js";
import { roleFilters } from "../middlewares/filters/roleFilters.js";

export const registerUser = asyncHandler(async (req, res) => {
  logger.info("Register user api hit.");
  try {
    const { username, email, password, role, phoneNumber, gender } = req.data;

    if (!username || !email || !password || !role || !phoneNumber || !gender) {
      throw new BadRequestError(
        "Details are missing.",
        "details missing",
        "DETAILS_MISSING",
      );
    }
    //1. check user if already exists
    const isExists = await prisma.identity.findUnique({
      where: { OR: [{ email }, { username }] },
      select: {
        id: true,
      },
    });
    if (isExists) {
      if (isExists.email === email.toLowerCase()) {
        return res.status(409).json({
          message: "Email already exists.",
        });
      }
      if (isExists.identityname === username) {
        return res.status(409).json({
          message: "Username already exists.",
        });
      }
    }
    //2. hash the password before saving
    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
    });

    // 3. Assign the hashed password and then save
    const created = await prisma.identity.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
        role,
        phoneNumber,
        gender,
      },
    });
    //4. GENERATE TOKENS
    const accessToken = JWT.sign(
      { id: created.id, role: created.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "2m",
      },
    );
    const refreshToken = crypto.randomBytes(64).toString("hex");
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + 7);
    logger.info(`User saved: ${created.id}`);
    const createdSession = await prisma.session.create({
      data: {
        identityId: created.id,
        refreshTokenHash: await argon2.hash(refreshToken),
        deviceName: os.hostname(),
        platform: os.platform(),
        userAgent: req.get("User-Agent"),
        ipAddress: req.ip,
        expiresAt: expDate, // expires in 7 days
      },
    });
    if (!createdSession) {
      return res.status(400).json({
        message: "An unexpected error occcured.",
      });
    }
    logger.info(`Session saved: ${createdSession.id}`);
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 2, // 2 minutes expiry
      sameSite: "strict",
    });
    const formattedRefreshToken = `${createdSession.id}.${refreshToken}`;
    res.cookie("refresh_token", formattedRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days expiry
      sameSite: "strict",
    });

    return res
      .status(201)
      .json({ message: "user registered successfully.", created });
  } catch (error) {
    return res.status(400).json({ message: error.stack });
    logger.error("register user api error", error);
    next(error);
  }
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password, username } = req.data;
  if ((!email && !username) || !password) {
    throw new BadRequestError(
      "Details missing.",
      "Please provide username/email and password",
      "LOGIN_DETAILS_MISSING",
    );
  }
  const credentials = email ? { email } : { username };
  const identity = await prisma.identity.findUnique({
    where: credentials,
    include: {
      role: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });
  console.log(identity);
  if (!identity || identity.deletedAt) {
    throw new NotFoundError(
      "Identity not found.",
      "Identity not found.",
      "IDENTITY_NOT_FOUND",
    );
  }
  // if user is not super admin
  if (identity.role.code !== "SUPER_ADMIN" && identity.role.code !== "ADMIN") {
    if (identity.status === "PROVISIONING") {
      throw new UnauthorizedError(
        "Your account setup is not complete.",
        "account setup incomplete",
        "ACCOUNT_SETUP_INCOMPLETE",
      );
    }

    if (identity.status === "INACTIVE") {
      throw new UnauthorizedError(
        "Your account is inactive.",
        "account is inactive",
        "ACCOUNT_NOT_ACTIVE",
      );
    }

    if (identity.status === "SUSPENDED") {
      throw new UnauthorizedError(
        "Your account has been suspended.",
        "account is suspended",
        "ACCOUNT_SUSPENDED",
      );
    }

    if (identity.status === "ARCHIVED") {
      throw new UnauthorizedError(
        "Your account is no longer available.",
        "account is no longer avaiable",
        "ACCOUNT_ARCHIVED",
      );
    }

    if (identity.status !== "ACTIVE") {
      throw new UnauthorizedError(
        "Login is not allowed for this account.",
        "Login is not allowed",
        "LOGIN_NOT_ALLOWED",
      );
    }
  }

  if (identity.lockedUntil && identity.lockedUntil > new Date()) {
    throw new UnauthorizedError(
      `Your account is temporarily locked until ${identity.lockedUntil}.`,
      "account locked",
      "ACCOUNT_LOCKED",
    );
  }

  // compare the password
  const isMatched = await argon2.verify(identity.passwordHash, password);
  console.log(isMatched);
  if (!isMatched) {
    const attempts = identity.failedLoginAttempts + 1;

    const updateData = {
      failedLoginAttempts: attempts,
    };
    if (attempts >= appConfig.loginConfiguration.maxLoginAttemps) {
      const lockedAccUntil = new Date();
      const lockMinutes =
        appConfig.loginConfiguration.lockAccountExpiryTimeInMinutes ?? 15;
      lockedAccUntil.setMinutes(lockedAccUntil.getMinutes() + lockMinutes);
      updateData.lockedUntil = lockedAccUntil;
    }
    await prisma.identity.update({
      where: { id: identity.id },
      data: updateData,
    });

    throw new BadRequestError(
      "invalid credentials.",
      "invalid credentials.",
      "INVALID_CREDENTIALS",
    );
  }

  const accessToken = generateAccessToken(identity);

  const { refreshToken, expiry } = generateRefreshToken();

  const [createdSession, updatedIdentity] = await prisma.$transaction(
    async (tx) => {
      const updatedIdentity = await tx.identity.update({
        where: { id: identity.id },
        data: {
          lastLoginAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
        include: {
          role: {
            select: {
              permissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      await tx.session.updateMany({
        where: {
          identityId: identity.id,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
      const createdSession = await tx.session.create({
        data: {
          identityId: identity.id,
          refreshTokenHash: await argon2.hash(refreshToken),
          deviceName: os.hostname(),
          platform: os.platform(),
          userAgent: req.get("User-Agent"),
          ipAddress: req.ip,
          expiresAt: expiry, // expires in 7 days
        },
      });
      const { passwordHash, ...updatedDetails } = updatedIdentity;
      return [createdSession, updatedDetails];
    },
  );
  const formattedRefreshToken = `${createdSession.id}.${refreshToken}`;
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: JWT_TOKEN.expiry,
    sameSite: "strict",
  });

  res.cookie("refresh_token", formattedRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: appConfig.loginConfiguration.refreshTokenExpiryMs, // 7 days expirty
    sameSite: "strict",
  });
  logger.info(`${updatedIdentity.id} user logged in.`);
  return res
    .status(200)
    .json(ApiResponse.success("Identity found", updatedIdentity));
});

export const refreshSession = asyncHandler(async (req, res) => {
  const { refresh_token: old_refresh_token_with_session_id } = req.cookies;
  if (!old_refresh_token_with_session_id) {
    throw new BadRequestError(
      "Already logged out.",
      "refresh token missing.",
      "REFRESH_TOKEN_MISSING",
    );
  }
  const [sessionId, oldRefreshToken] =
    old_refresh_token_with_session_id.split(".");
  console.log(sessionId);
  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    select: {
      id: true,
      expiresAt: true,
      refreshTokenHash: true,
      identityId: true,
      isRevoked: true,
      identity: {
        select: {
          deletedAt: true,
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date() || session.isRevoked) {
    throw new BadRequestError(
      "Session is invalid or expired.",
      "invalid refresh token.",
      "REFRESH_TOKEN_INVALID",
    );
  }
  if (session.identity.deletedAt) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found.",
      "IDENTITY_NOT_FOUND",
    );
  }

  // if session is there and ongoing then verify the refreshtoken
  const isValidRefreshToken = await argon2.verify(
    session.refreshTokenHash,
    oldRefreshToken,
  );
  if (!isValidRefreshToken) {
    throw new BadRequestError(
      "Session is invalid or expired.",
      "invalid refresh token.",
      "REFRESH_TOKEN_INVALID",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: { id: session.identityId },
    select: {
      id: true,
      username: true,
    },
  });
  if (!identity) {
    throw new NotFoundError(
      "Identity not found.",
      "identity not found.",
      "IDENTITY_NOT_FOUND",
    );
  }
  // if session is valid then generate new access token
  const accessToken = generateAccessToken(identity);

  const { refreshToken: new_refresh_token, expiry } = generateRefreshToken();
  const identitySession = await prisma.$transaction(async (tx) => {
    return await prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: await argon2.hash(new_refresh_token),
        ipAddress: req.ip,
      },
    });
  });
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: JWT_TOKEN.expiry,
    sameSite: "strict",
  });
  const formattedRefreshToken = `${identitySession.id}.${new_refresh_token}`;
  res.cookie("refresh_token", formattedRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: appConfig.loginConfiguration.refreshTokenExpiryMs, // 2 minutes expiry
    sameSite: "strict",
  });
  return res.status(200).json(ApiResponse.success("Session refreshed."));
});

export const logoutUser = async (req, res) => {
  const { refresh_token } = req.cookies;
  if (!refresh_token) {
    throw new BadRequestError(
      "Already logged out.",
      "refresh token missing.",
      "REFRESH_TOKEN_MISSING",
    );
  }
  const [sessionId, oldRefreshToken] = refresh_token.split(".");

  const session = await prisma.session.findUnique({
    where: {
      id: sessionId,
    },
    include: {
      identity: {
        select: {
          deletedAt: true,
        },
      },
    },
  });
  if (!session || session.identity.deletedAt) {
    throw new BadRequestError(
      "Session is invalid or expired.",
      "session is invalid.",
      "INVALID_SESSION",
    );
  }
  const isValid = await argon2.verify(
    session.refreshTokenHash,
    oldRefreshToken,
  );
  if (!isValid) {
    throw new UnauthorizedError(
      "Invalid session.",
      "invalid refresh token.",
      "INVALID_REFRESH_TOKEN",
    );
  }
  const updatedSession = await prisma.session.update({
    where: { id: sessionId },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
  if (!updatedSession) {
    throw new BadRequestError(
      "An unexpected error occured.",
      "unexpected error occured while updating session.",
      "UNEXPECTED_ERROR",
    );
  }
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });
  return res.status(200).json(ApiResponse.success("Logout successful."));
};

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email, username } = req.data;

  const credentials = email ? { email } : { username };
  if (!credentials) {
    throw new ApiError(
      "email or username is required",
      "identity missing.",
      "IDENTITY_MISSING",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: credentials,
  });
  if (!identity || identity.deletedAt) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
    resetToken,
  )}`;

  const resetHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // store the hash in db
  const expiryAt = new Date();
  expiryAt.setMinutes(
    expiryAt.getMinutes() +
      Number(appConfig.forgotPasswordConfig.resetLinkExpiryMinutes),
  );
  await prisma.passwordResetToken.create({
    data: {
      identityId: identity.id,
      resetTokenHash: resetHash,
      expiresAt: expiryAt,
    },
  });

  await mailSender({
    to: identity.email,
    subject: "reset code verification",
    html: resetPasswordEmail({
      username: identity.username,
      resetUrl,
      expiryMinutes: Number(
        appConfig.forgotPasswordConfig.resetLinkExpiryMinutes,
      ),
    }),
  });
  return res
    .status(200)
    .json(
      ApiResponse.success(
        `Password reset link sent to ${identity.email}`,
        null,
      ),
    );
});

export const resetPassword = asyncHandler(async (req, res) => {
  if (!req.data?.password) {
    throw new BadRequestError(
      "New password is missing.",
      "password missing.",
      "PASSWORD_MISSING",
    );
  }
  if (!req.query?.resetToken) {
    throw new BadRequestError(
      "Reset token is missing.",
      "reset token missing.",
      "RESET_TOKEN_MISSING",
    );
  }
  const resetTokenHash = crypto
    .createHash("sha256")
    .update(req.query.resetToken)
    .digest("hex");

  const isResetTokenExists = await prisma.passwordResetToken.findFirst({
    where: { resetTokenHash },
  });
  if (!isResetTokenExists) {
    throw new NotFoundError(
      "invalid reset token.",
      "invalid reset token.",
      "RESET_TOKEN_INVALID",
    );
  }
  if (isResetTokenExists.expiresAt < new Date()) {
    throw new BadRequestError(
      "reset token expired.",
      "reset token expired.",
      "RESET_TOKEN_EXPIRED",
    );
  }
  const newPassword = await argon2.hash(req.data.password, {
    type: argon2.argon2id,
  });
  await prisma.$transaction(async (tx) => {
    logger.info("reset password transaction started");
    await tx.identity.update({
      where: {
        id: isResetTokenExists.identityId,
      },
      data: {
        passwordHash: newPassword,
      },
      select: {
        id: true,
      },
    });
    await tx.session.updateMany({
      where: {
        identityId: isResetTokenExists.identityId,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
    await tx.passwordResetToken.delete({
      where: { id: isResetTokenExists.id },
    });
    logger.info("reset password transaction completed");
  });
  return res
    .status(200)
    .json(ApiResponse.success(`Password changed successfully.`, null));
});

export const getMe = asyncHandler(async (req, res) => {
  const { passwordHash, deletedAt, ...identityData } = req.identity;

  return res
    .status(200)
    .json(ApiResponse.success("Profile fetched successfully.", identityData));
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

export const changePassword = asyncHandler(async (req, res) => {
  const { email, username, oldPassword, newPassword } = req.data;

  const credentials = email ? { email } : { username };
  if (!credentials || !oldPassword || !newPassword) {
    throw new BadRequestError(
      "Details is missing.",
      "Details missing.",
      "DETAILS_MISSING",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: credentials,
    select: {
      passwordHash: true,
      id: true,
    },
  });
  const isPasswordVerified = await argon2.verify(
    identity.passwordHash,
    oldPassword,
  );
  if (!isPasswordVerified) {
    throw new BadRequestError(
      "Incorrect old password.",
      "Incorrect old password.",
      "INCORRECT_OLD_PASSWORD",
    );
  }
  const newPasswordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
  });
  await prisma.identity.update({
    where: { id: identity.id },
    data: {
      passwordHash: newPasswordHash,
    },
  });
  return res.status(200).json(ApiResponse.success(`Password changed.`, null));
});

export const getIdentitySessions = asyncHandler(async (req, res) => {
  const limit = req.pagination_query?.limit || 5;
  const skip = req.pagination_query?.skip || 0;
  const page = req.pagination_query?.page || 0;
  const sorting = { createdAt: "desc" };

  const [sessions, count] = await Promise.all([
    prisma.session.findMany({
      where: {
        identityId: req.identity.id,
      },
      orderBy: sorting,
      take: limit,
      skip,
      select: {
        id: true,
        deviceName: true,
        platform: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
      },
    }),
    prisma.session.count({
      where: { identityId: req.identity.id },
    }),
  ]);
  return res
    .status(200)
    .json(ApiResponse.paginated(sessions, page + 1, limit, count));
});

export const revokeIdentitySessions = asyncHandler(async (req, res) => {
  const removeAllSessions = await prisma.session.updateMany({
    where: {
      identityId: req.identity.id,
    },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
  return res
    .status(200)
    .json(ApiResponse.success(`All Sessions revoked.`, null));
});

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
  if (role.code === "SUPER_ADMIN") {
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
