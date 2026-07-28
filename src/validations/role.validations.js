import Joi from "joi";

export const createRoleValidation = Joi.object({
  code: Joi.string()
    .required()
    .trim()
    .uppercase()
    .min(3)
    .max(50)
    .pattern(/^[A-Z][A-Z0-9_]*$/)
    .label("code")
    .messages({
      "string.base": "role code must be a string.",
      "string.empty": "role code is required.",
      "any.required": "role code is required.",
      "string.min": "role code must contain at least 3 characters.",
      "string.max": "role code must contain no more than 50 characters.",
      "string.pattern.base":
        "role code must start with a letter and contain only uppercase letters, numbers and underscores.",
    }),

  name: Joi.string().required().trim().min(2).max(100).label("name").messages({
    "string.base": "role name must be a string.",
    "string.empty": "role name is required.",
    "any.required": "role name is required.",
    "string.min": "role name must contain at least 2 characters.",
    "string.max": "role name must contain no more than 100 characters.",
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
    "any.required": "Role data is required.",
  });

export const updateRoleDetails = Joi.object({
  name: Joi.string().required().trim().min(2).max(100).label("name").messages({
    "string.base": "role name must be a string.",
    "string.empty": "role name is required.",
    "any.required": "role name is required.",
    "string.min": "role name must contain at least 2 characters.",
    "string.max": "role name must contain no more than 100 characters.",
  }),

  description: Joi.string()
    .trim()
    .max(500)
    .allow("", null)
    .required()
    .label("description")
    .messages({
      "string.base": "description must be a string.",
      "string.max": "description must contain no more than 500 characters.",
      "any.required": "description is requied.",
    }),
})
  .required()
  .messages({
    "any.required": "New Updation data is required",
  });
