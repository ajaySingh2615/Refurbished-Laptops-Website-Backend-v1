import express from "express";
import multer from "multer";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  uploadImage,
  getProductImages,
  deleteImage,
  setPrimaryImage,
  updateImageOrder,
  getAllImages,
} from "../controllers/imageController.js";

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Admin routes - require authentication and admin role
router.post(
  "/upload",
  requireAuth,
  requireRole("admin"),
  upload.single("image"),
  uploadImage
);
router.get("/admin/all", requireAuth, requireRole("admin"), getAllImages);
router.delete(
  "/admin/:imageId",
  requireAuth,
  requireRole("admin"),
  deleteImage
);
router.patch(
  "/admin/set-primary",
  requireAuth,
  requireRole("admin"),
  setPrimaryImage
);
router.patch(
  "/admin/:imageId/order",
  requireAuth,
  requireRole("admin"),
  updateImageOrder
);

// Public routes
router.get("/product/:productId", getProductImages);

export default router;
