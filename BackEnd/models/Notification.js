import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // Storing PostgreSQL UUID as a string
      required: true,
      index: true, // Indexed for fast lookups by userId
    },
    type: {
      type: String,
      required: true,
      enum: ['DONATION_RECEIVED', 'MILESTONE_UPDATED', 'SYSTEM_ALERT'], // Example notification types
    },
    message: {
      type: String,
      required: true,
    },
    email_sent: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Flexible payload for extra unstructured data (e.g., campaignId, amount)
      default: {},
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
