import express from "express";
import { downloadInvoice } from "../controllers/invoiceController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Download invoice for an order
router.get("/:orderId", requireAuth, downloadInvoice);

export default router;
