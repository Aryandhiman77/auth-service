import { prisma } from "../../lib/prisma.js";
import { BadRequestError, NotFoundError } from "../helpers/apiError.js";
import crypto from "crypto";

export const verifyEmailService = async (identity, otp) => {
  const recordHash = crypto.createHash("sha256").update(otp).digest("hex");
  const record = await prisma.identifierVerification.findFirst({
    where: {
      identityId: identity.id,
      tokenHash: recordHash,
    },
    select: {
      id: true,
      type: true,
      expiresAt: true,
      revokedAt: true,
      attempts: true,
      maxAttempts: true,
    },
  });
  return record;
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
  const now = new Date();
  if (record.revokedAt) {
    throw new BadRequestError(
      "OTP already used.",
      "otp already used",
      "OTP_ALREADY_USED",
    );
  }

  if (record.expiresAt < now) {
    throw new BadRequestError("OTP expired.", "otp expired", "OTP_EXPIRED");
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
        AND: [{ identityId: identity.id }, { tokenHash: recordHash }],
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
  const record = await prisma.identifierVerification.findFirst({
    where: {
      identityId: identity.id,
      tokenHash: recordHash,
    },
    select: {
      tokenHash: true,
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
  const now = new Date();
  if (record.revokedAt < now || record.expiresAt < now) {
    throw new BadRequestError("OTP is expired", "otp expired", "OTP_EXPIRED");
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
      where: { identityId: identity.id, tokenHash: recordHash },
      data: {
        revokedAt: now,
        verifiedAt: now,
      },
    });
    return updatedIdentity;
  });
  return result;
};
