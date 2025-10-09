CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int DEFAULT null,
	`action` varchar(64) NOT NULL,
	`metadata` json DEFAULT ('null'),
	`ip` varchar(64) DEFAULT null,
	`user_agent` varchar(255) DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_resets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`token_hash` varchar(191) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `password_resets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `phone_otps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(32) NOT NULL,
	`code_hash` varchar(191) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` timestamp NOT NULL,
	`used_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `phone_otps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`refresh_token_hash` varchar(191) NOT NULL,
	`user_agent` varchar(255) DEFAULT null,
	`ip` varchar(64) DEFAULT null,
	`expires_at` timestamp NOT NULL,
	`revoked_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_oauth_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`provider` varchar(32) NOT NULL,
	`provider_user_id` varchar(191) NOT NULL,
	`provider_email` varchar(191) DEFAULT null,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `user_oauth_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`phone` varchar(32) DEFAULT null,
	`password_hash` varchar(191) DEFAULT null,
	`name` varchar(128) DEFAULT null,
	`avatar_url` varchar(255) DEFAULT null,
	`role` varchar(32) NOT NULL DEFAULT 'customer',
	`status` varchar(32) NOT NULL DEFAULT 'active',
	`email_verified_at` timestamp,
	`phone_verified_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
