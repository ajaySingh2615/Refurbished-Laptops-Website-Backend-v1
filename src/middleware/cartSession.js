import { v4 as uuidv4 } from "uuid";
import { verifyAccess } from "../utils/jwt.js";

/**
 * Middleware to handle cart sessions for both authenticated and guest users
 * This ensures every request has either a userId (authenticated) or sessionId (guest)
 */
export const cartSession = (req, res, next) => {
  try {
    // Check for authentication token first
    const hdr = req.headers.authorization || "";
    const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

    if (token) {
      try {
        // User is authenticated
        const claims = verifyAccess(token);

        // Get or create session ID for authenticated user
        let sessionId = req.headers["x-session-id"] || req.cookies?.sessionId;

        if (!sessionId) {
          // Generate new session ID only if none exists
          sessionId = `user_${claims.sub}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // Set cookie for future requests
          res.cookie("sessionId", sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          });
        }

        req.user = {
          userId: claims.sub, // sub is the user ID in JWT
          sessionId: sessionId,
        };
        return next();
      } catch (error) {
        console.log(
          "Cart session - invalid token, treating as guest:",
          error.message
        );
        // Invalid token, treat as guest
      }
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
