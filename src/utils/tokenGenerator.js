import jwt from "jsonwebtoken";
import crypto from "crypto";
import { appConfig, JWT_TOKEN } from "../configs/app.config.js";

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
