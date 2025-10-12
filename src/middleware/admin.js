export const adminMiddleware = (req, res, next) => {
  // Check if user is authenticated (should already be done by requireAuth)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Check if user has admin role
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required",
    });
  }

  // User is authenticated and is admin
  next();
};
