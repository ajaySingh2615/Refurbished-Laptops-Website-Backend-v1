import { db } from "../db/client.js";
import {
  coupons,
  couponUsage,
  cartCoupons,
  products,
  categories,
  cartItems,
  carts,
} from "../db/schema.js";
import {
  eq,
  and,
  desc,
  sql,
  isNull,
  or,
  inArray,
  gte,
  lte,
  ne,
} from "drizzle-orm";

export class CouponService {
  /**
   * Create a new coupon
   */
  static async createCoupon(couponData, adminUserId) {
    try {
      // Clean up data - convert empty strings to null for decimal fields
      const cleanDecimalField = (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        return parseFloat(value);
      };

      const cleanIntField = (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        return parseInt(value);
      };

      // Convert date strings to Date objects - only add fields with actual values
      const processedData = {
        code: couponData.code,
        name: couponData.name,
        type: couponData.type,
        value: couponData.value,
        createdBy: adminUserId || 1, // Fallback to admin user ID 1 if undefined
        validFrom: new Date(couponData.validFrom),
        validUntil: new Date(couponData.validUntil),
        applicableTo: couponData.applicableTo || "all",
        isActive:
          couponData.isActive !== undefined ? couponData.isActive : true,
        isPublic:
          couponData.isPublic !== undefined ? couponData.isPublic : true,
        stackable:
          couponData.stackable !== undefined ? couponData.stackable : false,
        autoApply:
          couponData.autoApply !== undefined ? couponData.autoApply : false,
        priority: couponData.priority !== undefined ? couponData.priority : 0,
      };

      // Only add optional fields if they have valid values
      if (couponData.description) {
        processedData.description = couponData.description;
      }

      const minOrder = cleanDecimalField(couponData.minOrderAmount);
      if (minOrder !== null) {
        processedData.minOrderAmount = minOrder;
      }

      const maxDiscount = cleanDecimalField(couponData.maxDiscountAmount);
      if (maxDiscount !== null) {
        processedData.maxDiscountAmount = maxDiscount;
      }

      const usageLim = cleanIntField(couponData.usageLimit);
      if (usageLim !== null) {
        processedData.usageLimit = usageLim;
      }

      const usageLimPerUser = cleanIntField(couponData.usageLimitPerUser);
      if (usageLimPerUser !== null) {
        processedData.usageLimitPerUser = usageLimPerUser;
      }

      // Add JSON fields only if they have values
      if (
        couponData.applicableCategories &&
        couponData.applicableCategories.length > 0
      ) {
        processedData.applicableCategories = couponData.applicableCategories;
      }
      if (
        couponData.applicableProducts &&
        couponData.applicableProducts.length > 0
      ) {
        processedData.applicableProducts = couponData.applicableProducts;
      }
      if (
        couponData.applicableBrands &&
        couponData.applicableBrands.length > 0
      ) {
        processedData.applicableBrands = couponData.applicableBrands;
      }
      if (
        couponData.excludedCategories &&
        couponData.excludedCategories.length > 0
      ) {
        processedData.excludedCategories = couponData.excludedCategories;
      }
      if (
        couponData.excludedProducts &&
        couponData.excludedProducts.length > 0
      ) {
        processedData.excludedProducts = couponData.excludedProducts;
      }
      if (couponData.excludedBrands && couponData.excludedBrands.length > 0) {
        processedData.excludedBrands = couponData.excludedBrands;
      }

      const coupon = await db.insert(coupons).values(processedData);

      return {
        success: true,
        data: coupon,
        message: "Coupon created successfully",
      };
    } catch (error) {
      console.error("Error creating coupon:", error);

      // Handle all duplicate entry errors (catch any variation)
      const errorString = error.toString().toLowerCase();
      const errorMessage = (error.message || "").toLowerCase();
      const causeMessage = (error.cause?.sqlMessage || "").toLowerCase();
      const causeCode = error.cause?.code;

      if (
        error.code === "ER_DUP_ENTRY" ||
        causeCode === "ER_DUP_ENTRY" ||
        errorString.includes("duplicate") ||
        errorMessage.includes("duplicate") ||
        causeMessage.includes("duplicate") ||
        errorString.includes("unique") ||
        causeMessage.includes("unique")
      ) {
        return {
          success: false,
          message: `Coupon code '${couponData.code}' already exists. Please choose a different code.`,
          error: "DUPLICATE_CODE",
        };
      }

      return {
        success: false,
        message: "Failed to create coupon",
        error: error.message,
      };
    }
  }

  /**
   * Get all coupons with filters
   */
  static async getCoupons(filters = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        type = "",
        isActive = null,
        isPublic = null,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = filters;

      const offset = (page - 1) * limit;

      let whereConditions = [];

      if (search) {
        whereConditions.push(
          or(
            sql`${coupons.code} LIKE ${`%${search}%`}`,
            sql`${coupons.name} LIKE ${`%${search}%`}`
          )
        );
      }

      if (type) {
        whereConditions.push(eq(coupons.type, type));
      }

      if (isActive !== null) {
        whereConditions.push(eq(coupons.isActive, isActive));
      }

      if (isPublic !== null) {
        whereConditions.push(eq(coupons.isPublic, isPublic));
      }

      const whereClause =
        whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const couponList = await db
        .select()
        .from(coupons)
        .where(whereClause)
        .orderBy(sortOrder === "desc" ? desc(coupons[sortBy]) : coupons[sortBy])
        .limit(limit)
        .offset(offset);

      const totalCount = await db
        .select({ count: sql`count(*)` })
        .from(coupons)
        .where(whereClause);

      return {
        success: true,
        data: {
          coupons: couponList,
          pagination: {
            page,
            limit,
            total: totalCount[0].count,
            pages: Math.ceil(totalCount[0].count / limit),
          },
        },
      };
    } catch (error) {
      console.error("Error getting coupons:", error);
      return {
        success: false,
        message: "Failed to get coupons",
        error: error.message,
      };
    }
  }

  /**
   * Get coupon by ID
   */
  static async getCouponById(couponId) {
    try {
      const coupon = await db
        .select()
        .from(coupons)
        .where(eq(coupons.id, couponId))
        .limit(1);

      if (coupon.length === 0) {
        return {
          success: false,
          message: "Coupon not found",
        };
      }

      return {
        success: true,
        data: coupon[0],
      };
    } catch (error) {
      console.error("Error getting coupon:", error);
      return {
        success: false,
        message: "Failed to get coupon",
        error: error.message,
      };
    }
  }

  /**
   * Get coupon by code
   */
  static async getCouponByCode(code) {
    try {
      const coupon = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .limit(1);

      if (coupon.length === 0) {
        return {
          success: false,
          message: "Coupon not found",
        };
      }

      return {
        success: true,
        data: coupon[0],
      };
    } catch (error) {
      console.error("Error getting coupon by code:", error);
      return {
        success: false,
        message: "Failed to get coupon",
        error: error.message,
      };
    }
  }

  /**
   * Update coupon
   */
  static async updateCoupon(couponId, updateData) {
    try {
      // Clean up data - convert empty strings to null for decimal fields
      const cleanDecimalField = (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        return parseFloat(value);
      };

      const cleanIntField = (value) => {
        if (value === "" || value === null || value === undefined) {
          return null;
        }
        return parseInt(value);
      };

      // Process the update data
      const processedData = {
        ...updateData,
        // Clean decimal fields if they exist
        ...(updateData.minOrderAmount !== undefined && {
          minOrderAmount: cleanDecimalField(updateData.minOrderAmount),
        }),
        ...(updateData.maxDiscountAmount !== undefined && {
          maxDiscountAmount: cleanDecimalField(updateData.maxDiscountAmount),
        }),
        // Clean integer fields if they exist
        ...(updateData.usageLimit !== undefined && {
          usageLimit: cleanIntField(updateData.usageLimit),
        }),
        ...(updateData.usageLimitPerUser !== undefined && {
          usageLimitPerUser: cleanIntField(updateData.usageLimitPerUser),
        }),
        // Clean JSON fields - convert empty arrays to null
        ...(updateData.applicableCategories !== undefined && {
          applicableCategories:
            updateData.applicableCategories &&
            updateData.applicableCategories.length > 0
              ? updateData.applicableCategories
              : null,
        }),
        ...(updateData.applicableProducts !== undefined && {
          applicableProducts:
            updateData.applicableProducts &&
            updateData.applicableProducts.length > 0
              ? updateData.applicableProducts
              : null,
        }),
        ...(updateData.applicableBrands !== undefined && {
          applicableBrands:
            updateData.applicableBrands &&
            updateData.applicableBrands.length > 0
              ? updateData.applicableBrands
              : null,
        }),
        ...(updateData.excludedCategories !== undefined && {
          excludedCategories:
            updateData.excludedCategories &&
            updateData.excludedCategories.length > 0
              ? updateData.excludedCategories
              : null,
        }),
        ...(updateData.excludedProducts !== undefined && {
          excludedProducts:
            updateData.excludedProducts &&
            updateData.excludedProducts.length > 0
              ? updateData.excludedProducts
              : null,
        }),
        ...(updateData.excludedBrands !== undefined && {
          excludedBrands:
            updateData.excludedBrands && updateData.excludedBrands.length > 0
              ? updateData.excludedBrands
              : null,
        }),
      };

      await db
        .update(coupons)
        .set(processedData)
        .where(eq(coupons.id, couponId));

      return {
        success: true,
        message: "Coupon updated successfully",
      };
    } catch (error) {
      console.error("Error updating coupon:", error);
      return {
        success: false,
        message: "Failed to update coupon",
        error: error.message,
      };
    }
  }

  /**
   * Delete coupon
   */
  static async deleteCoupon(couponId) {
    try {
      // Check if coupon has been used
      const usage = await db
        .select({ count: sql`count(*)` })
        .from(couponUsage)
        .where(eq(couponUsage.couponId, couponId));

      if (usage[0].count > 0) {
        return {
          success: false,
          message: "Cannot delete coupon that has been used",
        };
      }

      await db.delete(coupons).where(eq(coupons.id, couponId));

      return {
        success: true,
        message: "Coupon deleted successfully",
      };
    } catch (error) {
      console.error("Error deleting coupon:", error);
      return {
        success: false,
        message: "Failed to delete coupon",
        error: error.message,
      };
    }
  }

  /**
   * Validate coupon for cart
   */
  static async validateCoupon(
    couponCode,
    cartId,
    userId = null,
    sessionId = null,
    options = { skipUsageChecks: false, allowAlreadyApplied: false }
  ) {
    try {
      // Get coupon
      const couponResult = await this.getCouponByCode(couponCode);
      if (!couponResult.success) {
        return couponResult;
      }

      const coupon = couponResult.data;

      // Check if coupon is active
      if (!coupon.isActive) {
        return {
          success: false,
          message: "Coupon is not active",
        };
      }

      // Check validity dates
      const now = new Date();
      if (
        now < new Date(coupon.validFrom) ||
        now > new Date(coupon.validUntil)
      ) {
        return {
          success: false,
          message: "Coupon is not valid at this time",
        };
      }

      // Check usage limits
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return {
          success: false,
          message: "Coupon usage limit exceeded",
        };
      }

      // Check per-user usage limit (skip when only applying to cart)
      if (!options?.skipUsageChecks && userId) {
        console.log(
          "🔍 Checking usage for user:",
          userId,
          "coupon:",
          coupon.id
        );
        const userUsage = await db
          .select({ count: sql`count(*)` })
          .from(couponUsage)
          .where(
            and(
              eq(couponUsage.couponId, coupon.id),
              eq(couponUsage.userId, userId)
            )
          );

        console.log(
          "📊 User usage count:",
          userUsage[0].count,
          "limit:",
          coupon.usageLimitPerUser
        );
        if (userUsage[0].count >= coupon.usageLimitPerUser) {
          return {
            success: false,
            message: "You have already used this coupon",
          };
        }
      } else if (!options?.skipUsageChecks) {
        console.log("⚠️ No userId provided, checking session usage");
        if (sessionId) {
          const sessionUsage = await db
            .select({ count: sql`count(*)` })
            .from(couponUsage)
            .where(
              and(
                eq(couponUsage.couponId, coupon.id),
                eq(couponUsage.sessionId, sessionId)
              )
            );

          console.log("📊 Session usage count:", sessionUsage[0].count);
          if (sessionUsage[0].count >= coupon.usageLimitPerUser) {
            return {
              success: false,
              message: "You have already used this coupon",
            };
          }
        }
      }

      // Get cart details
      const cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);

      if (cart.length === 0) {
        return {
          success: false,
          message: "Cart not found",
        };
      }

      const cartData = cart[0];

      // Check minimum order amount
      const cartSubtotal = parseFloat(cartData.subtotal);
      const minOrderAmount = parseFloat(coupon.minOrderAmount);

      if (cartSubtotal < minOrderAmount) {
        return {
          success: false,
          message: `Minimum order amount of ₹${minOrderAmount} required`,
        };
      }

      // Check if coupon is already applied to cart
      const existingCoupon = await db
        .select()
        .from(cartCoupons)
        .where(
          and(
            eq(cartCoupons.cartId, cartId),
            eq(cartCoupons.couponId, coupon.id)
          )
        );

      if (existingCoupon.length > 0) {
        if (options?.allowAlreadyApplied) {
          // Idempotent success when the same coupon is already on the cart
          return {
            success: true,
            data: coupon,
            message: "Coupon already applied to cart",
          };
        }
        return {
          success: false,
          message: "Coupon already applied to cart",
        };
      }

      // Check stackability
      if (!coupon.stackable) {
        const appliedCoupons = await db
          .select()
          .from(cartCoupons)
          .where(eq(cartCoupons.cartId, cartId));

        if (appliedCoupons.length > 0) {
          const appliedCouponCodes = appliedCoupons
            .map((c) => c.couponCode)
            .join(", ");
          return {
            success: false,
            message: `This coupon cannot be used with other coupons. Please remove the existing coupon(s): ${appliedCouponCodes}`,
          };
        }
      }

      // Get cart items for product/category validation
      const cartItemsData = await db
        .select({
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          lineTotal: cartItems.lineTotal,
        })
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));

      // Validate applicable products/categories/brands
      const validationResult = await this.validateCouponApplicability(
        coupon,
        cartItemsData
      );

      if (!validationResult.valid) {
        return {
          success: false,
          message: validationResult.message,
        };
      }

      return {
        success: true,
        data: coupon,
        message: "Coupon is valid",
      };
    } catch (error) {
      console.error("Error validating coupon:", error);
      return {
        success: false,
        message: "Failed to validate coupon",
        error: error.message,
      };
    }
  }

  /**
   * Apply coupon to cart
   */
  static async applyCoupon(
    couponCode,
    cartId,
    userId = null,
    sessionId = null
  ) {
    try {
      // Validate coupon first
      const validation = await this.validateCoupon(
        couponCode,
        cartId,
        userId,
        sessionId,
        { skipUsageChecks: true, allowAlreadyApplied: true }
      );
      if (!validation.success) {
        return validation;
      }

      const coupon = validation.data;

      // Calculate discount amount
      const cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);

      const cartData = cart[0];
      let discountAmount = 0;

      const cartSubtotal = parseFloat(cartData.subtotal);
      const couponValue = parseFloat(coupon.value);

      switch (coupon.type) {
        case "percentage":
          discountAmount = (cartSubtotal * couponValue) / 100;
          if (
            coupon.maxDiscountAmount &&
            discountAmount > parseFloat(coupon.maxDiscountAmount)
          ) {
            discountAmount = parseFloat(coupon.maxDiscountAmount);
          }
          break;
        case "fixed_amount":
          discountAmount = couponValue;
          break;
        case "free_shipping":
          discountAmount = parseFloat(cartData.shippingAmount) || 0;
          break;
        default:
          return {
            success: false,
            message: "Invalid coupon type",
          };
      }

      // Idempotent apply: update if exists, else insert
      const existing = await db
        .select()
        .from(cartCoupons)
        .where(
          and(
            eq(cartCoupons.cartId, cartId),
            eq(cartCoupons.couponId, coupon.id)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(cartCoupons)
          .set({
            discountAmount,
            discountValue: coupon.value,
            discountType: coupon.type,
          })
          .where(eq(cartCoupons.id, existing[0].id));
      } else {
        await db.insert(cartCoupons).values({
          cartId,
          couponId: coupon.id,
          couponCode: coupon.code,
          discountType: coupon.type,
          discountValue: coupon.value,
          discountAmount,
          appliedBy: userId,
        });
      }

      // Optionally reflect the last applied coupon code on the cart for quick reads
      try {
        await db
          .update(carts)
          .set({ appliedCouponCode: coupon.code })
          .where(eq(carts.id, cartId));
      } catch (e) {
        // best-effort; ignore if the column isn't used
      }

      // IMPORTANT: Do not record usage or increment usageCount at apply-to-cart time.
      // Usage should be recorded only when an order is successfully placed.

      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);

      return {
        success: true,
        data: {
          coupon,
          discountAmount,
        },
        message: "Coupon applied successfully",
      };
    } catch (error) {
      console.error("Error applying coupon:", error);
      return {
        success: false,
        message: "Failed to apply coupon",
        error: error.message,
      };
    }
  }

  /**
   * Record coupon usage at order placement time.
   * This consumes usage limits and writes to coupon_usage for all coupons on the cart.
   */
  static async recordUsageForOrder(
    orderId,
    cartId,
    userId = null,
    sessionId = null
  ) {
    try {
      // Get cart totals for recording orderAmount
      const cartRows = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);
      if (cartRows.length === 0) {
        return { success: false, message: "Cart not found" };
      }
      const cartRow = cartRows[0];

      // Get applied coupons for this cart
      const applied = await db
        .select()
        .from(cartCoupons)
        .where(eq(cartCoupons.cartId, cartId));

      if (applied.length === 0) {
        return { success: true, message: "No coupons to record" };
      }

      // Record usage for each applied coupon
      for (const cc of applied) {
        await db.insert(couponUsage).values({
          couponId: cc.couponId,
          userId,
          sessionId,
          orderId,
          cartId,
          discountAmount: cc.discountAmount,
          orderAmount: cartRow.subtotal,
        });

        // Increment coupon usage count
        await db
          .update(coupons)
          .set({ usageCount: sql`${coupons.usageCount} + 1` })
          .where(eq(coupons.id, cc.couponId));
      }

      // Clear coupons from cart after successful recording
      await db.delete(cartCoupons).where(eq(cartCoupons.cartId, cartId));

      return { success: true };
    } catch (error) {
      console.error("Error recording coupon usage for order:", error);
      return {
        success: false,
        message: "Failed to record coupon usage",
        error: error.message,
      };
    }
  }

  /**
   * Remove coupon from cart
   */
  static async removeCoupon(cartCouponId, cartId) {
    try {
      // Remove coupon from cart using cart coupon ID
      await db
        .delete(cartCoupons)
        .where(
          and(eq(cartCoupons.cartId, cartId), eq(cartCoupons.id, cartCouponId))
        );

      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);

      return {
        success: true,
        message: "Coupon removed successfully",
      };
    } catch (error) {
      console.error("Error removing coupon:", error);
      return {
        success: false,
        message: "Failed to remove coupon",
        error: error.message,
      };
    }
  }

  /**
   * Clear all coupons from cart (for debugging)
   */
  static async clearAllCouponsFromCart(cartId) {
    try {
      // Remove all coupons from cart
      await db.delete(cartCoupons).where(eq(cartCoupons.cartId, cartId));

      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);

      return {
        success: true,
        message: "All coupons cleared from cart",
      };
    } catch (error) {
      console.error("Error clearing coupons:", error);
      return {
        success: false,
        message: "Failed to clear coupons",
        error: error.message,
      };
    }
  }

  /**
   * Get coupon analytics
   */
  static async getCouponAnalytics(couponId, dateRange = {}) {
    try {
      const { startDate, endDate } = dateRange;

      let whereConditions = [eq(couponUsage.couponId, couponId)];

      if (startDate) {
        whereConditions.push(gte(couponUsage.usedAt, startDate));
      }

      if (endDate) {
        whereConditions.push(lte(couponUsage.usedAt, endDate));
      }

      const analytics = await db
        .select({
          totalUsage: sql`count(*)`,
          totalDiscount: sql`sum(${couponUsage.discountAmount})`,
          totalOrderValue: sql`sum(${couponUsage.orderAmount})`,
          uniqueUsers: sql`count(distinct ${couponUsage.userId})`,
        })
        .from(couponUsage)
        .where(and(...whereConditions));

      return {
        success: true,
        data: analytics[0],
      };
    } catch (error) {
      console.error("Error getting coupon analytics:", error);
      return {
        success: false,
        message: "Failed to get coupon analytics",
        error: error.message,
      };
    }
  }

  /**
   * Validate coupon applicability to products
   */
  static async validateCouponApplicability(coupon, cartItems) {
    try {
      if (coupon.applicableTo === "all") {
        return { valid: true };
      }

      // Get product details for cart items
      const productIds = cartItems.map((item) => item.productId);
      const productsData = await db
        .select({
          id: products.id,
          categoryId: products.categoryId,
          brand: products.brand,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      // Check category restrictions
      if (
        coupon.applicableCategories &&
        coupon.applicableCategories.length > 0
      ) {
        const applicableCategoryIds = coupon.applicableCategories;
        const hasApplicableCategory = productsData.some((product) =>
          applicableCategoryIds.includes(product.categoryId)
        );

        if (!hasApplicableCategory) {
          return {
            valid: false,
            message: "Coupon is not applicable to any items in your cart",
          };
        }
      }

      // Check product restrictions
      if (coupon.applicableProducts && coupon.applicableProducts.length > 0) {
        const applicableProductIds = coupon.applicableProducts;
        const hasApplicableProduct = productsData.some((product) =>
          applicableProductIds.includes(product.id)
        );

        if (!hasApplicableProduct) {
          return {
            valid: false,
            message: "Coupon is not applicable to any items in your cart",
          };
        }
      }

      // Check brand restrictions
      if (coupon.applicableBrands && coupon.applicableBrands.length > 0) {
        const applicableBrands = coupon.applicableBrands;
        const hasApplicableBrand = productsData.some((product) =>
          applicableBrands.includes(product.brand)
        );

        if (!hasApplicableBrand) {
          return {
            valid: false,
            message: "Coupon is not applicable to any items in your cart",
          };
        }
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating coupon applicability:", error);
      return {
        valid: false,
        message: "Error validating coupon applicability",
      };
    }
  }

  /**
   * Recalculate cart totals after coupon changes
   */
  static async recalculateCartTotals(cartId) {
    try {
      // Get cart items
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));

      // Get applied coupons
      const appliedCoupons = await db
        .select()
        .from(cartCoupons)
        .where(eq(cartCoupons.cartId, cartId));

      // Calculate subtotal
      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.lineTotal),
        0
      );

      // Calculate total discount
      const totalDiscount = appliedCoupons.reduce(
        (sum, coupon) => sum + parseFloat(coupon.discountAmount),
        0
      );

      // Calculate tax (assuming 18% GST)
      const taxableAmount = subtotal - totalDiscount;
      const taxAmount = taxableAmount * 0.18;

      // Calculate total
      const totalAmount = subtotal - totalDiscount + taxAmount;

      // Update cart
      await db
        .update(carts)
        .set({
          subtotal: subtotal.toString(),
          discountAmount: totalDiscount.toString(),
          taxAmount: taxAmount.toString(),
          totalAmount: totalAmount.toString(),
          itemCount: items.length,
        })
        .where(eq(carts.id, cartId));

      return {
        success: true,
        data: {
          subtotal,
          discountAmount: totalDiscount,
          taxAmount,
          totalAmount,
        },
      };
    } catch (error) {
      console.error("Error recalculating cart totals:", error);
      return {
        success: false,
        message: "Failed to recalculate cart totals",
        error: error.message,
      };
    }
  }
}
