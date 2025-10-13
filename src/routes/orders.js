import express from "express";
import { OrdersController } from "../controllers/ordersController.js";

const router = express.Router();

router.get("/:id", OrdersController.getById);

export default router;
