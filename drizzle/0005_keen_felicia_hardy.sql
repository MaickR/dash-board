CREATE TABLE `drive_archivos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driveId` varchar(200) NOT NULL,
	`nombre` varchar(500) NOT NULL,
	`mimeType` varchar(200),
	`url` text,
	`carpeta` varchar(500),
	`area` varchar(200),
	`tamano` bigint,
	`procesado` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drive_archivos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `informes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`numero` int NOT NULL,
	`departamento` varchar(300) NOT NULL,
	`responsable` varchar(200) NOT NULL,
	`cargo` varchar(200),
	`empresa` varchar(200) NOT NULL,
	`categoria` varchar(200),
	`anio` int NOT NULL DEFAULT 2026,
	`observaciones` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `informes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `informes_mensuales` (
	`id` int AUTO_INCREMENT NOT NULL,
	`informeId` int NOT NULL,
	`mes` int NOT NULL,
	`estado` enum('entregado','retraso','no_entregado','pendiente') NOT NULL DEFAULT 'pendiente',
	`observacion` text,
	`fechaEntrega` varchar(30),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `informes_mensuales_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `tareas` MODIFY COLUMN `status` enum('pendiente','en_progreso','completada','vencida','visto','en_revision') NOT NULL DEFAULT 'pendiente';