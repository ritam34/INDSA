import { prisma } from '../config/database.config.js';
import { ApiError } from '../utils/apiError.js';
import { hashPassword, comparePassword } from '../utils/password.utils.js';
import { 
  generateAccessToken, 
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyRefreshToken
} from '../utils/jwt.utils.js';
import { 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendWelcomeEmail 
} from './email.service.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

export const signup = async (userData) => {
  const { fullName, username, email, password } = userData;

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ],
      deletedAt: null
    }
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new ApiError(409, 'Email already registered');
    }
    if (existingUser.username === username) {
      throw new ApiError(409, 'Username already taken');
    }
  }

  const hashedPassword = await hashPassword(password);

  const verificationToken = generateEmailVerificationToken({ email });
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await prisma.user.create({
    data: {
      fullName,
      username,
      email,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry,
      stats: {
        create: {} 
      }
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      avatar: true,
      role: true,
      isEmailVerified: true,
      createdAt: true
    }
  });

  sendVerificationEmail(email, fullName, verificationToken).catch(err => {
    logger.error('Failed to send verification email', { error: err.message });
  });

  logger.info('User signed up', { userId: user.id, email });

  return {
    user,
    message: 'Signup successful! Please check your email to verify your account.'
  };
};

export const login = async (credentials) => {
  const { email, password } = credentials;

  const user = await prisma.user.findUnique({
    where: { 
      email,
      deletedAt: null 
    },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      password: true,
      avatar: true,
      role: true,
      isEmailVerified: true,
      isPremium: true
    }
  });

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const accessToken = generateAccessToken({ 
    id: user.id, 
    email: user.email,
    role: user.role 
  });
  
  const refreshToken = generateRefreshToken({ 
    id: user.id 
  });

  const refreshTokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken,
      refreshTokenExpiry
    }
  });

  const { password: _, ...userWithoutPassword } = user;

  logger.info('User logged in', { userId: user.id, email });

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken
  };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(401, 'Refresh token required');
  }

  const decoded = verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where: { 
      id: decoded.id,
      deletedAt: null 
    },
    select: {
      id: true,
      email: true,
      role: true,
      refreshToken: true,
      refreshTokenExpiry: true
    }
  });

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  if (new Date() > user.refreshTokenExpiry) {
    throw new ApiError(401, 'Refresh token expired');
  }

  const accessToken = generateAccessToken({ 
    id: user.id, 
    email: user.email,
    role: user.role 
  });

  logger.info('Access token refreshed', { userId: user.id });

  return { accessToken };
};

export const verifyEmail = async (token) => {
  if (!token) {
    throw new ApiError(400, 'Verification token required');
  }

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      deletedAt: null
    }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid verification token');
  }

  if (new Date() > user.emailVerificationTokenExpiry) {
    throw new ApiError(400, 'Verification token expired');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email already verified');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpiry: null
    }
  });

  sendWelcomeEmail(user.email, user.fullName).catch(err => {
    logger.error('Failed to send welcome email', { error: err.message });
  });

  logger.info('Email verified', { userId: user.id, email: user.email });

  return { message: 'Email verified successfully!' };
};

export const resendVerificationEmail = async (email) => {
  const user = await prisma.user.findUnique({
    where: { 
      email,
      deletedAt: null 
    }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.isEmailVerified) {
    throw new ApiError(400, 'Email already verified');
  }

  const verificationToken = generateEmailVerificationToken({ email });
  const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiry: verificationTokenExpiry
    }
  });

  await sendVerificationEmail(email, user.fullName, verificationToken);

  logger.info('Verification email resent', { userId: user.id, email });

  return { message: 'Verification email sent!' };
};

export const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { 
      email,
      deletedAt: null 
    }
  });

  if (!user) {
    return { message: 'If an account exists, a password reset link has been sent.' };
  }

  const resetToken = generatePasswordResetToken({ email });
  const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: {
      forgotPasswordToken: resetToken,
      forgotPasswordTokenExpiry: resetTokenExpiry
    }
  });

  await sendPasswordResetEmail(email, user.fullName, resetToken);

  logger.info('Password reset requested', { userId: user.id, email });

  return { message: 'If an account exists, a password reset link has been sent.' };
};

export const resetPassword = async (token, newPassword) => {
  if (!token) {
    throw new ApiError(400, 'Reset token required');
  }

  const user = await prisma.user.findFirst({
    where: {
      forgotPasswordToken: token,
      deletedAt: null
    }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired reset token');
  }

  if (new Date() > user.forgotPasswordTokenExpiry) {
    throw new ApiError(400, 'Reset token expired');
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      forgotPasswordToken: null,
      forgotPasswordTokenExpiry: null
    }
  });

  logger.info('Password reset successful', { userId: user.id, email: user.email });

  return { message: 'Password reset successful!' };
};

export const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken: null,
      refreshTokenExpiry: null
    }
  });

  logger.info('User logged out', { userId });

  return { message: 'Logged out successfully' };
};