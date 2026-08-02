import { prisma } from "../../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../helpers/apiError.js";
import crypto from "crypto";

export const verifyEmailService = async (identity, otp) => {
  const recordHash = crypto.createHash("sha256").update(otp).digest("hex");
  const record = await prisma.identifierVerification.findUnique({
    where: {
      identityId_targetValue: {
        identityId: identity.id,
        targetValue: identity.email,
      },
    },
    include: {
      identity: {
        select: {
          isEmailVerified: true,
        },
      },
    },
  });
  if (
    !record ||
    record.type === "PHONE_CHANGE" ||
    record.type === "PHONE_REGISTRATION"
  ) {
    throw new NotFoundError(
      "Verification record not found",
      "verification record not found",
      "VERIFICATION_RECORD_NOT_FOUND",
    );
  }
  if (record.identity.isEmailVerified) {
    throw new BadRequestError(
      "Email is already verified.",
      "Email already verified",
      "email already verified",
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
        identityId_targetValue: {
          identityId: identity.id,
          targetValue: identity.email,
        },
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
  // token is not expired and valid then mark email as verified and revoke the token
  const result = await prisma.$transaction(async (tx) => {
    const updatedIdentity = await tx.identity.update({
      where: { id: identity.id },
      data: {
        isEmailVerified: true,
      },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });
    await tx.identifierVerification.update({
      where: {
        identityId_targetValue: {
          identityId: identity.id,
          targetValue: identity.email,
        },
      },
      data: {
        revokedAt: now,
        verifiedAt: now,
      },
    });
    return updatedIdentity;
  });
  return result;
};

export const verifyPhoneNumberService = async (identity, otp) => {
  const recordHash = crypto.createHash("sha256").update(otp).digest("hex");
  const record = await prisma.identifierVerification.findUnique({
    where: {
      identityId_targetValue: {
        identityId: identity.id,
        targetValue: identity.phoneNumber,
      },
    },
    include: {
      identity: {
        select: {
          isPhoneVerified: true,
        },
      },
    },
  });
  if (
    !record ||
    record.type === "EMAIL_CHANGE" ||
    record.type === "EMAIL_REGISTRATION"
  ) {
    throw new NotFoundError(
      "Verification record not found",
      "verification record not found",
      "VERIFICATION_RECORD_NOT_FOUND",
    );
  }
  if (record.identity.isPhoneVerified) {
    throw new BadRequestError(
      "Phone number is already verified.",
      "Phone number already verified",
      "Phone number already verified",
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
        identityId_targetValue: {
          identityId: identity.id,
          targetValue: identity.phoneNumber,
        },
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
      },
      select: {
        id: true,
        phoneNumber: true,
        isPhoneVerified: true,
      },
    });
    await tx.identifierVerification.update({
      where: {
        identityId_targetValue: {
          identityId: identity.id,
          targetValue: identity.phoneNumber,
        },
      },
      data: {
        revokedAt: now,
        verifiedAt: now,
        attempts,
      },
    });
    return updatedIdentity;
  });
  return result;
};
