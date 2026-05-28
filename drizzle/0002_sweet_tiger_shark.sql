CREATE TABLE `check_in_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`date` text NOT NULL,
	`steps_logged` integer DEFAULT false NOT NULL,
	`sleep_logged` integer DEFAULT false NOT NULL,
	`spend_logged` integer DEFAULT false NOT NULL,
	`dismissed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `check_in_logs_date_unique` ON `check_in_logs` (`date`);--> statement-breakpoint
ALTER TABLE `tasks` ADD `goal_id` text REFERENCES goals(id);