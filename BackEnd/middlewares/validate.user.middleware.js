import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

// Authentication middleware - validates JWT token
export const authenticateUser = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    } else {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
};

// Alias for backwards compatibility
export const validateUserMiddleware = authenticateUser;

// Authorize based on single role (user.role)
export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    const user = req.user;

    // Check if user's role is in the allowed roles
    if (!user.role || !allowedRoles.includes(user.role)) {
      return res.status(403).json({
        message: `Access denied. Required roles: ${allowedRoles.join(
          ", ",
        )}. Your role: ${user.role || "none"}`,
      });
    }

    next();
  };
}
