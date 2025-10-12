import {
  serial,
  varchar,
  text,
  int,
  decimal,
  boolean,
  timestamp,
  mysqlTable,
  json,
} from "drizzle-orm/mysql-core";

export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  slug: varchar("slug", { length: 256 }).notNull(),
  parentId: int("parent_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const products = mysqlTable("products", {
  id: serial("id").primaryKey(),
  categoryId: int("category_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  brand: varchar("brand", { length: 128 }).notNull(),
  // subType removed in favor of hierarchical categories
  model: varchar("model", { length: 128 }),
  sku: varchar("sku", { length: 64 }),
  cpu: varchar("cpu", { length: 128 }),
  gpu: varchar("gpu", { length: 128 }),
  ramGb: int("ram_gb"),
  storage: varchar("storage", { length: 128 }),
  displaySizeInches: decimal("display_size_inches", { precision: 4, scale: 1 }),
  displayResolution: varchar("display_resolution", { length: 64 }),
  displayPanel: varchar("display_panel", { length: 64 }),
  displayRefreshHz: int("display_refresh_hz"),
  brightnessNits: int("brightness_nits"),
  condition: varchar("condition", { length: 64 }).notNull(),
  cosmeticNotes: text("cosmetic_notes"),
  functionalNotes: text("functional_notes"),
  batteryHealthPct: int("battery_health_pct"),
  batteryCycles: int("battery_cycles"),
  ports: text("ports"),
  os: varchar("os", { length: 128 }),
  keyboardLayout: varchar("keyboard_layout", { length: 128 }),
  color: varchar("color", { length: 64 }),
  weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
  dimensionsMm: varchar("dimensions_mm", { length: 128 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  gstPercent: int("gst_percent"),
  discountPercent: int("discount_percent"),
  inStock: boolean("in_stock").notNull().default(true),
  stockQty: int("stock_qty").default(0),
  warrantyMonths: int("warranty_months"),
  returnWindowDays: int("return_window_days"),
  fulfillmentLocation: varchar("fulfillment_location", { length: 128 }),
  description: text("description"),
  highlights: text("highlights"),
  metaTitle: varchar("meta_title", { length: 255 }),
  metaDescription: varchar("meta_description", { length: 255 }),
  metaKeywords: varchar("meta_keywords", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const productVariants = mysqlTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: int("product_id").notNull(),
  sku: varchar("sku", { length: 128 }).notNull(),
  attributes: json("attributes").notNull(), // { color, ramGb, storage, ... }
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  mrp: decimal("mrp", { precision: 10, scale: 2 }),
  discountPercent: int("discount_percent"),
  gstPercent: int("gst_percent").default(18),
  inStock: boolean("in_stock").notNull().default(true),
  stockQty: int("stock_qty").default(0),
  fulfillmentLocation: varchar("fulfillment_location", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 191 }).unique().notNull(),
  phone: varchar("phone", { length: 32 }).unique().default(null),
  passwordHash: varchar("password_hash", { length: 191 }).default(null),
  name: varchar("name", { length: 128 }).default(null),
  avatarUrl: varchar("avatar_url", { length: 255 }).default(null),
  role: varchar("role", { length: 32 }).notNull().default("customer"), //customer / admin
  status: varchar("status", { length: 32 }).notNull().default("active"), //active, suspended, deleted
  emailVerifiedAt: timestamp("email_verified_at"),
  phoneVerifiedAt: timestamp("phone_verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const userOauthAccounts = mysqlTable("user_oauth_accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  provider: varchar("provider", { length: 32 }).notNull(), //google
  providerUserId: varchar("provider_user_id", { length: 191 }).notNull(),
  providerEmail: varchar("provider_email", { length: 191 }).default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = mysqlTable("sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  refreshTokenHash: varchar("refresh_token_hash", { length: 191 }).notNull(),
  userAgent: varchar("user_agent", { length: 255 }).default(null),
  ip: varchar("ip", { length: 64 }).default(null),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResets = mysqlTable("password_resets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 191 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const phoneOtps = mysqlTable("phone_otps", {
  id: int("id").autoincrement().primaryKey(),
  phone: varchar("phone", { length: 32 }).notNull(),
  codeHash: varchar("code_hash", { length: 191 }).notNull(),
  attempts: int("attempts").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").default(null),
  action: varchar("action", { length: 64 }).notNull(),
  metadata: json("metadata").default(null),
  ip: varchar("ip", { length: 64 }).default(null),
  userAgent: varchar("user_agent", { length: 255 }).default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailVerifications = mysqlTable("email_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  tokenHash: varchar("token_hash", { length: 191 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const productImages = mysqlTable("product_images", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  cloudinaryPublicId: varchar("cloudinary_public_id", {
    length: 255,
  }).notNull(),
  cloudinaryUrl: varchar("cloudinary_url", { length: 500 }).notNull(),
  altText: varchar("alt_text", { length: 255 }).default(null),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: int("sort_order").notNull().default(0),
  width: int("width").default(null),
  height: int("height").default(null),
  fileSize: int("file_size").default(null), // in bytes
  mimeType: varchar("mime_type", { length: 64 }).default(null),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const productReviews = mysqlTable("product_reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  userId: int("user_id").notNull(),
  rating: int("rating").notNull(), // 1-5 stars
  title: varchar("title", { length: 255 }).default(null),
  review: text("review").default(null),
  pros: text("pros").default(null), // JSON array of pros
  cons: text("cons").default(null), // JSON array of cons
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  status: varchar("status", { length: 32 }).notNull().default("pending"), // pending, approved, rejected
  adminNotes: text("admin_notes").default(null),
  helpfulCount: int("helpful_count").notNull().default(0),
  notHelpfulCount: int("not_helpful_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  approvedAt: timestamp("approved_at").default(null),
  rejectedAt: timestamp("rejected_at").default(null),
});

export const reviewHelpful = mysqlTable("review_helpful", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  userId: int("user_id").notNull(),
  isHelpful: boolean("is_helpful").notNull(), // true for helpful, false for not helpful
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviewImages = mysqlTable("review_images", {
  id: int("id").autoincrement().primaryKey(),
  reviewId: int("review_id").notNull(),
  cloudinaryPublicId: varchar("cloudinary_public_id", {
    length: 255,
  }).notNull(),
  cloudinaryUrl: varchar("cloudinary_url", { length: 500 }).notNull(),
  altText: varchar("alt_text", { length: 255 }).default(null),
  sortOrder: int("sort_order").notNull().default(0),
  width: int("width").default(null),
  height: int("height").default(null),
  fileSize: int("file_size").default(null),
  mimeType: varchar("mime_type", { length: 64 }).default(null),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cart System Tables
export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").default(null), // null for guest carts
  sessionId: varchar("session_id", { length: 191 }).default(null), // for guest carts
  status: varchar("status", { length: 32 }).notNull().default("active"), // active, abandoned, converted, expired
  currency: varchar("currency", { length: 3 }).notNull().default("INR"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  shippingAmount: decimal("shipping_amount", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  itemCount: int("item_count").notNull().default(0),
  appliedCouponCode: varchar("applied_coupon_code", { length: 64 }).default(
    null
  ),
  shippingAddress: json("shipping_address").default(null),
  billingAddress: json("billing_address").default(null),
  notes: text("notes").default(null),
  expiresAt: timestamp("expires_at").default(null), // cart expiration
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
  convertedAt: timestamp("converted_at").default(null), // when cart becomes order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cart_id").notNull(),
  productId: int("product_id").notNull(),
  productVariantId: int("product_variant_id").default(null), // null if no variant
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  unitMrp: decimal("unit_mrp", { precision: 10, scale: 2 }).default(null),
  unitDiscountPercent: int("unit_discount_percent").default(0),
  unitGstPercent: int("unit_gst_percent").default(18),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  lineTax: decimal("line_tax", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  lineDiscount: decimal("line_discount", { precision: 10, scale: 2 })
    .notNull()
    .default(0),
  selectedAttributes: json("selected_attributes").default(null), // for variant selection
  notes: text("notes").default(null), // item-specific notes
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Cart Abandonment Tracking
export const cartAbandonment = mysqlTable("cart_abandonment", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cart_id").notNull(),
  userId: int("user_id").default(null),
  email: varchar("email", { length: 191 }).default(null),
  phone: varchar("phone", { length: 32 }).default(null),
  abandonmentStage: varchar("abandonment_stage", { length: 32 }).notNull(), // viewed, added_item, checkout_started, payment_failed
  reminderSent: boolean("reminder_sent").notNull().default(false),
  reminderCount: int("reminder_count").notNull().default(0),
  lastReminderSentAt: timestamp("last_reminder_sent_at").default(null),
  recoveredAt: timestamp("recovered_at").default(null),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Saved Carts (Wishlist functionality)
export const savedCarts = mysqlTable("saved_carts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description").default(null),
  isPublic: boolean("is_public").notNull().default(false),
  cartData: json("cart_data").notNull(), // serialized cart items
  itemCount: int("item_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// Coupon System Tables
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").default(null),
  type: varchar("type", { length: 32 }).notNull(), // percentage, fixed_amount, free_shipping, buy_x_get_y
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: decimal("min_order_amount", {
    precision: 10,
    scale: 2,
  }).default(0),
  maxDiscountAmount: decimal("max_discount_amount", {
    precision: 10,
    scale: 2,
  }).default(null),
  usageLimit: int("usage_limit").default(null), // null = unlimited
  usageCount: int("usage_count").notNull().default(0),
  usageLimitPerUser: int("usage_limit_per_user").default(1),
  isActive: boolean("is_active").notNull().default(true),
  isPublic: boolean("is_public").notNull().default(true), // public coupons vs private/admin-only
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  applicableTo: varchar("applicable_to", { length: 32 })
    .notNull()
    .default("all"), // all, categories, products, brands
  applicableCategories: json("applicable_categories").default(null), // array of category IDs
  applicableProducts: json("applicable_products").default(null), // array of product IDs
  applicableBrands: json("applicable_brands").default(null), // array of brand names
  excludedCategories: json("excluded_categories").default(null),
  excludedProducts: json("excluded_products").default(null),
  excludedBrands: json("excluded_brands").default(null),
  stackable: boolean("stackable").notNull().default(false), // can be used with other coupons
  autoApply: boolean("auto_apply").notNull().default(false), // automatically apply if conditions met
  priority: int("priority").notNull().default(0), // higher number = higher priority
  createdBy: int("created_by").notNull(), // admin user ID
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const couponUsage = mysqlTable("coupon_usage", {
  id: int("id").autoincrement().primaryKey(),
  couponId: int("coupon_id").notNull(),
  userId: int("user_id").default(null), // null for guest users
  sessionId: varchar("session_id", { length: 191 }).default(null), // for guest users
  orderId: int("order_id").default(null), // when order is created
  cartId: int("cart_id").default(null), // for cart-level tracking
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").defaultNow(),
  ip: varchar("ip", { length: 64 }).default(null),
  userAgent: varchar("user_agent", { length: 255 }).default(null),
});

// Cart Coupons/Discounts (for applied coupons in cart)
export const cartCoupons = mysqlTable("cart_coupons", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cart_id").notNull(),
  couponId: int("coupon_id").notNull(),
  couponCode: varchar("coupon_code", { length: 64 }).notNull(),
  discountType: varchar("discount_type", { length: 32 }).notNull(), // percentage, fixed_amount, free_shipping
  discountValue: decimal("discount_value", {
    precision: 10,
    scale: 2,
  }).notNull(),
  discountAmount: decimal("discount_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  appliedAt: timestamp("applied_at").defaultNow(),
  appliedBy: int("applied_by").default(null), // user ID who applied the coupon
});
