CREATE TABLE `product_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`user_id` int NOT NULL,
	`rating` int NOT NULL,
	`title` varchar(255) DEFAULT null,
	`review` text DEFAULT (null),
	`pros` text DEFAULT (null),
	`cons` text DEFAULT (null),
	`is_verified_purchase` boolean NOT NULL DEFAULT false,
	`is_anonymous` boolean NOT NULL DEFAULT false,
	`status` varchar(32) NOT NULL DEFAULT 'pending',
	`admin_notes` text DEFAULT (null),
	`helpful_count` int NOT NULL DEFAULT 0,
	`not_helpful_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`approved_at` timestamp DEFAULT null,
	`rejected_at` timestamp DEFAULT null,
	CONSTRAINT `product_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_helpful` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`user_id` int NOT NULL,
	`is_helpful` boolean NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `review_helpful_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`review_id` int NOT NULL,
	`cloudinary_public_id` varchar(255) NOT NULL,
	`cloudinary_url` varchar(500) NOT NULL,
	`alt_text` varchar(255) DEFAULT null,
	`sort_order` int NOT NULL DEFAULT 0,
	`width` int DEFAULT null,
	`height` int DEFAULT null,
	`file_size` int DEFAULT null,
	`mime_type` varchar(64) DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `review_images_id` PRIMARY KEY(`id`)
);
