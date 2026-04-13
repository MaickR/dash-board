CREATE TABLE `prompt_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`descripcion` text,
	`prompt` text NOT NULL,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tarea_borradores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`descripcion` text,
	`responsable` varchar(200),
	`area` varchar(200),
	`empresa` varchar(200),
	`prioridad` enum('alta','media','baja') DEFAULT 'media',
	`fechaLimite` varchar(30),
	`status` enum('borrador','aprobado','rechazado') NOT NULL DEFAULT 'borrador',
	`archivoOrigenId` int,
	`driveArchivoId` int,
	`reunionId` int,
	`promptUsado` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tarea_borradores_id` PRIMARY KEY(`id`)
);
