import { db } from "../db/client.js";
import { products, productVariants, categories } from "../db/schema.js";
import { eq, like, and, or, gte, lte, inArray, sql } from "drizzle-orm";

export const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    const allProducts = await db
      .select()
      .from(products)
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(products);

    res.json({
      products: allProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Load variants
    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product[0].id));

    res.json({ ...product[0], variants });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const getProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await db
      .select()
      .from(products)
      .where(eq(products.sku, sku))
      .limit(1);

    if (product.length === 0) {
      // fallback: maybe SKU matches a variant
      const variant = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.sku, sku))
        .limit(1);
      if (variant.length === 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      const base = await db
        .select()
        .from(products)
        .where(eq(products.id, variant[0].productId))
        .limit(1);
      const siblings = await db
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, variant[0].productId));
      return res.json({
        ...base[0],
        variants: siblings,
        selectedVariant: variant[0],
      });
    }

    const variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, product[0].id));

    res.json({ ...product[0], variants });
  } catch (error) {
    console.error("Error fetching product by SKU:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};

export const getLowStockCount = async (req, res) => {
  try {
    const threshold = Math.max(
      0,
      parseInt(String(req.query.threshold ?? 5), 10) || 5
    );
    // Count total low stock across entire table
    const [{ total }] = await db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(
        and(eq(products.inStock, true), lte(products.stockQty, threshold))
      );

    // Also return up to 3 example titles for the banner
    const sample = await db
      .select({ title: products.title })
      .from(products)
      .where(and(eq(products.inStock, true), lte(products.stockQty, threshold)))
      .limit(3);

    res.json({ count: total, titles: sample.map((s) => s.title), threshold });
  } catch (error) {
    console.error("Error fetching low stock count:", error);
    res.status(500).json({ message: "Failed to fetch low stock summary" });
  }
};

export const getLowStockList = async (req, res) => {
  try {
    const threshold = Math.max(
      0,
      parseInt(String(req.query.threshold ?? 5), 10) || 5
    );
    const rows = await db
      .select()
      .from(products)
      .where(and(eq(products.inStock, true), lte(products.stockQty, threshold)))
      .orderBy(products.stockQty);
    res.json({ products: rows, threshold });
  } catch (error) {
    console.error("Error fetching low stock list:", error);
    res.status(500).json({ message: "Failed to fetch low stock products" });
  }
};

// Variants CRUD
export const createVariants = async (req, res) => {
  try {
    const { id } = req.params; // product id
    const { variants } = req.body; // array of { sku, attributes, price, ... }
    if (!Array.isArray(variants) || variants.length === 0) {
      return res.status(400).json({ message: "Variants array is required" });
    }
    // enforce productId
    const rows = variants.map((v) => ({ ...v, productId: Number(id) }));
    await db.insert(productVariants).values(rows);
    res.status(201).json({ message: "Variants created", count: rows.length });
  } catch (error) {
    console.error("Error creating variants:", error);
    res.status(500).json({ message: "Failed to create variants" });
  }
};

export const updateVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    const payload = req.body;
    await db
      .update(productVariants)
      .set(payload)
      .where(eq(productVariants.id, Number(variantId)));
    res.json({ message: "Variant updated" });
  } catch (error) {
    console.error("Error updating variant:", error);
    res.status(500).json({ message: "Failed to update variant" });
  }
};

export const deleteVariant = async (req, res) => {
  try {
    const { variantId } = req.params;
    await db
      .delete(productVariants)
      .where(eq(productVariants.id, Number(variantId)));
    res.json({ message: "Variant deleted" });
  } catch (error) {
    console.error("Error deleting variant:", error);
    res.status(500).json({ message: "Failed to delete variant" });
  }
};

export const getVariantBySku = async (req, res) => {
  try {
    const { sku } = req.params;
    const variant = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.sku, sku))
      .limit(1);
    if (variant.length === 0)
      return res.status(404).json({ message: "Variant not found" });
    res.json(variant[0]);
  } catch (error) {
    console.error("Error fetching variant by SKU:", error);
    res.status(500).json({ message: "Failed to fetch variant" });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchResults = await db
      .select()
      .from(products)
      .where(
        or(
          like(products.title, `%${q}%`),
          like(products.brand, `%${q}%`),
          like(products.cpu, `%${q}%`),
          like(products.sku, `%${q}%`),
          eq(products.id, isNaN(Number(q)) ? -1 : Number(q))
        )
      );

    res.json({ products: searchResults, query: q });
  } catch (error) {
    console.error("Error searching products:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

export const filterProducts = async (req, res) => {
  try {
    const {
      brand,
      condition,
      minPrice,
      maxPrice,
      ramGb,
      storage,
      subType,
      inStock,
      processor,
      categoryId, // Legacy: category ID filter
      category, // New: category slug filter
      sortBy,
      sortOrder,
      page = 1,
      limit = 12,
    } = req.query;

    const toList = (v) =>
      String(v)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    const where = [];

    if (brand) {
      const list = toList(brand);
      where.push(
        list.length > 1
          ? inArray(products.brand, list)
          : eq(products.brand, list[0])
      );
    }
    if (subType) {
      const list = toList(subType);
      where.push(
        list.length > 1
          ? inArray(products.subType, list)
          : eq(products.subType, list[0])
      );
    }
    if (condition) {
      const list = toList(condition);
      where.push(
        list.length > 1
          ? inArray(products.condition, list)
          : eq(products.condition, list[0])
      );
    }
    if (typeof inStock !== "undefined") {
      where.push(eq(products.inStock, String(inStock) === "true"));
    }
    if (minPrice) where.push(gte(products.price, Number(minPrice)));
    if (maxPrice) where.push(lte(products.price, Number(maxPrice)));
    // Variant-aware RAM filter
    if (ramGb) {
      const list = toList(ramGb)
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n));
      if (list.length === 1) {
        const v = list[0];
        where.push(
          or(
            eq(products.ramGb, v),
            sql`JSON_EXTRACT(${productVariants.attributes}, '$.ramGb') = ${v}`
          )
        );
      } else if (list.length > 1) {
        // match any of provided RAM values either on base or variant
        const ors = list.map((v) =>
          or(
            eq(products.ramGb, v),
            sql`JSON_EXTRACT(${productVariants.attributes}, '$.ramGb') = ${v}`
          )
        );
        where.push(or(...ors));
      }
    }
    // Variant-aware storage filter
    if (storage) {
      const list = toList(storage);
      if (list.length === 1) {
        const t = `%${list[0]}%`;
        where.push(
          or(
            like(products.storage, t),
            sql`JSON_EXTRACT(${productVariants.attributes}, '$.storage') LIKE ${t}`
          )
        );
      } else if (list.length > 1) {
        const likes = list.map((it) => {
          const t = `%${it}%`;
          return or(
            like(products.storage, t),
            sql`JSON_EXTRACT(${productVariants.attributes}, '$.storage') LIKE ${t}`
          );
        });
        where.push(or(...likes));
      }
    }

    // Processor filter (filters by CPU field)
    if (processor) {
      const processorType = String(processor).toLowerCase().trim();
      if (processorType === "intel") {
        where.push(like(products.cpu, "%Intel%"));
      } else if (processorType === "amd") {
        where.push(like(products.cpu, "%AMD%"));
      }
      // Note: For Apple processors, we filter by brand=apple instead
      // since Apple uses both Intel and Apple Silicon (M1/M2/M3)
    }

    // Category filter (includes parent category and all its children)
    if (categoryId) {
      const catId = parseInt(categoryId, 10);
      if (!isNaN(catId)) {
        // Fetch all categories to find children
        const allCategories = await db.select().from(categories);
        const childIds = allCategories
          .filter((c) => c.parentId === catId)
          .map((c) => c.id);
        const categoryIds = [catId, ...childIds];

        if (categoryIds.length === 1) {
          where.push(eq(products.categoryId, categoryIds[0]));
        } else {
          where.push(inArray(products.categoryId, categoryIds));
        }
      }
    }

    // Category slug filter (includes parent category and all its children)
    if (category) {
      // Fetch all categories to find the category by slug
      const allCategories = await db.select().from(categories);
      const targetCategory = allCategories.find((c) => c.slug === category);

      if (targetCategory) {
        // Find all child categories
        const childIds = allCategories
          .filter((c) => c.parentId === targetCategory.id)
          .map((c) => c.id);
        const categoryIds = [targetCategory.id, ...childIds];

        if (categoryIds.length === 1) {
          where.push(eq(products.categoryId, categoryIds[0]));
        } else {
          where.push(inArray(products.categoryId, categoryIds));
        }
      }
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 12);
    const offset = (pageNum - 1) * limitNum;

    const filteredProducts = await db
      .select({ p: products })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where.length > 0 ? and(...where) : undefined)
      .groupBy(products.id)
      .limit(limitNum)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql`count(distinct ${products.id})`.mapWith(Number) })
      .from(products)
      .leftJoin(productVariants, eq(productVariants.productId, products.id))
      .where(where.length > 0 ? and(...where) : undefined);

    res.json({
      products: filteredProducts.map((r) => r.p),
      filters: req.query,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error filtering products:", error);
    res.status(500).json({ message: "Filtering failed" });
  }
};

export const createProducts = async (req, res) => {
  try {
    const productData = req.body;

    // Check if SKU already exists
    if (productData.sku) {
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.sku, productData.sku))
        .limit(1);

      if (existingProduct.length > 0) {
        return res.status(400).json({
          message: `SKU "${productData.sku}" already exists. Please generate a new SKU.`,
        });
      }
    }

    const newProduct = await db.insert(products).values(productData);
    res.status(201).json({
      message: "Product created successfully",
      id: newProduct.insertId,
    });
  } catch (error) {
    console.error("Error creating products:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
};

export const updatedProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    await db.update(products).set(updatedData).where(eq(products.id, id));
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(products).where(eq(products.id, id));
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
};
