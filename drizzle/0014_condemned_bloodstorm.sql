CREATE TABLE `briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reunionId` int NOT NULL,
	`contenido` text NOT NULL,
	`tipo` varchar(20) NOT NULL DEFAULT 'manual',
	`generadoEn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `briefs_id` PRIMARY KEY(`id`)
);
