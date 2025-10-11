import { authMiddleware } from "./auth.js";

export const adminMiddleware = (req, res, next) => {
  // First check if user is authenticated
  authMiddleware(req, res, (err) => {
    if (err) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Check if user has admin role
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // User is authenticated and is admin
    next();
  });
};
