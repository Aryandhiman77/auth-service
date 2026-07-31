import Joi from "joi";

const authConfig = {
  username: { minLength: 3, maxLength: 40 },
  password: { minLength: 8, maxLength: 20 },
};
const usernameValidation = Joi.string()
  .lowercase()
  .trim()
  .min(authConfig.username.minLength)
  .max(authConfig.username.maxLength)
  .pattern(/^[a-z0-9._]+$/)
  .label("username")
  .messages({
    "string.base": "username must be a string.",
    "string.empty": "username is required.",
    "any.required": "username is required.",
    "string.min": `username must contain at least ${authConfig.username.minLength} characters.`,
    "string.max": `username must contain no more than ${authConfig.username.maxLength} characters.`,
    "string.pattern.base":
      "username can contain only lowercase letters, numbers, dots and underscores.",
  });
const emailValidation = Joi.string()
  .email({
    minDomainSegments: 2,
    tlds: {
      allow: true,
    },
  })
  .lowercase()
  .trim()
  .max(254)
  .label("email")
  .messages({
    "string.base": "email must be a string.",
    "string.empty": "email is required.",
    "any.required": "email is required.",
    "string.email": "email must be a valid email address.",
    "string.max": "email must contain no more than 254 characters.",
  });
const phoneNumberValidation = Joi.string()
  .required()
  .trim()
  .pattern(/^\+?[1-9]\d{9,14}$/)
  .label("phoneNumber")
  .messages({
    "string.base": "phoneNumber must be a string.",
    "string.empty": "phoneNumber is required.",
    "any.required": "phoneNumber is required.",
    "string.pattern.base":
      "phoneNumber must be a valid phone number containing 10 to 15 digits.",
  });

export const registerUserValidations = Joi.object({
  firstName: Joi.string()
    .lowercase()
    .required()
    .trim()
    .min(2)
    .max(100)
    .label("name")
    .messages({
      "string.base": "identity name must be a string.",
      "string.empty": "identity name is required.",
      "any.required": "identity name is required.",
      "string.min": "identity name must contain at least 2 characters.",
      "string.max": "identity name must contain no more than 100 characters.",
    }),
  lastName: Joi.string()
    .lowercase()
    .required()
    .trim()
    .min(2)
    .max(100)
    .label("name")
    .messages({
      "string.base": "identity name must be a string.",
      "string.empty": "identity name is required.",
      "any.required": "identity name is required.",
      "string.min": "identity name must contain at least 2 characters.",
      "string.max": "identity name must contain no more than 100 characters.",
    }),
  username: usernameValidation.required(),
  email: emailValidation.required(),
  password: Joi.string()
    .required()
    .min(authConfig.password.minLength)
    .max(authConfig.password.maxLength)
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[0-9]/, "number")
    .pattern(/[^a-zA-Z0-9]/, "special character")
    .label("password")
    .messages({
      "string.base": "password must be a string.",
      "string.empty": "password is required.",
      "any.required": "password is required.",
      "string.min": `password must contain at least ${authConfig.password.minLength} characters.`,
      "string.max": `password must contain no more than ${authConfig.password.maxLength} characters.`,
      "string.pattern.name":
        "password must contain at least one uppercase letter, one lowercase letter, one number and one special character.",
    }),
  phoneNumber: phoneNumberValidation,
  gender: Joi.string()
    .trim()
    .uppercase()
    .valid("MALE", "FEMALE", "OTHER")
    .required()
    .label("gender")
    .messages({
      "string.base": "gender must be a string.",
      "string.empty": "gender is required.",
      "any.required": "gender is required.",
      "any.only": "gender must be MALE, FEMALE or OTHER.",
    }),
});

export const loginValidation = Joi.object({
  email: emailValidation,
  username: usernameValidation,
  password: Joi.string().required().label("password").messages({
    "string.base": "password must be a string.",
    "string.empty": "password is required.",
    "any.required": "password is required.",
  }),
})
  .or("username", "email")
  .messages({
    "object.missing":
      "Either username or email is required to reset your password.",
  });

export const forgotPasswordValidation = Joi.object({
  username: usernameValidation,
  email: emailValidation,
})
  .or("username", "email")
  .messages({
    "object.missing":
      "Either username or email is required to reset your password.",
  });

export const resetPasswordValidation = Joi.object({
  password: Joi.string()
    .required()
    .min(authConfig.password.minLength)
    .max(authConfig.password.maxLength)
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[0-9]/, "number")
    .pattern(/[^a-zA-Z0-9]/, "special character")
    .label("New password")
    .messages({
      "string.base": "New password must be a string.",
      "string.empty": "New password is required.",
      "any.required": "New password is required.",
      "string.min": `New password must contain at least ${authConfig.password.minLength} characters.`,
      "string.max": `New password must contain no more than ${authConfig.password.maxLength} characters.`,
      "string.pattern.name":
        "New password must contain at least one uppercase letter, one lowercase letter, one number and one special character.",
    }),
}).required();
export const changePasswordValidation = Joi.object({
  username: Joi.string().lowercase().trim().label("username").messages({
    "string.base": "username must be a string.",
    "string.empty": "username is required.",
  }),
  email: emailValidation,
  oldPassword: Joi.string().required().label("password").messages({
    "string.base": "password must be a string.",
    "string.empty": "password is required.",
    "any.required": "password is required.",
  }),
  newPassword: Joi.string()
    .required()
    .min(authConfig.password.minLength)
    .max(authConfig.password.maxLength)
    .pattern(/[a-z]/, "lowercase letter")
    .pattern(/[A-Z]/, "uppercase letter")
    .pattern(/[0-9]/, "number")
    .pattern(/[^a-zA-Z0-9]/, "special character")
    .label("New password")
    .messages({
      "string.base": "New password must be a string.",
      "string.empty": "New password is required.",
      "any.required": "New password is required.",
      "string.min": `New password must contain at least ${authConfig.password.minLength} characters.`,
      "string.max": `New password must contain no more than ${authConfig.password.maxLength} characters.`,
      "string.pattern.name":
        "New password must contain at least one uppercase letter, one lowercase letter, one number and one special character.",
    }),
})
  .or("username", "email")
  .messages({
    "object.missing":
      "Either username or email is required to change your password.",
  });
