import ResponseError from "../utils/customError.js";

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error instanceof ResponseError) {
    return res
      .status(error.code || 500)
      .json({ error: error.message || "Internal Server Error" });
  }

  // PostgreSQL / node-postgres constraint & input errors → clearer client message
  const pgClientErrors = ["23502", "23503", "23505", "23514", "22P02"];
  if (error.code && pgClientErrors.includes(error.code)) {
    return res.status(400).json({
      error: error.detail || error.message || "Invalid data",
    });
  }

  if (error.message && error.message.includes("relation")) {
    return res.status(400).json({ error: "Database error: Table not found" });
  }

  return res.status(500).json({ error: "Internal Server Error" });
};

export default errorHandler;
