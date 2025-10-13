import { CheckoutService } from "../services/checkoutService.js";

export class CheckoutController {
  static async init(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const { cartId, billingAddress, shippingAddress, shippingMethod } =
        req.body;
      const result = await CheckoutService.init(
        { cartId, billingAddress, shippingAddress, shippingMethod },
        { userId, sessionId }
      );
      if (!result.success) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      console.error("Checkout init error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Failed to start checkout" });
    }
  }

  static async pay(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const { orderId, paymentMethod } = req.body;
      const result = await CheckoutService.pay(
        { orderId, paymentMethod },
        { userId, sessionId }
      );
      if (!result.success) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      console.error("Checkout pay error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Payment init failed" });
    }
  }

  static async confirm(req, res) {
    try {
      const { userId, sessionId } = req.user || {};
      const { orderId, providerPayload } = req.body;
      const result = await CheckoutService.confirm(
        { orderId, providerPayload },
        { userId, sessionId }
      );
      if (!result.success) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      console.error("Checkout confirm error:", e);
      return res
        .status(500)
        .json({ success: false, message: "Confirmation failed" });
    }
  }

  static async cancel(req, res) {
    try {
      const { orderId } = req.body;
      const result = await CheckoutService.cancel({ orderId });
      if (!result.success) return res.status(400).json(result);
      return res.json(result);
    } catch (e) {
      console.error("Checkout cancel error:", e);
      return res.status(500).json({ success: false, message: "Cancel failed" });
    }
  }
}
