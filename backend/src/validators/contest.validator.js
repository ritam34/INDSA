import Joi from "joi";

export const createContestSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 5 characters long",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string().max(2000).allow("").messages({
    "string.max": "Description cannot exceed 2000 characters",
  }),

  startTime: Joi.date().iso().greater("now").required().messages({
    "date.greater": "Start time must be in the future",
  }),

  duration: Joi.number().integer().min(30).max(480).required().messages({
    "number.min": "Duration must be at least 30 minutes",
    "number.max": "Duration cannot exceed 480 minutes (8 hours)",
  }),

  isPublic: Joi.boolean().default(true),
  isRated: Joi.boolean().default(true),

  problems: Joi.array()
    .items(
      Joi.object({
        problemId: Joi.string().uuid().required(),
        points: Joi.number().integer().min(100).max(5000).default(500),
        order: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      "array.min": "At least one problem is required",
      "array.max": "Cannot add more than 10 problems",
    }),
});

export const updateContestSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  description: Joi.string().max(2000).allow(""),
  startTime: Joi.date().iso().greater("now"),
  duration: Joi.number().integer().min(30).max(480),
  isPublic: Joi.boolean(),
  isRated: Joi.boolean(),
}).min(1);

export const contestQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  status: Joi.string().valid("upcoming", "ongoing", "past"),
  isPublic: Joi.boolean(),
});

export const contestIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const contestSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

export const addContestProblemSchema = Joi.object({
  problemId: Joi.string().uuid().required(),
  points: Joi.number().integer().min(100).max(5000).default(500),
  order: Joi.number().integer().min(1).required(),
});

export const contestSubmissionSchema = Joi.object({
  problemId: Joi.string().uuid().required(),
  sourceCode: Joi.string().required(),
  language: Joi.string()
    .valid(
      "javascript",
      "python",
      "java",
      "cpp",
      "c",
      "csharp",
      "go",
      "rust",
      "typescript",
    )
    .required(),
});
