// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error("🔥 ERROR:", err.stack || err.message);

  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorHandler;
