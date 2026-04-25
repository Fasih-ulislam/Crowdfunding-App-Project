import { Worker } from 'bullmq';
import nodemailer from 'nodemailer';
import redisConnection from '../config/redis.js';
import Notification from '../models/Notification.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configure NodeMailer transporter (using mock configuration for now)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const processJob = async (job) => {
  const { type, userId, message, metadata } = job.data;
  let emailSent = false;

  try {
    // 1. Fetch User Data from PostgreSQL
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found in PostgreSQL`);
    }

    // 2. Attempt to Send Email
    if (user.email) {
      await transporter.sendMail({
        from: '"TrustFund System" <noreply@trustfund.com>',
        to: user.email,
        subject: `Notification: ${type}`,
        text: message,
      });
      emailSent = true;
      console.log(`[Worker] Email successfully sent to ${user.email}`);
    }

  } catch (error) {
    console.error(`[Worker] Error sending email to user ${userId}:`, error.message);
    // We do NOT throw here if we still want to save the notification to MongoDB with email_sent: false.
    // If you want BullMQ to retry the entire job (including MongoDB save), uncomment the next line:
    // throw error; 
  }

  // 3. Save Unstructured Notification to MongoDB
  try {
    const newNotification = new Notification({
      userId,
      type,
      message,
      email_sent: emailSent,
      metadata,
    });

    await newNotification.save();
    console.log(`[Worker] Notification saved to MongoDB for user ${userId} (email_sent: ${emailSent})`);
  } catch (mongoError) {
    console.error(`[Worker] Failed to save notification to MongoDB for user ${userId}:`, mongoError);
    throw mongoError; // If Mongo fails, we want the job to retry
  }
};

// Initialize the Worker to listen to 'notificationQueue'
export const notificationWorker = new Worker('notificationQueue', processJob, {
  connection: redisConnection,
});

notificationWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job.id} failed with error: ${err.message}`);
});
