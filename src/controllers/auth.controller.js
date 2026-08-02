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
import {
  appConfig,
  JWT_TOKEN,
  SYSTEM_ROLE_CODES,
} from "../configs/app.config.js";
import { roleFilters } from "../middlewares/filters/roleFilters.js";
import {
  resendVerficationCodeOnPhone,
  resendVerificationOtpOnEmail,
  verifyEmailService,
  verifyPhoneNumberService,
} from "../services/identity.services.js";

export const registerUser = asyncHandler(async (req, res) => {
  logger.info("Register user api hit.");
  const {
    firstName,
    lastName,
    username,
    email,
    password,
    phoneNumber,
    gender,
    roleId,
  } = req.data;

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

  //1. check user if already exists
  const isExists = await prisma.identity.findUnique({
    where: { OR: [{ email }, { username }, { phoneNumber }] },
    select: {
      id: true,
    },
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
    data: {
      firstName,
      lastName,
      username,
      email,
      passwordHash: hashedPassword,
      phoneNumber,
      gender,
      roleId,
    },
  });

  //4. GENERATE TOKENS
  const accessToken = generateAccessToken(identity);
  const { refreshToken, expiry } = generateRefreshToken();

  logger.info(`User saved: ${created.id}`);
  const createdSession = await prisma.session.create({
    data: {
      identityId: created.id,
      refreshTokenHash: await argon2.hash(refreshToken),
      deviceName: os.hostname(),
      platform: os.platform(),
      userAgent: req.get("User-Agent"),
      ipAddress: req.ip,
      expiresAt: expiry,
    },
  });
  if (!createdSession) {
    throw new BadRequestError(
      "An unexpected error occcured.",
      "unexpected error occured",
      "UNEXPECTED_ERROR",
    );
  }
  logger.info(`Session saved: ${createdSession.id}`);
  res.cookie("access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 2, // 2 minutes expiry
    sameSite: "strict",
  });
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

  return res
    .status(201)
    .json({ message: "user registered successfully.", created });
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
  if (identity.lockedUntil > new Date()) {
    throw new BadRequestError(
      `Identity is locked until ${identity.lockedUntil.toLocaleString(undefined, { hour12: true })}.`,
      "identity locked.",
      "IDENTITY_LOCKED",
    );
  }
  // if user is not super admin
  if (
    identity.role.code !== SYSTEM_ROLE_CODES.SUPER_ADMIN &&
    identity.role.code !== SYSTEM_ROLE_CODES.ADMIN
  ) {
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
  if (identity.isEmailVerified) {
    throw new BadRequestError(
      "Verified email is required.",
      "The identity does not have a verified email address.",
      "EMAIL_NOT_VERIFIED",
    );
  }
  if (identity.isPhoneVerified) {
    throw new BadRequestError(
      "Verified phone number is required.",
      "The identity does not have a verified phone number.",
      "PHONE_NOT_VERIFIED",
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

export const verifyEmail = asyncHandler(async (req, res) => {
  const identity = await verifyEmailService(req.identity, req.data?.otp);
  return res
    .status(200)
    .json(ApiResponse.success(`Email verification successful.`, identity));
});

export const verifyPhoneNumber = asyncHandler(async (req, res) => {
  const identity = await verifyPhoneNumberService(req.identity, req.data?.otp);
  return res
    .status(200)
    .json(
      ApiResponse.success(`Phone number verification successful.`, identity),
    );
});

export const resendOtpVerificationEmail = asyncHandler(async (req, res) => {
  const identity = await resendVerificationOtpOnEmail(req.identity);
  return res
    .status(200)
    .json(
      ApiResponse.success(
        `Email verification otp sent to ${req.identity.email}.`,
        identity,
      ),
    );
});
export const resendPhoneOtpVerificationCode = asyncHandler(async (req, res) => {
  const identity = await resendVerficationCodeOnPhone(req.identity);
  return res
    .status(200)
    .json(
      ApiResponse.success(
        `Phone number verification otp sent to ${req.identity.phoneNumber}.`,
        identity,
      ),
    );
});
