import dns from "dns";
import nodemailer from "nodemailer";
import logger from "../utils/logger.js";

dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false,
  family: 4,
  requireTLS: true,

  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },

  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 20000,
});

export default async function mailSender({ to, subject, html }) {
  try {
    const from = process.env.EMAIL_FROM;
    console.log(from);
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: from,
      subject,
      html,
    });
    console.log(`Mail sent to ${to} with id: ${info.messageId}`);
    logger.info(`Mail sent to ${to} with id: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(
      `Failed to send mail to ${to} due to error: ${error.message}`,
    );
    logger.info(`Failed to send mail to ${to} due to error: ${error.message}`);
    return false;
  }
}
