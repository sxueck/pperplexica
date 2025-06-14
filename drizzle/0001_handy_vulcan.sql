CREATE TABLE `shared_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`chatId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`createdAt` text NOT NULL,
	`author` text NOT NULL,
	`spaceSharing` integer DEFAULT true NOT NULL
);
