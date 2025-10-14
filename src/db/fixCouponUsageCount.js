/**
 * Database Migration Script: Fix Coupon Usage Count Discrepancies
 *
 * This script audits and fixes the usage_count field in the coupons table
 * to match the actual number of records in the coupon_usage table.
 *
 * Run this script once to repair any data inconsistencies.
 */

import { db } from "./client.js";
import { coupons, couponUsage } from "./schema.js";
import { eq, sql } from "drizzle-orm";

async function fixCouponUsageCounts() {
  console.log("🔍 Starting coupon usage count audit...\n");

  try {
    // Get all coupons
    const allCoupons = await db.select().from(coupons);

    console.log(`📊 Found ${allCoupons.length} coupons to audit\n`);

    let fixedCount = 0;
    let correctCount = 0;
    const discrepancies = [];

    for (const coupon of allCoupons) {
      // Count actual usage records
      const actualUsage = await db
        .select({ count: sql`count(*)` })
        .from(couponUsage)
        .where(eq(couponUsage.couponId, coupon.id));

      const actualCount = parseInt(actualUsage[0]?.count || 0);
      const recordedCount = coupon.usageCount;

      if (actualCount !== recordedCount) {
        console.log(
          `❌ Discrepancy found for coupon "${coupon.code}" (ID: ${coupon.id})`
        );
        console.log(`   Database says: ${recordedCount} uses`);
        console.log(`   Actual count: ${actualCount} uses`);
        console.log(`   Difference: ${actualCount - recordedCount}\n`);

        discrepancies.push({
          id: coupon.id,
          code: coupon.code,
          recorded: recordedCount,
          actual: actualCount,
          difference: actualCount - recordedCount,
        });

        // Fix the count
        await db
          .update(coupons)
          .set({ usageCount: actualCount })
          .where(eq(coupons.id, coupon.id));

        console.log(
          `✅ Fixed: "${coupon.code}" usage count updated to ${actualCount}\n`
        );
        fixedCount++;
      } else {
        correctCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 AUDIT SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Coupons with correct counts: ${correctCount}`);
    console.log(`🔧 Coupons fixed: ${fixedCount}`);
    console.log(`📊 Total coupons audited: ${allCoupons.length}\n`);

    if (discrepancies.length > 0) {
      console.log("📋 DISCREPANCIES DETAILS:");
      console.table(discrepancies);
    } else {
      console.log(
        "✨ No discrepancies found! All coupon usage counts are accurate."
      );
    }

    console.log("\n✅ Migration completed successfully!");
    return {
      success: true,
      fixed: fixedCount,
      correct: correctCount,
      total: allCoupons.length,
      discrepancies,
    };
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixCouponUsageCounts()
    .then((result) => {
      console.log("\n🎉 All done!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Migration failed:", error);
      process.exit(1);
    });
}

export { fixCouponUsageCounts };
