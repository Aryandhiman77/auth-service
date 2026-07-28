export class ApiError extends Error {
  constructor(
    statusCode = 500,
    message = "Internal server error",
    errors = null,
    code = "INTERNAL_SERVER_ERROR",
  ) {
    super(message);
    this.statusCode = statusCode >= 400 ? statusCode : 500;
    this.errorCode = code;
    this.errors = errors;
  }
}
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", errors, code = "NOT_FOUND") {
    super(404, message, errors, code);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad Request", errors, code = "BAD_REQUEST") {
    super(400, message, errors, code);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", errors, code = "FORBIDDEN") {
    super(403, message, errors, code);
  }
}
export class ConflictError extends ApiError {
  constructor(message = "Forbidden", errors, code = "RESOURCE_CONFLICT") {
    super(409, message, errors, code);
  }
}
export class UnauthorizedError extends ApiError {
  // send when token is expired.
  constructor(message = "Unauthorized", errors, code = "UNAUTHORIZED") {
    super(401, message, errors, code);
  }
}

export class TooManyRequestsError extends ApiError {
  constructor(
    message = "Too Many Requests",
    errors = null,
    code = "TOO_MANY_REQUESTS",
  ) {
    super(429, message, errors, code);
  }
}
