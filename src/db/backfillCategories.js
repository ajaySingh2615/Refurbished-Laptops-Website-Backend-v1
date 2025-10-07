import { db } from "./client.js";
import { products, categories } from "./schema.js";
import { eq } from "drizzle-orm";

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getCategoryIdBySlug(slug) {
  const rows = await db.select().from(categories);
  const row = rows.find((r) => r.slug === slug);
  return row ? row.id : null;
}

function guessSlugForProduct(p) {
  const sub = (p.subType || "").toLowerCase();
  if (sub.includes("casing")) return "peripherals/casing";
  if (sub.includes("mouse")) return "peripherals/mouse-pads";
  if (sub.includes("wifi") || sub.includes("dongle"))
    return "peripherals/wifi-dongles";
  // Default: laptops
  return "electronics/laptops";
}

export async function backfillProductCategories() {
  // Build cache of category slug -> id
  const rows = await db.select().from(categories);
  const idBySlug = new Map(rows.map((r) => [r.slug, r.id]));
  const ensure = async (slug) => {
    if (idBySlug.has(slug)) return idBySlug.get(slug);
    return null;
  };

  const all = await db.select().from(products);
  let updated = 0;
  for (const p of all) {
    if (p.categoryId) continue;
    const slug = guessSlugForProduct(p);
    const catId = await ensure(slug);
    if (!catId) continue;
    await db
      .update(products)
      .set({ categoryId: catId })
      .where(eq(products.id, p.id));
    updated += 1;
  }
  console.log(
    `Backfill complete. Updated ${updated} products with categoryId.`
  );
}

// Allow running directly: node src/db/backfillCategories.js
if (import.meta.url === `file://${process.argv[1]}`) {
  backfillProductCategories().then(() => process.exit(0));
}
