import Joi from "joi";

export const createBookmarkSchema = Joi.object({
  problemId: Joi.string().uuid().required().messages({
    "string.empty": "Problem ID is required",
    "string.uuid": "Invalid problem ID format",
  }),
  notes: Joi.string().max(500).allow("").messages({
    "string.max": "Notes cannot exceed 500 characters",
  }),
  tags: Joi.array().items(Joi.string().max(50)).max(10).default([]).messages({
    "array.max": "Cannot add more than 10 tags",
  }),
});

export const updateBookmarkSchema = Joi.object({
  notes: Joi.string().max(500).allow("").messages({
    "string.max": "Notes cannot exceed 500 characters",
  }),
  tags: Joi.array().items(Joi.string().max(50)).max(10).messages({
    "array.max": "Cannot add more than 10 tags",
  }),
}).min(1);

export const bookmarkQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  tags: Joi.string().allow(""),
  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD"),
  search: Joi.string().max(100).allow(""),
});

export const bookmarkIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});
