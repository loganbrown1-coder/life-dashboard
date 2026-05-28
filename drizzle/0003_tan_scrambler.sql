CREATE TABLE `user_options` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`type` text NOT NULL,
	`value` text NOT NULL,
	`label` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL
);
