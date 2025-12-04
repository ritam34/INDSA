import Joi from "joi";

export const createPlaylistSchema = Joi.object({
  name: Joi.string().min(3).max(100).required().messages({
    "string.empty": "Playlist name is required",
    "string.min": "Playlist name must be at least 3 characters long",
    "string.max": "Playlist name cannot exceed 100 characters",
  }),

  description: Joi.string().max(500).required().messages({
    "string.empty": "Description is required",
    "string.max": "Description cannot exceed 500 characters",
  }),

  isPublic: Joi.boolean().default(true),
});

export const updatePlaylistSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  isPublic: Joi.boolean(),
}).min(1);

export const addProblemSchema = Joi.object({
  problemId: Joi.string().uuid().required(),
  notes: Joi.string().max(500).allow(""),
});

export const reorderProblemsSchema = Joi.object({
  problemOrders: Joi.array()
    .items(
      Joi.object({
        problemInPlaylistId: Joi.string().uuid().required(),
        order: Joi.number().integer().min(1).required(),
      }),
    )
    .min(1)
    .required(),
});

export const playlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  isPublic: Joi.boolean(),
  search: Joi.string().max(100).allow(""),
});

export const playlistIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const playlistSlugSchema = Joi.object({
  slug: Joi.string().required(),
});
