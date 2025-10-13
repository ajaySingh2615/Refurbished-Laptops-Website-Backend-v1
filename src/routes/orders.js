import express from "express";
import { OrdersController } from "../controllers/ordersController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/", requireAuth, OrdersController.list);
router.get("/:id", OrdersController.getById);

export default router;
