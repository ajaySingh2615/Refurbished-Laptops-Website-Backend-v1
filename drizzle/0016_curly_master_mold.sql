CREATE TABLE `newsletter_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(191) NOT NULL,
	`source` varchar(64) DEFAULT 'homepage',
	`ip` varchar(64) DEFAULT null,
	`user_agent` varchar(255) DEFAULT null,
	`subscribed_at` timestamp DEFAULT (now()),
	CONSTRAINT `newsletter_subscriptions_id` PRIMARY KEY(`id`)
);
