import { db } from "../db/client.js";
import { categories, products } from "../db/schema.js";
import { eq, sql, inArray, and } from "drizzle-orm";

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

export const createCategory = async (req, res) => {
  try {
    const { name, slug, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if slug already exists
    if (slug) {
      const existingSlug = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, slug))
        .limit(1);

      if (existingSlug.length > 0) {
        return res.status(400).json({ message: "Slug already exists" });
      }
    }

    // Check if parent exists (if parentId is provided)
    if (parentId) {
      const parent = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parentId))
        .limit(1);

      if (parent.length === 0) {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    const result = await db.insert(categories).values({
      name: name.trim(),
      slug: autoSlug,
      parentId: parentId || null,
    });

    // Get the inserted category by slug since we can't use returning()
    const [newCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.slug, autoSlug))
      .limit(1);

    res.status(201).json(newCategory);
  } catch (error) {
    console.error("Error creating category:", error);
    res.status(500).json({ message: "Failed to create category" });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if category exists
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if slug already exists (excluding current category)
    if (slug) {
      const existingSlug = await db
        .select()
        .from(categories)
        .where(and(eq(categories.slug, slug), sql`id != ${id}`))
        .limit(1);

      if (existingSlug.length > 0) {
        return res.status(400).json({ message: "Slug already exists" });
      }
    }

    // Check if parent exists and is not the same category
    if (parentId) {
      if (parentId == id) {
        return res
          .status(400)
          .json({ message: "Category cannot be its own parent" });
      }

      const parent = await db
        .select()
        .from(categories)
        .where(eq(categories.id, parentId))
        .limit(1);

      if (parent.length === 0) {
        return res.status(400).json({ message: "Parent category not found" });
      }
    }

    const autoSlug = slug || name.toLowerCase().replace(/\s+/g, "-");

    await db
      .update(categories)
      .set({
        name: name.trim(),
        slug: autoSlug,
        parentId: parentId || null,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));

    // Get the updated category
    const [updatedCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    res.json(updatedCategory);
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Failed to update category" });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id))
      .limit(1);

    if (existing.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if category has children
    const children = await db
      .select()
      .from(categories)
      .where(eq(categories.parentId, id))
      .limit(1);

    if (children.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category with subcategories. Please delete subcategories first.",
      });
    }

    // Check if category has products
    const productsInCategory = await db
      .select()
      .from(products)
      .where(eq(products.categoryId, id))
      .limit(1);

    if (productsInCategory.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete category with products. Please move or delete products first.",
      });
    }

    await db.delete(categories).where(eq(categories.id, id));

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};
