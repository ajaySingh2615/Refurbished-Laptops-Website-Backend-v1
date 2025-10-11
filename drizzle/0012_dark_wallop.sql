CREATE TABLE `cart_abandonment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cart_id` int NOT NULL,
	`user_id` int DEFAULT null,
	`email` varchar(191) DEFAULT null,
	`phone` varchar(32) DEFAULT null,
	`abandonment_stage` varchar(32) NOT NULL,
	`reminder_sent` boolean NOT NULL DEFAULT false,
	`reminder_count` int NOT NULL DEFAULT 0,
	`last_reminder_sent_at` timestamp DEFAULT null,
	`recovered_at` timestamp DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_abandonment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cart_id` int NOT NULL,
	`coupon_code` varchar(64) NOT NULL,
	`discount_type` varchar(32) NOT NULL,
	`discount_value` decimal(10,2) NOT NULL,
	`applied_at` timestamp DEFAULT (now()),
	CONSTRAINT `cart_coupons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cart_id` int NOT NULL,
	`product_id` int NOT NULL,
	`product_variant_id` int DEFAULT null,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(10,2) NOT NULL,
	`unit_mrp` decimal(10,2) DEFAULT null,
	`unit_discount_percent` int DEFAULT 0,
	`unit_gst_percent` int DEFAULT 18,
	`line_total` decimal(10,2) NOT NULL,
	`line_tax` decimal(10,2) NOT NULL DEFAULT 0,
	`line_discount` decimal(10,2) NOT NULL DEFAULT 0,
	`selected_attributes` json DEFAULT ('null'),
	`notes` text DEFAULT (null),
	`added_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int DEFAULT null,
	`session_id` varchar(191) DEFAULT null,
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`subtotal` decimal(10,2) NOT NULL DEFAULT 0,
	`tax_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`discount_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`shipping_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`total_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`item_count` int NOT NULL DEFAULT 0,
	`applied_coupon_code` varchar(64) DEFAULT null,
	`shipping_address` json DEFAULT ('null'),
	`billing_address` json DEFAULT ('null'),
	`notes` text DEFAULT (null),
	`expires_at` timestamp DEFAULT null,
	`last_accessed_at` timestamp DEFAULT (now()),
	`converted_at` timestamp DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_carts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`description` text DEFAULT (null),
	`is_public` boolean NOT NULL DEFAULT false,
	`cart_data` json NOT NULL,
	`item_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_carts_id` PRIMARY KEY(`id`)
);
