import Joi from 'joi';

export const createSolutionSchema = Joi.object({
  problemSlug: Joi.string().required(),
  title: Joi.string()
    .min(5)
    .max(200)
    .required()
    .messages({
      'string.empty': 'Title is required',
      'string.min': 'Title must be at least 5 characters long',
      'string.max': 'Title cannot exceed 200 characters'
    }),
  content: Joi.string()
    .min(50)
    .required()
    .messages({
      'string.empty': 'Content is required',
      'string.min': 'Content must be at least 50 characters long'
    }),
  language: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'typescript')
    .required()
    .messages({
      'any.only': 'Invalid language'
    }),
  code: Joi.string()
    .min(10)
    .required()
    .messages({
      'string.empty': 'Code is required',
      'string.min': 'Code must be at least 10 characters long'
    }),
  complexity: Joi.object({
    time: Joi.string().required(),
    space: Joi.string().required()
  }).optional()
});

export const updateSolutionSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  content: Joi.string().min(50),
  code: Joi.string().min(10),
  complexity: Joi.object({
    time: Joi.string(),
    space: Joi.string()
  })
}).min(1);

export const solutionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  language: Joi.string(),
  sortBy: Joi.string()
    .valid('recent', 'popular', 'most_voted')
    .default('most_voted')
});

export const solutionIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const voteSchema = Joi.object({
  value: Joi.number()
    .valid(1, -1)
    .required()
    .messages({
      'any.only': 'Vote value must be 1 (upvote) or -1 (downvote)'
    })
});