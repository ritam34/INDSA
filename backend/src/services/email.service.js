import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { ApiError } from '../utils/apiError.js';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

export const sendVerificationEmail = async (email, fullName, token) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'InDSA'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to InDSA, ${fullName}! 🎉</h2>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Verify Email
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Welcome to InDSA, ${fullName}! 🎉
        
        Thank you for signing up. Please verify your email address by clicking the button below:
        ${verificationUrl}
        
        Or copy and paste this link in your browser:
        ${verificationUrl}
        
        This link will expire in 24 hours. If you didn't create an account, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`, { messageId: info.messageId });
    
    return true;
  } catch (error) {
    logger.error('Failed to send verification email', { error: error.message, email });
    throw new ApiError(500, 'Failed to send verification email');
  }
};

export const sendPasswordResetEmail = async (email, fullName, token) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'InDSA'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hi ${fullName},</p>
          <p>We received a request to reset your password. Click the button below to reset it:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #f44336; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Reset Password
            </a>
          </div>
          
          <p>Or copy and paste this link in your browser:</p>
          <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
          
          <p style="color: #999; font-size: 12px; margin-top: 30px;">
            This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
          </p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hi ${fullName},
        
        We received a request to reset your password. Click the button below to reset it:
        ${resetUrl}
        
        Or copy and paste this link in your browser:
        ${resetUrl}
        
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`, { messageId: info.messageId });
    
    return true;
  } catch (error) {
    logger.error('Failed to send password reset email', { error: error.message, email });
    throw new ApiError(500, 'Failed to send password reset email');
  }
};

export const sendWelcomeEmail = async (email, fullName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'InDSA'}" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Welcome to InDSA!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome Aboard, ${fullName}! 🚀</h2>
          <p>Your email has been verified successfully. You're all set to start solving problems!</p>
          
          <h3>What's Next?</h3>
          <ul>
            <li>Browse our extensive problem library</li>
            <li>Join coding contests</li>
            <li>Track your progress</li>
            <li>Connect with other developers</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/problems" 
               style="background-color: #2196F3; color: white; padding: 14px 28px; 
                      text-decoration: none; border-radius: 4px; display: inline-block;">
              Start Solving Problems
            </a>
          </div>
          
          <p>Happy coding! 💻</p>
        </div>
      `,
      text: `
        Welcome Aboard, ${fullName}! 🚀
        
        Your email has been verified successfully. You're all set to start solving problems!
        
        What's Next?
        - Browse our extensive problem library
        - Join coding contests
        - Track your progress
        - Connect with other developers
        
        Start Solving Problems: ${process.env.FRONTEND_URL}/problems
        
        Happy coding! 💻
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Welcome email sent to ${email}`, { messageId: info.messageId });
    
    return true;
  } catch (error) {
    logger.error('Failed to send welcome email', { error: error.message, email });
    return false;
  }
};