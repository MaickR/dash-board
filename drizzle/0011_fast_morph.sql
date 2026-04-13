CREATE TABLE `brief_enviados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reunionId` int NOT NULL,
	`emailDestinatario` varchar(320) NOT NULL,
	`asunto` varchar(500) NOT NULL,
	`contenidoHtml` text,
	`contenidoTexto` text,
	`enviado` boolean DEFAULT false,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `brief_enviados_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `config_brief` (
	`id` int AUTO_INCREMENT NOT NULL,
	`activo` boolean DEFAULT true,
	`emailDestinatario` varchar(320) NOT NULL DEFAULT 'gerencia@cap.hn',
	`minutosAnticipacion` int NOT NULL DEFAULT 30,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `config_brief_id` PRIMARY KEY(`id`)
);
