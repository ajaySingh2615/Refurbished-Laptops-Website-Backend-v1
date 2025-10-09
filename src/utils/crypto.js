import bcrypt from "bcryptjs";
import crypto from "crypto";

export const hashPassword = async (plain) => bcrypt.hash(plain, 10);
export const verifyPassword = async (plain, hash) =>
  bcrypt.compare(plain, hash);

export const sha256 = (s) =>
  crypto.createHash("sha256").update(s).digest("hex");
export const randomToken = (len = 48) =>
  crypto.randomBytes(len).toString("hex");
