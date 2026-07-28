import { ForbiddenError } from "../helpers/apiError.js";
import asyncHandler from "../helpers/asyncHandler.js";

export const checkPermission = (requiredPermissions = []) => {
  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  return asyncHandler(async (req, res, next) => {
    const identity = req.identity;

    if (!identity) {
      throw new ForbiddenError(
        "Identity context is missing.",
        "Authentication context not found.",
        "IDENTITY_CONTEXT_MISSING",
      );
    }

    const userPermissions = Array.isArray(identity.permissionCodes)
      ? identity.permissionCodes
      : Array.isArray(identity.permissions)
        ? identity.permissions.map((permission) => permission.code)
        : [];

    const hasAllPermissions = required.every((permissionCode) =>
      userPermissions.includes(permissionCode),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenError(
        "Access denied.",
        "You do not have the required permission.",
        "ACCESS_DENIED",
      );
    }

    return next();
  });
};
