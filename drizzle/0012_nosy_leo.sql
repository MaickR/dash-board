CREATE TABLE `acuerdos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reunionId` int NOT NULL,
	`descripcion` text NOT NULL,
	`responsable` varchar(200),
	`responsableId` int,
	`fechaLimite` varchar(30),
	`status` enum('pendiente','en_seguimiento','cumplido') NOT NULL DEFAULT 'pendiente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `acuerdos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `organizacion` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(300) NOT NULL,
	`cargo` varchar(300) NOT NULL,
	`escala` varchar(20),
	`nivel` varchar(100),
	`empresa` varchar(200) NOT NULL,
	`departamento` varchar(300),
	`equipo` int DEFAULT 0,
	`esVacante` boolean DEFAULT false,
	`reportaA` int,
	`orden` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `organizacion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prompt_templates_am` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`tipo` enum('ayuda_memoria','extraer_tareas') NOT NULL,
	`descripcion` text,
	`prompt` text NOT NULL,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `prompt_templates_am_id` PRIMARY KEY(`id`)
);
