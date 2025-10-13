import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { AddressController } from "../controllers/addressController.js";

const router = express.Router();

// Ensure body parsing for various clients
router.use(
  express.json({ type: ["application/json", "text/json", "*/json", "*/*"] })
);
router.use(express.urlencoded({ extended: true }));

router.use(requireAuth);

router.get("/", AddressController.list);
router.post("/", AddressController.create);
router.put("/:id", AddressController.update);
router.delete("/:id", AddressController.remove);

export default router;
