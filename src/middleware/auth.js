import { verifyAccess } from "../utils/jwt.js";

export function requireAuth(req, res, next) {
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing token" });

  try {
    const claims = verifyAccess(token);
    console.log("Auth middleware - claims:", claims);
    req.user = claims;
    console.log("Auth middleware - req.user set:", req.user);
    return next();
  } catch (error) {
    console.log("Auth middleware - error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

// Export as authMiddleware for compatibility
export const authMiddleware = requireAuth;

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
