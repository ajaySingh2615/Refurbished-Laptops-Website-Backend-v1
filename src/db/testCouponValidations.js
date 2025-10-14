/**
 * Coupon Validation Test Suite
 *
 * This script tests all coupon validation scenarios to ensure
 * security fixes are working correctly.
 */

import { db } from "./client.js";
import { coupons, couponUsage, cartCoupons, carts } from "./schema.js";
import { CouponService } from "../services/couponService.js";
import { eq } from "drizzle-orm";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function pass(message) {
  console.log(`${colors.green}✅ PASS:${colors.reset} ${message}`);
}

function fail(message) {
  console.log(`${colors.red}❌ FAIL:${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ️  INFO:${colors.reset} ${message}`);
}

function section(message) {
  console.log(`\n${colors.cyan}${"=".repeat(60)}`);
  console.log(`${message}`);
  console.log(`${"=".repeat(60)}${colors.reset}\n`);
}

async function runTests() {
  section("🧪 COUPON VALIDATION TEST SUITE");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // Test helper function
  async function test(name, testFn) {
    totalTests++;
    try {
      await testFn();
      passedTests++;
      pass(name);
    } catch (error) {
      failedTests++;
      fail(`${name} - ${error.message}`);
    }
  }

  // ==========================================
  // TEST 1: Active Status Validation
  // ==========================================
  section("TEST 1: Active Status Validation");

  await test("Should reject inactive coupon", async () => {
    // Create a test inactive coupon
    const [testCoupon] = await db.insert(coupons).values({
      code: "TEST_INACTIVE",
      name: "Test Inactive",
      type: "fixed_amount",
      value: 100,
      isActive: false,
      isPublic: true,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    const result = await CouponService.validateCoupon(
      "TEST_INACTIVE",
      1,
      1,
      null
    );

    await db.delete(coupons).where(eq(coupons.code, "TEST_INACTIVE"));

    if (result.success) {
      throw new Error("Should have rejected inactive coupon");
    }
    if (result.code !== "COUPON_INACTIVE") {
      throw new Error(`Expected COUPON_INACTIVE, got ${result.code}`);
    }
  });

  // ==========================================
  // TEST 2: Date Range Validation
  // ==========================================
  section("TEST 2: Date Range Validation");

  await test("Should reject expired coupon", async () => {
    await db.insert(coupons).values({
      code: "TEST_EXPIRED",
      name: "Test Expired",
      type: "fixed_amount",
      value: 100,
      isActive: true,
      validFrom: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      validUntil: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Expired
      createdBy: 1,
    });

    const result = await CouponService.validateCoupon(
      "TEST_EXPIRED",
      1,
      1,
      null
    );

    await db.delete(coupons).where(eq(coupons.code, "TEST_EXPIRED"));

    if (result.success) {
      throw new Error("Should have rejected expired coupon");
    }
    if (result.code !== "COUPON_EXPIRED") {
      throw new Error(`Expected COUPON_EXPIRED, got ${result.code}`);
    }
  });

  await test("Should reject not-yet-active coupon", async () => {
    await db.insert(coupons).values({
      code: "TEST_FUTURE",
      name: "Test Future",
      type: "fixed_amount",
      value: 100,
      isActive: true,
      validFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Future
      validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    const result = await CouponService.validateCoupon(
      "TEST_FUTURE",
      1,
      1,
      null
    );

    await db.delete(coupons).where(eq(coupons.code, "TEST_FUTURE"));

    if (result.success) {
      throw new Error("Should have rejected future coupon");
    }
    if (result.code !== "COUPON_NOT_STARTED") {
      throw new Error(`Expected COUPON_NOT_STARTED, got ${result.code}`);
    }
  });

  // ==========================================
  // TEST 3: Total Usage Limit
  // ==========================================
  section("TEST 3: Total Usage Limit Validation");

  await test("Should reject coupon at usage limit", async () => {
    await db.insert(coupons).values({
      code: "TEST_LIMIT",
      name: "Test Limit",
      type: "fixed_amount",
      value: 100,
      usageLimit: 5,
      usageCount: 5, // Already at limit
      isActive: true,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    const result = await CouponService.validateCoupon("TEST_LIMIT", 1, 1, null);

    await db.delete(coupons).where(eq(coupons.code, "TEST_LIMIT"));

    if (result.success) {
      throw new Error("Should have rejected coupon at usage limit");
    }
    if (result.code !== "TOTAL_USAGE_LIMIT_EXCEEDED") {
      throw new Error(
        `Expected TOTAL_USAGE_LIMIT_EXCEEDED, got ${result.code}`
      );
    }
  });

  // ==========================================
  // TEST 4: Per-User Usage Limit (CRITICAL)
  // ==========================================
  section("TEST 4: Per-User Usage Limit Validation (CRITICAL)");

  await test("Should reject user who exceeded limit", async () => {
    // Cleanup any existing test coupon first
    await db.delete(coupons).where(eq(coupons.code, "TEST_USER_LIMIT"));

    // Create test coupon
    const insertResult = await db.insert(coupons).values({
      code: "TEST_USER_LIMIT",
      name: "Test User Limit",
      type: "fixed_amount",
      value: 100,
      usageLimitPerUser: 1,
      isActive: true,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    const couponId = insertResult.insertId || insertResult[0]?.insertId;

    // Get the actual coupon record to get its ID
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, "TEST_USER_LIMIT"))
      .limit(1);

    // Create usage record for user 999
    await db.insert(couponUsage).values({
      couponId: coupon.id,
      userId: 999,
      sessionId: null,
      orderId: 1,
      cartId: 1,
      discountAmount: 100,
      orderAmount: 1000,
    });

    // Try to validate for same user
    const result = await CouponService.validateCoupon(
      "TEST_USER_LIMIT",
      1,
      999,
      null,
      { skipUsageChecks: false }
    );

    // Cleanup
    await db.delete(couponUsage).where(eq(couponUsage.couponId, coupon.id));
    await db.delete(coupons).where(eq(coupons.code, "TEST_USER_LIMIT"));

    if (result.success) {
      throw new Error("Should have rejected user who exceeded limit");
    }
    if (result.code !== "USER_LIMIT_EXCEEDED") {
      throw new Error(`Expected USER_LIMIT_EXCEEDED, got ${result.code}`);
    }
  });

  // ==========================================
  // TEST 5: Minimum Order Amount
  // ==========================================
  section("TEST 5: Minimum Order Amount Validation");

  await test("Should reject cart below minimum", async () => {
    // Cleanup any existing test coupon first
    await db.delete(coupons).where(eq(coupons.code, "TEST_MIN_ORDER"));

    // Create test cart with low subtotal
    const cartInsertResult = await db.insert(carts).values({
      userId: 1,
      sessionId: "test_session",
      subtotal: 400, // Below minimum
      totalAmount: 400,
      itemCount: 1,
    });

    const cartId = cartInsertResult.insertId || cartInsertResult[0]?.insertId;

    // Create coupon with minimum order
    await db.insert(coupons).values({
      code: "TEST_MIN_ORDER",
      name: "Test Min Order",
      type: "fixed_amount",
      value: 100,
      minOrderAmount: 500, // Requires 500
      isActive: true,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    const result = await CouponService.validateCoupon(
      "TEST_MIN_ORDER",
      cartId,
      1,
      null
    );

    // Cleanup
    await db.delete(carts).where(eq(carts.id, cartId));
    await db.delete(coupons).where(eq(coupons.code, "TEST_MIN_ORDER"));

    if (result.success) {
      throw new Error("Should have rejected cart below minimum");
    }
    if (result.code !== "MINIMUM_ORDER_NOT_MET") {
      throw new Error(`Expected MINIMUM_ORDER_NOT_MET, got ${result.code}`);
    }
    if (!result.shortfall || result.shortfall !== 100) {
      throw new Error(`Expected shortfall of 100, got ${result.shortfall}`);
    }
  });

  // ==========================================
  // TEST 6: Discount Calculation
  // ==========================================
  section("TEST 6: Discount Calculation");

  await test("Percentage discount should cap at max", async () => {
    // Cleanup any existing test coupon first
    await db.delete(coupons).where(eq(coupons.code, "TEST_PERCENT_CAP"));

    // Create cart with high subtotal
    const cartInsertResult = await db.insert(carts).values({
      userId: 1,
      sessionId: "test_session_2",
      subtotal: 10000, // High amount
      totalAmount: 10000,
      itemCount: 1,
    });

    const cartId = cartInsertResult.insertId || cartInsertResult[0]?.insertId;

    // Create percentage coupon with cap
    await db.insert(coupons).values({
      code: "TEST_PERCENT_CAP",
      name: "Test Percent Cap",
      type: "percentage",
      value: 20, // 20% of 10000 = 2000
      maxDiscountAmount: 500, // But capped at 500
      isActive: true,
      validFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: 1,
    });

    // Get the coupon record to get its ID
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, "TEST_PERCENT_CAP"))
      .limit(1);

    // Apply coupon
    const result = await CouponService.applyCoupon(
      "TEST_PERCENT_CAP",
      cartId,
      1,
      null
    );

    // Cleanup
    await db.delete(cartCoupons).where(eq(cartCoupons.cartId, cartId));
    await db.delete(carts).where(eq(carts.id, cartId));
    await db.delete(coupons).where(eq(coupons.id, coupon.id));

    if (!result.success) {
      throw new Error(`Apply failed: ${result.message}`);
    }
    if (result.data.discountAmount !== 500) {
      throw new Error(
        `Expected discount of 500, got ${result.data.discountAmount}`
      );
    }
  });

  // ==========================================
  // SUMMARY
  // ==========================================
  section("📊 TEST RESULTS SUMMARY");

  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(
    `Success Rate: ${((passedTests / totalTests) * 100).toFixed(2)}%\n`
  );

  if (failedTests === 0) {
    console.log(
      `${colors.green}✨ All tests passed! Coupon system is secure.${colors.reset}\n`
    );
  } else {
    console.log(
      `${colors.red}⚠️ Some tests failed. Please review the failures above.${colors.reset}\n`
    );
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    success: failedTests === 0,
  };
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(`${colors.red}💥 Test suite failed:${colors.reset}`, error);
      process.exit(1);
    });
}

export { runTests };
