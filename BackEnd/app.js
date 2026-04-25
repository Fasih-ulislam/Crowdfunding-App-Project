import express from "express";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import campaignRoutes from "./routes/campaign.routes.js";
import milestoneRoutes from "./routes/milestone.routes.js";
import voteRoutes from "./routes/vote.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import path from "path";
import { fileURLToPath } from "url";
import errorHandler from "./middlewares/globalErrorHandler.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import paymentRoutes from "./routes/payment.routes.js";
import { handleStripeWebhook } from "./controllers/webhook.controller.js";

//Main server instance
const app = express();

// Stripe webhook route must come BEFORE express.json()
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    req.rawBody = req.body; // raw buffer
    next();
  },
  handleStripeWebhook,
);

/***************** MIDDLEWARES ****************/
//Data format - limit payload size to prevent DoS
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

//Security helmet
app.use(helmet());

//CORS --> Restrict to allowed origins in production
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:8080"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

//Allow cookies
app.use(cookieParser());
//uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/***************** ROUTING ****************/

// -------> Health Check <--------
app.get("/health-check", (req, res) => {
  res.status(200).json("OK");
});

// -------> Public Routes <--------
// Auth Routes (register, login, logout, verify-otp)
app.use("/api/auth", authRoutes);

// -------> Protected Routes <--------
// Each route file handles its own authentication via authenticateUser middleware
// User Routes
//app.use("/api/user", userRoutes);

// Application Routes
app.use("/api/application", applicationRoutes);
//Campaign Routes
app.use("/api/campaigns", campaignRoutes);
//Milestones Routes
app.use("/api/milestones", milestoneRoutes);
// Votes Routes
app.use("/api/votes", voteRoutes);
// Notifications Routes
app.use("/api/notifications", notificationRoutes);
//Payment Routes
app.use("/api/payments", paymentRoutes);
/***************** ERROR HANDLING ****************/
// Global Error Handler
app.use(errorHandler);

//Export
export default app;
