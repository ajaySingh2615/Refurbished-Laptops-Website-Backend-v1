import cloudinary from "../config/cloudinary.js";
import { db } from "../db/client.js";
import { productImages } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

export class ImageService {
  /**
   * Upload image to Cloudinary
   */
  static async uploadImage(file, options = {}) {
    try {
      // Use Cloudinary's upload_stream for buffer uploads
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || "ml_default",
            folder: "products",
            ...options,
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Write the buffer to the upload stream
        uploadStream.end(file.buffer);
      });

      return {
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        format: result.format,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload image");
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId) {
    try {
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      throw new Error("Failed to delete image");
    }
  }

  /**
   * Save image record to database
   */
  static async saveImageRecord(productId, imageData, options = {}) {
    try {
      const result = await db.insert(productImages).values({
        productId,
        cloudinaryPublicId: imageData.publicId,
        cloudinaryUrl: imageData.url,
        altText: options.altText || null,
        isPrimary: options.isPrimary || false,
        sortOrder: options.sortOrder || 0,
        width: imageData.width,
        height: imageData.height,
        fileSize: imageData.bytes,
        mimeType: `image/${imageData.format}`,
      });

      return result.insertId;
    } catch (error) {
      console.error("Database save error:", error);
      throw new Error("Failed to save image record");
    }
  }

  /**
   * Get images for a product
   */
  static async getProductImages(productId) {
    try {
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, productId))
        .orderBy(productImages.sortOrder, productImages.createdAt);

      return images;
    } catch (error) {
      console.error("Database query error:", error);
      throw new Error("Failed to fetch product images");
    }
  }

  /**
   * Delete image record from database
   */
  static async deleteImageRecord(imageId) {
    try {
      // Get image record first to get Cloudinary public ID
      const image = await db
        .select()
        .from(productImages)
        .where(eq(productImages.id, imageId))
        .limit(1);

      if (image.length === 0) {
        throw new Error("Image not found");
      }

      // Delete from Cloudinary
      await this.deleteImage(image[0].cloudinaryPublicId);

      // Delete from database
      await db.delete(productImages).where(eq(productImages.id, imageId));

      return true;
    } catch (error) {
      console.error("Delete image error:", error);
      throw new Error("Failed to delete image");
    }
  }

  /**
   * Set primary image for a product
   */
  static async setPrimaryImage(productId, imageId) {
    try {
      // First, unset all primary images for this product
      await db
        .update(productImages)
        .set({ isPrimary: false })
        .where(eq(productImages.productId, productId));

      // Set the new primary image
      await db
        .update(productImages)
        .set({ isPrimary: true })
        .where(
          and(
            eq(productImages.id, imageId),
            eq(productImages.productId, productId)
          )
        );

      return true;
    } catch (error) {
      console.error("Set primary image error:", error);
      throw new Error("Failed to set primary image");
    }
  }

  /**
   * Update image sort order
   */
  static async updateImageOrder(imageId, sortOrder) {
    try {
      await db
        .update(productImages)
        .set({ sortOrder })
        .where(eq(productImages.id, imageId));

      return true;
    } catch (error) {
      console.error("Update image order error:", error);
      throw new Error("Failed to update image order");
    }
  }
}
