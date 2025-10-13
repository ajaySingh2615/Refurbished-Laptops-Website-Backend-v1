import { db } from "../db/client.js";
import {
  orders,
  orderItems,
  addresses,
  productImages,
  products,
} from "../db/schema.js";
import { eq, desc, asc } from "drizzle-orm";

export class OrdersController {
  static async list(req, res) {
    try {
      const userId = req.user?.id || req.user?.sub;
      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      const userOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(desc(orders.createdAt));

      // Fetch shipping addresses, item counts, and a preview image/title per order
      const ordersWithDetails = await Promise.all(
        userOrders.map(async (order) => {
          const items = await db
            .select()
            .from(orderItems)
            .where(eq(orderItems.orderId, order.id));

          const shippingAddress = order.shippingAddressId
            ? (
                await db
                  .select()
                  .from(addresses)
                  .where(eq(addresses.id, order.shippingAddressId))
                  .limit(1)
              )[0]
            : null;

          // One preview item and image
          let previewTitle = null;
          let previewImageUrl = null;
          const firstItem = items[0];
          if (firstItem) {
            previewTitle = firstItem.title || null;
            // Try to use product title if missing
            if (!previewTitle && firstItem.productId) {
              const prod = (
                await db
                  .select()
                  .from(products)
                  .where(eq(products.id, firstItem.productId))
                  .limit(1)
              )[0];
              if (prod?.title) previewTitle = prod.title;
            }
            if (firstItem.productId) {
              // Prefer primary image, fall back to any image
              const primaryImg = (
                await db
                  .select()
                  .from(productImages)
                  .where(eq(productImages.productId, firstItem.productId))
                  .orderBy(
                    desc(productImages.isPrimary),
                    asc(productImages.sortOrder),
                    asc(productImages.id)
                  )
                  .limit(1)
              )[0];
              if (primaryImg?.cloudinaryUrl)
                previewImageUrl = primaryImg.cloudinaryUrl;
            }
          }

          return {
            ...order,
            itemCount: items.length,
            shippingAddress,
            previewTitle,
            previewImageUrl,
          };
        })
      );

      return res.json({ success: true, data: ordersWithDetails });
    } catch (e) {
      console.error("List orders error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to fetch orders" });
    }
  }

  static async getById(req, res) {
    try {
      const { id } = req.params;
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.id, Number(id)))
        .limit(1);
      if (rows.length === 0)
        return res
          .status(404)
          .json({ success: false, message: "Order not found" });
      const ord = rows[0];
      const itemsRaw = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, ord.id));
      // Attach image and title for each item
      const items = await Promise.all(
        itemsRaw.map(async (it) => {
          let imageUrl = null;
          let title = it.title || null;
          if (!title && it.productId) {
            const prod = (
              await db
                .select()
                .from(products)
                .where(eq(products.id, it.productId))
                .limit(1)
            )[0];
            if (prod?.title) title = prod.title;
          }
          if (it.productId) {
            const img = (
              await db
                .select()
                .from(productImages)
                .where(eq(productImages.productId, it.productId))
                .orderBy(
                  desc(productImages.isPrimary),
                  asc(productImages.sortOrder),
                  asc(productImages.id)
                )
                .limit(1)
            )[0];
            if (img?.cloudinaryUrl) imageUrl = img.cloudinaryUrl;
          }
          return { ...it, title, imageUrl };
        })
      );
      const billing = ord.billingAddressId
        ? (
            await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, ord.billingAddressId))
              .limit(1)
          )[0]
        : null;
      const shipping = ord.shippingAddressId
        ? (
            await db
              .select()
              .from(addresses)
              .where(eq(addresses.id, ord.shippingAddressId))
              .limit(1)
          )[0]
        : null;
      return res.json({
        success: true,
        data: {
          ...ord,
          items,
          billingAddress: billing,
          shippingAddress: shipping,
        },
      });
    } catch (e) {
      console.error("Get order error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to get order" });
    }
  }
}
