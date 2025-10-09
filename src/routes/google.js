import express from "express";
import passport from "passport";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { db } from "../db/client.js";
import { sessions } from "../db/schema.js";
import { sha256 } from "../utils/crypto.js";

const router = express.Router();

// Start Google OAuth
router.get(
  "/start",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback handler
router.get(
  "/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    // req.user is set by passport verify callback (we returned { id, email, role })
    const u = req.user;
    if (!u) return res.status(400).json({ message: "OAuth failed" });
    const access = signAccessToken({ sub: u.id, role: u.role, email: u.email });
    const refresh = signRefreshToken({ sub: u.id });
    // persist session
    db.insert(sessions)
      .values({
        userId: u.id,
        refreshTokenHash: sha256(refresh),
        userAgent: req.headers["user-agent"] || null,
        ip: req.ip || null,
        expiresAt: new Date(
          Date.now() +
            1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30)
        ),
      })
      .then(() => {
        res.cookie("refresh_token", refresh, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/api/auth",
          maxAge:
            1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30),
        });
        // Redirect back to app; client can call /api/auth/refresh to get access later,
        // but we also include access in fragment for immediate use if desired
        const redirectUrl =
          process.env.OAUTH_REDIRECT_SUCCESS || "http://localhost:5173/login";
        return res.redirect(
          `${redirectUrl}#access=${encodeURIComponent(access)}`
        );
      })
      .catch(() =>
        res.status(500).json({ message: "Failed to create session" })
      );
  }
);

export default router;
