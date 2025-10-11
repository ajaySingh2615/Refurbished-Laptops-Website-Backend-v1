import express from "express";
import { reviewController } from "../controllers/reviewController.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";

const router = express.Router();

// Public routes
router.get("/product/:productId", reviewController.getProductReviews);
router.get("/product/:productId/stats", reviewController.getProductReviewStats);

// Protected routes (require authentication)
router.get(
  "/product/:productId/can-review",
  authMiddleware,
  reviewController.canUserReview
);
router.post(
  "/product/:productId",
  authMiddleware,
  reviewController.createReview
);
router.post(
  "/:reviewId/helpful",
  authMiddleware,
  reviewController.updateReviewHelpfulness
);

// Admin routes (require admin authentication)
router.get("/admin/reviews", adminMiddleware, reviewController.getAdminReviews);
router.post(
  "/admin/:reviewId/approve",
  adminMiddleware,
  reviewController.approveReview
);
router.post(
  "/admin/:reviewId/reject",
  adminMiddleware,
  reviewController.rejectReview
);

export default router;
