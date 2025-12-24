CREATE TABLE `failed_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`transaction_signature` text NOT NULL,
	`event_id` text NOT NULL,
	`option_id` text NOT NULL,
	`option_label` text,
	`quantity` integer NOT NULL,
	`amount` real NOT NULL,
	`chain` text DEFAULT 'SOL',
	`error_message` text NOT NULL,
	`status` text DEFAULT 'pending',
	`resolved_by` text,
	`resolved_at` integer,
	`resolution_note` text,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE INDEX `failed_tx_wallet_idx` ON `failed_transactions` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `failed_tx_status_idx` ON `failed_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `failed_tx_created_idx` ON `failed_transactions` (`created_at`);