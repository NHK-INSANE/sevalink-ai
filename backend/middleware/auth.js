const jwt = require("jsonwebtoken");

/**
 * Authentication Middleware
 * Verifies the JWT token from the Authorization header.
 */
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No authentication token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role, ... }
    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

/**
 * Authorization Middleware (Role-Based Access Control)
 * Checks if the authenticated user has one of the allowed roles.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role.toLowerCase())) {
      return res.status(403).json({ 
        error: `Access Denied: Your role (${req.user?.role || "unknown"}) is not authorized to perform this action.` 
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
