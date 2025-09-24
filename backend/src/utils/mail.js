import Mailgen from "mailgen";
import Nodemailer from "nodemailer";

const sendMail = async (options) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "Task Manager",
      link: "https://mailgen.js/",
    },
  });
  // Generate an HTML email with the provided contents
  const emailHtmlBody = mailGenerator.generate(options.mailGenContent);

  // Generate the plaintext version of the e-mail (for clients that do not support HTML)
  const emailText = mailGenerator.generatePlaintext(options.mailGenContent);

  // Create a test account or replace with real credentials.
  const transporter = nodemailer.createTransport({
    host: process.env.MAILTRAP_SMTP_HOST,
    port: process.env.MAILTRAP_SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.MAILTRAP_SMTP_USER,
      pass: process.env.MAILTRAP_SMTP_PASSWORD,
    },
  });

  const mail = await transporter.sendMail({
    from: '"Ritam " <taskmanager@example.com>',
    to: options.email,
    subject: options.subject,
    text: emailText, // plain‑text body
    html: emailHtmlBody, // HTML body
  });

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    console.error("Email sending failed", err);
  }
};

//
const emailVerificationMailGenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro:
        "Welcome to TaskManagerApp! We're very excited to have you on board.",
      action: {
        instructions: "To get started with our App, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Verify Your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};
const forgotPasswordMailGenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "Request to change your password",
      action: {
        instructions: "To change password, please click here:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

// example
// sendMail({
//     email:user.email,
//     subject:"Subject",
//     mailGenContent:emailVerificationMailGenContent(
//         username,`http://google.com`
//     )
// })
