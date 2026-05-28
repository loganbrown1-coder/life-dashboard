CREATE TABLE `sleep_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`date` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`notes` text
);
