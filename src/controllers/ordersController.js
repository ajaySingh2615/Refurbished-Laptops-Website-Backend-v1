import { db } from "../db/client.js";
import { orders, orderItems, addresses } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

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

      // Fetch shipping addresses and item counts for each order
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

          return {
            ...order,
            itemCount: items.length,
            shippingAddress,
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
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, ord.id));
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
