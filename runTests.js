/**
 * Test Runner - Executes all coupon system tests and migrations
 */

import { fixCouponUsageCounts } from "./src/db/fixCouponUsageCount.js";
import { cleanupCartCoupons } from "./src/db/cleanupCartCoupons.js";
import { runTests } from "./src/db/testCouponValidations.js";

async function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   COUPON SYSTEM - COMPREHENSIVE TEST & FIX SUITE         ║");
  console.log(
    "╚═══════════════════════════════════════════════════════════╝\n"
  );

  try {
    // Step 1: Fix usage counts
    console.log("\n📊 STEP 1/3: Fixing Coupon Usage Counts");
    console.log("─".repeat(60));
    const fixResult = await fixCouponUsageCounts();
    console.log(
      `✅ Fixed ${fixResult.discrepancies.length} discrepancies in ${fixResult.totalCoupons} coupons\n`
    );

    // Step 2: Cleanup cart coupons
    console.log("\n🧹 STEP 2/3: Cleaning Up Cart Coupons");
    console.log("─".repeat(60));
    const cleanupResult = await cleanupCartCoupons();
    console.log(
      `✅ Removed ${cleanupResult.removed} orphaned records, found ${cleanupResult.violations.length} violations\n`
    );

    // Step 3: Run validation tests
    console.log("\n🧪 STEP 3/3: Running Validation Tests");
    console.log("─".repeat(60));
    const testResult = await runTests();

    // Final Summary
    console.log(
      "\n╔═══════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                    FINAL SUMMARY                          ║"
    );
    console.log(
      "╚═══════════════════════════════════════════════════════════╝\n"
    );
    console.log(`✅ Usage Count Fixes: ${fixResult.discrepancies.length}`);
    console.log(`✅ Cart Coupons Cleaned: ${cleanupResult.removed}`);
    console.log(
      `✅ Tests Passed: ${testResult.passed}/${testResult.total} (${((testResult.passed / testResult.total) * 100).toFixed(0)}%)\n`
    );

    if (testResult.success) {
      console.log("🎉 SUCCESS! Your coupon system is secure and ready!\n");
      process.exit(0);
    } else {
      console.log("⚠️  Some tests failed. Please review the output above.\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error running tests:", error);
    process.exit(1);
  }
}

runAllTests();
