import { prisma } from "../../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../helpers/apiError.js";
import crypto from "crypto";
import { generateOtpWithResetHash } from "../utils/tokenGenerator.js";
import {
  IdentityStatus,
  VerificationType,
} from "../../generated/prisma/index.js";
import mailSender from "../helpers/nodeMailer.js";
import { appConfig } from "../configs/app.config.js";
import { emailVerificationOtpTemplate } from "../html/emailVerificationOtpTemplate.js";

export const verifyEmailService = async (identity, otp) => {
  const allowedStatuses = [IdentityStatus.PROVISIONING, IdentityStatus.ACTIVE];

  if (!allowedStatuses.includes(identity.status)) {
    throw new ForbiddenError(
      "Verification is not allowed.",
      `Identity status ${identity.status} cannot perform this operation.`,
      "IDENTITY_STATUS_NOT_ALLOWED",
    );
  }
  if (
    (identity.pendingEmail && !identity.isEmailVerified) ||
    (identity.isEmailVerified && !identity.pendingEmail)
  ) {
    throw new BadRequestError(
      "No pending email for verification.",
      "No pending email for verification",
      "NO_VERIFICATION_PENDING_EMAIL",
    );
  }

  let type = "";
  if (!identity.pendingEmail && !identity.isEmailVerified) {
    type = VerificationType.EMAIL_REGISTRATION;
  }

  if (identity.isEmailVerified && identity.pendingEmail) {
    type = VerificationType.EMAIL_CHANGE;
  }
  const targetValue =
    type === VerificationType.EMAIL_REGISTRATION
      ? identity.email
      : identity.pendingEmail;

  const recordHash = crypto.createHash("sha256").update(otp).digest("hex");
  const record = await prisma.identifierVerification.findFirst({
    where: {
      identityId: identity.id,
      targetValue,
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!record) {
    throw new NotFoundError(
      "Verification record not found",
      "verification record not found",
      "VERIFICATION_RECORD_NOT_FOUND",
    );
  }
  const now = new Date();
  if (record.revokedAt) {
    throw new BadRequestError(
      "OTP is revoked for security reasons.",
      "otp revoked",
      "OTP_REVOKED",
    );
  }
  if (record.verifiedAt) {
    throw new BadRequestError(
      "OTP already used.",
      "otp already used",
      "OTP_ALREADY_USED",
    );
  }

  if (record.expiresAt < now) {
    throw new BadRequestError("OTP expired.", "otp expired", "OTP_EXPIRED");
  }

  let attempts = record.attempts + 1;
  if (record.tokenHash.toString() !== recordHash.toString()) {
    const updatedData = { attempts };
    if (attempts >= record.maxAttempts) {
      updatedData.revokedAt = new Date();
    }
    await prisma.identifierVerification.update({
      where: {
        id: record.id,
      },
      data: updatedData,
      select: {
        id: true,
      },
    });
    if (attempts >= record.maxAttempts) {
      throw new BadRequestError(
        "Max attempts reached for this verification.",
        "max attemps reached",
        "MAX_ATTEMPS_REACHED",
      );
    }
    throw new BadRequestError("Invalid OTP.", "invalid otp", "INVALID_OTP");
  }
  // token is not expired and valid then mark email as verified and revoke the token
  const result = await prisma.$transaction(async (tx) => {
    const updatedIdentity = await tx.identity.update({
      where: { id: identity.id },
      data: {
        isEmailVerified: true,
        pendingEmail: null,
        lastEmailChangedAt:
          type === VerificationType.EMAIL_REGISTRATION ? null : new Date(),
        email: targetValue,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        pendingEmail: true,
      },
    });
    await tx.identifierVerification.update({
      where: {
        id: record.id,
      },
      data: {
        verifiedAt: now,
        attempts,
      },
    });
    return updatedIdentity;
  });
  return result;
};

export const verifyPhoneNumberService = async (identity, otp) => {
  const allowedStatuses = [IdentityStatus.PROVISIONING, IdentityStatus.ACTIVE];

  if (!allowedStatuses.includes(identity.status)) {
    throw new ForbiddenError(
      "Verification is not allowed.",
      `Identity status ${identity.status} cannot perform this operation.`,
      "IDENTITY_STATUS_NOT_ALLOWED",
    );
  }
  if (
    (identity.pendingPhone && !identity.isPhoneVerified) ||
    (identity.isPhoneVerified && !identity.pendingPhone)
  ) {
    throw new BadRequestError(
      "No pending phone number for verification.",
      "No pending phone number for verification",
      "NO_VERIFICATION_PENDING_PHONE",
    );
  }

  let type = "";
  if (!identity.pendingPhone && !identity.isPhoneVerified) {
    type = VerificationType.PHONE_REGISTRATION;
  }

  if (identity.isPhoneVerified && identity.pendingPhone) {
    type = VerificationType.PHONE_CHANGE;
  }
  const targetValue =
    type === VerificationType.PHONE_REGISTRATION
      ? identity.phoneNumber
      : identity.pendingPhone;

  const recordHash = crypto.createHash("sha256").update(otp).digest("hex");
  const record = await prisma.identifierVerification.findFirst({
    where: {
      identityId: identity.id,
      targetValue,
      type,
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!record) {
    throw new NotFoundError(
      "Verification record not found",
      "verification record not found",
      "VERIFICATION_RECORD_NOT_FOUND",
    );
  }
  const now = new Date();
  if (record.revokedAt) {
    throw new BadRequestError(
      "OTP is revoked for security reasons.",
      "otp revoked",
      "OTP_REVOKED",
    );
  }
  if (record.verifiedAt) {
    throw new BadRequestError(
      "OTP already used.",
      "otp already used",
      "OTP_ALREADY_USED",
    );
  }
  if (record.expiresAt < now) {
    throw new BadRequestError("OTP expired.", "otp expired", "OTP_EXPIRED");
  }

  let attempts = record.attempts + 1;
  if (record.tokenHash.toString() !== recordHash.toString()) {
    const updatedData = { attempts };
    if (attempts >= record.maxAttempts) {
      updatedData.revokedAt = new Date();
    }
    await prisma.identifierVerification.update({
      where: {
        id: record.id,
      },
      data: updatedData,
    });
    if (attempts >= record.maxAttempts) {
      throw new BadRequestError(
        "Max attempts reached for this verification.",
        "max attemps reached",
        "MAX_ATTEMPS_REACHED",
      );
    }
    throw new BadRequestError("Invalid OTP.", "invalid otp", "INVALID_OTP");
  }
  // token is not expired and valid then mark phoneNumber as verified and revoke the token
  const result = await prisma.$transaction(async (tx) => {
    const updatedIdentity = await tx.identity.update({
      where: { id: identity.id },
      data: {
        isPhoneVerified: true,
        lastPhoneNumberChangedAt:
          type === VerificationType.PHONE_REGISTRATION ? null : new Date(),
        pendingPhone: null,
        phoneNumber: targetValue,
      },
      select: {
        id: true,
        phoneNumber: true,
        isPhoneVerified: true,
        pendingPhone: true,
      },
    });
    await tx.identifierVerification.update({
      where: {
        id: record.id,
      },
      data: {
        verifiedAt: now,
        attempts,
      },
    });
    return updatedIdentity;
  });
  return result;
};

export const resendVerificationOtpOnEmail = async (identity) => {
  const allowedStatuses = [IdentityStatus.PROVISIONING, IdentityStatus.ACTIVE];

  if (!allowedStatuses.includes(identity.status)) {
    throw new ForbiddenError(
      "Verification is not allowed.",
      `Identity status ${identity.status} cannot perform this operation.`,
      "IDENTITY_STATUS_NOT_ALLOWED",
    );
  }
  if (
    (identity.pendingEmail && !identity.isEmailVerified) ||
    (identity.isEmailVerified && !identity.pendingEmail)
  ) {
    throw new BadRequestError(
      "No pending email for verification.",
      "No pending email for verification",
      "NO_VERIFICATION_PENDING_EMAIL",
    );
  }

  let type = "";
  if (!identity.pendingEmail && !identity.isEmailVerified) {
    type = VerificationType.EMAIL_REGISTRATION;
  }

  if (identity.isEmailVerified || identity.pendingEmail) {
    type = VerificationType.EMAIL_CHANGE;
  }
  const targetValue =
    type === VerificationType.EMAIL_REGISTRATION
      ? identity.email
      : identity.pendingEmail;
  const now = new Date();
  const { otp, resetOtpHash, expiryAt } = generateOtpWithResetHash();
  await prisma.$transaction(async (tx) => {
    await tx.identifierVerification.updateMany({
      where: {
        identityId: identity.id,
        targetValue,
        type,
        verifiedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
    await tx.identifierVerification.create({
      data: {
        identityId: identity.id,
        type,
        targetValue,
        tokenHash: resetOtpHash,
        expiresAt: expiryAt,
      },
    });
  });
  const isOtpSentToEmail = await mailSender({
    to: targetValue,
    subject: "Email verification",
    html: emailVerificationOtpTemplate({
      firstName: identity.firstName,
      otp: otp,
      expiryMinutes: appConfig.emailVerificationOtpExpiryMinutes,
    }),
  });
  return {
    identityId: identity.id,
    isOtpSentToEmail,
    isEmailVerified: identity.isEmailVerified,
    pendingEmail: targetValue,
  };
};

export const resendVerficationCodeOnPhone = async (identity) => {
  const allowedStatuses = [IdentityStatus.PROVISIONING, IdentityStatus.ACTIVE];

  if (!allowedStatuses.includes(identity.status)) {
    throw new ForbiddenError(
      "Verification is not allowed.",
      `Identity status ${identity.status} cannot perform this operation.`,
      "IDENTITY_STATUS_NOT_ALLOWED",
    );
  }
  if (
    (identity.pendingPhone && !identity.isPhoneVerified) ||
    (identity.isPhoneVerified && !identity.pendingPhone)
  ) {
    throw new BadRequestError(
      "No pending phone number for verification.",
      "No pending phone number for verification",
      "NO_VERIFICATION_PENDING_PHONE",
    );
  }

  let type = "";
  if (!identity.pendingPhone && !identity.isPhoneVerified) {
    type = VerificationType.PHONE_REGISTRATION;
  }

  if (identity.isPhoneVerified || identity.pendingPhone) {
    type = VerificationType.PHONE_CHANGE;
  }
  const targetValue =
    type === VerificationType.PHONE_REGISTRATION
      ? identity.phoneNumber
      : identity.pendingPhone;
  const now = new Date();
  const { otp, resetOtpHash, expiryAt } = generateOtpWithResetHash();
  await prisma.$transaction(async (tx) => {
    await tx.identifierVerification.updateMany({
      where: {
        identityId: identity.id,
        targetValue,
        type,
        verifiedAt: null,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
      },
    });
    await tx.identifierVerification.create({
      data: {
        identityId: identity.id,
        type,
        targetValue,
        tokenHash: resetOtpHash,
        expiresAt: expiryAt,
      },
    });
  });
  const isOtpSentToPhoneNumber = await mailSender({
    to: targetValue,
    subject: "Phone number verification",
    html: emailVerificationOtpTemplate({
      firstName: identity.firstName,
      otp: otp,
      expiryMinutes: appConfig.emailVerificationOtpExpiryMinutes,
    }),
  });
  return {
    identityId: identity.id,
    isOtpSentToPhoneNumber,
    isPhoneVerified: identity.isPhoneVerified,
    pendingPhone: targetValue,
  };
};
