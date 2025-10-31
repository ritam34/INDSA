import Joi from 'joi';

export const createDiscussionSchema = Joi.object({
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
    .min(10)
    .required()
    .messages({
      'string.empty': 'Content is required',
      'string.min': 'Content must be at least 10 characters long'
    })
});

export const updateDiscussionSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  content: Joi.string().min(10)
}).min(1);

export const discussionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  sortBy: Joi.string()
    .valid('recent', 'popular', 'most_voted', 'most_viewed')
    .default('recent'),
  search: Joi.string().max(100).allow('')
});

export const createCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Comment content is required',
      'string.max': 'Comment cannot exceed 2000 characters'
    }),
  parentId: Joi.string().uuid().optional()
});

export const updateCommentSchema = Joi.object({
  content: Joi.string()
    .min(1)
    .max(2000)
    .required()
    .messages({
      'string.empty': 'Comment content is required',
      'string.max': 'Comment cannot exceed 2000 characters'
    })
});

export const voteSchema = Joi.object({
  value: Joi.number()
    .valid(1, -1)
    .required()
    .messages({
      'any.only': 'Vote value must be 1 (upvote) or -1 (downvote)'
    })
});

export const discussionIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});

export const commentIdSchema = Joi.object({
  id: Joi.string().uuid().required()
});