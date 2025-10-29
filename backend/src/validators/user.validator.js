import Joi from 'joi';

export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),

  username: Joi.string()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_]+$/)
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 20 characters',
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores'
    }),

  bio: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': 'Bio cannot exceed 500 characters'
    }),

  location: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'Location cannot exceed 100 characters'
    }),

  website: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': 'Please provide a valid URL'
    }),

  github: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'GitHub username cannot exceed 100 characters'
    }),

  linkedin: Joi.string()
    .max(100)
    .allow('')
    .messages({
      'string.max': 'LinkedIn username cannot exceed 100 characters'
    })
}).min(1);

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),

  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.invalid': 'New password must be different from current password'
    })
});

export const usernameParamSchema = Joi.object({
  username: Joi.string()
    .required()
    .messages({
      'string.empty': 'Username is required'
    })
});

export const userQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),

  search: Joi.string()
    .max(100)
    .allow(''),

  sortBy: Joi.string()
    .valid('reputation', 'problems_solved', 'created_at', 'contest_rating')
    .default('reputation'),

  order: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
});