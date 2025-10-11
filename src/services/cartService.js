import { db } from "../db/client.js";
import {
  carts,
  cartItems,
  products,
  productVariants,
  productImages,
  cartAbandonment,
  savedCarts,
  cartCoupons,
} from "../db/schema.js";
import { eq, and, desc, sql, isNull, or } from "drizzle-orm";

export class CartService {
  /**
   * Get or create cart for user (authenticated or guest)
   */
  static async getOrCreateCart(userId = null, sessionId = null) {
    try {
      let cart;

      if (userId) {
        // Look for existing active cart for authenticated user
        cart = await db
          .select()
          .from(carts)
          .where(and(eq(carts.userId, userId), eq(carts.status, "active")))
          .limit(1);

        if (cart.length === 0) {
          // Create new cart for authenticated user
          const insertResult = await db.insert(carts).values({
            userId,
            status: "active",
            currency: "INR",
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          });

          // Get the created cart
          const newCart = await db
            .select()
            .from(carts)
            .where(and(eq(carts.userId, userId), eq(carts.status, "active")))
            .limit(1);
          cart = newCart;
        }
      } else if (sessionId) {
        // Look for existing active cart for guest user
        cart = await db
          .select()
          .from(carts)
          .where(
            and(eq(carts.sessionId, sessionId), eq(carts.status, "active"))
          )
          .limit(1);

        if (cart.length === 0) {
          // Create new cart for guest user
          const insertResult = await db.insert(carts).values({
            sessionId,
            status: "active",
            currency: "INR",
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days for guests
          });

          // Get the created cart
          const newCart = await db
            .select()
            .from(carts)
            .where(
              and(eq(carts.sessionId, sessionId), eq(carts.status, "active"))
            )
            .limit(1);
          cart = newCart;
        }
      } else {
        throw new Error("Either userId or sessionId must be provided");
      }

      return cart[0];
    } catch (error) {
      console.error("Error getting or creating cart:", error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  static async addToCart(
    cartId,
    productId,
    productVariantId = null,
    quantity = 1,
    selectedAttributes = null
  ) {
    try {
      // Get product details
      const product = await db
        .select()
        .from(products)
        .where(eq(products.id, productId))
        .limit(1);

      if (product.length === 0) {
        throw new Error("Product not found");
      }

      let unitPrice = product[0].price;
      let unitMrp = product[0].mrp;
      let unitDiscountPercent = product[0].discountPercent || 0;
      let unitGstPercent = product[0].gstPercent || 18;

      // If variant is selected, get variant pricing
      if (productVariantId) {
        const variant = await db
          .select()
          .from(productVariants)
          .where(eq(productVariants.id, productVariantId))
          .limit(1);

        if (variant.length === 0) {
          throw new Error("Product variant not found");
        }

        unitPrice = variant[0].price;
        unitMrp = variant[0].mrp;
        unitDiscountPercent = variant[0].discountPercent || 0;
        unitGstPercent = variant[0].gstPercent || 18;
      }

      // Check if item already exists in cart
      const existingItem = await db
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cartId, cartId),
            eq(cartItems.productId, productId),
            productVariantId
              ? eq(cartItems.productVariantId, productVariantId)
              : isNull(cartItems.productVariantId)
          )
        )
        .limit(1);

      if (existingItem.length > 0) {
        // Update quantity
        const newQuantity = existingItem[0].quantity + quantity;
        return await this.updateCartItem(existingItem[0].id, newQuantity);
      } else {
        // Add new item
        const lineTotal = unitPrice * quantity;
        const lineDiscount = (lineTotal * unitDiscountPercent) / 100;
        const lineTax = ((lineTotal - lineDiscount) * unitGstPercent) / 100;

        await db.insert(cartItems).values({
          cartId,
          productId,
          productVariantId,
          quantity,
          unitPrice,
          unitMrp,
          unitDiscountPercent,
          unitGstPercent,
          lineTotal,
          lineTax,
          lineDiscount,
          selectedAttributes,
        });

        // Get the created item
        const newItem = await db
          .select()
          .from(cartItems)
          .where(
            and(
              eq(cartItems.cartId, cartId),
              eq(cartItems.productId, productId),
              productVariantId
                ? eq(cartItems.productVariantId, productVariantId)
                : isNull(cartItems.productVariantId)
            )
          )
          .limit(1);

        // Update cart totals
        await this.updateCartTotals(cartId);

        return newItem[0];
      }
    } catch (error) {
      console.error("Error adding item to cart:", error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  static async updateCartItem(itemId, quantity) {
    try {
      if (quantity <= 0) {
        return await this.removeFromCart(itemId);
      }

      const item = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId))
        .limit(1);

      if (item.length === 0) {
        throw new Error("Cart item not found");
      }

      const lineTotal = item[0].unitPrice * quantity;
      const lineDiscount = (lineTotal * item[0].unitDiscountPercent) / 100;
      const lineTax =
        ((lineTotal - lineDiscount) * item[0].unitGstPercent) / 100;

      await db
        .update(cartItems)
        .set({
          quantity,
          lineTotal,
          lineTax,
          lineDiscount,
          updatedAt: new Date(),
        })
        .where(eq(cartItems.id, itemId));

      // Get the updated item
      const updatedItem = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId))
        .limit(1);

      // Update cart totals
      await this.updateCartTotals(item[0].cartId);

      return updatedItem[0];
    } catch (error) {
      console.error("Error updating cart item:", error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  static async removeFromCart(itemId) {
    try {
      const item = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.id, itemId))
        .limit(1);

      if (item.length === 0) {
        throw new Error("Cart item not found");
      }

      const cartId = item[0].cartId;

      await db.delete(cartItems).where(eq(cartItems.id, itemId));

      // Update cart totals
      await this.updateCartTotals(cartId);

      return { success: true };
    } catch (error) {
      console.error("Error removing item from cart:", error);
      throw error;
    }
  }

  /**
   * Get cart with items and product details
   */
  static async getCartWithItems(cartId) {
    try {
      const cart = await db
        .select()
        .from(carts)
        .where(eq(carts.id, cartId))
        .limit(1);

      if (cart.length === 0) {
        throw new Error("Cart not found");
      }

      const items = await db
        .select({
          id: cartItems.id,
          productId: cartItems.productId,
          productVariantId: cartItems.productVariantId,
          quantity: cartItems.quantity,
          unitPrice: cartItems.unitPrice,
          unitMrp: cartItems.unitMrp,
          unitDiscountPercent: cartItems.unitDiscountPercent,
          unitGstPercent: cartItems.unitGstPercent,
          lineTotal: cartItems.lineTotal,
          lineTax: cartItems.lineTax,
          lineDiscount: cartItems.lineDiscount,
          selectedAttributes: cartItems.selectedAttributes,
          notes: cartItems.notes,
          addedAt: cartItems.addedAt,
          // Product details
          productTitle: products.title,
          productBrand: products.brand,
          productModel: products.model,
          productCondition: products.condition,
          productSku: products.sku,
          // Variant details
          variantSku: productVariants.sku,
          variantAttributes: productVariants.attributes,
        })
        .from(cartItems)
        .leftJoin(products, eq(cartItems.productId, products.id))
        .leftJoin(
          productVariants,
          eq(cartItems.productVariantId, productVariants.id)
        )
        .where(eq(cartItems.cartId, cartId));

      // Get primary product images
      const productIds = items.map((item) => item.productId);
      const images =
        productIds.length > 0
          ? await db
              .select({
                productId: productImages.productId,
                cloudinaryUrl: productImages.cloudinaryUrl,
                altText: productImages.altText,
              })
              .from(productImages)
              .where(
                and(
                  sql`${productImages.productId} IN (${productIds.join(",")})`,
                  eq(productImages.isPrimary, true)
                )
              )
          : [];

      // Attach images to items
      const itemsWithImages = items.map((item) => ({
        ...item,
        image:
          images.find((img) => img.productId === item.productId)
            ?.cloudinaryUrl || null,
        imageAlt:
          images.find((img) => img.productId === item.productId)?.altText ||
          null,
      }));

      return {
        ...cart[0],
        items: itemsWithImages,
      };
    } catch (error) {
      console.error("Error getting cart with items:", error);
      throw error;
    }
  }

  /**
   * Update cart totals
   */
  static async updateCartTotals(cartId) {
    try {
      const items = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.cartId, cartId));

      const subtotal = items.reduce(
        (sum, item) => sum + parseFloat(item.lineTotal),
        0
      );
      const taxAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.lineTax),
        0
      );
      const discountAmount = items.reduce(
        (sum, item) => sum + parseFloat(item.lineDiscount),
        0
      );
      const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
      const totalAmount = subtotal + taxAmount - discountAmount;

      await db
        .update(carts)
        .set({
          subtotal,
          taxAmount,
          discountAmount,
          totalAmount,
          itemCount,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cartId));

      return { subtotal, taxAmount, discountAmount, totalAmount, itemCount };
    } catch (error) {
      console.error("Error updating cart totals:", error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  static async clearCart(cartId) {
    try {
      await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
      await this.updateCartTotals(cartId);
      return { success: true };
    } catch (error) {
      console.error("Error clearing cart:", error);
      throw error;
    }
  }

  /**
   * Apply coupon to cart
   */
  static async applyCoupon(cartId, couponCode) {
    try {
      // This would integrate with your coupon system
      // For now, we'll just store the coupon code
      await db
        .update(carts)
        .set({
          appliedCouponCode: couponCode,
          updatedAt: new Date(),
        })
        .where(eq(carts.id, cartId));

      // Recalculate totals with coupon
      await this.updateCartTotals(cartId);

      return { success: true };
    } catch (error) {
      console.error("Error applying coupon:", error);
      throw error;
    }
  }

  /**
   * Save cart as wishlist
   */
  static async saveCart(
    userId,
    cartId,
    name,
    description = null,
    isPublic = false
  ) {
    try {
      const cart = await this.getCartWithItems(cartId);

      await db.insert(savedCarts).values({
        userId,
        name,
        description,
        isPublic,
        cartData: JSON.stringify(cart.items),
        itemCount: cart.itemCount,
      });

      // Get the created saved cart
      const savedCart = await db
        .select()
        .from(savedCarts)
        .where(and(eq(savedCarts.userId, userId), eq(savedCarts.name, name)))
        .limit(1);

      return savedCart[0];
    } catch (error) {
      console.error("Error saving cart:", error);
      throw error;
    }
  }

  /**
   * Track cart abandonment
   */
  static async trackAbandonment(
    cartId,
    userId = null,
    email = null,
    phone = null,
    stage = "viewed"
  ) {
    try {
      const existing = await db
        .select()
        .from(cartAbandonment)
        .where(eq(cartAbandonment.cartId, cartId))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(cartAbandonment).values({
          cartId,
          userId,
          email,
          phone,
          abandonmentStage: stage,
        });
      } else {
        await db
          .update(cartAbandonment)
          .set({
            abandonmentStage: stage,
            updatedAt: new Date(),
          })
          .where(eq(cartAbandonment.cartId, cartId));
      }

      return { success: true };
    } catch (error) {
      console.error("Error tracking abandonment:", error);
      throw error;
    }
  }

  /**
   * Get abandoned carts for recovery campaigns
   */
  static async getAbandonedCarts(hoursAgo = 24) {
    try {
      const cutoffTime = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

      const abandonedCarts = await db
        .select({
          cartId: cartAbandonment.cartId,
          userId: cartAbandonment.userId,
          email: cartAbandonment.email,
          phone: cartAbandonment.phone,
          abandonmentStage: cartAbandonment.abandonmentStage,
          reminderSent: cartAbandonment.reminderSent,
          reminderCount: cartAbandonment.reminderCount,
          lastReminderSentAt: cartAbandonment.lastReminderSentAt,
          createdAt: cartAbandonment.createdAt,
        })
        .from(cartAbandonment)
        .leftJoin(carts, eq(cartAbandonment.cartId, carts.id))
        .where(
          and(
            eq(cartAbandonment.reminderSent, false),
            sql`${cartAbandonment.createdAt} < ${cutoffTime}`
          )
        );

      return abandonedCarts;
    } catch (error) {
      console.error("Error getting abandoned carts:", error);
      throw error;
    }
  }
}
