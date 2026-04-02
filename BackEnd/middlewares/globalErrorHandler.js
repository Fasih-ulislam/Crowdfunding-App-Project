import ResponseError from "../utils/customError.js";

const errorHandler = (error, req, res, next) => {
  console.error(error);

  if (error instanceof ResponseError) {
    return res
      .status(error.code || 500)
      .json({ error: error.message || "Internal Server Error" });
  } else if (error.message && error.message.includes("relation")) {
    // Database table/column doesn't exist
    return res.status(400).json({ error: "Database error: Table not found" });
  } else {
    // Generic server error
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default errorHandler;
