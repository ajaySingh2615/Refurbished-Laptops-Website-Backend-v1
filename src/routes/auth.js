import express from "express";
import cookieParser from "cookie-parser";
import {
  register,
  login,
  logout,
  refresh,
  me,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/client.js";
import { emailVerifications, users } from "../db/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import { sha256 } from "../utils/crypto.js";

const router = express.Router();
router.use(cookieParser());

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

// Verify email using token (soft-gate)
router.get("/verify-email", async (req, res) => {
  try {
    const token = String(req.query.token || "");
    console.log("Verification request - token:", token);
    if (!token) return res.status(400).json({ message: "Missing token" });

    const [rec] = await db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, sha256(token)))
      .limit(1);

    console.log("Found verification record:", rec);

    if (!rec) return res.status(400).json({ message: "Invalid token" });

    // If token already used, check if user is verified
    if (rec.usedAt) {
      const [user] = await db
        .select({ emailVerifiedAt: users.emailVerifiedAt })
        .from(users)
        .where(eq(users.id, rec.userId));

      if (user?.emailVerifiedAt) {
        console.log("User already verified");
        return res.json({ message: "Email already verified" });
      } else {
        return res.status(400).json({ message: "Token already used" });
      }
    }
    if (!(new Date(rec.expiresAt) > new Date()))
      return res.status(400).json({ message: "Token expired" });

    await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, rec.userId));
    await db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(eq(emailVerifications.id, rec.id));

    console.log("Email verification successful for user:", rec.userId);
    return res.json({ message: "Email verified" });
  } catch (e) {
    console.error("Verification error:", e);
    return res.status(500).json({ message: "Failed to verify" });
  }
});

// Resend verification link (returns link in JSON; in production send via SMTP)
router.post("/resend-verification", requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const [{ email }] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId));
    const raw =
      Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const tokenHash = sha256(raw);
    const ttlHours = Number(process.env.VERIFICATION_TOKEN_TTL_HOURS || 24);
    await db.insert(emailVerifications).values({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    });
    const appUrl = process.env.APP_URL || "http://localhost:5173";
    const link = `${appUrl}/verify-email?token=${raw}`;
    return res.json({ message: "Sent", link });
  } catch (e) {
    return res.status(500).json({ message: "Failed to resend" });
  }
});

export default router;
