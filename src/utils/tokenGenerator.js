import jwt from "jsonwebtoken";
import crypto from "crypto";
import { appConfig, JWT_TOKEN } from "../configs/app.config.js";
import { generateOTP } from "./otpGenerator.js";

const JWT_SECRET = JWT_TOKEN.secret;
const JWT_EXPIRY = JWT_TOKEN.expiry;

export const generateAccessToken = (identity) => {
  return jwt.sign(
    {
      id: identity.id,
      username: identity.username,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRY,
    },
  );
};

export const generateRefreshToken = () => {
  const refreshToken = crypto.randomBytes(64).toString("hex");
  const expiry = new Date(
    Date.now() + appConfig.loginConfiguration.refreshTokenExpiryMs,
  );

  return { refreshToken, expiry };
};

export const generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString("hex");

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
  return { resetToken, resetHash, expiryAt };
};

export const generateOtpWithResetHash = () => {
  const otp = generateOTP();
  const resetOtpHash = crypto.createHash("sha256").update(otp).digest("hex");
  const expiryAt = new Date();
  expiryAt.setMinutes(
    expiryAt.getMinutes() + Number(appConfig.emailVerificationOtpExpiryMinutes),
  );
  return { otp, resetOtpHash, expiryAt };
};
