import unlinkFiles from "../utils/fileUnlinker.js";
import { ApiError } from "./apiError.js";

const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.validateAsync(req.body, {
        abortEarly: false,
      });
      req.data = validatedData;
      next();
    } catch (error) {
      if (req.files) {
        unlinkFiles(req.files);
      }
      if (req.file) {
        unlinkFiles(req.file);
      }
      res.status(400).json(
        new ApiError(
          400,
          "Validation failed.",
          error.details.map((err) => ({
            message: err.message,
            label: err.context.label,
            key: err.context.key,
          })),
          "VALIDATION_FAILED",
        ),
      );
    }
  };
};

export default validate;
