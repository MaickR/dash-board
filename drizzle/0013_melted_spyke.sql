CREATE TABLE `system_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`config_key` varchar(100) NOT NULL,
	`value` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_config_config_key_unique` UNIQUE(`config_key`)
);
--> statement-breakpoint
CREATE TABLE `task_followers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tareaId` int NOT NULL,
	`responsableId` int NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_followers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_sections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`orden` int NOT NULL DEFAULT 0,
	`color` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `task_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tareas` ADD `sectionId` int;