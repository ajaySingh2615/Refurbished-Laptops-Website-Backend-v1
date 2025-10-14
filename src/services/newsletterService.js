import { db } from "../db/client.js";
import { newsletterSubscriptions } from "../db/schema.js";
import { eq } from "drizzle-orm";

export async function subscribeToNewsletter(
  email,
  source = "homepage",
  meta = {}
) {
  const trimmed = String(email || "")
    .trim()
    .toLowerCase();
  if (!trimmed) throw new Error("Email is required");

  // Use same robust email regex as frontend to avoid false negatives
  const emailRegex =
    /^(?:[a-zA-Z0-9_'^&+%`{}~!$*-]+(?:\.[a-zA-Z0-9_'^&+%`{}~!$*-]+)*)@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) throw new Error("Invalid email");

  // upsert-like behavior: avoid duplicate rows for same email+source
  const existing = await db
    .select()
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.email, trimmed));

  if (existing && existing.length > 0) {
    return { alreadySubscribed: true };
  }

  await db.insert(newsletterSubscriptions).values({
    email: trimmed,
    source: source || "homepage",
    ip: meta.ip || null,
    userAgent: meta.userAgent || null,
  });

  return { success: true };
}
