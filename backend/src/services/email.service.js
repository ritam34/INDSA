import nodemailer from "nodemailer";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async initialize() {
    if (this.initialized) return;

    try {
      this.transporter = this.createTransporter();

      await this.transporter.verify();
      this.initialized = true;
      logger.info("Email service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize email service", {
        error: error.message,
      });
    }
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.initialized) {
      logger.warn("Email service not initialized, skipping email send");
      return null;
    }

    try {
      const mailOptions = {
        from: `"${process.env.APP_NAME || "InDSA"}" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info("Email sent successfully", {
        to,
        subject,
        messageId: info.messageId,
      });

      return info;
    } catch (error) {
      logger.error("Failed to send email", {
        error: error.message,
        to,
        subject,
      });
      return null;
    }
  }

  async sendVerificationEmail(email, fullName, token) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

      const html = `
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
      `;

      const text = `
        Welcome to InDSA, ${fullName}! 
        
        Thank you for signing up. Please verify your email address by visiting:
        ${verificationUrl}
        
        This link will expire in 24 hours. If you didn't create an account, please ignore this email.
      `;

      const info = await this.sendEmail(
        email,
        "Verify Your Email Address",
        html,
        text,
      );

      if (info) {
        logger.info(`Verification email sent to ${email}`, {
          messageId: info.messageId,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to send verification email", {
        error: error.message,
        email,
      });
      throw new ApiError(500, "Failed to send verification email");
    }
  }

  async sendPasswordResetEmail(email, fullName, token) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

      const html = `
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
      `;

      const text = `
        Password Reset Request
        
        Hi ${fullName},
        
        We received a request to reset your password. Visit this link:
        ${resetUrl}
        
        This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
      `;

      const info = await this.sendEmail(
        email,
        "Reset Your Password",
        html,
        text,
      );

      if (info) {
        logger.info(`Password reset email sent to ${email}`, {
          messageId: info.messageId,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to send password reset email", {
        error: error.message,
        email,
      });
      throw new ApiError(500, "Failed to send password reset email");
    }
  }

  async sendWelcomeEmail(email, fullName) {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome Aboard, ${fullName}!</h2>
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
          
          <p>Happy coding! </p>
        </div>
      `;

      const text = `
        Welcome Aboard, ${fullName}! 
        
        Your email has been verified successfully. You're all set to start solving problems!
        
        What's Next?
        - Browse our extensive problem library
        - Join coding contests
        - Track your progress
        - Connect with other developers
        
        Start Solving Problems: ${process.env.FRONTEND_URL}/problems
        
        Happy coding! 
      `;

      const info = await this.sendEmail(email, "Welcome to InDSA!", html, text);

      if (info) {
        logger.info(`Welcome email sent to ${email}`, {
          messageId: info.messageId,
        });
        return true;
      }
      return false;
    } catch (error) {
      logger.error("Failed to send welcome email", {
        error: error.message,
        email,
      });
      return false;
    }
  }

  async sendBadgeEmail(user, badge) {
    try {
      const subject = `You earned a new badge: ${badge.name}!`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .badge-icon { font-size: 72px; text-align: center; margin: 20px 0; }
            .badge-name { font-size: 24px; font-weight: bold; text-align: center; color: #2563eb; }
            .badge-description { text-align: center; color: #666; margin: 10px 0; }
            .rarity { 
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
            .rarity-COMMON { background: #10b981; color: white; }
            .rarity-RARE { background: #3b82f6; color: white; }
            .rarity-EPIC { background: #8b5cf6; color: white; }
            .rarity-LEGENDARY { background: #f59e0b; color: white; }
            .points { font-size: 18px; color: #059669; font-weight: bold; }
            .cta-button {
              display: inline-block;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Congratulations, ${user.fullName}! </h1>
            <div class="badge-icon">${badge.icon}</div>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
            <p style="text-align: center; margin: 20px 0;">
              <span class="rarity rarity-${badge.rarity}">${badge.rarity}</span>
              <span class="points">+${badge.points} points</span>
            </p>
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/badges/${badge.slug}" class="cta-button">
                View Your Badge
              </a>
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 40px;">
              Keep up the great work! Check out your profile to see all your achievements.
            </p>
          </div>
        </body>
        </html>
      `;

      const text = `
        Congratulations, ${user.fullName}! 
        
        You've earned the "${badge.name}" badge!
        ${badge.description}
        
        Rarity: ${badge.rarity}
        Points: +${badge.points}
        
        View your badge: ${process.env.FRONTEND_URL}/badges/${badge.slug}
        
        Keep up the great work!
      `;

      return await this.sendEmail(user.email, subject, html, text);
    } catch (error) {
      logger.error("Failed to send badge email", { error: error.message });
      return null;
    }
  }

  async sendSubmissionEmail(user, submission, problem) {
    try {
      const isAccepted = submission.status === "ACCEPTED";
      const subject = isAccepted
        ? `Solution Accepted: ${problem.title}`
        : `Submission Failed: ${problem.title}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .status { font-size: 48px; text-align: center; margin: 20px 0; }
            .problem-title { font-size: 20px; font-weight: bold; color: #2563eb; }
            .stats { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .stat-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 10px 0;
              padding: 5px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .stat-row:last-child { border-bottom: none; }
            .cta-button {
              display: inline-block;
              padding: 12px 24px;
              background: #2563eb;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${isAccepted ? "Congratulations!" : "Keep Trying!"}</h1>
            <p class="problem-title">${problem.title}</p>
            <div class="stats">
              <div class="stat-row">
                <strong>Status:</strong>
                <span>${submission.status.replace(/_/g, " ")}</span>
              </div>
              <div class="stat-row">
                <strong>Tests Passed:</strong>
                <span>${submission.passedTests}/${submission.totalTests}</span>
              </div>
              ${
                submission.time
                  ? `
              <div class="stat-row">
                <strong>Runtime:</strong>
                <span>${submission.time}s</span>
              </div>
              `
                  : ""
              }
              ${
                submission.memory
                  ? `
              <div class="stat-row">
                <strong>Memory:</strong>
                <span>${submission.memory} KB</span>
              </div>
              `
                  : ""
              }
            </div>
            ${
              isAccepted
                ? `
              <p style="color: #059669; font-weight: bold;">
                Great job! Your solution passed all test cases.
              </p>
            `
                : `
              <p style="color: #dc2626;">
                Don't give up! Review the test cases and try again.
              </p>
            `
            }
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/submissions/${submission.id}" class="cta-button">
                View Submission Details
              </a>
            </p>
          </div>
        </body>
        </html>
      `;

      const text = `
        ${isAccepted ? "Congratulations!" : "Keep Trying!"}
        
        Problem: ${problem.title}
        Status: ${submission.status.replace(/_/g, " ")}
        Tests Passed: ${submission.passedTests}/${submission.totalTests}
        ${submission.time ? `Runtime: ${submission.time}s` : ""}
        ${submission.memory ? `Memory: ${submission.memory} KB` : ""}
        
        View details: ${process.env.FRONTEND_URL}/submissions/${submission.id}
      `;

      return await this.sendEmail(user.email, subject, html, text);
    } catch (error) {
      logger.error("Failed to send submission email", { error: error.message });
      return null;
    }
  }

  async sendContestReminderEmail(user, contest, minutesUntilStart) {
    try {
      const subject = `Contest "${contest.title}" starts in ${minutesUntilStart} minutes!`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .contest-icon { font-size: 72px; text-align: center; margin: 20px 0; }
            .countdown { 
              font-size: 36px; 
              font-weight: bold; 
              text-align: center; 
              color: #dc2626;
              margin: 20px 0;
            }
            .cta-button {
              display: inline-block;
              padding: 12px 24px;
              background: #dc2626;
              color: white;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="contest-icon">🏆</div>
            <h1>Contest Starting Soon!</h1>
            <h2>${contest.title}</h2>
            <div class="countdown">${minutesUntilStart} minutes</div>
            ${contest.description ? `<p>${contest.description}</p>` : ""}
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/contests/${contest.slug}" class="cta-button">
                Join Contest Now
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              Make sure you're ready. The contest starts in ${minutesUntilStart} minutes!
            </p>
          </div>
        </body>
        </html>
      `;

      const text = `
        Contest Starting Soon! 
        
        ${contest.title}
        Starts in: ${minutesUntilStart} minutes
        
        ${contest.description || ""}
        
        Join now: ${process.env.FRONTEND_URL}/contests/${contest.slug}
      `;

      return await this.sendEmail(user.email, subject, html, text);
    } catch (error) {
      logger.error("Failed to send contest reminder email", {
        error: error.message,
      });
      return null;
    }
  }

  async sendDiscussionReplyEmail(user, discussion, replierName, replyContent) {
    try {
      const subject = `${replierName} replied to your discussion`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Reply to Your Discussion</h2>
          <p>Hi ${user.fullName},</p>
          <p><strong>${replierName}</strong> replied to your discussion: "${discussion.title}"</p>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
            <p style="margin: 0;">${replyContent.substring(0, 200)}${replyContent.length > 200 ? "..." : ""}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/discussions/${discussion.id}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Discussion
            </a>
          </div>
        </div>
      `;

      const text = `
        New Reply to Your Discussion
        
        Hi ${user.fullName},
        
        ${replierName} replied to your discussion: "${discussion.title}"
        
        ${replyContent.substring(0, 200)}${replyContent.length > 200 ? "..." : ""}
        
        View discussion: ${process.env.FRONTEND_URL}/discussions/${discussion.id}
      `;

      return await this.sendEmail(user.email, subject, html, text);
    } catch (error) {
      logger.error("Failed to send discussion reply email", {
        error: error.message,
      });
      return null;
    }
  }

  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

const emailService = new EmailService();
export default emailService;

export const sendVerificationEmail = (email, fullName, token) =>
  emailService.sendVerificationEmail(email, fullName, token);

export const sendPasswordResetEmail = (email, fullName, token) =>
  emailService.sendPasswordResetEmail(email, fullName, token);

export const sendWelcomeEmail = (email, fullName) =>
  emailService.sendWelcomeEmail(email, fullName);