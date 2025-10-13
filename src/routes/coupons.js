import express from "express";
import { CouponController } from "../controllers/couponController.js";
import { requireAuth } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";
import { cartSession } from "../middleware/cartSession.js";

const router = express.Router();

// Admin routes (require authentication and admin role)
router.post("/", requireAuth, adminMiddleware, CouponController.createCoupon);
router.get("/", requireAuth, adminMiddleware, CouponController.getCoupons);
router.get(
  "/:id",
  requireAuth,
  adminMiddleware,
  CouponController.getCouponById
);
router.put("/:id", requireAuth, adminMiddleware, CouponController.updateCoupon);
router.delete(
  "/:id",
  requireAuth,
  adminMiddleware,
  CouponController.deleteCoupon
);
router.get(
  "/:id/analytics",
  requireAuth,
  adminMiddleware,
  CouponController.getCouponAnalytics
);

// Public routes
router.get("/public/list", CouponController.getPublicCoupons);

// Cart-related routes (require cart session)
router.post("/validate/:cartId", cartSession, CouponController.validateCoupon);
router.post("/apply/:cartId", cartSession, CouponController.applyCoupon);
router.delete(
  "/remove/:cartId/:couponId",
  cartSession,
  CouponController.removeCoupon
);
router.delete(
  "/clear/:cartId",
  cartSession,
  CouponController.clearAllCouponsFromCart
);

export default router;
