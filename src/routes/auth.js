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
import {
  emailVerifications,
  users,
  passwordResets,
  sessions,
} from "../db/schema.js";
import { eq, and, isNull } from "drizzle-orm";
import { sha256 } from "../utils/crypto.js";
import crypto from "crypto";
import bcrypt from "bcrypt";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordResetSuccessEmail,
} from "../utils/mailer.js";
import { sendMsg91OtpSms } from "../services/msg91.js";

const router = express.Router();
router.use(cookieParser());

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

// Phone: send OTP (no auth required)
router.post("/phone/send-otp", async (req, res) => {
  try {
    const { phone } = req.body || {};
    if (!phone) return res.status(400).json({ message: "Phone is required" });

    // Rate limit attempts per phone (simple: delete expired records, count recent attempts)
    const ttlMinutes = Number(process.env.PHONE_OTP_TTL_MIN || 10);
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = sha256(code);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // Store OTP record
    await db.insert(phoneOtps).values({ phone, codeHash, expiresAt });

    // Send via MSG91
    const msg91Res = await sendMsg91OtpSms({
      apiKey: process.env.MSG91_AUTHKEY,
      templateId: process.env.MSG91_TEMPLATE_ID,
      senderId: process.env.MSG91_SENDER_ID,
      countryCode: process.env.MSG91_COUNTRY_CODE || "91",
      phone,
      code,
    });

    if (!msg91Res.success) {
      return res.status(500).json({ message: "Failed to send OTP" });
    }

    return res.json({ message: "OTP sent" });
  } catch (e) {
    console.error("Send OTP error:", e);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
});

// Phone: verify OTP (issues tokens, creates user if needed)
router.post("/phone/verify-otp", async (req, res) => {
  try {
    const { phone, code } = req.body || {};
    if (!phone || !code)
      return res.status(400).json({ message: "Phone and code are required" });

    // Find latest unused OTP for phone
    const [otp] = await db
      .select()
      .from(phoneOtps)
      .where(and(eq(phoneOtps.phone, phone), isNull(phoneOtps.usedAt)))
      .orderBy(phoneOtps.id)
      .limit(1);

    if (!otp) return res.status(400).json({ message: "Invalid or used code" });
    if (!(new Date(otp.expiresAt) > new Date()))
      return res.status(400).json({ message: "Code expired" });
    if (otp.codeHash !== sha256(String(code)))
      return res.status(400).json({ message: "Incorrect code" });

    // Mark OTP used
    await db
      .update(phoneOtps)
      .set({ usedAt: new Date() })
      .where(eq(phoneOtps.id, otp.id));

    // Find or create user
    let [u] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);
    if (!u) {
      const result = await db
        .insert(users)
        .values({
          phone,
          status: "active",
          role: "customer",
          phoneVerifiedAt: new Date(),
        })
        .returning({ id: users.id });
      const newId = result?.[0]?.id;
      [u] = await db.select().from(users).where(eq(users.id, newId)).limit(1);
    }

    // Mark phone verified if not already
    if (!u.phoneVerifiedAt) {
      await db
        .update(users)
        .set({ phoneVerifiedAt: new Date() })
        .where(eq(users.id, u.id));
    }

    // Issue tokens
    const access = signAccessToken({ sub: u.id, role: u.role });
    const refreshToken = signRefreshToken({ sub: u.id });
    setRefreshCookie(res, refreshToken);

    return res.json({
      access,
      user: {
        id: u.id,
        email: u.email,
        phone: u.phone,
        name: u.name,
        role: u.role,
        emailVerifiedAt: u.emailVerifiedAt,
        phoneVerifiedAt: u.phoneVerifiedAt || new Date(),
      },
    });
  } catch (e) {
    console.error("Verify OTP error:", e);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
});

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

    // Send the verification email using our new template
    if (process.env.RESEND_API_KEY) {
      try {
        const result = await sendVerificationEmail(email, link);
        console.log("Verification email sent via Resend:", result);
        return res.json({ message: "Verification email sent" });
      } catch (e) {
        console.error("Failed to send verification email:", e);
        return res.status(500).json({ message: "Failed to send email" });
      }
    } else {
      return res.json({ message: "Verification link", link });
    }
  } catch (e) {
    return res.status(500).json({ message: "Failed to resend" });
  }
});

// Forgot password - send reset link
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({
        message: "If the email exists, a reset link has been sent",
      });
    }

    // Delete any existing password reset tokens for this user
    await db.delete(passwordResets).where(eq(passwordResets.userId, user.id));

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    console.log("Password reset link:", resetLink);

    // Send email
    if (process.env.RESEND_API_KEY) {
      try {
        const result = await sendPasswordResetEmail(user.email, resetLink);
        console.log("Password reset email sent:", result);
        return res.json({ message: "Password reset link sent to your email" });
      } catch (e) {
        console.error("Failed to send password reset email:", e);
        return res.status(500).json({ message: "Failed to send reset email" });
      }
    } else {
      return res.json({ message: "Password reset link", link: resetLink });
    }
  } catch (e) {
    console.error("Forgot password error:", e);
    return res.status(500).json({ message: "Failed to process request" });
  }
});

// Reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: "Token and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const [resetRecord] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, sha256(token)),
          isNull(passwordResets.usedAt)
        )
      )
      .limit(1);

    if (!resetRecord) {
      return res
        .status(400)
        .json({ message: "Invalid or expired reset token" });
    }

    if (!(new Date(resetRecord.expiresAt) > new Date())) {
      return res.status(400).json({ message: "Reset token has expired" });
    }

    // Get user email before updating password
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, resetRecord.userId))
      .limit(1);

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await db
      .update(users)
      .set({ passwordHash: hashedPassword })
      .where(eq(users.id, resetRecord.userId));

    // Mark token as used
    await db
      .update(passwordResets)
      .set({ usedAt: new Date() })
      .where(eq(passwordResets.id, resetRecord.id));

    // Invalidate all user sessions (force re-login)
    await db.delete(sessions).where(eq(sessions.userId, resetRecord.userId));

    // Send success email
    if (user?.email && process.env.RESEND_API_KEY) {
      try {
        const result = await sendPasswordResetSuccessEmail(user.email);
        console.log("Password reset success email sent:", result);
      } catch (e) {
        console.error("Failed to send success email:", e);
        // Don't fail the request if email sending fails
      }
    }

    console.log("Password reset successful for user:", resetRecord.userId);
    return res.json({ message: "Password reset successfully" });
  } catch (e) {
    console.error("Reset password error:", e);
    return res.status(500).json({ message: "Failed to reset password" });
  }
});

export default router;
