import { db } from "./client.js";
import { categories } from "./schema.js";
import { eq, sql } from "drizzle-orm";

async function fixCategoryParents() {
  // Map of childSlug -> parentSlug
  const pairs = [
    ["electronics/laptops", "electronics"],
    ["electronics/desktops", "electronics"],
    ["peripherals/casing", "peripherals"],
    ["peripherals/mouse-pads", "peripherals"],
    ["peripherals/wifi-dongles", "peripherals"],
  ];

  const all = await db.select().from(categories);
  // eslint-disable-next-line no-console
  console.log(
    "[fixCategoryParents] Before:",
    all.map((c) => ({ id: c.id, slug: c.slug, parentId: c.parentId }))
  );
  const bySlug = new Map(all.map((c) => [c.slug, c]));

  for (const [childSlug, parentSlug] of pairs) {
    const child = bySlug.get(childSlug);
    const parent = bySlug.get(parentSlug);
    if (!child || !parent) continue;
    if (child.parentId !== parent.id) {
      await db
        .update(categories)
        .set({ parentId: parent.id })
        .where(eq(categories.id, child.id));
      // eslint-disable-next-line no-console
      console.log(
        `Updated parentId for ${child.slug} -> ${parent.slug} (${parent.id})`
      );
    }
  }

  const after = await db.select().from(categories);
  // eslint-disable-next-line no-console
  console.log(
    "[fixCategoryParents] After:",
    after.map((c) => ({ id: c.id, slug: c.slug, parentId: c.parentId }))
  );
}

// Run immediately when executed
fixCategoryParents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed to fix category parents:", err);
    process.exit(1);
  });
