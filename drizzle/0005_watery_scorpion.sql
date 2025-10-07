DROP TABLE `categories`;--> statement-breakpoint
DROP TABLE `category_attributes`;--> statement-breakpoint
DROP TABLE `product_attribute_values`;--> statement-breakpoint
ALTER TABLE `products` ADD `sub_type` varchar(128);--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `category_id`;