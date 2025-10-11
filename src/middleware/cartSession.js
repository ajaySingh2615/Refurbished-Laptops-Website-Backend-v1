import { v4 as uuidv4 } from "uuid";

/**
 * Middleware to handle cart sessions for guest users
 * This ensures every request has either a userId (authenticated) or sessionId (guest)
 */
export const cartSession = (req, res, next) => {
  try {
    // If user is authenticated, use their userId
    if (req.user && req.user.id) {
      req.user = {
        userId: req.user.id,
        sessionId: null,
      };
      return next();
    }

    // For guest users, check for existing session or create new one
    let sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;

    if (!sessionId) {
      // Generate new session ID for guest user
      sessionId = uuidv4();

      // Set cookie for future requests
      res.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // Set user context for cart operations
    req.user = {
      userId: null,
      sessionId: sessionId,
    };

    next();
  } catch (error) {
    console.error("Error in cart session middleware:", error);
    res.status(500).json({
      success: false,
      message: "Session error",
    });
  }
};
