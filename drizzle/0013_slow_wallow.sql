CREATE TABLE `coupon_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`coupon_id` int NOT NULL,
	`user_id` int DEFAULT null,
	`session_id` varchar(191) DEFAULT null,
	`order_id` int DEFAULT null,
	`cart_id` int DEFAULT null,
	`discount_amount` decimal(10,2) NOT NULL,
	`order_amount` decimal(10,2) NOT NULL,
	`used_at` timestamp DEFAULT (now()),
	`ip` varchar(64) DEFAULT null,
	`user_agent` varchar(255) DEFAULT null,
	CONSTRAINT `coupon_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text DEFAULT (null),
	`type` varchar(32) NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`min_order_amount` decimal(10,2) DEFAULT 0,
	`max_discount_amount` decimal(10,2) DEFAULT null,
	`usage_limit` int DEFAULT null,
	`usage_count` int NOT NULL DEFAULT 0,
	`usage_limit_per_user` int DEFAULT 1,
	`is_active` boolean NOT NULL DEFAULT true,
	`is_public` boolean NOT NULL DEFAULT true,
	`valid_from` timestamp NOT NULL,
	`valid_until` timestamp NOT NULL,
	`applicable_to` varchar(32) NOT NULL DEFAULT 'all',
	`applicable_categories` json DEFAULT ('null'),
	`applicable_products` json DEFAULT ('null'),
	`applicable_brands` json DEFAULT ('null'),
	`excluded_categories` json DEFAULT ('null'),
	`excluded_products` json DEFAULT ('null'),
	`excluded_brands` json DEFAULT ('null'),
	`stackable` boolean NOT NULL DEFAULT false,
	`auto_apply` boolean NOT NULL DEFAULT false,
	`priority` int NOT NULL DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `cart_coupons` ADD `coupon_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_coupons` ADD `discount_amount` decimal(10,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `cart_coupons` ADD `applied_by` int DEFAULT null;