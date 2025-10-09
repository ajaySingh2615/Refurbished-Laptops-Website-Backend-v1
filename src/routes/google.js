import express from "express";
import passport from "passport";

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
    // TODO: issue tokens and set refresh cookie; then redirect
    return res.json({
      message: "Google OAuth callback not fully implemented yet",
    });
  }
);

export default router;
