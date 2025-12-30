CREATE TABLE `blog_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`excerpt` text,
	`content` text NOT NULL,
	`image_url` text,
	`category` text DEFAULT 'announcement',
	`is_published` integer DEFAULT false,
	`author_id` text,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `blog_published_idx` ON `blog_posts` (`is_published`);--> statement-breakpoint
CREATE INDEX `blog_category_idx` ON `blog_posts` (`category`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`data` text,
	`is_read` integer DEFAULT false,
	`created_at` text DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_platform_settings` (
	`id` text PRIMARY KEY DEFAULT 'settings' NOT NULL,
	`ticket_price` real DEFAULT 10,
	`platform_fee` real DEFAULT 0.01,
	`max_events_per_day` integer DEFAULT 10,
	`claim_delay_hours` integer DEFAULT 0,
	`maintenance_mode` integer DEFAULT false,
	`updated_at` integer
);
--> statement-breakpoint
INSERT INTO `__new_platform_settings`("id", "ticket_price", "platform_fee", "max_events_per_day", "claim_delay_hours", "maintenance_mode", "updated_at") SELECT "id", "ticket_price", "platform_fee", "max_events_per_day", "claim_delay_hours", "maintenance_mode", "updated_at" FROM `platform_settings`;--> statement-breakpoint
DROP TABLE `platform_settings`;--> statement-breakpoint
ALTER TABLE `__new_platform_settings` RENAME TO `platform_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
CREATE INDEX `tickets_purchase_tx_unique` ON `tickets` (`purchase_tx`);