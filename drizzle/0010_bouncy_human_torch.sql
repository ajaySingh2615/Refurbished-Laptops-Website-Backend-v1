CREATE TABLE `product_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`cloudinary_public_id` varchar(255) NOT NULL,
	`cloudinary_url` varchar(500) NOT NULL,
	`alt_text` varchar(255) DEFAULT null,
	`is_primary` boolean NOT NULL DEFAULT false,
	`sort_order` int NOT NULL DEFAULT 0,
	`width` int DEFAULT null,
	`height` int DEFAULT null,
	`file_size` int DEFAULT null,
	`mime_type` varchar(64) DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_images_id` PRIMARY KEY(`id`)
);
