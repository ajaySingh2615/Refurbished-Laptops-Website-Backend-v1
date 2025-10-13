import express from "express";
import { AdminOrdersController } from "../controllers/adminOrdersController.js";
import { requireAuth } from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/admin.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(requireAuth, adminMiddleware);

// Get order statistics
router.get("/statistics", AdminOrdersController.getStatistics);

// List all orders with filters
router.get("/", AdminOrdersController.listAll);

// Get order details
router.get("/:id", AdminOrdersController.getOrderDetails);

// Update order status
router.patch("/:id/status", AdminOrdersController.updateOrderStatus);

// Update payment status
router.patch("/:id/payment", AdminOrdersController.updatePaymentStatus);

// Delete/cancel order
router.delete("/:id", AdminOrdersController.deleteOrder);

export default router;
