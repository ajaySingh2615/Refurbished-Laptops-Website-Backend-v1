ALTER TABLE `orders` ADD `order_number` varchar(64) DEFAULT null;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_method` varchar(32) DEFAULT null;--> statement-breakpoint
ALTER TABLE `orders` ADD `payment_id` varchar(191) DEFAULT null;--> statement-breakpoint
ALTER TABLE `orders` ADD `razorpay_order_id` varchar(191) DEFAULT null;--> statement-breakpoint
ALTER TABLE `orders` ADD `transaction_id` varchar(191) DEFAULT null;--> statement-breakpoint
ALTER TABLE `orders` ADD `cod_collected` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `orders` ADD `order_status` varchar(32) DEFAULT null;