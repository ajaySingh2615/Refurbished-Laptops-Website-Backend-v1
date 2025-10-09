import express from "express";
import cookieParser from "cookie-parser";
import {
  register,
  login,
  logout,
  refresh,
  me,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(cookieParser());

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, me);

export default router;
