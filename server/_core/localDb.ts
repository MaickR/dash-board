import fs from "fs";
import path from "path";

type TableName =
  | "users"
  | "departamentos"
  | "departamentoHistorial"
  | "responsables"
  | "tareas"
  | "notas"
  | "archivos"
  | "adjuntos"
  | "actividadTarea"
  | "plantillas"
  | "automatizaciones"
  | "tiempoRegistros"
  | "reuniones"
  | "etiquetas"
  | "correos"
  | "notificaciones"
  | "informes"
  | "informesMensuales"
  | "driveArchivos"
  | "promptTemplates"
  | "tareaBorradores"
  | "briefEnviados"
  | "organizacion"
  | "acuerdos"
  | "promptTemplatesAM"
  | "taskSections"
  | "taskFollowers"
  | "briefs";

type LocalState = {
  version: number;
  ids: Record<TableName, number>;
  users: any[];
  departamentos: any[];
  departamentoHistorial: any[];
  responsables: any[];
  tareas: any[];
  notas: any[];
  archivos: any[];
  adjuntos: any[];
  actividadTarea: any[];
  plantillas: any[];
  automatizaciones: any[];
  tiempoRegistros: any[];
  reuniones: any[];
  etiquetas: any[];
  correos: any[];
  notificaciones: any[];
  informes: any[];
  informesMensuales: any[];
  driveArchivos: any[];
  promptTemplates: any[];
  tareaBorradores: any[];
  briefEnviados: any[];
  organizacion: any[];
  acuerdos: any[];
  promptTemplatesAM: any[];
  taskSections: any[];
  taskFollowers: any[];
  briefs: any[];
  systemConfig: Record<string, string>;
  configBrief: {
    activo: boolean;
    emailDestinatario: string;
    minutosAnticipacion: number;
  };
};

const LOCAL_DB_DIR = path.join(process.cwd(), ".local");
const LOCAL_DB_PATH = path.join(LOCAL_DB_DIR, "dashboard-local-db.json");
const IS_TEST = process.env.NODE_ENV === "test";

let stateCache: LocalState | null = null;

function isoNow() {
  return new Date().toISOString();
}

function nextWeekDate() {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function createEmptyIds(): Record<TableName, number> {
  return {
    users: 0,
    departamentos: 0,
    departamentoHistorial: 0,
    responsables: 0,
    tareas: 0,
    notas: 0,
    archivos: 0,
    adjuntos: 0,
    actividadTarea: 0,
    plantillas: 0,
    automatizaciones: 0,
    tiempoRegistros: 0,
    reuniones: 0,
    etiquetas: 0,
    correos: 0,
    notificaciones: 0,
    informes: 0,
    informesMensuales: 0,
    driveArchivos: 0,
    promptTemplates: 0,
    tareaBorradores: 0,
    briefEnviados: 0,
    organizacion: 0,
    acuerdos: 0,
    promptTemplatesAM: 0,
    taskSections: 0,
    taskFollowers: 0,
    briefs: 0,
  };
}

function buildDefaultState(): LocalState {
  const now = isoNow();
  const fecha = nextWeekDate();

  return {
    version: 1,
    ids: {
      ...createEmptyIds(),
      departamentos: 2,
      responsables: 2,
      tareas: 2,
      reuniones: 1,
    },
    users: [],
    departamentos: [
      {
        id: 1,
        nombre: "Gerencia Administrativa",
        empresa: "CAP Honduras",
        categoria: "Gerencia",
        responsableActualId: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        nombre: "Calidad y Procesos",
        empresa: "CAP Honduras",
        categoria: "Operaciones",
        responsableActualId: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    departamentoHistorial: [],
    responsables: [
      {
        id: 1,
        nombre: "Sindy Castro",
        area: "Coordinadores",
        email: "gerencia@cap.hn",
        cargo: "Gerente General",
        empresa: "CAP Honduras",
        telefono: "+504 9999-0001",
        departamentoId: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        nombre: "Carlos Mendoza",
        area: "Calidad y Procesos",
        email: "calidad@cap.hn",
        cargo: "Coordinador",
        empresa: "CAP Honduras",
        telefono: "+504 9999-0002",
        departamentoId: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    tareas: [
      {
        id: 1,
        nombre: "Preparar seguimiento semanal",
        descripcion: "Consolidar avances y bloqueos del equipo de coordinación.",
        area: "Coordinadores",
        tarea: "Preparar seguimiento semanal del comité de coordinación",
        responsable: "Sindy Castro",
        responsableId: 1,
        departamentoId: 1,
        fecha,
        fechaTs: Date.now() + 2 * 24 * 60 * 60 * 1000,
        propuesta: null,
        status: "pendiente",
        source: "local-demo",
        reunion: "Coordinadores",
        archivoId: null,
        prioridad: "alta",
        avance: 15,
        parentId: null,
        etiquetas: "demo,prioridad",
        responsablesIds: null,
        dependeDeId: null,
        fechaInicio: null,
        fechaInicioTs: null,
        isAcuerdo: false,
        acuerdoStatus: null,
        reunionOrigenId: 1,
        tiempoRegistrado: 0,
        fechaCreacionManual: null,
        esRecurrente: false,
        recurrencia: null,
        checklist: null,
        tiempoEstimado: 4,
        empresa: "CAP Honduras",
        plantillaId: null,
        sectionId: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        nombre: "Actualizar tablero de calidad",
        descripcion: "Revisar indicadores y cerrar observaciones abiertas.",
        area: "Calidad y Procesos",
        tarea: "Actualizar tablero de calidad y cerrar observaciones",
        responsable: "Carlos Mendoza",
        responsableId: 2,
        departamentoId: 2,
        fecha,
        fechaTs: Date.now() + 4 * 24 * 60 * 60 * 1000,
        propuesta: null,
        status: "en_progreso",
        source: "local-demo",
        reunion: "Coordinadores",
        archivoId: null,
        prioridad: "media",
        avance: 60,
        parentId: null,
        etiquetas: "demo",
        responsablesIds: null,
        dependeDeId: null,
        fechaInicio: null,
        fechaInicioTs: null,
        isAcuerdo: true,
        acuerdoStatus: "en_progreso",
        reunionOrigenId: 1,
        tiempoRegistrado: 0,
        fechaCreacionManual: null,
        esRecurrente: false,
        recurrencia: null,
        checklist: null,
        tiempoEstimado: 6,
        empresa: "CAP Honduras",
        plantillaId: null,
        sectionId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    notas: [],
    archivos: [],
    adjuntos: [],
    actividadTarea: [],
    plantillas: [],
    automatizaciones: [],
    tiempoRegistros: [],
    reuniones: [
      {
        id: 1,
        area: "Coordinadores",
        dia: "Miércoles",
        hora: "09:00-10:00",
        responsable: "Sindy Castro",
        departamentoId: 1,
        status: "pendiente",
        hasAyudaMemoria: false,
        semana: "2026-W16",
        fecha,
        notas: "Reunión local de demostración",
        tareasGeneradas: 2,
        createdAt: now,
        updatedAt: now,
      },
    ],
    etiquetas: [],
    correos: [],
    notificaciones: [],
    informes: [],
    informesMensuales: [],
    driveArchivos: [],
    promptTemplates: [],
    tareaBorradores: [],
    briefEnviados: [],
    organizacion: [],
    acuerdos: [],
    promptTemplatesAM: [],
    taskSections: [],
    taskFollowers: [],
    briefs: [],
    systemConfig: {
      system_name: "ARIA — Grupo CAP Honduras",
      timezone: "America/Tegucigalpa",
      notif_brief_enviado: "true",
      notif_tarea_vencida: "true",
      notif_nueva_tarea: "true",
      teams_webhook_url: "",
      telegram_bot_token: "",
    },
    configBrief: {
      activo: true,
      emailDestinatario: "gerencia@cap.hn",
      minutosAnticipacion: 30,
    },
  };
}

function ensureDirectory() {
  if (!fs.existsSync(LOCAL_DB_DIR)) {
    fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
  }
}

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(buildDefaultState())) as LocalState;
}

function normalizeState(raw: Partial<LocalState> | null | undefined): LocalState {
  const base = cloneDefaultState();
  if (!raw) return base;

  return {
    ...base,
    ...raw,
    ids: { ...base.ids, ...(raw.ids ?? {}) },
    systemConfig: { ...base.systemConfig, ...(raw.systemConfig ?? {}) },
    configBrief: { ...base.configBrief, ...(raw.configBrief ?? {}) },
  };
}

function saveState() {
  if (IS_TEST || !stateCache) return;
  ensureDirectory();
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(stateCache, null, 2), "utf-8");
}

function loadState(): LocalState {
  if (stateCache) return stateCache;

  if (IS_TEST || !fs.existsSync(LOCAL_DB_PATH)) {
    stateCache = cloneDefaultState();
    return stateCache;
  }

  const raw = JSON.parse(fs.readFileSync(LOCAL_DB_PATH, "utf-8")) as Partial<LocalState>;
  stateCache = normalizeState(raw);
  return stateCache;
}

function touchRow<T extends Record<string, any>>(row: T) {
  return {
    ...row,
    updatedAt: isoNow(),
  };
}

export function isLocalDbEnabled() {
  return true;
}

export function getLocalState() {
  return loadState();
}

export function listRows(table: TableName) {
  return [...loadState()[table]];
}

export function findRow(table: TableName, predicate: (row: any) => boolean) {
  return loadState()[table].find(predicate);
}

export function insertRow(table: TableName, data: Record<string, any>) {
  const state = loadState();
  const id = (state.ids[table] ?? 0) + 1;
  state.ids[table] = id;
  const now = isoNow();
  const row = {
    id,
    createdAt: now,
    ...(table === "briefs" ? { generadoEn: now } : {}),
    ...(table === "reuniones" ? { updatedAt: now, hasAyudaMemoria: false, tareasGeneradas: 0 } : {}),
    ...(table !== "notas" && table !== "adjuntos" && table !== "correos" && table !== "notificaciones" && table !== "briefs" && table !== "departamentoHistorial"
      ? { updatedAt: now }
      : {}),
    ...data,
  };
  state[table].push(row);
  saveState();
  return row;
}

export function updateRow(table: TableName, id: number, data: Record<string, any>) {
  const state = loadState();
  const index = state[table].findIndex((row: any) => row.id === id);
  if (index === -1) return undefined;
  const nextRow = touchRow({ ...state[table][index], ...data });
  state[table][index] = nextRow;
  saveState();
  return nextRow;
}

export function deleteRow(table: TableName, id: number) {
  const state = loadState();
  const index = state[table].findIndex((row: any) => row.id === id);
  if (index === -1) return false;
  state[table].splice(index, 1);
  saveState();
  return true;
}

export function replaceRows(table: TableName, rows: any[]) {
  const state = loadState();
  state[table] = rows;
  saveState();
}

export function getSystemConfigValue(key: string) {
  return loadState().systemConfig[key] ?? null;
}

export function setSystemConfigValue(key: string, value: string) {
  const state = loadState();
  state.systemConfig[key] = value;
  saveState();
  return value;
}

export function getAllSystemConfigValues() {
  return { ...loadState().systemConfig };
}

export function getConfigBriefState() {
  return { ...loadState().configBrief };
}

export function updateConfigBriefState(data: Partial<LocalState["configBrief"]>) {
  const state = loadState();
  state.configBrief = {
    ...state.configBrief,
    ...data,
  };
  saveState();
  return { ...state.configBrief };
}

export function upsertUniqueRow(
  table: TableName,
  predicate: (row: any) => boolean,
  createData: Record<string, any>,
  updateData: Record<string, any>,
) {
  const existing = findRow(table, predicate);
  if (existing) {
    return updateRow(table, existing.id, updateData);
  }
  return insertRow(table, createData);
}

export function clearRows(table: TableName) {
  const state = loadState();
  state[table] = [];
  saveState();
}