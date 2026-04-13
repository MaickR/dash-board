CREATE TABLE `etiquetas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`color` varchar(20) NOT NULL,
	`area` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `etiquetas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `reuniones` ADD `notas` text;--> statement-breakpoint
ALTER TABLE `reuniones` ADD `tareasGeneradas` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tareas` ADD `prioridad` enum('alta','media','baja') DEFAULT 'media' NOT NULL;--> statement-breakpoint
ALTER TABLE `tareas` ADD `avance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tareas` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `tareas` ADD `etiquetas` text;--> statement-breakpoint
ALTER TABLE `tareas` ADD `responsablesIds` text;--> statement-breakpoint
ALTER TABLE `tareas` ADD `dependeDeId` int;--> statement-breakpoint
ALTER TABLE `tareas` ADD `fechaInicio` varchar(20);--> statement-breakpoint
ALTER TABLE `tareas` ADD `fechaInicioTs` bigint;