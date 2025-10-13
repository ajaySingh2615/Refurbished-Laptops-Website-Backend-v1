import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import {
  getProfile,
  updateProfile,
  changePassword,
} from "../controllers/profileController.js";

const router = Router();

// All profile routes require authentication
router.get("/", requireAuth, getProfile);
router.put("/", requireAuth, updateProfile);
router.post("/change-password", requireAuth, changePassword);

export default router;
