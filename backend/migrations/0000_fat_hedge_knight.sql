CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`admin_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`details` text,
	`ip_address` text,
	`user_agent` text,
	`created_at` integer,
	FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_admin_idx` ON `admin_audit_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `admin_audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `audit_created_idx` ON `admin_audit_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `event_options` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`option_id` text NOT NULL,
	`label` text NOT NULL,
	`ticket_limit` integer NOT NULL,
	`tickets_sold` integer DEFAULT 0,
	`pool_amount` real DEFAULT 0,
	`is_winner` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `event_options_event_idx` ON `event_options` (`event_id`);--> statement-breakpoint
CREATE INDEX `event_options_unique` ON `event_options` (`event_id`,`option_id`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`ticket_price` real DEFAULT 10,
	`image_url` text,
	`start_time` integer NOT NULL,
	`lock_time` integer NOT NULL,
	`event_time` integer NOT NULL,
	`status` text DEFAULT 'draft',
	`winning_option` text,
	`resolved_at` integer,
	`resolved_by` text,
	`total_pool` real DEFAULT 0,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `events_category_idx` ON `events` (`category`);--> statement-breakpoint
CREATE INDEX `events_event_time_idx` ON `events` (`event_time`);--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` text PRIMARY KEY DEFAULT 'settings' NOT NULL,
	`ticket_price` real DEFAULT 10,
	`platform_fee` real DEFAULT 0.01,
	`max_events_per_day` integer DEFAULT 3,
	`claim_delay_hours` integer DEFAULT 3,
	`maintenance_mode` integer DEFAULT false,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`serial_number` text NOT NULL,
	`event_id` text NOT NULL,
	`option_id` text NOT NULL,
	`option_label` text NOT NULL,
	`user_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`chain` text NOT NULL,
	`purchase_price` real NOT NULL,
	`purchase_tx` text NOT NULL,
	`status` text DEFAULT 'active',
	`payout_amount` real,
	`claim_tx` text,
	`claimed_at` integer,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`option_id`) REFERENCES `event_options`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_serial_number_unique` ON `tickets` (`serial_number`);--> statement-breakpoint
CREATE INDEX `tickets_user_idx` ON `tickets` (`user_id`);--> statement-breakpoint
CREATE INDEX `tickets_event_idx` ON `tickets` (`event_id`);--> statement-breakpoint
CREATE INDEX `tickets_wallet_idx` ON `tickets` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `tickets_status_idx` ON `tickets` (`status`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`email_verified` integer DEFAULT false,
	`wallet_address` text,
	`preferred_chain` text DEFAULT 'SOL',
	`role` text DEFAULT 'user',
	`created_at` integer,
	`updated_at` integer,
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_wallet_idx` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `users_role_idx` ON `users` (`role`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);