CREATE TABLE `event_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`event_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_event_idx` ON `event_messages` (`event_id`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `event_messages` (`created_at`);--> statement-breakpoint
ALTER TABLE `events` ADD `is_jackpot` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `events` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `events` ADD `external_source` text;--> statement-breakpoint
ALTER TABLE `events` ADD `external_data` text;--> statement-breakpoint
CREATE INDEX `events_jackpot_idx` ON `events` (`is_jackpot`);