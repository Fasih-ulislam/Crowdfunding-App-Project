import { Queue } from 'bullmq';
import redisConnection from '../config/redis.js';

// Create a new queue for notifications
export const notificationQueue = new Queue('notificationQueue', {
  connection: redisConnection,
});

/**
 * Pushes a new job to the notification queue.
 * @param {string} jobName
 * @param {object} payload
 */
export const queueNotificationJob = async (jobName, payload) => {
  try {
    await notificationQueue.add(jobName, payload, {
      removeOnComplete: true, // remove successful jobs
      removeOnFail: false, // keep failed jobs for inspection
      attempts: 3, // retry 3 times on failure
      backoff: {
        type: 'exponential',
        delay: 3000, // first delay is 3 seconds
      },
    });
    console.log(`[Queue] Job '${jobName}' added successfully for user ${payload.userId}`);
  } catch (error) {
    console.error(`[Queue] Failed to add job '${jobName}':`, error);
  }
};
