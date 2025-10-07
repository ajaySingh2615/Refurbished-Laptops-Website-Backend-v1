import { db } from "./client.js";
import { categories } from "./schema.js";

export async function seedCategories() {
  const all = await db.select().from(categories);
  if (all.length) return; // already seeded

  const insert = async (name, slug, parentId = null) => {
    const r = await db.insert(categories).values({ name, slug, parentId });
    return r.insertId;
  };

  const electronicsId = await insert("Electronics", "electronics");
  await insert("Laptops", "electronics/laptops", electronicsId);
  await insert("Desktops", "electronics/desktops", electronicsId);

  const peripheralsId = await insert("Peripherals", "peripherals");
  await insert("Casing", "peripherals/casing", peripheralsId);
  await insert("Mouse Pads", "peripherals/mouse-pads", peripheralsId);
  await insert("Wi-Fi Dongles", "peripherals/wifi-dongles", peripheralsId);
}
