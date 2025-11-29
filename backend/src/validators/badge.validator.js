import Joi from "joi";

export const createBadgeSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Badge name is required",
    "string.min": "Badge name must be at least 3 characters",
    "string.max": "Badge name cannot exceed 100 characters",
  }),

  slug: Joi.string()
    .min(3)
    .max(100)
    .pattern(/^[a-z0-9-]+$/)
    .messages({
      "string.pattern.base":
        "Slug must contain only lowercase letters, numbers, and hyphens",
    }),

  description: Joi.string().min(10).max(500).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 10 characters",
    "string.max": "Description cannot exceed 500 characters",
  }),

  icon: Joi.string().required().messages({
    "string.empty": "Icon is required",
  }),

  type: Joi.string()
    .valid(
      "PROBLEM_SOLVING",
      "STREAK",
      "CONTEST",
      "COMMUNITY",
      "SPECIAL",
      "MILESTONE",
    )
    .required()
    .messages({
      "any.only": "Invalid badge type",
      "string.empty": "Type is required",
    }),

  rarity: Joi.string()
    .valid("COMMON", "RARE", "EPIC", "LEGENDARY")
    .required()
    .messages({
      "any.only": "Invalid badge rarity",
      "string.empty": "Rarity is required",
    }),

  points: Joi.number().integer().min(0).default(0),

  criteria: Joi.object({
    totalProblems: Joi.number().integer().min(1),
    easyProblems: Joi.number().integer().min(1),
    mediumProblems: Joi.number().integer().min(1),
    hardProblems: Joi.number().integer().min(1),

    streakDays: Joi.number().integer().min(1),
    maxStreak: Joi.number().integer().min(1),

    contestsParticipated: Joi.number().integer().min(1),
    contestWins: Joi.number().integer().min(1),
    topRankings: Joi.number().integer().min(1),

    discussionsCreated: Joi.number().integer().min(1),
    solutionsShared: Joi.number().integer().min(1),
    helpfulVotes: Joi.number().integer().min(1),

    customCheck: Joi.string(),
  })
    .min(1)
    .required()
    .messages({
      "object.min": "At least one criteria must be specified",
      "object.base": "Criteria must be an object",
    }),

  isActive: Joi.boolean().default(true),
});

export const updateBadgeSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  slug: Joi.string()
    .min(3)
    .max(100)
    .pattern(/^[a-z0-9-]+$/),
  description: Joi.string().min(10).max(500),
  icon: Joi.string(),
  type: Joi.string().valid(
    "PROBLEM_SOLVING",
    "STREAK",
    "CONTEST",
    "COMMUNITY",
    "SPECIAL",
    "MILESTONE",
  ),
  rarity: Joi.string().valid("COMMON", "RARE", "EPIC", "LEGENDARY"),
  points: Joi.number().integer().min(0),
  criteria: Joi.object({
    totalProblems: Joi.number().integer().min(1),
    easyProblems: Joi.number().integer().min(1),
    mediumProblems: Joi.number().integer().min(1),
    hardProblems: Joi.number().integer().min(1),
    streakDays: Joi.number().integer().min(1),
    maxStreak: Joi.number().integer().min(1),
    contestsParticipated: Joi.number().integer().min(1),
    contestWins: Joi.number().integer().min(1),
    topRankings: Joi.number().integer().min(1),
    discussionsCreated: Joi.number().integer().min(1),
    solutionsShared: Joi.number().integer().min(1),
    helpfulVotes: Joi.number().integer().min(1),
    customCheck: Joi.string(),
  }),
  isActive: Joi.boolean(),
}).min(1);

export const getBadgesQuerySchema = Joi.object({
  type: Joi.string().valid(
    "PROBLEM_SOLVING",
    "STREAK",
    "CONTEST",
    "COMMUNITY",
    "SPECIAL",
    "MILESTONE",
  ),
  rarity: Joi.string().valid("COMMON", "RARE", "EPIC", "LEGENDARY"),
  isActive: Joi.string().valid("true", "false"),
  includeProgress: Joi.string().valid("true", "false"),
});

export const leaderboardQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
});
