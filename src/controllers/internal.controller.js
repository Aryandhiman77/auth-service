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
import crypto from "crypto";
import { appConfig, SYSTEM_ROLE_CODES } from "../configs/app.config.js";
import mailSender from "../helpers/nodeMailer.js";
import { resetPasswordEmail } from "../html/resetPasswordEmail.js";
import {
  generateOtpWithResetHash,
  generateResetToken,
} from "../utils/tokenGenerator.js";
import { emailVerificationOtpTemplate } from "../html/emailVerificationOtpTemplate.js";

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
    // expiresIn: "1d",
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
      code: true,
    },
  });
  if (
    !isRoleExists ||
    !isRoleExists.isActive ||
    isRoleExists.code === SYSTEM_ROLE_CODES.SUPER_ADMIN
  ) {
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

  // generate resetOtps for email and password verification
  const {
    otp: emailVerificationOtp,
    resetOtpHash: emailResetHash,
    expiryAt: emailOtpExpiry,
  } = generateOtpWithResetHash();
  const {
    otp: phoneVerificationOtp,
    resetOtpHash: phoneResetHash,
    expiryAt: phoneOtpExpiry,
  } = generateOtpWithResetHash();

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.identity.create({
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
    const createEmailVerificationRecord =
      await tx.identifierVerification.create({
        data: {
          identityId: created.id,
          type: "EMAIL_REGISTRATION",
          targetValue: created.email,
          tokenHash: emailResetHash,
          expiresAt: emailOtpExpiry,
        },
      });

    const phoneNumberVerificationRecord =
      await tx.identifierVerification.create({
        data: {
          identityId: created.id,
          type: "PHONE_REGISTRATION",
          targetValue: created.phoneNumber,
          tokenHash: phoneResetHash,
          expiresAt: phoneOtpExpiry,
        },
      });
    return created;
  });

  const isOtpSentToEmail = await mailSender({
    to: result.email,
    subject: "Email verification",
    html: emailVerificationOtpTemplate({
      firstName: result.firstName,
      otp: emailVerificationOtp,
      expiryMinutes: appConfig.emailVerificationOtpExpiryMinutes,
    }),
  });

  // ❌ -> phone number verification api
  const isOtpSentToPhoneNumber = await mailSender({
    to: result.email,
    subject: "Phone number verification",
    html: emailVerificationOtpTemplate({
      firstName: result.firstName,
      otp: phoneVerificationOtp,
      expiryMinutes: appConfig.phoneNumberVerificationOtpExpiryMinutes,
    }),
  });

  return res.status(201).json(
    ApiResponse.created(
      `Email verification otp sent to ${result.email} & phone number verification otp sent to ${result.phoneNumber}`,
      {
        id: result.id,
        phoneNumberVerificationOtp: phoneVerificationOtp,
        isOtpSentToEmail,
        isOtpSentToPhoneNumber,
      },
    ),
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

  const identityUpdationObj = {};
  const isIdentityExists = await prisma.identity.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email,
      phoneNumber,
      firstName,
    },
  });
  const now = new Date();
  let isOtpSentToEmail = false;
  let isOtpSentToPhoneNumber = false;
  if (email && isIdentityExists.email !== email) {
    identityUpdationObj.email = email;
    identityUpdationObj.isEmailVerified = false;
    identityUpdationObj.lastEmailChangedAt = now;
    // expire the previous otps from db and create new otp
    const {
      otp: emailVerificationOtp,
      resetOtpHash: emailResetHash,
      expiryAt: emailOtpExpiry,
    } = generateOtpWithResetHash();

    await prisma.$transaction(async (tx) => {
      await prisma.identifierVerification.updateMany({
        where: {
          identityId: isIdentityExists.id,
          type: "EMAIL_CHANGE",
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
        },
      });
      await tx.identifierVerification.create({
        data: {
          identityId: isIdentityExists.id,
          type: "EMAIL_CHANGE",
          targetValue: email,
          tokenHash: emailResetHash,
          expiresAt: emailOtpExpiry,
        },
      });
    });
    isOtpSentToEmail = await mailSender({
      to: isIdentityExists.email,
      subject: "Email verification",
      html: emailVerificationOtpTemplate({
        firstName: isIdentityExists.firstName,
        otp: emailVerificationOtp,
        expiryMinutes: appConfig.emailVerificationOtpExpiryMinutes,
      }),
    });
  }
  if (phoneNumber && isIdentityExists.phoneNumber !== phoneNumber) {
    identityUpdationObj.phoneNumber = phoneNumber;
    identityUpdationObj.isPhoneVerified = false;
    identityUpdationObj.lastPhoneNumberChangedAt = now;
    const {
      otp: phoneVerificationOtp,
      resetOtpHash: phoneResetHash,
      expiryAt: phoneOtpExpiry,
    } = generateOtpWithResetHash();

    await prisma.$transaction(async (tx) => {
      await prisma.identifierVerification.updateMany({
        where: {
          identityId: isIdentityExists.id,
          type: "PHONE_CHANGE",
          expiresAt: { gt: now },
        },
        data: {
          revokedAt: now,
        },
      });
      await tx.identifierVerification.create({
        data: {
          identityId: isIdentityExists.id,
          type: "PHONE_CHANGE",
          targetValue: phoneNumber,
          tokenHash: phoneResetHash,
          expiresAt: phoneOtpExpiry,
        },
      });
    });
    // ❌ -> phone number verification api
    isOtpSentToPhoneNumber = await mailSender({
      to: isIdentityExists.email,
      subject: "Phone number verification",
      html: emailVerificationOtpTemplate({
        firstName: isIdentityExists.firstName,
        otp: phoneVerificationOtp,
        expiryMinutes: appConfig.phoneNumberVerificationOtpExpiryMinutes,
      }),
    });
  }
  if (firstName) identityUpdationObj.firstName = firstName;
  if (lastName) identityUpdationObj.lastName = lastName;
  if (username) identityUpdationObj.username = username;
  if (gender) identityUpdationObj.gender = gender;

  const updated = await prisma.identity.update({
    where: {
      id: isIdentityExists.id,
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
  return res.status(200).json(
    ApiResponse.success("Identity updated successfully.", {
      otherDetails,
      isOtpSentToEmail,
      isOtpSentToPhoneNumber,
    }),
  );
});

export const changeIdentityStatus = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  // const { status } = ;
  if (
    !req.body?.status ||
    !IDENTITY_STATUSES.includes(req.body.status.toUpperCase())
  ) {
    throw new BadRequestError(
      `status can be either ${IDENTITY_STATUSES.toString().toLowerCase()}.`,
      "invalid status",
      "INVALID_STATUS",
    );
  }
  const updated = await prisma.identity.update({
    where: { id: req.params.id },
    data: {
      status: req.body?.status.toUpperCase(),
    },
  });
  return res.status(200).json(
    ApiResponse.success(
      `Identity status updated to ${req.body?.status.toLowerCase()}.`,
      {
        id: updated.id,
      },
    ),
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
  if (!req.body?.roleId) {
    throw new NotFoundError(
      "role not found.",
      "role not found",
      "ROLE_NOT_FOUND",
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

export const getIdentityContext = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: {
      id: req.params.id,
    },
    select: {
      id: true,
      status: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      lockedUntil: true,
      deletedAt: true,

      role: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,

          permissions: {
            where: {
              permission: {
                isActive: true,
              },
            },
            select: {
              permission: {
                select: {
                  id: true,
                  code: true,
                  module: true,
                  action: true,
                },
              },
            },
          },
        },
      },
    },
  });
  if (identity) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const now = new Date();

  const temporarilyLocked = Boolean(
    identity.lockedUntil && identity.lockedUntil > now,
  );

  const statusAllowsLogin = ["PROVISIONING", "ACTIVE"].includes(
    identity.status,
  );

  const loginAllowed =
    !identity.deletedAt &&
    !temporarilyLocked &&
    identity.role.isActive &&
    statusAllowsLogin;

  const permissionCodes = identity.role.permissions.map(
    ({ permission }) => permission.code,
  );

  return res.status(200).json(
    ApiResponse.success(`Identity context found.`, {
      identityId: identity.id,
      status: identity.status,

      authentication: {
        loginAllowed,
        temporarilyLocked,
        lockedUntil: identity.lockedUntil,
        emailVerified: identity.isEmailVerified,
        phoneVerified: identity.isPhoneVerified,
      },

      role: {
        id: identity.role.id,
        code: identity.role.code,
        name: identity.role.name,
        isActive: identity.role.isActive,
      },

      permissionCodes,
    }),
  );
});

export const revokeIdentitySessions = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const revoked = await prisma.session.updateMany({
    where: { identityId: req.params.id },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });
  if (!revoked.count) {
    throw new BadRequestError(
      "Sessions already revoked",
      "sessions already revoked",
      "SESSIONS_ALREADY_REVOKED",
    );
  }
  return res
    .status(200)
    .json(
      ApiResponse.success(
        `${revoked.count === 1 ? `${revoked.count} session revoked.` : `${revoked.count} sessions revoked.`}`,
        revoked,
      ),
    );
});

export const initiatePasswordResetFlow = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: { id: req.params.id },
  });
  if (!identity.isEmailVerified) {
    throw new BadRequestError(
      "Verified email is required.",
      "The identity does not have a verified email address.",
      "EMAIL_NOT_VERIFIED",
    );
  }
  if (!identity.isPhoneVerified) {
    throw new BadRequestError(
      "Verified phone number is required.",
      "The identity does not have a verified phone number.",
      "PHONE_NOT_VERIFIED",
    );
  }

  const { resetToken, resetHash, expiryAt } = generateResetToken();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(
    resetToken,
  )}`;
  const [token, tokenExpiresAt] = await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.passwordResetToken.updateMany({
      where: {
        identityId: identity.id,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        expiresAt: now,
      },
    });
    const passwordReset = await tx.passwordResetToken.create({
      data: {
        identityId: identity.id,
        resetTokenHash: resetHash,
        expiresAt: now,
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    await tx.session.updateMany({
      where: {
        identityId: identity.id,
      },
      data: {
        revokedAt: now,
        isRevoked: true,
      },
    });
    return [passwordReset, now];
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
  return res.status(200).json(
    ApiResponse.success(`Password reset link sent to ${identity.email}`, {
      requestId: token.id,
      status: "PENDING",
      deliveryChannel: "EMAIL",
      destination: identity.email,
      expiresAt: tokenExpiresAt,
      sessionsRevoked: true,
    }),
  );
});

export const archieveIdentity = asyncHandler(async (req, res) => {
  if (!req.params?.id) {
    throw new NotFoundError(
      "identity not found.",
      "identity not found",
      "IDENTITY_NOT_FOUND",
    );
  }
  const identity = await prisma.identity.findUnique({
    where: {
      id: identityId,
    },
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      status: true,
      deletedAt: true,
      createdAt: true,
      role: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  if (!identity) {
    throw new NotFoundError(
      "Identity not found.",
      "The requested identity does not exist.",
      "IDENTITY_NOT_FOUND",
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const updatedIdentity = await tx.identity.update({
      where: { id: identity.id },
      data: {
        status: "ARCHIVED",
        deletedAt: now,
      },
    });
    const revokedSessions = await tx.session.updateMany({
      where: { id: identity.id },
      data: {
        isRevoked: true,
        revokedAt: now,
      },
    });
    await tx.passwordResetToken.updateMany({
      data: {
        identityId: identity.id,
        expiresAt: now,
      },
      select: {
        id: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    return updatedIdentity;
  });
  return res.status(200).json(
    ApiResponse.success(`Identity status changed to ${updated.status}`, {
      id: updated.id,
      sessionsRevoked: true,
      resetTokensRevoked: true,
    }),
  );
});
