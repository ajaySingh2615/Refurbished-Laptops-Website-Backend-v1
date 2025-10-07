ALTER TABLE `products` MODIFY COLUMN `category_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `products` DROP COLUMN `sub_type`;