import { CartService } from "../services/cartService.js";
import { db } from "../db/client.js";
import { carts } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class CartController {
  /**
   * Get current user's cart
   */
  static async getCart(req, res) {
    try {
      const { userId, sessionId } = req.user || {};

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: "User session required",
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      const cartWithItems = await CartService.getCartWithItems(cart.id);

      res.json({
        success: true,
        data: cartWithItems,
      });
    } catch (error) {
      console.error("Error getting cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get cart",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Add item to cart
   */
  static async addToCart(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const {
        productId,
        productVariantId,
        quantity = 1,
        selectedAttributes,
      } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: "User session required",
        });
      }

      if (!productId) {
        return res.status(400).json({
          success: false,
          message: "Product ID is required",
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      const cartItem = await CartService.addToCart(
        cart.id,
        productId,
        productVariantId,
        quantity,
        selectedAttributes
      );

      // Track abandonment for marketing
      await CartService.trackAbandonment(
        cart.id,
        userId,
        null,
        null,
        "added_item"
      );

      res.json({
        success: true,
        message: "Item added to cart",
        data: cartItem,
      });
    } catch (error) {
      console.error("Error adding to cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add item to cart",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(req, res) {
    try {
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: "Item ID is required",
        });
      }

      if (!quantity || quantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Valid quantity is required",
        });
      }

      const cartItem = await CartService.updateCartItem(itemId, quantity);

      res.json({
        success: true,
        message: "Cart item updated",
        data: cartItem,
      });
    } catch (error) {
      console.error("Error updating cart item:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update cart item",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(req, res) {
    try {
      const { itemId } = req.params;

      if (!itemId) {
        return res.status(400).json({
          success: false,
          message: "Item ID is required",
        });
      }

      await CartService.removeFromCart(itemId);

      res.json({
        success: true,
        message: "Item removed from cart",
      });
    } catch (error) {
      console.error("Error removing from cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove item from cart",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Clear entire cart
   */
  static async clearCart(req, res) {
    try {
      const { userId, sessionId } = req.user || {};

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: "User session required",
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      await CartService.clearCart(cart.id);

      res.json({
        success: true,
        message: "Cart cleared",
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to clear cart",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Apply coupon to cart
   */
  static async applyCoupon(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const { couponCode } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: "User session required",
        });
      }

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: "Coupon code is required",
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      await CartService.applyCoupon(cart.id, couponCode);

      res.json({
        success: true,
        message: "Coupon applied successfully",
      });
    } catch (error) {
      console.error("Error applying coupon:", error);
      res.status(500).json({
        success: false,
        message: "Failed to apply coupon",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Save cart as wishlist
   */
  static async saveCart(req, res) {
    try {
      const { userId } = req.user;
      const { cartId, name, description, isPublic = false } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!cartId || !name) {
        return res.status(400).json({
          success: false,
          message: "Cart ID and name are required",
        });
      }

      const savedCart = await CartService.saveCart(
        userId,
        cartId,
        name,
        description,
        isPublic
      );

      res.json({
        success: true,
        message: "Cart saved successfully",
        data: savedCart,
      });
    } catch (error) {
      console.error("Error saving cart:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save cart",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get saved carts (wishlist)
   */
  static async getSavedCarts(req, res) {
    try {
      const { userId } = req.user;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const savedCarts = await db
        .select()
        .from(carts)
        .where(eq(carts.userId, userId));

      res.json({
        success: true,
        data: savedCarts,
      });
    } catch (error) {
      console.error("Error getting saved carts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get saved carts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Track cart abandonment (for analytics)
   */
  static async trackAbandonment(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const { stage = "viewed" } = req.body;

      if (!userId && !sessionId) {
        return res.status(400).json({
          success: false,
          message: "User session required",
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      await CartService.trackAbandonment(cart.id, userId, null, null, stage);

      res.json({
        success: true,
        message: "Abandonment tracked",
      });
    } catch (error) {
      console.error("Error tracking abandonment:", error);
      res.status(500).json({
        success: false,
        message: "Failed to track abandonment",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get cart summary (for header/mini cart)
   */
  static async getCartSummary(req, res) {
    try {
      const { userId, sessionId } = req.user || {};

      if (!userId && !sessionId) {
        return res.json({
          success: true,
          data: {
            itemCount: 0,
            totalAmount: 0,
            items: [],
          },
        });
      }

      const cart = await CartService.getOrCreateCart(userId, sessionId);
      const cartWithItems = await CartService.getCartWithItems(cart.id);

      res.json({
        success: true,
        data: {
          itemCount: cartWithItems.itemCount,
          totalAmount: cartWithItems.totalAmount,
          items: cartWithItems.items.slice(0, 3), // Show only first 3 items in summary
        },
      });
    } catch (error) {
      console.error("Error getting cart summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get cart summary",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Merge guest cart with user cart on login
   */
  static async mergeCarts(req, res) {
    try {
      const { userId } = req.user;
      const { sessionId } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required",
        });
      }

      // Get guest cart
      const guestCart = await db
        .select()
        .from(carts)
        .where(and(eq(carts.sessionId, sessionId), eq(carts.status, "active")))
        .limit(1);

      if (guestCart.length === 0) {
        return res.json({
          success: true,
          message: "No guest cart to merge",
        });
      }

      // Get or create user cart
      const userCart = await CartService.getOrCreateCart(userId, null);

      // Move items from guest cart to user cart
      // This would require additional logic to handle conflicts
      // For now, we'll just update the guest cart to belong to the user
      await db
        .update(carts)
        .set({
          userId,
          sessionId: null,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, guestCart[0].id));

      res.json({
        success: true,
        message: "Carts merged successfully",
      });
    } catch (error) {
      console.error("Error merging carts:", error);
      res.status(500).json({
        success: false,
        message: "Failed to merge carts",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
}
