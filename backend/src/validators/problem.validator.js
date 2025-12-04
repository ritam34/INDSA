import Joi from "joi";

export const createProblemSchema = Joi.object({
  title: Joi.string().min(3).max(200).required().messages({
    "string.empty": "Title is required",
    "string.min": "Title must be at least 3 characters long",
    "string.max": "Title cannot exceed 200 characters",
  }),

  description: Joi.string().min(10).required().messages({
    "string.empty": "Description is required",
    "string.min": "Description must be at least 10 characters long",
  }),

  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD").required().messages({
    "any.only": "Difficulty must be EASY, MEDIUM, or HARD",
  }),

  tags: Joi.array().items(Joi.string()).min(1).required().messages({
    "array.min": "At least one tag is required",
  }),

  examples: Joi.array()
    .items(
      Joi.object({
        input: Joi.string().required(),
        output: Joi.string().required(),
        explanation: Joi.string().allow(""),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one example is required",
    }),

  constraints: Joi.string().required().messages({
    "string.empty": "Constraints are required",
  }),

  hints: Joi.string().allow(""),

  editorial: Joi.string().allow(""),

  testCases: Joi.array()
    .items(
      Joi.object({
        input: Joi.string().required(),
        output: Joi.string().required(),
        explanation: Joi.string().allow(""),
        isPublic: Joi.boolean().default(false),
        order: Joi.number().integer().min(1).required(),
      }),
    )
    .min(3)
    .required()
    .messages({
      "array.min": "At least 3 test cases are required",
    }),

  codeSnippets: Joi.array()
    .items(
      Joi.object({
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
        code: Joi.string().required(),
      }),
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one code snippet is required",
    }),

  referenceSolutions: Joi.array()
    .items(
      Joi.object({
        language: Joi.string().required(),
        code: Joi.string().required(),
        explanation: Joi.string().allow(""),
        complexity: Joi.object({
          time: Joi.string(),
          space: Joi.string(),
        }).allow(null),
      }),
    )
    .default([]),

  isPublic: Joi.boolean().default(false),
  isPremium: Joi.boolean().default(false),
  status: Joi.string().valid("DRAFT", "PUBLISHED", "ARCHIVED").default("DRAFT"),

  validateTests: Joi.boolean().default(true),
});

export const updateProblemSchema = Joi.object({
  title: Joi.string().min(3).max(200),
  description: Joi.string().min(10),
  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD"),
  tags: Joi.array().items(Joi.string()).min(1),
  examples: Joi.array().items(
    Joi.object({
      input: Joi.string().required(),
      output: Joi.string().required(),
      explanation: Joi.string().allow(""),
    }),
  ),
  constraints: Joi.string(),
  hints: Joi.string().allow(""),
  editorial: Joi.string().allow(""),
  isPublic: Joi.boolean(),
  isPremium: Joi.boolean(),
  status: Joi.string().valid("DRAFT", "PUBLISHED", "ARCHIVED"),
  validateTests: Joi.boolean().default(true),
}).min(1);

export const problemQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  difficulty: Joi.string().valid("EASY", "MEDIUM", "HARD"),
  tags: Joi.string(),
  status: Joi.string().valid("DRAFT", "PUBLISHED", "ARCHIVED"),
  search: Joi.string().max(100).allow(""),
  sortBy: Joi.string()
    .valid("title", "difficulty", "acceptance_rate", "created_at", "order")
    .default("order"),
  order: Joi.string().valid("asc", "desc").default("asc"),
});

export const problemSlugSchema = Joi.object({
  slug: Joi.string().required(),
});

export const problemIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const addTestCaseSchema = Joi.object({
  input: Joi.string().required(),
  output: Joi.string().required(),
  explanation: Joi.string().allow(""),
  isPublic: Joi.boolean().default(false),
  order: Joi.number().integer().min(1).required(),
  weight: Joi.number().integer().min(1).default(1),
});

export const addCodeSnippetSchema = Joi.object({
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
  code: Joi.string().required(),
});
