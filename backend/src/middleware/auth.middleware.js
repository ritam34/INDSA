import { verifyAccessToken } from "../utils/jwt.utils.js";
import { ApiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { prisma } from "../config/database.config.js";

export const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Access token required");
  }
  const token = authHeader.replace("Bearer ", "");

  const decoded = verifyAccessToken(token);

  const user = await prisma.user.findUnique({
    where: {
      id: decoded.id,
      deletedAt: null,
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatar: true,
      role: true,
      isEmailVerified: true,
      isPremium: true,
    },
  });

  if (!user) {
    throw new ApiError(401, "User not found or has been deleted");
  }
  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const decoded = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: {
          id: decoded.id,
          deletedAt: null,
        },
        select: {
          id: true,
          fullName: true,
          username: true,
          email: true,
          avatar: true,
          role: true,
          isEmailVerified: true,
          isPremium: true,
        },
      });

      if (user) {
        req.user = user;
      }
    }
  } catch (error) {}
  next();
});

export const requireEmailVerification = asyncHandler(async (req, res, next) => {
  if (!req.user.isEmailVerified) {
    throw new ApiError(403, "Please verify your email to access this resource");
  }
  next();
});