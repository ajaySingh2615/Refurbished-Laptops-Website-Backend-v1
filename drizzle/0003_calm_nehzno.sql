CREATE TABLE `product_variants` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`sku` varchar(128) NOT NULL,
	`attributes` json NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`mrp` decimal(10,2),
	`discount_percent` int,
	`gst_percent` int DEFAULT 18,
	`in_stock` boolean NOT NULL DEFAULT true,
	`stock_qty` int DEFAULT 0,
	`fulfillment_location` varchar(128),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`)
);
