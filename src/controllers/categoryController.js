import { db } from "../db/client.js";
import { categories, products } from "../db/schema.js";
import { eq, sql, inArray } from "drizzle-orm";

function buildTree(rows) {
  const byId = new Map(rows.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const r of rows) {
    const node = byId.get(r.id);
    if (r.parentId && byId.has(r.parentId))
      byId.get(r.parentId).children.push(node);
    else roots.push(node);
  }
  return roots;
}

export const getAllCategories = async (_req, res) => {
  try {
    const rows = await db.select().from(categories);
    res.json(buildTree(rows));
  } catch (e) {
    console.error("Error fetching categories:", e);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const rows = await db.select().from(categories);
    const node = rows.find((r) => r.slug === slug);
    if (!node) return res.status(404).json({ message: "Category not found" });
    const children = rows.filter((r) => r.parentId === node.id);
    res.json({ ...node, children });
  } catch (e) {
    console.error("Error fetching category:", e);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

export const getCategoryProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const rows = await db.select().from(categories);
    const node = rows.find((r) => r.slug === slug);
    if (!node) return res.status(404).json({ message: "Category not found" });
    const childIds = rows
      .filter((r) => r.parentId === node.id)
      .map((r) => r.id);
    const ids = [node.id, ...childIds];

    const offset = (page - 1) * limit;
    const list = await db
      .select()
      .from(products)
      .where(inArray(products.categoryId, ids))
      .limit(limit)
      .offset(offset);
    const [{ total }] = await db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(inArray(products.categoryId, ids));
    res.json({
      products: list,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Error fetching category products:", e);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};
