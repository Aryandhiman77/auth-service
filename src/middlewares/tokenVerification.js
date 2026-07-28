import asyncHandler from "../helpers/asyncHandler.js";
import JWT, { decode } from "jsonwebtoken";
import { NotFoundError, UnauthorizedError } from "../helpers/apiError.js";
import { JWT_TOKEN } from "../configs/app.config.js";
import { prisma } from "../../lib/prisma.js";
const tokenVerification = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.access_token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new UnauthorizedError("No authorization token provided.");
  }
  let decoded;
  try {
    decoded = JWT.verify(token, JWT_TOKEN.secret);
  } catch (err) {
    console.log(err);
    if (err.name === "TokenExpiredError") {
      throw new UnauthorizedError("Authorization token expired.");
    }
    throw new UnauthorizedError("Invalid authorization token.");
  }
  const identity = await prisma.identity.findUnique({
    where: {
      id: decoded.id,
      username: decoded.username,
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

  if (!identity || identity.deletedAt) {
    throw new NotFoundError(
      "User not found.",
      "Invalid credentials",
      "USER_NOT_FOUND",
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
  req.identity = mutatedIdentity;
  next();
});

export default tokenVerification;
