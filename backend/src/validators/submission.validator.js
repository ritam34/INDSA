import Joi from 'joi';

export const runCodeSchema = Joi.object({
  problemSlug: Joi.string().required(),
  sourceCode: Joi.string().required().messages({
    'string.empty': 'Source code is required'
  }),
  language: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'typescript')
    .required()
    .messages({
      'any.only': 'Invalid language'
    }),
  stdin: Joi.string().allow('').optional()
});

export const submitSolutionSchema = Joi.object({
  problemSlug: Joi.string().required(),
  sourceCode: Joi.string().required().messages({
    'string.empty': 'Source code is required'
  }),
  language: Joi.string()
    .valid('javascript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'typescript')
    .required()
    .messages({
      'any.only': 'Invalid language'
    })
});

export const submissionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(
    'ACCEPTED',
    'WRONG_ANSWER',
    'TIME_LIMIT_EXCEEDED',
    'MEMORY_LIMIT_EXCEEDED',
    'RUNTIME_ERROR',
    'COMPILE_ERROR',
    'PENDING',
    'JUDGING'
  ),
  language: Joi.string(),
  problemId: Joi.string().uuid()
});