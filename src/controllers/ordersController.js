import { db } from "../db/client.js";
import { orders, orderItems, addresses } from "../db/schema.js";
import { eq } from "drizzle-orm";

export class OrdersController {
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
        data: { order: ord, items, billing, shipping },
      });
    } catch (e) {
      console.error("Get order error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to get order" });
    }
  }
}
