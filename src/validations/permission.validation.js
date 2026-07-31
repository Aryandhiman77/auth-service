import Joi from "joi";
export const createPermissionValidation = Joi.object({
  module: Joi.string()
    .required()
    .trim()
    .uppercase()
    .min(3)
    .max(15)
    .pattern(/^[A-Z][A-Z0-9_]*$/)
    .label("module")
    .messages({
      "string.base": "permission module must be a string.",
      "string.empty": "permission module is required.",
      "any.required": "permission code is required.",
      "string.min": "permission code must contain at least 3 characters.",
      "string.max": "permission code must contain no more than 15 characters.",
      "string.pattern.base":
        "permission code must start with a letter and contain only uppercase letters, numbers and underscores.",
    }),
  action: Joi.string()
    .required()
    .trim()
    .uppercase()
    .min(3)
    .max(25)
    .pattern(/^[A-Z][A-Z0-9_]*$/)
    .label("action")
    .messages({
      "string.base": "permission action must be a string.",
      "string.empty": "permission action is required.",
      "any.required": "permission action is required.",
      "string.min": "permission action must contain at least 3 characters.",
      "string.max":
        "permission action must contain no more than 25 characters.",
      "string.pattern.base":
        "permission action must start with a letter and contain only uppercase letters, numbers and underscores.",
    }),
  name: Joi.string()
    .lowercase()
    .required()
    .trim()
    .min(2)
    .max(100)
    .label("name")
    .messages({
      "string.base": "permission name must be a string.",
      "string.empty": "permission name is required.",
      "any.required": "permission name is required.",
      "string.min": "permission name must contain at least 2 characters.",
      "string.max": "permission name must contain no more than 100 characters.",
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .allow("", null)
    .optional()
    .label("description")
    .messages({
      "string.base": "description must be a string.",
      "string.max": "description must contain no more than 500 characters.",
    }),
})
  .required()
  .messages({
    "any.required": "Permission creation data is required.",
  });
