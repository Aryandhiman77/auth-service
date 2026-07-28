import logger from "../utils/logger.js";
import { PrismaClientKnownRequestError } from "../../generated/prisma/runtime/client.js";
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message;

  if (err?.code === "LIMIT_FILE_COUNT") {
    return res.status(409).json({
      success: false,
      message: `Cannot upload more than 10 files.`,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File size too large.",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
  logger.error(err.stack);
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      // Extract the field that failed the unique constraint
      const target =
        err.meta.driverAdapterError.cause.constraint.fields.toString();
      return res.status(statusCode).json({
        success: false,
        message: `A record with this ${target ? `'${target}'` : "identity"} already exists.`,
        errors: err.errors || [],
        errorCode: err.code,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  }
  if (err.code === "P2025") {
    return res.status(statusCode).json({
      success: false,
      message: `Failed to update record.`,
      errors: err.errors || [],
      errorCode: err.code,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    errorCode: err.errorCode,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
export default errorHandler;
