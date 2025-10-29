import { ApiError } from '../utils/apiError.js';

export const isAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Admin access required');
  }
  next();
};

export const isModerator = (req, res, next) => {
  if (req.user.role !== 'MODERATOR' && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'Moderator access required');
  }
  next();
};

export const isPremium = (req, res, next) => {
  if (!req.user.isPremium) {
    throw new ApiError(403, 'Premium membership required');
  }

  if (req.user.premiumExpiresAt && new Date() > req.user.premiumExpiresAt) {
    throw new ApiError(403, 'Premium membership expired');
  }

  next();
};

export const isOwner = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (req.user.id !== resourceUserId && req.user.role !== 'ADMIN') {
      throw new ApiError(403, 'You do not have permission to access this resource');
    }
    
    next();
  };
};