CREATE TABLE `addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int DEFAULT null,
	`type` varchar(16) NOT NULL,
	`name` varchar(128) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`email` varchar(191) DEFAULT null,
	`line1` varchar(255) NOT NULL,
	`line2` varchar(255) DEFAULT null,
	`city` varchar(128) NOT NULL,
	`state` varchar(128) NOT NULL,
	`postcode` varchar(16) NOT NULL,
	`country` varchar(64) NOT NULL,
	`is_default` boolean NOT NULL DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int NOT NULL,
	`product_variant_id` int DEFAULT null,
	`title` varchar(255) NOT NULL,
	`sku` varchar(128) DEFAULT null,
	`quantity` int NOT NULL,
	`unit_price` decimal(10,2) NOT NULL,
	`unit_mrp` decimal(10,2) DEFAULT null,
	`unit_gst_percent` int DEFAULT 18,
	`line_total` decimal(10,2) NOT NULL,
	`line_tax` decimal(10,2) NOT NULL DEFAULT 0,
	`line_discount` decimal(10,2) NOT NULL DEFAULT 0,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int DEFAULT null,
	`cart_id` int NOT NULL,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`payment_status` varchar(32) NOT NULL DEFAULT 'unpaid',
	`payment_provider` varchar(64) DEFAULT null,
	`payment_ref` varchar(191) DEFAULT null,
	`subtotal` decimal(10,2) NOT NULL DEFAULT 0,
	`discount_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`tax_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`shipping_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`total_amount` decimal(10,2) NOT NULL DEFAULT 0,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`shipping_method` varchar(64) DEFAULT null,
	`notes` text DEFAULT (null),
	`placed_at` timestamp DEFAULT null,
	`billing_address_id` int DEFAULT null,
	`shipping_address_id` int DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`provider` varchar(64) DEFAULT null,
	`amount` decimal(10,2) NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'INR',
	`status` varchar(32) NOT NULL DEFAULT 'created',
	`txn_id` varchar(191) DEFAULT null,
	`payload` json DEFAULT ('null'),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
