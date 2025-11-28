import Joi from "joi";

export const createStudyPlanSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 5 characters long",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string().min(20).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 20 characters long",
  }),

  difficulty: Joi.string()
    .valid("BEGINNER", "INTERMEDIATE", "ADVANCED")
    .required()
    .messages({
      "any.only": "Difficulty must be BEGINNER, INTERMEDIATE, or ADVANCED",
    }),

  estimatedWeeks: Joi.number().integer().min(1).max(52).required().messages({
    "number.base": "Estimated weeks must be a number",
    "number.min": "Estimated weeks must be at least 1",
    "number.max": "Estimated weeks cannot exceed 52",
  }),

  category: Joi.string()
    .valid(
      "ALGORITHMS",
      "DATA_STRUCTURES",
      "INTERVIEW_PREP",
      "COMPANY_SPECIFIC",
      "TOPIC_SPECIFIC",
    )
    .required()
    .messages({
      "any.only": "Invalid category",
    }),

  prerequisites: Joi.array().items(Joi.string()).optional().default([]),

  tags: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one tag is required",
  }),

  isPremium: Joi.boolean().default(false),

  isPublic: Joi.boolean().default(true),

  problems: Joi.array()
    .items(
      Joi.object({
        problemId: Joi.string().uuid().required(),
        weekNumber: Joi.number().integer().min(1).required(),
        dayNumber: Joi.number().integer().min(1).max(7).required(),
        order: Joi.number().integer().min(1).required(),
        isOptional: Joi.boolean().default(false),
        notes: Joi.string().allow("").optional(),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one problem is required",
    }),
});

export const updateStudyPlanSchema = Joi.object({
  title: Joi.string().min(5).max(200).optional(),
  description: Joi.string().min(20).optional(),
  difficulty: Joi.string()
    .valid("BEGINNER", "INTERMEDIATE", "ADVANCED")
    .optional(),
  estimatedWeeks: Joi.number().integer().min(1).max(52).optional(),
  category: Joi.string()
    .valid(
      "ALGORITHMS",
      "DATA_STRUCTURES",
      "INTERVIEW_PREP",
      "COMPANY_SPECIFIC",
      "TOPIC_SPECIFIC",
    )
    .optional(),
  prerequisites: Joi.array().items(Joi.string()).optional(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPremium: Joi.boolean().optional(),
  isPublic: Joi.boolean().optional(),
});

export const studyPlanSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

export const studyPlanIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const problemIdSchema = Joi.object({
  problemId: Joi.string().uuid().required(),
});

export const enrollStudyPlanSchema = Joi.object({
  startDate: Joi.date()
    .optional()
    .default(() => new Date()),
});

export const completeProblemSchema = Joi.object({
  submissionId: Joi.string().uuid().optional(),
  notes: Joi.string().max(1000).allow("").optional(),
});
