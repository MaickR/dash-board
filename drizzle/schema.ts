import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, json } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Departamentos ───
export const departamentos = mysqlTable("departamentos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  empresa: varchar("empresa", { length: 200 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  responsableActualId: int("responsableActualId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Departamento = typeof departamentos.$inferSelect;
export type InsertDepartamento = typeof departamentos.$inferInsert;

// ─── Historial de responsables por departamento ───
export const departamentoHistorial = mysqlTable("departamento_historial", {
  id: int("id").autoincrement().primaryKey(),
  departamentoId: int("departamentoId").notNull(),
  responsableId: int("responsableId").notNull(),
  responsableNombre: varchar("responsableNombre", { length: 200 }).notNull(),
  fechaInicio: varchar("fechaInicio", { length: 20 }).notNull(),
  fechaFin: varchar("fechaFin", { length: 20 }),
  motivoCambio: text("motivoCambio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DepartamentoHistorial = typeof departamentoHistorial.$inferSelect;
export type InsertDepartamentoHistorial = typeof departamentoHistorial.$inferInsert;

// ─── Responsables (coordinadores y equipo) ───
export const responsables = mysqlTable("responsables", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  area: varchar("area", { length: 200 }).notNull(),
  email: varchar("email", { length: 320 }),
  cargo: varchar("cargo", { length: 200 }),
  empresa: varchar("empresa", { length: 200 }),
  telefono: varchar("telefono", { length: 50 }),
  departamentoId: int("departamentoId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Responsable = typeof responsables.$inferSelect;
export type InsertResponsable = typeof responsables.$inferInsert;

// ─── Tareas extraídas de reuniones ───
export const tareas = mysqlTable("tareas", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }),
  descripcion: text("descripcion"),
  area: varchar("area", { length: 200 }).notNull(),
  tarea: text("tarea").notNull(),
  responsable: varchar("responsable", { length: 200 }).notNull(),
  responsableId: int("responsableId"),
  departamentoId: int("departamentoId"),
  fecha: varchar("fecha", { length: 20 }).notNull(),
  fechaTs: bigint("fechaTs", { mode: "number" }),
  propuesta: text("propuesta"),
  status: mysqlEnum("status", ["pendiente", "en_progreso", "completada", "vencida", "visto", "en_revision"]).default("pendiente").notNull(),
  source: varchar("source", { length: 100 }),
  reunion: varchar("reunion", { length: 200 }),
  archivoId: int("archivoId"),
  prioridad: mysqlEnum("prioridad", ["alta", "media", "baja"]).default("media").notNull(),
  avance: int("avance").default(0).notNull(),
  parentId: int("parentId"),
  etiquetas: text("etiquetas"),
  responsablesIds: text("responsablesIds"),
  dependeDeId: int("dependeDeId"),
  fechaInicio: varchar("fechaInicio", { length: 20 }),
  fechaInicioTs: bigint("fechaInicioTs", { mode: "number" }),
  // Acuerdo fields
  isAcuerdo: boolean("isAcuerdo").default(false),
  acuerdoStatus: mysqlEnum("acuerdoStatus", ["pendiente", "en_progreso", "cerrado", "postergado"]),
  reunionOrigenId: int("reunionOrigenId"),
  // V4 new fields
  tiempoRegistrado: int("tiempoRegistrado").default(0), // minutes accumulated from timer
  fechaCreacionManual: varchar("fechaCreacionManual", { length: 30 }), // editable creation date
  esRecurrente: boolean("esRecurrente").default(false),
  recurrencia: mysqlEnum("recurrencia", ["diaria", "semanal", "quincenal", "mensual"]),
  checklist: json("checklist"), // [{text: string, done: boolean}]
  tiempoEstimado: int("tiempoEstimado"), // estimated hours
  empresa: varchar("empresa", { length: 200 }), // company assignment
  plantillaId: int("plantillaId"), // template used to create
  sectionId: int("sectionId"), // v5.5 task section
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tarea = typeof tareas.$inferSelect;
export type InsertTarea = typeof tareas.$inferInsert;

// ─── Notas / Comentarios por tarea ───
export const notas = mysqlTable("notas", {
  id: int("id").autoincrement().primaryKey(),
  tareaId: int("tareaId").notNull(),
  contenido: text("contenido").notNull(),
  autor: varchar("autor", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Nota = typeof notas.$inferSelect;
export type InsertNota = typeof notas.$inferInsert;

// ─── Archivos subidos (PDFs, transcripciones) ───
export const archivos = mysqlTable("archivos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 500 }).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  reunion: varchar("reunion", { length: 200 }),
  area: varchar("area", { length: 200 }),
  reunionId: int("reunionId"),
  tipo: varchar("tipo", { length: 50 }).default("documento"),
  procesado: boolean("procesado").default(false),
  contenido: text("contenido"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Archivo = typeof archivos.$inferSelect;
export type InsertArchivo = typeof archivos.$inferInsert;

// ─── Adjuntos de tareas (v4) ───
export const adjuntos = mysqlTable("adjuntos", {
  id: int("id").autoincrement().primaryKey(),
  tareaId: int("tareaId").notNull(),
  nombre: varchar("nombre", { length: 500 }).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  tamano: int("tamano"), // bytes
  subidoPor: varchar("subidoPor", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Adjunto = typeof adjuntos.$inferSelect;
export type InsertAdjunto = typeof adjuntos.$inferInsert;

// ─── Historial de actividad por tarea (v4) ───
export const actividadTarea = mysqlTable("actividad_tarea", {
  id: int("id").autoincrement().primaryKey(),
  tareaId: int("tareaId").notNull(),
  accion: varchar("accion", { length: 200 }).notNull(), // e.g. "cambio_estado", "cambio_responsable"
  detalle: text("detalle").notNull(), // human-readable description
  usuario: varchar("usuario", { length: 200 }),
  campoAnterior: text("campoAnterior"),
  campoNuevo: text("campoNuevo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActividadTarea = typeof actividadTarea.$inferSelect;
export type InsertActividadTarea = typeof actividadTarea.$inferInsert;

// ─── Plantillas de tareas (v4) ───
export const plantillas = mysqlTable("plantillas", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  area: varchar("area", { length: 200 }),
  empresa: varchar("empresa", { length: 200 }),
  responsableSugerido: varchar("responsableSugerido", { length: 200 }),
  duracionEstimada: int("duracionEstimada"), // hours
  prioridad: mysqlEnum("prioridad", ["alta", "media", "baja"]).default("media"),
  checklist: json("checklist"), // [{text: string, done: boolean}]
  etiquetas: text("etiquetas"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Plantilla = typeof plantillas.$inferSelect;
export type InsertPlantilla = typeof plantillas.$inferInsert;

// ─── Reglas de automatización (v4) ───
export const automatizaciones = mysqlTable("automatizaciones", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  activa: boolean("activa").default(true),
  trigger: mysqlEnum("trigger_type", ["tarea_completada", "tarea_vencida", "tarea_asignada", "tarea_creada"]).notNull(),
  accion: mysqlEnum("accion_type", ["notificar_email", "cambiar_estado", "notificar_app", "asignar_responsable"]).notNull(),
  condicion: text("condicion"), // JSON with conditions like area, empresa, etc.
  parametros: text("parametros"), // JSON with action parameters
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Automatizacion = typeof automatizaciones.$inferSelect;
export type InsertAutomatizacion = typeof automatizaciones.$inferInsert;

// ─── Reuniones quincenales ───
export const reuniones = mysqlTable("reuniones", {
  id: int("id").autoincrement().primaryKey(),
  area: varchar("area", { length: 200 }).notNull(),
  dia: varchar("dia", { length: 20 }).notNull(),
  hora: varchar("hora", { length: 30 }).notNull(),
  responsable: varchar("responsable", { length: 200 }).notNull(),
  departamentoId: int("departamentoId"),
  status: mysqlEnum("status", ["pendiente", "realizada", "cancelada"]).default("pendiente").notNull(),
  hasAyudaMemoria: boolean("hasAyudaMemoria").default(false),
  semana: varchar("semana", { length: 20 }),
  fecha: varchar("fecha", { length: 20 }),
  notas: text("notas"),
  tareasGeneradas: int("tareasGeneradas").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reunion = typeof reuniones.$inferSelect;
export type InsertReunion = typeof reuniones.$inferInsert;

// ─── Etiquetas personalizables ───
export const etiquetas = mysqlTable("etiquetas", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).notNull(),
  area: varchar("area", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Etiqueta = typeof etiquetas.$inferSelect;
export type InsertEtiqueta = typeof etiquetas.$inferInsert;

// ─── Registro de correos enviados ───
export const correos = mysqlTable("correos", {
  id: int("id").autoincrement().primaryKey(),
  destinatario: varchar("destinatario", { length: 320 }).notNull(),
  nombreDestinatario: varchar("nombreDestinatario", { length: 200 }),
  asunto: varchar("asunto", { length: 500 }).notNull(),
  tipo: mysqlEnum("tipo", ["tareas", "recordatorio", "resumen_semanal"]).default("tareas").notNull(),
  tareasIds: text("tareasIds"),
  enviado: boolean("enviado").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Correo = typeof correos.$inferSelect;
export type InsertCorreo = typeof correos.$inferInsert;

// ─── Notificaciones in-app ───
export const notificaciones = mysqlTable("notificaciones", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 300 }).notNull(),
  mensaje: text("mensaje").notNull(),
  tipo: mysqlEnum("tipo", ["tarea_vencida", "acuerdo_pendiente", "nueva_tarea", "recordatorio", "sistema", "asignacion", "comentario", "cambio_estado"]).default("sistema").notNull(),
  leida: boolean("leida").default(false),
  tareaId: int("tareaId"),
  link: varchar("link", { length: 500 }),
  categoria: varchar("categoria", { length: 50 }), // for filtering: asignaciones, vencimientos, comentarios, cambios
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notificacion = typeof notificaciones.$inferSelect;
export type InsertNotificacion = typeof notificaciones.$inferInsert;

// ─── Registro de tiempo (timer entries) v4 ───
export const tiempoRegistros = mysqlTable("tiempo_registros", {
  id: int("id").autoincrement().primaryKey(),
  tareaId: int("tareaId").notNull(),
  inicio: bigint("inicio", { mode: "number" }).notNull(), // timestamp ms
  fin: bigint("fin", { mode: "number" }), // null if still running
  duracion: int("duracion"), // minutes
  usuario: varchar("usuario", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TiempoRegistro = typeof tiempoRegistros.$inferSelect;
export type InsertTiempoRegistro = typeof tiempoRegistros.$inferInsert;

// ─── Informes mensuales (v5) ───
export const informes = mysqlTable("informes", {
  id: int("id").autoincrement().primaryKey(),
  numero: int("numero").notNull(),
  departamento: varchar("departamento", { length: 300 }).notNull(),
  responsable: varchar("responsable", { length: 200 }).notNull(),
  cargo: varchar("cargo", { length: 200 }),
  empresa: varchar("empresa", { length: 200 }).notNull(),
  categoria: varchar("categoria", { length: 200 }),
  anio: int("anio").notNull().default(2026),
  observaciones: text("observaciones"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Informe = typeof informes.$inferSelect;
export type InsertInforme = typeof informes.$inferInsert;

// ─── Estado mensual de informes (v5) ───
export const informesMensuales = mysqlTable("informes_mensuales", {
  id: int("id").autoincrement().primaryKey(),
  informeId: int("informeId").notNull(),
  mes: int("mes").notNull(), // 1-12
  estado: mysqlEnum("estado", ["entregado", "retraso", "no_entregado", "pendiente"]).default("pendiente").notNull(),
  observacion: text("observacion"),
  fechaEntrega: varchar("fechaEntrega", { length: 30 }),
  documentoUrl: text("documentoUrl"),
  documentoNombre: varchar("documentoNombre", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InformeMensual = typeof informesMensuales.$inferSelect;
export type InsertInformeMensual = typeof informesMensuales.$inferInsert;

// ─── Archivos de Google Drive vinculados (v5) ───
export const driveArchivos = mysqlTable("drive_archivos", {
  id: int("id").autoincrement().primaryKey(),
  driveId: varchar("driveId", { length: 200 }).notNull(),
  nombre: varchar("nombre", { length: 500 }).notNull(),
  mimeType: varchar("mimeType", { length: 200 }),
  url: text("url"),
  carpeta: varchar("carpeta", { length: 500 }),
  area: varchar("area", { length: 200 }),
  tamano: bigint("tamano", { mode: "number" }),
  procesado: boolean("procesado").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DriveArchivo = typeof driveArchivos.$inferSelect;
export type InsertDriveArchivo = typeof driveArchivos.$inferInsert;

// ─── Plantillas de Prompt para IA (v5.1) ───
export const promptTemplates = mysqlTable("prompt_templates", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  prompt: text("prompt").notNull(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type InsertPromptTemplate = typeof promptTemplates.$inferInsert;

// ─── Borradores de tarea generados por IA (v5.1) ───
export const tareaBorradores = mysqlTable("tarea_borradores", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion"),
  responsable: varchar("responsable", { length: 200 }),
  area: varchar("area", { length: 200 }),
  empresa: varchar("empresa", { length: 200 }),
  prioridad: mysqlEnum("prioridad", ["alta", "media", "baja"]).default("media"),
  fechaLimite: varchar("fechaLimite", { length: 30 }),
  status: mysqlEnum("status", ["borrador", "aprobado", "rechazado"]).default("borrador").notNull(),
  archivoOrigenId: int("archivoOrigenId"), // archivo from which it was generated
  driveArchivoId: int("driveArchivoId"), // drive file from which it was generated
  reunionId: int("reunionId"),
  promptUsado: text("promptUsado"), // the prompt that was used
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TareaBorrador = typeof tareaBorradores.$inferSelect;
export type InsertTareaBorrador = typeof tareaBorradores.$inferInsert;

// ─── Brief Pre-Reunión enviados (v5.3) ───
export const briefEnviados = mysqlTable("brief_enviados", {
  id: int("id").autoincrement().primaryKey(),
  reunionId: int("reunionId").notNull(),
  emailDestinatario: varchar("emailDestinatario", { length: 320 }).notNull(),
  asunto: varchar("asunto", { length: 500 }).notNull(),
  contenidoHtml: text("contenidoHtml"),
  contenidoTexto: text("contenidoTexto"),
  enviado: boolean("enviado").default(false),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BriefEnviado = typeof briefEnviados.$inferSelect;
export type InsertBriefEnviado = typeof briefEnviados.$inferInsert;

// ─── Configuración Brief Pre-Reunión (v5.3) ───
export const configBrief = mysqlTable("config_brief", {
  id: int("id").autoincrement().primaryKey(),
  activo: boolean("activo").default(true),
  emailDestinatario: varchar("emailDestinatario", { length: 320 }).notNull().default("gerencia@cap.hn"),
  minutosAnticipacion: int("minutosAnticipacion").notNull().default(30),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConfigBrief = typeof configBrief.$inferSelect;
export type InsertConfigBrief = typeof configBrief.$inferInsert;

// ─── Organización del Grupo CAP (v5.4) ───
export const organizacion = mysqlTable("organizacion", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 300 }).notNull(),
  cargo: varchar("cargo", { length: 300 }).notNull(),
  escala: varchar("escala", { length: 20 }), // E4, E5, E6, E8
  nivel: varchar("nivel", { length: 100 }), // Director Ejecutivo, Jefe, Coordinador Sr, etc.
  empresa: varchar("empresa", { length: 200 }).notNull(),
  departamento: varchar("departamento", { length: 300 }),
  equipo: int("equipo").default(0), // number of people in team
  esVacante: boolean("esVacante").default(false),
  reportaA: int("reportaA"), // parent ID for org chart
  orden: int("orden").default(0), // sort order
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Organizacion = typeof organizacion.$inferSelect;
export type InsertOrganizacion = typeof organizacion.$inferInsert;

// ─── Acuerdos de reunión (v5.4) ───
export const acuerdos = mysqlTable("acuerdos", {
  id: int("id").autoincrement().primaryKey(),
  reunionId: int("reunionId").notNull(),
  descripcion: text("descripcion").notNull(),
  responsable: varchar("responsable", { length: 200 }),
  responsableId: int("responsableId"),
  fechaLimite: varchar("fechaLimite", { length: 30 }),
  status: mysqlEnum("status", ["pendiente", "en_seguimiento", "cumplido"]).default("pendiente").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Acuerdo = typeof acuerdos.$inferSelect;
export type InsertAcuerdo = typeof acuerdos.$inferInsert;

// ─── Plantillas de Prompt para Ayudas Memorias (v5.4) ───
export const promptTemplatesAM = mysqlTable("prompt_templates_am", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  tipo: mysqlEnum("tipo", ["ayuda_memoria", "extraer_tareas"]).notNull(),
  descripcion: text("descripcion"),
  prompt: text("prompt").notNull(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PromptTemplateAM = typeof promptTemplatesAM.$inferSelect;
export type InsertPromptTemplateAM = typeof promptTemplatesAM.$inferInsert;

// ─── Secciones de tareas (v5.5 - Asana-like) ───
export const taskSections = mysqlTable("task_sections", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  orden: int("orden").default(0).notNull(),
  color: varchar("color", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskSection = typeof taskSections.$inferSelect;
export type InsertTaskSection = typeof taskSections.$inferInsert;

// ─── Seguidores de tareas (v5.5 - Asana-like) ───
export const taskFollowers = mysqlTable("task_followers", {
  id: int("id").autoincrement().primaryKey(),
  tareaId: int("tareaId").notNull(),
  responsableId: int("responsableId").notNull(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TaskFollower = typeof taskFollowers.$inferSelect;
export type InsertTaskFollower = typeof taskFollowers.$inferInsert;

// ─── Configuración del sistema (v5.5) ───
export const systemConfig = mysqlTable("system_config", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("config_key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = typeof systemConfig.$inferInsert;

// ─── Briefs Pre-Reunión (v5.8) ───
export const briefs = mysqlTable("briefs", {
  id: int("id").autoincrement().primaryKey(),
  reunionId: int("reunionId").notNull(),
  contenido: text("contenido").notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull().default("manual"), // 'auto' | 'manual'
  generadoEn: timestamp("generadoEn").defaultNow().notNull(),
});
export type Brief = typeof briefs.$inferSelect;
export type InsertBrief = typeof briefs.$inferInsert;
