import express from "express";
import { cartSession } from "../middleware/cartSession.js";
import { CheckoutController } from "../controllers/checkoutController.js";

const router = express.Router();

router.use(cartSession);

router.post("/init", CheckoutController.init);
router.post("/pay", CheckoutController.pay);
router.post("/confirm", CheckoutController.confirm);
router.post("/cancel", CheckoutController.cancel);

export default router;
