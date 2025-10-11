import { db } from "../db/client.js";
import {
  productReviews,
  reviewHelpful,
  reviewImages,
  users,
  products,
} from "../db/schema.js";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export class ReviewService {
  // Get reviews for a product (approved only for public)
  async getProductReviews(productId, options = {}) {
    const {
      status = "approved",
      limit = 10,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeUser = true,
    } = options;

    let query = db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        review: productReviews.review,
        pros: productReviews.pros,
        cons: productReviews.cons,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        isAnonymous: productReviews.isAnonymous,
        helpfulCount: productReviews.helpfulCount,
        notHelpfulCount: productReviews.notHelpfulCount,
        createdAt: productReviews.createdAt,
        approvedAt: productReviews.approvedAt,
        // User info (if not anonymous)
        userName: users.name,
        userAvatar: users.avatarUrl,
      })
      .from(productReviews)
      .leftJoin(users, eq(productReviews.userId, users.id))
      .where(
        and(
          eq(productReviews.productId, productId),
          status === "all" ? undefined : eq(productReviews.status, status)
        )
      );

    // Apply sorting
    const sortColumn = productReviews[sortBy] || productReviews.createdAt;
    if (sortOrder === "desc") {
      query = query.orderBy(desc(sortColumn));
    } else {
      query = query.orderBy(asc(sortColumn));
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const reviews = await query;

    // Get review images for each review
    const reviewsWithImages = await Promise.all(
      reviews.map(async (review) => {
        const images = await db
          .select()
          .from(reviewImages)
          .where(eq(reviewImages.reviewId, review.id))
          .orderBy(asc(reviewImages.sortOrder));

        return {
          ...review,
          images,
          // Parse JSON fields
          pros: review.pros ? JSON.parse(review.pros) : [],
          cons: review.cons ? JSON.parse(review.cons) : [],
        };
      })
    );

    return reviewsWithImages;
  }

  // Get review statistics for a product
  async getProductReviewStats(productId) {
    const stats = await db
      .select({
        totalReviews: sql`COUNT(*)`.as("totalReviews"),
        averageRating: sql`AVG(${productReviews.rating})`.as("averageRating"),
        rating1:
          sql`SUM(CASE WHEN ${productReviews.rating} = 1 THEN 1 ELSE 0 END)`.as(
            "rating1"
          ),
        rating2:
          sql`SUM(CASE WHEN ${productReviews.rating} = 2 THEN 1 ELSE 0 END)`.as(
            "rating2"
          ),
        rating3:
          sql`SUM(CASE WHEN ${productReviews.rating} = 3 THEN 1 ELSE 0 END)`.as(
            "rating3"
          ),
        rating4:
          sql`SUM(CASE WHEN ${productReviews.rating} = 4 THEN 1 ELSE 0 END)`.as(
            "rating4"
          ),
        rating5:
          sql`SUM(CASE WHEN ${productReviews.rating} = 5 THEN 1 ELSE 0 END)`.as(
            "rating5"
          ),
      })
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.status, "approved")
        )
      );

    const rawStats = stats[0];

    // Handle null/undefined averageRating from database
    let averageRating = rawStats?.averageRating
      ? Number(rawStats.averageRating)
      : 0;

    // If averageRating is still 0 but we have reviews, calculate manually
    if (averageRating === 0 && rawStats?.totalReviews > 0) {
      const totalRating =
        (rawStats.rating1 || 0) * 1 +
        (rawStats.rating2 || 0) * 2 +
        (rawStats.rating3 || 0) * 3 +
        (rawStats.rating4 || 0) * 4 +
        (rawStats.rating5 || 0) * 5;
      averageRating = totalRating / (rawStats.totalReviews || 1);
    }

    const result = {
      totalReviews: rawStats?.totalReviews || 0,
      averageRating: averageRating,
      rating1: rawStats?.rating1 || 0,
      rating2: rawStats?.rating2 || 0,
      rating3: rawStats?.rating3 || 0,
      rating4: rawStats?.rating4 || 0,
      rating5: rawStats?.rating5 || 0,
    };

    return result;
  }

  // Create a new review
  async createReview(reviewData) {
    const {
      productId,
      userId,
      rating,
      title,
      review,
      isVerifiedPurchase = false,
      isAnonymous = false,
    } = reviewData;

    // Check if user already reviewed this product
    const existingReview = await db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.userId, userId)
        )
      )
      .limit(1);

    if (existingReview.length > 0) {
      throw new Error("You have already reviewed this product");
    }

    const insertResult = await db.insert(productReviews).values({
      productId,
      userId,
      rating,
      title,
      review,
      isVerifiedPurchase,
      isAnonymous,
      status: "pending", // All reviews need admin approval
    });

    // Get the inserted review by fetching it
    const newReview = await db
      .select()
      .from(productReviews)
      .where(eq(productReviews.id, insertResult.insertId))
      .limit(1);

    return newReview[0];
  }

  // Update review helpfulness
  async updateReviewHelpfulness(reviewId, userId, isHelpful) {
    // Check if user already voted
    const existingVote = await db
      .select()
      .from(reviewHelpful)
      .where(
        and(
          eq(reviewHelpful.reviewId, reviewId),
          eq(reviewHelpful.userId, userId)
        )
      )
      .limit(1);

    if (existingVote.length > 0) {
      // Update existing vote
      await db
        .update(reviewHelpful)
        .set({ isHelpful })
        .where(
          and(
            eq(reviewHelpful.reviewId, reviewId),
            eq(reviewHelpful.userId, userId)
          )
        );
    } else {
      // Create new vote
      await db.insert(reviewHelpful).values({
        reviewId,
        userId,
        isHelpful,
      });
    }

    // Update review helpful counts
    const helpfulCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(reviewHelpful)
      .where(
        and(
          eq(reviewHelpful.reviewId, reviewId),
          eq(reviewHelpful.isHelpful, true)
        )
      );

    const notHelpfulCount = await db
      .select({ count: sql`COUNT(*)` })
      .from(reviewHelpful)
      .where(
        and(
          eq(reviewHelpful.reviewId, reviewId),
          eq(reviewHelpful.isHelpful, false)
        )
      );

    await db
      .update(productReviews)
      .set({
        helpfulCount: helpfulCount[0].count,
        notHelpfulCount: notHelpfulCount[0].count,
      })
      .where(eq(productReviews.id, reviewId));

    return {
      helpfulCount: helpfulCount[0].count,
      notHelpfulCount: notHelpfulCount[0].count,
    };
  }

  // Admin: Get all reviews with pagination and filters
  async getAdminReviews(options = {}) {
    const {
      status = "all",
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
      productId = null,
    } = options;

    let query = db
      .select({
        id: productReviews.id,
        productId: productReviews.productId,
        userId: productReviews.userId,
        rating: productReviews.rating,
        title: productReviews.title,
        review: productReviews.review,
        pros: productReviews.pros,
        cons: productReviews.cons,
        isVerifiedPurchase: productReviews.isVerifiedPurchase,
        isAnonymous: productReviews.isAnonymous,
        status: productReviews.status,
        adminNotes: productReviews.adminNotes,
        helpfulCount: productReviews.helpfulCount,
        notHelpfulCount: productReviews.notHelpfulCount,
        createdAt: productReviews.createdAt,
        approvedAt: productReviews.approvedAt,
        rejectedAt: productReviews.rejectedAt,
        // User info
        userName: users.name,
        userEmail: users.email,
        // Product info
        productTitle: products.title,
        productBrand: products.brand,
      })
      .from(productReviews)
      .leftJoin(users, eq(productReviews.userId, users.id))
      .leftJoin(products, eq(productReviews.productId, products.id));

    // Apply filters
    const conditions = [];
    if (status !== "all") {
      conditions.push(eq(productReviews.status, status));
    }
    if (productId) {
      conditions.push(eq(productReviews.productId, productId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = productReviews[sortBy] || productReviews.createdAt;
    if (sortOrder === "desc") {
      query = query.orderBy(desc(sortColumn));
    } else {
      query = query.orderBy(asc(sortColumn));
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const reviews = await query;

    return reviews.map((review) => ({
      ...review,
      pros: review.pros ? JSON.parse(review.pros) : [],
      cons: review.cons ? JSON.parse(review.cons) : [],
    }));
  }

  // Admin: Approve review
  async approveReview(reviewId, adminNotes = null) {
    await db
      .update(productReviews)
      .set({
        status: "approved",
        approvedAt: new Date(),
        adminNotes,
      })
      .where(eq(productReviews.id, reviewId));

    // Get the updated review
    const updatedReview = await db
      .select()
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);

    return updatedReview[0];
  }

  // Admin: Reject review
  async rejectReview(reviewId, adminNotes = null) {
    await db
      .update(productReviews)
      .set({
        status: "rejected",
        rejectedAt: new Date(),
        adminNotes,
      })
      .where(eq(productReviews.id, reviewId));

    // Get the updated review
    const updatedReview = await db
      .select()
      .from(productReviews)
      .where(eq(productReviews.id, reviewId))
      .limit(1);

    return updatedReview[0];
  }

  // Check if user can review product
  async canUserReview(productId, userId) {
    const existingReview = await db
      .select()
      .from(productReviews)
      .where(
        and(
          eq(productReviews.productId, productId),
          eq(productReviews.userId, userId)
        )
      )
      .limit(1);

    return existingReview.length === 0;
  }
}

export const reviewService = new ReviewService();
