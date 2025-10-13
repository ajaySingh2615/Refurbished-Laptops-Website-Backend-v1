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
import { and, eq, desc } from "drizzle-orm";
import { CartService } from "./cartService.js";
import { CouponService } from "./couponService.js";

export class CheckoutService {
  static sanitizeAddressInput(input, type, userId) {
    if (!input) return null;
    // If an existing address is selected, reuse id
    if (input.id) {
      return { id: Number(input.id) };
    }
    // Only allow these fields to be inserted
    const payload = {
      userId: Number(userId),
      type: type || "shipping",
      name: String(input.name || ""),
      phone: String(input.phone || ""),
      email: input.email ? String(input.email) : null,
      line1: String(input.line1 || ""),
      line2: input.line2 ? String(input.line2) : null,
      city: String(input.city || ""),
      state: String(input.state || ""),
      postcode: String(input.postcode || ""),
      country: String(input.country || "IN"),
      isDefault: !!input.isDefault,
    };
    // Guard: require minimal fields; otherwise skip creating a new address
    const requiredFilled =
      payload.name &&
      payload.phone &&
      payload.line1 &&
      payload.city &&
      payload.state &&
      payload.postcode;
    if (!requiredFilled) return null;
    return { payload };
  }

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

    // Persist addresses (reuse existing or insert sanitized)
    let billingAddrId = null;
    if (billingAddress) {
      const b = this.sanitizeAddressInput(billingAddress, "billing", userId);
      if (b?.id) billingAddrId = b.id;
      else if (b?.payload)
        billingAddrId = (await db.insert(addresses).values(b.payload)).insertId;
    }
    let shippingAddrId = null;
    if (shippingAddress) {
      const s = this.sanitizeAddressInput(shippingAddress, "shipping", userId);
      if (s?.id) shippingAddrId = s.id;
      else if (s?.payload)
        shippingAddrId = (await db.insert(addresses).values(s.payload))
          .insertId;
    }
    // Require a delivery address
    if (!shippingAddrId) {
      return {
        success: false,
        message: "Select a delivery address or add a new one before checkout",
      };
    }

    // Create order snapshot
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const orderInsert = await db.insert(orders).values({
      userId,
      cartId,
      status: "pending",
      orderStatus: "pending",
      paymentStatus: "unpaid",
      orderNumber,
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
    // Resolve a reliable orderId across environments
    let createdOrderId = orderInsert?.insertId;
    if (!createdOrderId) {
      const latest = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.cartId, cartId), eq(orders.userId, userId)))
        .orderBy(desc(orders.id))
        .limit(1);
      createdOrderId = latest?.[0]?.id;
    }
    if (!createdOrderId) {
      return { success: false, message: "Failed to create order" };
    }

    // Copy items
    for (const it of items) {
      await db.insert(orderItems).values({
        orderId: createdOrderId,
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
        orderId: createdOrderId,
        orderNumber,
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
      // Update order with COD payment method
      await db
        .update(orders)
        .set({
          paymentMethod: "cod",
          paymentStatus: "authorized",
          orderStatus: "confirmed",
          codCollected: false,
        })
        .where(eq(orders.id, orderId));
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
      const receipt = ord.orderNumber || `order_${ord.id}_${Date.now()}`;

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

      // Store razorpay_order_id and payment_method in orders table
      await db
        .update(orders)
        .set({
          razorpayOrderId: rpOrder.id,
          paymentMethod: "razorpay",
        })
        .where(eq(orders.id, orderId));

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
      // Store payment_id and transaction_id from Razorpay
      await db
        .update(orders)
        .set({
          paymentId: providerPayload.razorpay_payment_id,
          transactionId: providerPayload.razorpay_payment_id,
          paymentRef: providerPayload.razorpay_payment_id,
        })
        .where(eq(orders.id, orderId));
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
      .set({
        status: "confirmed",
        orderStatus: "confirmed",
        paymentStatus: "paid",
        placedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    // Record coupon usage and clear coupons from cart
    await CouponService.recordUsageForOrder(
      orderId,
      order.cartId,
      ctx.userId,
      ctx.sessionId
    );

    // Clear cart items after successful order
    await db.delete(cartItems).where(eq(cartItems.cartId, order.cartId));

    // Update cart status to converted
    await db
      .update(carts)
      .set({
        status: "converted",
        convertedAt: new Date(),
        itemCount: 0,
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        shippingAmount: 0,
        totalAmount: 0,
      })
      .where(eq(carts.id, order.cartId));

    return { success: true, data: { orderId, orderNumber: order.orderNumber } };
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
