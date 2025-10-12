import { CouponService } from "../services/couponService.js";

export class CouponController {
  /**
   * Create a new coupon (Admin only)
   */
  static async createCoupon(req, res) {
    try {
      const adminUserId = req.user.id;
      console.log("Admin user ID:", adminUserId);
      console.log("Request user:", req.user);
      const couponData = req.body;

      // Validate required fields
      const requiredFields = [
        "code",
        "name",
        "type",
        "value",
        "validFrom",
        "validUntil",
      ];

      for (const field of requiredFields) {
        if (!couponData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`,
          });
        }
      }

      // Validate coupon type
      const validTypes = [
        "percentage",
        "fixed_amount",
        "free_shipping",
        "buy_x_get_y",
      ];
      if (!validTypes.includes(couponData.type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid coupon type",
        });
      }

      // Validate value based on type
      if (
        couponData.type === "percentage" &&
        (couponData.value < 0 || couponData.value > 100)
      ) {
        return res.status(400).json({
          success: false,
          message: "Percentage value must be between 0 and 100",
        });
      }

      if (couponData.type === "fixed_amount" && couponData.value < 0) {
        return res.status(400).json({
          success: false,
          message: "Fixed amount must be positive",
        });
      }

      const result = await CouponService.createCoupon(couponData, adminUserId);

      if (result.success) {
        res.status(201).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in createCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get all coupons with filters (Admin only)
   */
  static async getCoupons(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        search: req.query.search || "",
        type: req.query.type || "",
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : null,
        isPublic:
          req.query.isPublic !== undefined
            ? req.query.isPublic === "true"
            : null,
        sortBy: req.query.sortBy || "createdAt",
        sortOrder: req.query.sortOrder || "desc",
      };

      const result = await CouponService.getCoupons(filters);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getCoupons:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get coupon by ID (Admin only)
   */
  static async getCouponById(req, res) {
    try {
      const { id } = req.params;
      const result = await CouponService.getCouponById(parseInt(id));

      if (result.success) {
        res.json(result);
      } else {
        res.status(404).json(result);
      }
    } catch (error) {
      console.error("Error in getCouponById:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Update coupon (Admin only)
   */
  static async updateCoupon(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.createdBy;
      delete updateData.createdAt;
      delete updateData.usageCount;

      const result = await CouponService.updateCoupon(parseInt(id), updateData);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in updateCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete coupon (Admin only)
   */
  static async deleteCoupon(req, res) {
    try {
      const { id } = req.params;
      const result = await CouponService.deleteCoupon(parseInt(id));

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in deleteCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Validate coupon (Public)
   */
  static async validateCoupon(req, res) {
    try {
      const { code } = req.body;
      const { cartId } = req.params;
      const userId = req.user?.userId || null;
      const sessionId = req.user?.sessionId || null;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is required",
        });
      }

      const result = await CouponService.validateCoupon(
        code,
        parseInt(cartId),
        userId,
        sessionId
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in validateCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Apply coupon to cart (Public)
   */
  static async applyCoupon(req, res) {
    try {
      const { code } = req.body;
      const { cartId } = req.params;
      const userId = req.user?.userId || null;
      const sessionId = req.user?.sessionId || null;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is required",
        });
      }

      const result = await CouponService.applyCoupon(
        code,
        parseInt(cartId),
        userId,
        sessionId
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in applyCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Remove coupon from cart (Public)
   */
  static async removeCoupon(req, res) {
    try {
      const { cartId, couponId } = req.params;
      const result = await CouponService.removeCoupon(
        parseInt(couponId),
        parseInt(cartId)
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in removeCoupon:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get coupon analytics (Admin only)
   */
  static async getCouponAnalytics(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const dateRange = {};
      if (startDate) dateRange.startDate = new Date(startDate);
      if (endDate) dateRange.endDate = new Date(endDate);

      const result = await CouponService.getCouponAnalytics(
        parseInt(id),
        dateRange
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getCouponAnalytics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get public coupons (for frontend display)
   */
  static async getPublicCoupons(req, res) {
    try {
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        isActive: true,
        isPublic: true,
        sortBy: "priority",
        sortOrder: "desc",
      };

      const result = await CouponService.getCoupons(filters);

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error in getPublicCoupons:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}
