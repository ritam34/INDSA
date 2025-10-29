import jwt from "jsonwebtoken";
import { ApiError } from "./apiError.js";

export const generateAccessToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
  } catch (error) {
    throw new ApiError(500, "Failed to generate access token");
  }
};

export const generateRefreshToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "30d",
    });
  } catch (error) {
    throw new ApiError(500, "Failed to generate refresh token");
  }
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Access token expired");
    }
    throw new ApiError(401, "Invalid access token");
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new ApiError(401, "Refresh token expired");
    }
    throw new ApiError(401, "Invalid refresh token");
  }
};

export const generateEmailVerificationToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
  } catch (error) {
    throw new ApiError(500, "Failed to generate verification token");
  }
};

export const generatePasswordResetToken = (payload) => {
  try {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  } catch (error) {
    throw new ApiError(500, "Failed to generate reset token");
  }
};

export const decodeToken = (token) => {
  return jwt.decode(token);
};
