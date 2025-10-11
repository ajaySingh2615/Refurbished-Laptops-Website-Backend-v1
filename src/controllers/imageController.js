import { ImageService } from "../services/imageService.js";
import { db } from "../db/client.js";
import { products, productImages } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

export const uploadImage = async (req, res) => {
  try {
    const { productId, altText, isPrimary, sortOrder } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    if (!productId) {
      return res.status(400).json({ message: "Product ID is required" });
    }

    // Verify product exists
    const product = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Upload to Cloudinary
    const imageData = await ImageService.uploadImage(req.file, {
      resource_type: "auto",
    });

    // Save to database
    const imageId = await ImageService.saveImageRecord(productId, imageData, {
      altText,
      isPrimary: isPrimary === "true",
      sortOrder: parseInt(sortOrder) || 0,
    });

    res.status(201).json({
      message: "Image uploaded successfully",
      imageId,
      imageData,
    });
  } catch (error) {
    console.error("Upload image error:", error);
    res.status(500).json({ message: "Failed to upload image" });
  }
};

export const getProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    const images = await ImageService.getProductImages(parseInt(productId));

    res.json({
      images,
      count: images.length,
    });
  } catch (error) {
    console.error("Get product images error:", error);
    res.status(500).json({ message: "Failed to fetch product images" });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    await ImageService.deleteImageRecord(parseInt(imageId));

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete image error:", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

export const setPrimaryImage = async (req, res) => {
  try {
    const { productId, imageId } = req.body;

    await ImageService.setPrimaryImage(productId, imageId);

    res.json({ message: "Primary image updated successfully" });
  } catch (error) {
    console.error("Set primary image error:", error);
    res.status(500).json({ message: "Failed to set primary image" });
  }
};

export const updateImageOrder = async (req, res) => {
  try {
    const { imageId } = req.params;
    const { sortOrder } = req.body;

    await ImageService.updateImageOrder(parseInt(imageId), parseInt(sortOrder));

    res.json({ message: "Image order updated successfully" });
  } catch (error) {
    console.error("Update image order error:", error);
    res.status(500).json({ message: "Failed to update image order" });
  }
};

export const getAllImages = async (req, res) => {
  try {
    const { page = 1, limit = 20, productId } = req.query;
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: productImages.id,
        productId: productImages.productId,
        cloudinaryUrl: productImages.cloudinaryUrl,
        altText: productImages.altText,
        isPrimary: productImages.isPrimary,
        sortOrder: productImages.sortOrder,
        width: productImages.width,
        height: productImages.height,
        fileSize: productImages.fileSize,
        createdAt: productImages.createdAt,
        productTitle: products.title,
        productSku: products.sku,
      })
      .from(productImages)
      .leftJoin(products, eq(productImages.productId, products.id));

    if (productId) {
      query = query.where(eq(productImages.productId, parseInt(productId)));
    }

    const images = await query
      .orderBy(productImages.createdAt)
      .limit(parseInt(limit))
      .offset(offset);

    // Get total count
    const totalQuery = db.select({ count: sql`count(*)` }).from(productImages);

    if (productId) {
      totalQuery.where(eq(productImages.productId, parseInt(productId)));
    }

    const [{ count: total }] = await totalQuery;

    res.json({
      images,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all images error:", error);
    res.status(500).json({ message: "Failed to fetch images" });
  }
};
