import express from "express";
import { CartController } from "../controllers/cartController.js";
import { requireAuth } from "../middleware/auth.js";
import { cartSession } from "../middleware/cartSession.js";

const router = express.Router();

// Apply cart session middleware to all routes
router.use(cartSession);

// Public routes (work for both authenticated and guest users)
router.get("/", CartController.getCart);
router.post("/add", CartController.addToCart);
router.put("/items/:itemId", CartController.updateCartItem);
router.delete("/items/:itemId", CartController.removeFromCart);
router.delete("/clear", CartController.clearCart);
router.post("/coupon", CartController.applyCoupon);
router.post("/track-abandonment", CartController.trackAbandonment);
router.get("/summary", CartController.getCartSummary);

// Authenticated routes only
router.post("/save", requireAuth, CartController.saveCart);
router.get("/saved", requireAuth, CartController.getSavedCarts);
router.post("/merge", requireAuth, CartController.mergeCarts);

export default router;
