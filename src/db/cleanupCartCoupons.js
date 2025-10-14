/**
 * Database Cleanup Script: Remove Invalid Cart Coupons
 *
 * This script removes coupons from carts where:
 * 1. The user has already used the coupon (exceeded per-user limit)
 * 2. The coupon has expired
 * 3. The coupon is inactive
 *
 * Run this periodically to maintain data integrity.
 */

import { db } from "./client.js";
import { cartCoupons, coupons, couponUsage } from "./schema.js";
import { eq, and, sql } from "drizzle-orm";

async function cleanupCartCoupons() {
  console.log("🧹 Starting cart coupons cleanup...\n");

  try {
    // Get all cart coupons
    const allCartCoupons = await db.select().from(cartCoupons);

    console.log(`📊 Found ${allCartCoupons.length} cart coupons to check\n`);

    let removedExpired = 0;
    let removedInactive = 0;
    let removedExceededLimit = 0;
    const violations = [];

    for (const cartCoupon of allCartCoupons) {
      // Get the coupon details
      const [couponData] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.id, cartCoupon.couponId))
        .limit(1);

      if (!couponData) {
        console.log(
          `⚠️ Coupon ID ${cartCoupon.couponId} not found (orphaned record)`
        );
        continue;
      }

      let shouldRemove = false;
      let reason = "";

      // Check if coupon is inactive
      if (!couponData.isActive) {
        shouldRemove = true;
        reason = "Coupon is inactive";
        removedInactive++;
      }

      // Check if coupon has expired
      const now = new Date();
      if (new Date(couponData.validUntil) < now) {
        shouldRemove = true;
        reason = "Coupon has expired";
        removedExpired++;
      }

      // Check if user has already exceeded usage limit
      if (cartCoupon.appliedBy && couponData.usageLimitPerUser) {
        const userUsage = await db
          .select({ count: sql`count(*)` })
          .from(couponUsage)
          .where(
            and(
              eq(couponUsage.couponId, cartCoupon.couponId),
              eq(couponUsage.userId, cartCoupon.appliedBy)
            )
          );

        const usageCount = userUsage[0]?.count || 0;

        if (usageCount >= couponData.usageLimitPerUser) {
          shouldRemove = true;
          reason = `User ${cartCoupon.appliedBy} has already used this coupon ${usageCount}/${couponData.usageLimitPerUser} times`;
          removedExceededLimit++;
        }
      }

      if (shouldRemove) {
        console.log(
          `❌ Removing invalid coupon "${couponData.code}" from cart ${cartCoupon.cartId}`
        );
        console.log(`   Reason: ${reason}\n`);

        violations.push({
          cartId: cartCoupon.cartId,
          couponCode: couponData.code,
          appliedBy: cartCoupon.appliedBy,
          reason: reason,
        });

        // Remove the invalid cart coupon
        await db.delete(cartCoupons).where(eq(cartCoupons.id, cartCoupon.id));
      }
    }

    const totalRemoved =
      removedExpired + removedInactive + removedExceededLimit;

    console.log("\n" + "=".repeat(60));
    console.log("📈 CLEANUP SUMMARY");
    console.log("=".repeat(60));
    console.log(`🔴 Expired coupons removed: ${removedExpired}`);
    console.log(`⚫ Inactive coupons removed: ${removedInactive}`);
    console.log(`🚫 Exceeded limit coupons removed: ${removedExceededLimit}`);
    console.log(`📊 Total cart coupons removed: ${totalRemoved}`);
    console.log(
      `✅ Clean cart coupons remaining: ${allCartCoupons.length - totalRemoved}\n`
    );

    if (violations.length > 0) {
      console.log("📋 VIOLATIONS DETAILS:");
      console.table(violations);
    } else {
      console.log("✨ No violations found! All cart coupons are valid.");
    }

    console.log("\n✅ Cleanup completed successfully!");
    return {
      success: true,
      removedExpired,
      removedInactive,
      removedExceededLimit,
      totalRemoved,
      violations,
    };
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

// Run the cleanup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupCartCoupons()
    .then((result) => {
      console.log("\n🎉 All done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Cleanup failed:", error);
      process.exit(1);
    });
}

export { cleanupCartCoupons };
