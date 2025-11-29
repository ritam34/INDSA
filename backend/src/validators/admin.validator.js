import Joi from 'joi';

export const updateUserRoleSchema = Joi.object({
  role: Joi.string()
    .valid('USER', 'MODERATOR', 'ADMIN')
    .required()
    .messages({
      'any.only': 'Role must be USER, MODERATOR, or ADMIN',
      'any.required': 'Role is required'
    })
});

export const updateUserStatusSchema = Joi.object({
  isActive: Joi.boolean()
    .required()
    .messages({
      'any.required': 'isActive status is required'
    }),
  reason: Joi.string()
    .min(10)
    .max(500)
    .optional()
    .messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 500 characters'
    })
});

export const banUserSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Ban reason is required',
      'string.min': 'Reason must be at least 10 characters'
    }),
  duration: Joi.number()
    .integer()
    .min(1)
    .max(365)
    .optional()
    .messages({
      'number.min': 'Duration must be at least 1 day',
      'number.max': 'Duration cannot exceed 365 days'
    }),
  permanent: Joi.boolean()
    .default(false)
});

export const moderateContentSchema = Joi.object({
  action: Joi.string()
    .valid('APPROVE', 'REJECT', 'FLAG', 'DELETE')
    .required()
    .messages({
      'any.only': 'Action must be APPROVE, REJECT, FLAG, or DELETE'
    }),
  reason: Joi.string()
    .min(10)
    .max(500)
    .optional()
});

export const userIdSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required()
});

export const contentIdSchema = Joi.object({
  contentId: Joi.string()
    .uuid()
    .required()
});

export const statsDateRangeSchema = Joi.object({
  startDate: Joi.date()
    .optional(),
  endDate: Joi.date()
    .optional()
    .greater(Joi.ref('startDate'))
    .messages({
      'date.greater': 'End date must be after start date'
    }),
  period: Joi.string()
    .valid('day', 'week', 'month', 'year', 'all')
    .default('month')
});