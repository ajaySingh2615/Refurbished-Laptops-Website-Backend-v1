import express from "express";
import {
  createProducts,
  deleteProduct,
  filterProducts,
  getAllProducts,
  getProductById,
  getProductBySku,
  getLowStockCount,
  getLowStockList,
  createVariants,
  updateVariant,
  deleteVariant,
  getVariantBySku,
  searchProducts,
  updatedProduct,
} from "../controllers/productController.js";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/filter", filterProducts);
router.get("/low-stock/summary", getLowStockCount);
router.get("/low-stock/list", getLowStockList);
router.get("/sku/:sku", getProductBySku);
router.get("/:id", getProductById);

// Variant routes
router.post("/:id/variants", createVariants);
router.put("/variants/:variantId", updateVariant);
router.delete("/variants/:variantId", deleteVariant);
router.get("/variants/sku/:sku", getVariantBySku);

// Admin routes (add auth middlewares later)
router.post("/", createProducts);
router.put("/:id", updatedProduct);
router.delete("/:id", deleteProduct);

export default router;
