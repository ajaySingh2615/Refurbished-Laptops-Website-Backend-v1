import { reviewService } from "../services/reviewService.js";
import { authMiddleware } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";

export const reviewController = {
  // Get product reviews (public)
  async getProductReviews(req, res) {
    try {
      const { productId } = req.params;
      const {
        limit = 10,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const reviews = await reviewService.getProductReviews(productId, {
        status: "approved",
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder,
        includeUser: true,
      });

      const stats = await reviewService.getProductReviewStats(productId);

      res.json({
        success: true,
        data: {
          reviews,
          stats,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            hasMore: reviews.length === parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Error fetching product reviews:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch product reviews",
        error: error.message,
      });
    }
  },

  // Get product review statistics
  async getProductReviewStats(req, res) {
    try {
      const { productId } = req.params;
      const stats = await reviewService.getProductReviewStats(productId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Error fetching review stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch review statistics",
        error: error.message,
      });
    }
  },

  // Create a new review
  async createReview(req, res) {
    try {
      const userId = req.user.sub;
      const { productId } = req.params;
      const {
        rating,
        title,
        review,
        isVerifiedPurchase = false,
        isAnonymous = false,
      } = req.body;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating must be between 1 and 5",
        });
      }

      // Check if user can review
      const canReview = await reviewService.canUserReview(productId, userId);
      if (!canReview) {
        return res.status(400).json({
          success: false,
          message: "You have already reviewed this product",
        });
      }

      const newReview = await reviewService.createReview({
        productId: parseInt(productId),
        userId,
        rating,
        title,
        review,
        isVerifiedPurchase,
        isAnonymous,
      });

      res.status(201).json({
        success: true,
        message:
          "Review submitted successfully. It will be published after admin approval.",
        data: newReview,
      });
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create review",
        error: error.message,
      });
    }
  },

  // Update review helpfulness
  async updateReviewHelpfulness(req, res) {
    try {
      const userId = req.user.sub;
      const { reviewId } = req.params;
      const { isHelpful } = req.body;

      if (typeof isHelpful !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isHelpful must be a boolean value",
        });
      }

      const result = await reviewService.updateReviewHelpfulness(
        parseInt(reviewId),
        userId,
        isHelpful
      );

      res.json({
        success: true,
        message: "Review helpfulness updated",
        data: result,
      });
    } catch (error) {
      console.error("Error updating review helpfulness:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update review helpfulness",
        error: error.message,
      });
    }
  },

  // Admin: Get all reviews
  async getAdminReviews(req, res) {
    try {
      const {
        status = "all",
        limit = 20,
        offset = 0,
        sortBy = "createdAt",
        sortOrder = "desc",
        productId = null,
      } = req.query;

      const reviews = await reviewService.getAdminReviews({
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder,
        productId: productId ? parseInt(productId) : null,
      });

      res.json({
        success: true,
        data: reviews,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: reviews.length === parseInt(limit),
        },
      });
    } catch (error) {
      console.error("Error fetching admin reviews:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch reviews",
        error: error.message,
      });
    }
  },

  // Admin: Approve review
  async approveReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { adminNotes } = req.body;

      const updatedReview = await reviewService.approveReview(
        parseInt(reviewId),
        adminNotes
      );

      res.json({
        success: true,
        message: "Review approved successfully",
        data: updatedReview,
      });
    } catch (error) {
      console.error("Error approving review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to approve review",
        error: error.message,
      });
    }
  },

  // Admin: Reject review
  async rejectReview(req, res) {
    try {
      const { reviewId } = req.params;
      const { adminNotes } = req.body;

      const updatedReview = await reviewService.rejectReview(
        parseInt(reviewId),
        adminNotes
      );

      res.json({
        success: true,
        message: "Review rejected successfully",
        data: updatedReview,
      });
    } catch (error) {
      console.error("Error rejecting review:", error);
      res.status(500).json({
        success: false,
        message: "Failed to reject review",
        error: error.message,
      });
    }
  },

  // Check if user can review product
  async canUserReview(req, res) {
    try {
      const userId = req.user.sub;
      const { productId } = req.params;

      const canReview = await reviewService.canUserReview(
        parseInt(productId),
        userId
      );

      res.json({
        success: true,
        data: { canReview },
      });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({
        success: false,
        message: "Failed to check review eligibility",
        error: error.message,
      });
    }
  },
};
