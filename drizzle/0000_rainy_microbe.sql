CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`brand` varchar(128) NOT NULL,
	`cpu` varchar(128),
	`ram_gb` int,
	`storage` varchar(128),
	`condition` varchar(64) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`in_stock` boolean NOT NULL DEFAULT true,
	`description` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
