import { db } from "../db/client.js";
import { products } from "../db/schema.js";
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

    res.json(product[0]);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
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
          like(products.cpu, `%${q}%`)
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
      inStock,
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
    if (ramGb) {
      const list = toList(ramGb)
        .map((n) => parseInt(n, 10))
        .filter((n) => !Number.isNaN(n));
      if (list.length === 1) {
        where.push(eq(products.ramGb, list[0]));
      } else if (list.length > 1) {
        where.push(inArray(products.ramGb, list));
      }
    }
    if (storage) {
      const list = toList(storage);
      // Match storage type token inside description (e.g., "512GB SSD" should match "SSD")
      if (list.length === 1) {
        where.push(like(products.storage, `%${list[0]}%`));
      } else if (list.length > 1) {
        const likes = list.map((t) => like(products.storage, `%${t}%`));
        where.push(or(...likes));
      }
    }

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 12);
    const offset = (pageNum - 1) * limitNum;

    const filteredProducts = await db
      .select()
      .from(products)
      .where(where.length > 0 ? and(...where) : undefined)
      .limit(limitNum)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql`count(*)`.mapWith(Number) })
      .from(products)
      .where(where.length > 0 ? and(...where) : undefined);

    res.json({
      products: filteredProducts,
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
