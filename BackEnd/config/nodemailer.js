import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587, // TLS port
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const mailOptions = (to, subject, text, html) => ({
  from: `"Trust Fund Team" <${process.env.SMTP_USER}>`,
  to,
  subject,
  text,
  html,
});
