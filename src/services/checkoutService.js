import { db } from "../db/client.js";
import crypto from "crypto";
import {
  carts,
  cartItems,
  orders,
  orderItems,
  addresses,
  payments,
  products,
} from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { CartService } from "./cartService.js";
import { CouponService } from "./couponService.js";

export class CheckoutService {
  static async init(input, ctx) {
    const { cartId, billingAddress, shippingAddress, shippingMethod } = input;
    const { userId, sessionId } = ctx;
    // Reprice cart
    await CartService.updateCartTotals(cartId);
    const cartRows = await db
      .select()
      .from(carts)
      .where(eq(carts.id, cartId))
      .limit(1);
    if (cartRows.length === 0)
      return { success: false, message: "Cart not found" };
    const cart = cartRows[0];

    // Validate stock
    const items = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
    for (const it of items) {
      const prod = await db
        .select()
        .from(products)
        .where(eq(products.id, it.productId))
        .limit(1);
      if (prod.length === 0)
        return { success: false, message: "Product missing" };
      if ((prod[0].stockQty || 0) < it.quantity) {
        return {
          success: false,
          message: `Insufficient stock for product ${prod[0].title}`,
        };
      }
    }

    // Persist addresses
    const billingAddrId = billingAddress
      ? (
          await db
            .insert(addresses)
            .values({ ...billingAddress, userId, type: "billing" })
        ).insertId
      : null;
    const shippingAddrId = shippingAddress
      ? (
          await db
            .insert(addresses)
            .values({ ...shippingAddress, userId, type: "shipping" })
        ).insertId
      : null;

    // Create order snapshot
    const orderInsert = await db.insert(orders).values({
      userId,
      cartId,
      status: "pending",
      paymentStatus: "unpaid",
      subtotal: cart.subtotal,
      discountAmount: cart.discountAmount,
      taxAmount: cart.taxAmount,
      shippingAmount: cart.shippingAmount,
      totalAmount: cart.totalAmount,
      currency: cart.currency,
      shippingMethod: shippingMethod || null,
      billingAddressId: billingAddrId,
      shippingAddressId: shippingAddrId,
    });

    // Copy items
    for (const it of items) {
      await db.insert(orderItems).values({
        orderId: orderInsert.insertId,
        productId: it.productId,
        productVariantId: it.productVariantId,
        title: "", // could join to fill; optional for now
        sku: null,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        unitMrp: it.unitMrp,
        unitGstPercent: it.unitGstPercent,
        lineTotal: it.lineTotal,
        lineTax: it.lineTax,
        lineDiscount: it.lineDiscount,
      });
    }

    return {
      success: true,
      data: {
        orderId: orderInsert.insertId,
        totals: {
          subtotal: cart.subtotal,
          discountAmount: cart.discountAmount,
          taxAmount: cart.taxAmount,
          shippingAmount: cart.shippingAmount,
          totalAmount: cart.totalAmount,
        },
      },
    };
  }

  static async pay(input, ctx) {
    const { orderId, paymentMethod } = input;
    if (paymentMethod === "cod") {
      // Confirm immediately
      const confirm = await this.confirm(
        { orderId, providerPayload: { method: "cod" } },
        ctx
      );
      return confirm;
    }
    if (paymentMethod === "razorpay") {
      // Create Razorpay order
      const orderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);
      if (orderRows.length === 0)
        return { success: false, message: "Order not found" };
      const ord = orderRows[0];

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret)
        return { success: false, message: "Razorpay not configured" };

      const amountPaise = Math.round(parseFloat(ord.totalAmount) * 100);
      const receipt = `order_${ord.id}_${Date.now()}`;

      const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: ord.currency || "INR",
          receipt,
        }),
      });
      if (!rpRes.ok) {
        const txt = await rpRes.text();
        return {
          success: false,
          message: "Failed to create Razorpay order",
          error: txt,
        };
      }
      const rpOrder = await rpRes.json();

      await db.insert(payments).values({
        orderId,
        provider: "razorpay",
        amount: ord.totalAmount,
        currency: ord.currency || "INR",
        status: "created",
        txnId: rpOrder.id,
        payload: rpOrder,
      });

      return {
        success: true,
        data: {
          provider: "razorpay",
          keyId,
          order: rpOrder,
          amount: amountPaise,
          currency: ord.currency || "INR",
          orderId,
        },
      };
    }
    return { success: false, message: "Unsupported payment method" };
  }

  static async confirm(input, ctx) {
    const { orderId, providerPayload } = input;
    const rows = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (rows.length === 0)
      return { success: false, message: "Order not found" };
    const order = rows[0];

    // If Razorpay payload provided, verify signature
    if (providerPayload?.razorpay_signature) {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const hmac = crypto
        .createHmac("sha256", keySecret || "")
        .update(
          `${providerPayload.razorpay_order_id}|${providerPayload.razorpay_payment_id}`
        )
        .digest("hex");
      if (hmac !== providerPayload.razorpay_signature) {
        return { success: false, message: "Invalid payment signature" };
      }
    }

    // Reduce stock
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    for (const it of items) {
      const prodRows = await db
        .select()
        .from(products)
        .where(eq(products.id, it.productId))
        .limit(1);
      if (prodRows.length) {
        await db
          .update(products)
          .set({ stockQty: (prodRows[0].stockQty || 0) - it.quantity })
          .where(eq(products.id, it.productId));
      }
    }

    // Mark order confirmed/paid
    await db
      .update(orders)
      .set({ status: "confirmed", paymentStatus: "paid" })
      .where(eq(orders.id, orderId));

    // Record coupon usage and clear coupons from cart
    await CouponService.recordUsageForOrder(
      orderId,
      order.cartId,
      ctx.userId,
      ctx.sessionId
    );

    return { success: true, data: { orderId } };
  }

  static async cancel(input) {
    const { orderId } = input;
    await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, orderId));
    return { success: true };
  }
}
