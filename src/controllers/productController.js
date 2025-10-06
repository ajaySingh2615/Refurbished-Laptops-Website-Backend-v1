import { db } from "../db/client.js";
import { products } from "../db/schema.js";
import { eq, like, and, or, gte, lte, desc } from "drizzle-orm";

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

    const totalCount = await db.select({ count: products.id }).from(products);

    res.json({
      products: allProducts,
      pagination: {
        page,
        limit,
        total: totalCount.length,
        totalPages: Math.ceil(totalCount.length / limit),
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
    const { brand, condition, minPrice, maxPrice, ramGb, storage } = req.query;
    let conditions = [];

    if (brand) conditions.push(eq(products.brand, brand));
    if (condition) conditions.push(eq(products.condition, condition));
    if (minPrice) conditions.push(gte(products.price, minPrice));
    if (maxPrice) conditions.push(lte(products.price, maxPrice));
    if (ramGb) conditions.push(eq(products.ramGb, parseInt(ramGb)));
    if (storage) conditions.push(like(products.storage, `%${storage}%`));

    const filteredProducts = await db
      .select()
      .from(products)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    res.json({ products: filteredProducts, filter: req.query });
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
