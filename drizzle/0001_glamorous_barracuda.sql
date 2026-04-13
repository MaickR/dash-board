CREATE TABLE `archivos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(500) NOT NULL,
	`url` text NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`reunion` varchar(200),
	`area` varchar(200),
	`procesado` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `archivos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `correos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`destinatario` varchar(320) NOT NULL,
	`nombreDestinatario` varchar(200),
	`asunto` varchar(500) NOT NULL,
	`tipo` enum('tareas','recordatorio','resumen_semanal') NOT NULL DEFAULT 'tareas',
	`tareasIds` text,
	`enviado` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `correos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tareaId` int NOT NULL,
	`contenido` text NOT NULL,
	`autor` varchar(200) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `responsables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`area` varchar(200) NOT NULL,
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `responsables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reuniones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` varchar(200) NOT NULL,
	`dia` varchar(20) NOT NULL,
	`hora` varchar(30) NOT NULL,
	`responsable` varchar(200) NOT NULL,
	`status` enum('pendiente','realizada','cancelada') NOT NULL DEFAULT 'pendiente',
	`hasAyudaMemoria` boolean DEFAULT false,
	`semana` varchar(20),
	`fecha` varchar(20),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reuniones_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tareas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`area` varchar(200) NOT NULL,
	`tarea` text NOT NULL,
	`responsable` varchar(200) NOT NULL,
	`responsableId` int,
	`fecha` varchar(20) NOT NULL,
	`fechaTs` bigint,
	`propuesta` text,
	`status` enum('pendiente','en_progreso','completada','vencida','visto') NOT NULL DEFAULT 'pendiente',
	`source` varchar(100),
	`reunion` varchar(200),
	`archivoId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tareas_id` PRIMARY KEY(`id`)
);
