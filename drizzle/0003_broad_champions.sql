CREATE TABLE `departamento_historial` (
	`id` int AUTO_INCREMENT NOT NULL,
	`departamentoId` int NOT NULL,
	`responsableId` int NOT NULL,
	`responsableNombre` varchar(200) NOT NULL,
	`fechaInicio` varchar(20) NOT NULL,
	`fechaFin` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `departamento_historial_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `departamentos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`empresa` varchar(200) NOT NULL,
	`responsableActualId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `departamentos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notificaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titulo` varchar(300) NOT NULL,
	`mensaje` text NOT NULL,
	`tipo` enum('tarea_vencida','acuerdo_pendiente','nueva_tarea','recordatorio','sistema') NOT NULL DEFAULT 'sistema',
	`leida` boolean DEFAULT false,
	`tareaId` int,
	`link` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notificaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `archivos` ADD `reunionId` int;--> statement-breakpoint
ALTER TABLE `reuniones` ADD `departamentoId` int;--> statement-breakpoint
ALTER TABLE `tareas` ADD `nombre` varchar(200);--> statement-breakpoint
ALTER TABLE `tareas` ADD `descripcion` text;--> statement-breakpoint
ALTER TABLE `tareas` ADD `departamentoId` int;--> statement-breakpoint
ALTER TABLE `tareas` ADD `isAcuerdo` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tareas` ADD `acuerdoStatus` enum('pendiente','en_progreso','cerrado','postergado');--> statement-breakpoint
ALTER TABLE `tareas` ADD `reunionOrigenId` int;