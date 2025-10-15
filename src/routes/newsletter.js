import { Router } from "express";
import {
  postSubscribe,
  getAdminSubscriptions,
  getAdminStats,
  deleteSubscription,
} from "../controllers/newsletterController.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Public routes
router.post("/subscribe", postSubscribe);

// Admin routes (protected)
router.get("/admin/subscriptions", requireAuth, getAdminSubscriptions);
router.get("/admin/stats", requireAuth, getAdminStats);
router.delete("/admin/subscriptions/:id", requireAuth, deleteSubscription);

export default router;
