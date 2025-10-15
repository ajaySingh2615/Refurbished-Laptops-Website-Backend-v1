import { db } from "../db/client.js";
import { newsletterSubscriptions } from "../db/schema.js";
import { eq, desc, like, count } from "drizzle-orm";

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

// Admin functions
export async function getNewsletterSubscriptions(options = {}) {
  const { page = 1, limit = 20, search, source } = options;
  const offset = (page - 1) * limit;

  let query = db.select().from(newsletterSubscriptions);
  let countQuery = db.select({ count: count() }).from(newsletterSubscriptions);

  // Apply filters
  const conditions = [];
  if (search) {
    conditions.push(like(newsletterSubscriptions.email, `%${search}%`));
  }
  if (source) {
    conditions.push(eq(newsletterSubscriptions.source, source));
  }

  if (conditions.length > 0) {
    query = query.where(
      conditions.reduce((acc, condition) =>
        acc ? acc.and(condition) : condition
      )
    );
    countQuery = countQuery.where(
      conditions.reduce((acc, condition) =>
        acc ? acc.and(condition) : condition
      )
    );
  }

  // Get total count
  const totalResult = await countQuery;
  const total = totalResult[0]?.count || 0;

  // Get paginated results
  const subscriptions = await query
    .orderBy(desc(newsletterSubscriptions.subscribedAt))
    .limit(limit)
    .offset(offset);

  return {
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getNewsletterStats() {
  const totalResult = await db
    .select({ count: count() })
    .from(newsletterSubscriptions);
  const total = totalResult[0]?.count || 0;

  // Get subscriptions by source
  const sourceStats = await db
    .select({
      source: newsletterSubscriptions.source,
      count: count(),
    })
    .from(newsletterSubscriptions)
    .groupBy(newsletterSubscriptions.source);

  // Get recent subscriptions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentResult = await db
    .select({ count: count() })
    .from(newsletterSubscriptions)
    .where(eq(newsletterSubscriptions.subscribedAt, thirtyDaysAgo));

  const recent = recentResult[0]?.count || 0;

  return {
    total,
    recent,
    sourceStats,
  };
}

export async function deleteNewsletterSubscription(id) {
  try {
    // First check if the subscription exists
    const existing = await db
      .select()
      .from(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.id, id));

    if (!existing || existing.length === 0) {
      return false;
    }

    // Delete the subscription
    await db
      .delete(newsletterSubscriptions)
      .where(eq(newsletterSubscriptions.id, id));

    return true;
  } catch (error) {
    console.error("Error deleting newsletter subscription:", error);
    throw error;
  }
}
