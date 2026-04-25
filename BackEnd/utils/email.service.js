import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail", // Assuming standard SMTP, fallback to console if not set
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to, subject, text) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log("Mock Email Sent to:", to);
    console.log("Subject:", subject);
    console.log("Body:", text);
    return true; // Pretend it succeeded
  }

  try {
    await transporter.sendMail({
      from: `"TrustFund" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error("Failed to send email to", to, error);
    throw error;
  }
};
