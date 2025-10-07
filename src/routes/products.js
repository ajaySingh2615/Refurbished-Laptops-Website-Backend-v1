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

// Admin routes (add auth middlewares later)
router.post("/", createProducts);
router.put("/:id", updatedProduct);
router.delete("/:id", deleteProduct);

export default router;
