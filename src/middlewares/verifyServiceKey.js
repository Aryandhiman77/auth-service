import JWT from "jsonwebtoken";
import asyncHandler from "../helpers/asyncHandler.js";
import { BadRequestError, UnauthorizedError } from "../helpers/apiError.js";
import { PUBLIC_KEY } from "../configs/loadKeys.js";

export const verifyServiceKey = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; //BEARER TOKEN
  if (!token) {
    throw new UnauthorizedError(
      "token missing",
      "token missing",
      "TOKEN_MISSING",
    );
  }
  let decoded;
  try {
    decoded = JWT.verify(token, PUBLIC_KEY, {
      algorithms: ["RS256"],
      issuer: "identity-service",
      audience: process.env.SERVICE_NAME,
    });
    if (decoded.service_id !== process.env.SERVICE_ID) {
      throw new UnauthorizedError(
        "Invalid service id",
        "invalid service id",
        "INVALID_SERVICE_ID",
      );
    }
    next();
  } catch (err) {
    console.log(err);
    if (err.name === "TokenExpiredError") {
      throw new UnauthorizedError(
        "Authorization token expired.",
        "invalid expired",
        "TOKEN_EXPIRED",
      );
    }
    throw new UnauthorizedError(
      "Invalid authorization token.",
      "invalid token",
      "TOKEN_INVALID",
    );
  }
});


