// Mock Auth Middleware for SevaLink AI (Hackathon Grade)
// Parses the user object from the Authorization header: "Bearer {JSON_USER_OBJECT}"

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authentication token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // In this mock implementation, the token is the stringified user object
    const user = JSON.parse(token);

    if (!user || (!user._id && !user.id)) {
      return res.status(401).json({ error: "Invalid user data in token" });
    }

    // Populate req.user for use in routes
    req.user = {
      id: user._id || user.id,
      role: user.role.toLowerCase(), // Ensure consistent casing
    };

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = auth;
