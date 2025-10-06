import { db } from "../db/client.js";
import { products } from "../db/schema.js";

export const getBrands = async (req, res) => {
  try {
    const brands = await db
      .selectDistinct({ brand: products.brand })
      .from(products)
      .orderBy(products.brand);

    res.json(brands.map((b) => b.brand));
  } catch (error) {
    console.error("Error fetching brands:", error);
    res.status(500).json({ message: "Failed to fetch brands" });
  }
};
