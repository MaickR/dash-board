CREATE TABLE `actividad_tarea` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tareaId` int NOT NULL,
	`accion` varchar(200) NOT NULL,
	`detalle` text NOT NULL,
	`usuario` varchar(200),
	`campoAnterior` text,
	`campoNuevo` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actividad_tarea_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `adjuntos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tareaId` int NOT NULL,
	`nombre` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`tamano` int,
	`subidoPor` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `adjuntos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `automatizaciones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`activa` boolean DEFAULT true,
	`trigger_type` enum('tarea_completada','tarea_vencida','tarea_asignada','tarea_creada') NOT NULL,
	`accion_type` enum('notificar_email','cambiar_estado','notificar_app','asignar_responsable') NOT NULL,
	`condicion` text,
	`parametros` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automatizaciones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plantillas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`descripcion` text,
	`area` varchar(200),
	`empresa` varchar(200),
	`responsableSugerido` varchar(200),
	`duracionEstimada` int,
	`prioridad` enum('alta','media','baja') DEFAULT 'media',
	`checklist` json,
	`etiquetas` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plantillas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tiempo_registros` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tareaId` int NOT NULL,
	`inicio` bigint NOT NULL,
	`fin` bigint,
	`duracion` int,
	`usuario` varchar(200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tiempo_registros_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `notificaciones` MODIFY COLUMN `tipo` enum('tarea_vencida','acuerdo_pendiente','nueva_tarea','recordatorio','sistema','asignacion','comentario','cambio_estado') NOT NULL DEFAULT 'sistema';--> statement-breakpoint
ALTER TABLE `notificaciones` ADD `categoria` varchar(50);--> statement-breakpoint
ALTER TABLE `tareas` ADD `tiempoRegistrado` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tareas` ADD `fechaCreacionManual` varchar(30);--> statement-breakpoint
ALTER TABLE `tareas` ADD `esRecurrente` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tareas` ADD `recurrencia` enum('diaria','semanal','quincenal','mensual');--> statement-breakpoint
ALTER TABLE `tareas` ADD `checklist` json;--> statement-breakpoint
ALTER TABLE `tareas` ADD `tiempoEstimado` int;--> statement-breakpoint
ALTER TABLE `tareas` ADD `empresa` varchar(200);--> statement-breakpoint
ALTER TABLE `tareas` ADD `plantillaId` int;