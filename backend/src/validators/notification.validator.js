import Joi from 'joi';

export const getNotificationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  isRead: Joi.string().valid('true', 'false'),
  type: Joi.string().valid(
    'SUBMISSION',
    'DISCUSSION',
    'COMMENT',
    'CONTEST',
    'ACHIEVEMENT',
    'SYSTEM'
  )
});

export const updateSettingsSchema = Joi.object({
  emailOnSubmission: Joi.boolean(),
  emailOnDiscussionReply: Joi.boolean(),
  emailOnCommentReply: Joi.boolean(),
  emailOnContest: Joi.boolean(),
  emailOnAchievement: Joi.boolean(),
  emailOnSystemUpdate: Joi.boolean(),
  pushOnSubmission: Joi.boolean(),
  pushOnDiscussionReply: Joi.boolean(),
  pushOnCommentReply: Joi.boolean(),
  pushOnContest: Joi.boolean(),
  pushOnAchievement: Joi.boolean(),
  weeklyDigest: Joi.boolean(),
  marketingEmails: Joi.boolean()
}).min(1).messages({
  'object.min': 'At least one setting must be provided'
});