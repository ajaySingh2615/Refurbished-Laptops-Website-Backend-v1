import { db } from "../db/client.js";
import { users, sessions, passwordResets } from "../db/schema.js";
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
  verifyRefresh,
} from "../utils/jwt.js";
import path from "path";

function setRefreshCookie(res, token) {
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * Number(process.env.REFRESH_TTL_DAYS || 30),
  });
}

// register
export const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if ((!email, !password))
      return res.status(400).json({
        message: "Email and password required",
      });

    const passwordHash = await hashPassword(password);
    await db.insert(users).values({ email, passwordHash, name });
    // Optionally send verification email here
    return res.status(201).json({ message: "Registered" });
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
    const claims = verifyRefresh(token);
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
    const token = req.cookie?.refresh_token;
    if (token) {
      await ab
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
