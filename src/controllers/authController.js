import { db } from "../db/client.js";
import {
  users,
  sessions,
  passwordResets,
  emailVerifications,
} from "../db/schema.js";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  sha256,
  randomToken,
} from "../utils/crypto.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import path from "path";
import { sendMail } from "../utils/mailer.js";

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure:
      String(process.env.COOKIE_SECURE || "false").toLowerCase() === "true",
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30),
  });
}

// register
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({
        message: "Email and password required",
      });

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ email, passwordHash, name });

    // Auto-login on successful registration
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const access = signAccessToken({ sub: u.id, role: u.role, email: u.email });
    const refresh = signRefreshToken({ sub: u.id });
    await db.insert(sessions).values({
      userId: u.id,
      refreshTokenHash: sha256(refresh),
      userAgent: req.headers["user-agent"] || null,
      ip: req.ip || null,
      expiresAt: new Date(
        Date.now() +
          1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30)
      ),
    });
    setRefreshCookie(res, refresh);

    // Soft-gate email verification: send verification link asynchronously
    try {
      console.log(
        "REQUIRE_EMAIL_VERIFICATION:",
        process.env.REQUIRE_EMAIL_VERIFICATION
      );
      if (process.env.REQUIRE_EMAIL_VERIFICATION !== "false") {
        console.log("Sending verification email to:", u.email);
        const raw = randomToken(24);
        const tokenHash = sha256(raw);
        const ttlHours = Number(process.env.VERIFICATION_TOKEN_TTL_HOURS || 24);
        const appUrl = process.env.APP_URL || "http://localhost:5173";

        await db.insert(emailVerifications).values({
          userId: u.id,
          tokenHash,
          expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
        });

        const link = `${appUrl}/verify-email?token=${raw}`;
        console.log("Verification link:", link);

        const result = await sendMail({
          to: u.email,
          subject: "Verify your email",
          text: `Click to verify: ${link}`,
          html: `<p>Hi ${name || ""},</p><p>Verify your email by clicking the link below:</p><p><a href="${link}">Verify Email</a></p><p>This link expires in ${ttlHours} hours.</p>`,
        });

        console.log("Email send result:", result);
      } else {
        console.log("Email verification disabled");
      }
    } catch (error) {
      console.error("Email verification error:", error);
    }

    return res.status(201).json({ access });
  } catch (error) {
    return res.status(500).json({ message: "Failed to register" });
  }
};

// login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!u) return res.status(401).json({ message: "Invalid credentials" });
    if (!u.passwordHash)
      return res.status(401).json({ message: "use social login" });
    const ok = await verifyPassword(password, u.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const access = signAccessToken({ sub: u.id, role: u.role, email: u.email });
    const refresh = signRefreshToken({ sub: u.id });
    await db.insert(sessions).values({
      userId: u.id,
      refreshTokenHash: sha256(refresh),
      userAgent: req.headers["user-agent"] || null,
      ip: req.ip || null,
      expiresAt: new Date(
        Date.now() +
          1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30)
      ),
    });
    setRefreshCookie(res, refresh);
    return res.json({ access });
  } catch (error) {
    return res.status(500).json({ message: "failed to login" });
  }
};

export const refresh = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: "Missing refresh" });
    const claims = verifyRefreshToken(token);
    const [sess] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, sha256(token)))
      .limit(1);
    if (!sess || sess.revokedAt) return res.status(401).json("Invalid session");
    const [u] = await db
      .select()
      .from(users)
      .where(eq(users.id, claims.sub))
      .limit(1);
    if (!u) return res.status(401).json({ message: "User missing" });
    const access = signAccessToken({ sub: u.id, role: u.role, email: u.email });
    return res.json({ access });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh" });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.refreshTokenHash, sha256(token)));
    }
    res.clearCookie("refresh_token", { path: "/api/auth" });
    return res.json({ message: "Logged out" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to logout" });
  }
};

export const me = async (req, res) => {
  try {
    const [u] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.id, req.user.sub))
      .limit(1);

    if (!u) return res.status(404).json({ message: "Not found" });
    return res.json(u);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load profile" });
  }
};
