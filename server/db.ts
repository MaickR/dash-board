import { eq, desc, and, inArray, sql, like, or, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  responsables, InsertResponsable,
  tareas, InsertTarea,
  notas, InsertNota,
  archivos, InsertArchivo,
  reuniones, InsertReunion,
  correos, InsertCorreo,
  etiquetas, InsertEtiqueta,
  departamentos, InsertDepartamento,
  departamentoHistorial, InsertDepartamentoHistorial,
  notificaciones, InsertNotificacion,
  informes, InsertInforme,
  informesMensuales, InsertInformeMensual,
  driveArchivos, InsertDriveArchivo,
  promptTemplates, InsertPromptTemplate,
  tareaBorradores, InsertTareaBorrador,
  briefEnviados, InsertBriefEnviado,
  configBrief, InsertConfigBrief,
  organizacion, InsertOrganizacion,
  acuerdos, InsertAcuerdo,
  promptTemplatesAM, InsertPromptTemplateAM,
  taskSections, InsertTaskSection,
  taskFollowers, InsertTaskFollower,
  systemConfig, InsertSystemConfig,
  briefs, InsertBrief,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import {
  clearRows,
  deleteRow,
  findRow,
  getAllSystemConfigValues,
  getConfigBriefState,
  getLocalState,
  getSystemConfigValue,
  insertRow,
  listRows,
  replaceRows,
  setSystemConfigValue,
  updateConfigBriefState,
  updateRow,
  upsertUniqueRow,
} from "./_core/localDb";

let _db: ReturnType<typeof drizzle> | null = null;
let _dbInitFailed = false;
let _dbUrl: string | null = null;

const DB_UNAVAILABLE_ERROR = "DB not available";
const USE_LOCAL_STORE = !ENV.databaseUrl && (!ENV.isProduction || ENV.allowLocalFallback);

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function withInsertId<T>(result: unknown, data: T): T & { id: number } {
  const insertId = Array.isArray(result)
    ? Number((result[0] as { insertId?: number } | undefined)?.insertId ?? 0)
    : Number((result as { insertId?: number } | undefined)?.insertId ?? 0);

  return { id: insertId, ...data };
}

async function requireDb(): Promise<Database> {
  const db = await getDb();
  if (!db) throw new Error(DB_UNAVAILABLE_ERROR);
  return db;
}

function sortByDateDesc<T extends Record<string, any>>(rows: T[], key: keyof T = "createdAt" as keyof T) {
  return [...rows].sort((left, right) => new Date(String(right[key] ?? 0)).getTime() - new Date(String(left[key] ?? 0)).getTime());
}

function sortByText<T extends Record<string, any>>(rows: T[], ...keys: Array<keyof T>) {
  return [...rows].sort((left, right) => {
    for (const key of keys) {
      const leftValue = String(left[key] ?? "");
      const rightValue = String(right[key] ?? "");
      const result = leftValue.localeCompare(rightValue, "es", { sensitivity: "base" });
      if (result !== 0) return result;
    }
    return 0;
  });
}

function sumBy<T>(rows: T[], predicate: (row: T) => boolean) {
  return rows.reduce((total, row) => total + (predicate(row) ? 1 : 0), 0);
}

export async function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    _db = null;
    _dbInitFailed = false;
    _dbUrl = null;
    return null;
  }

  if (_db && _dbUrl === databaseUrl) {
    return _db;
  }

  if (_dbInitFailed && _dbUrl === databaseUrl) {
    return null;
  }

  _dbUrl = databaseUrl;

  try {
    _db = drizzle(databaseUrl);
    _dbInitFailed = false;
  }
  catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
    _dbInitFailed = true;
  }

  return _db;
}

// ─── Users ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (USE_LOCAL_STORE) {
    const existing = findRow("users", row => row.openId === user.openId);
    if (existing) {
      updateRow("users", existing.id, {
        ...existing,
        ...user,
        role: user.role ?? existing.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
        lastSignedIn: user.lastSignedIn ?? new Date().toISOString(),
      });
      return;
    }

    insertRow("users", {
      ...user,
      role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
      lastSignedIn: user.lastSignedIn ?? new Date().toISOString(),
    });
    return;
  }

  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field]; if (value === undefined) return;
      const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  if (USE_LOCAL_STORE) {
    return findRow("users", row => row.openId === openId);
  }

  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Departamentos ───
export async function listDepartamentos() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("departamentos"), "empresa", "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(departamentos).orderBy(departamentos.empresa, departamentos.nombre);
}

export async function createDepartamento(data: InsertDepartamento) {
  if (USE_LOCAL_STORE) {
    return insertRow("departamentos", data);
  }

  const db = await requireDb();
  const result = await db.insert(departamentos).values(data);
  return withInsertId(result, data);
}

export async function updateDepartamento(id: number, data: Partial<InsertDepartamento>) {
  if (USE_LOCAL_STORE) {
    updateRow("departamentos", id, data);
    return;
  }

  const db = await requireDb();
  await db.update(departamentos).set(data).where(eq(departamentos.id, id));
}

export async function deleteDepartamento(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("departamentos", id);
    return;
  }

  const db = await requireDb();
  await db.delete(departamentos).where(eq(departamentos.id, id));
}

export async function listDepartamentoHistorial(departamentoId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("departamentoHistorial").filter(row => row.departamentoId === departamentoId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(departamentoHistorial)
    .where(eq(departamentoHistorial.departamentoId, departamentoId))
    .orderBy(desc(departamentoHistorial.createdAt));
}

export async function createDepartamentoHistorial(data: InsertDepartamentoHistorial) {
  if (USE_LOCAL_STORE) {
    return insertRow("departamentoHistorial", data);
  }

  const db = await requireDb();
  const result = await db.insert(departamentoHistorial).values(data);
  return withInsertId(result, data);
}

export async function closeDepartamentoHistorial(departamentoId: number, fechaFin: string) {
  if (USE_LOCAL_STORE) {
    const open = listRows("departamentoHistorial")
      .filter(row => row.departamentoId === departamentoId && !row.fechaFin)
      .sort((left, right) => right.id - left.id)[0];
    if (open) updateRow("departamentoHistorial", open.id, { fechaFin });
    return;
  }

  const db = await requireDb();
  const open = await db.select().from(departamentoHistorial)
    .where(and(eq(departamentoHistorial.departamentoId, departamentoId), sql`${departamentoHistorial.fechaFin} IS NULL`))
    .limit(1);
  if (open.length > 0) {
    await db.update(departamentoHistorial).set({ fechaFin }).where(eq(departamentoHistorial.id, open[0].id));
  }
}

// ─── Responsables ───
export async function listResponsables() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("responsables"), "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(responsables).orderBy(responsables.nombre);
}

export async function createResponsable(data: InsertResponsable) {
  if (USE_LOCAL_STORE) {
    return insertRow("responsables", data);
  }

  const db = await requireDb();
  const result = await db.insert(responsables).values(data);
  return withInsertId(result, data);
}

export async function updateResponsable(id: number, data: Partial<InsertResponsable>) {
  if (USE_LOCAL_STORE) {
    updateRow("responsables", id, data);
    return { id, ...data };
  }

  const db = await requireDb();
  await db.update(responsables).set(data).where(eq(responsables.id, id));
  return { id, ...data };
}

export async function deleteResponsable(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("responsables", id);
    return;
  }

  const db = await requireDb();
  await db.delete(responsables).where(eq(responsables.id, id));
}

// ─── Tareas ───
export async function listTareas() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareas"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareas).orderBy(desc(tareas.createdAt));
}

export async function createTarea(data: InsertTarea) {
  if (USE_LOCAL_STORE) {
    return insertRow("tareas", data);
  }

  const db = await requireDb();
  const result = await db.insert(tareas).values(data);
  return withInsertId(result, data);
}

export async function createTareasBatch(items: InsertTarea[]) {
  if (USE_LOCAL_STORE) {
    return items.map(item => insertRow("tareas", item));
  }

  const db = await requireDb();
  if (items.length === 0) return [];
  await db.insert(tareas).values(items);
  return items;
}

export async function updateTarea(id: number, data: Partial<InsertTarea>) {
  if (USE_LOCAL_STORE) {
    updateRow("tareas", id, data);
    return;
  }

  const db = await requireDb();
  await db.update(tareas).set(data).where(eq(tareas.id, id));
}

export async function deleteTarea(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("tareas", id);
    return;
  }

  const db = await requireDb();
  await db.delete(tareas).where(eq(tareas.id, id));
}

export async function getTareasByIds(ids: number[]) {
  if (USE_LOCAL_STORE) {
    if (ids.length === 0) return [];
    return listRows("tareas").filter(row => ids.includes(row.id));
  }

  const db = await getDb(); if (!db) return [];
  if (ids.length === 0) return [];
  return db.select().from(tareas).where(inArray(tareas.id, ids));
}

export async function listSubtareas(parentId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareas").filter(row => row.parentId === parentId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareas).where(eq(tareas.parentId, parentId)).orderBy(tareas.createdAt);
}

export async function listAcuerdosByArea(area: string) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareas").filter(row => row.area === area && row.isAcuerdo === true));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareas)
    .where(and(eq(tareas.area, area), eq(tareas.isAcuerdo, true)))
    .orderBy(desc(tareas.createdAt));
}

export async function listAcuerdosPendientesByArea(area: string) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareas").filter(row => row.area === area && row.isAcuerdo === true && ["pendiente", "en_progreso"].includes(row.acuerdoStatus)));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareas)
    .where(and(
      eq(tareas.area, area),
      eq(tareas.isAcuerdo, true),
      or(eq(tareas.acuerdoStatus, "pendiente"), eq(tareas.acuerdoStatus, "en_progreso"))
    ))
    .orderBy(desc(tareas.createdAt));
}

export async function searchGlobal(query: string) {
  if (USE_LOCAL_STORE) {
    const q = query.toLowerCase();
    return {
      tareas: listRows("tareas").filter(row => [row.tarea, row.nombre, row.responsable, row.area].some(value => String(value ?? "").toLowerCase().includes(q))).slice(0, 20),
      responsables: listRows("responsables").filter(row => [row.nombre, row.area, row.email].some(value => String(value ?? "").toLowerCase().includes(q))).slice(0, 10),
      departamentos: listRows("departamentos").filter(row => [row.nombre, row.empresa].some(value => String(value ?? "").toLowerCase().includes(q))).slice(0, 10),
    };
  }

  const db = await getDb(); if (!db) return { tareas: [], responsables: [], departamentos: [] };
  const q = `%${query}%`;
  const tareasR = await db.select().from(tareas)
    .where(or(like(tareas.tarea, q), like(tareas.nombre, q), like(tareas.responsable, q), like(tareas.area, q)))
    .orderBy(desc(tareas.createdAt)).limit(20);
  const responsablesR = await db.select().from(responsables)
    .where(or(like(responsables.nombre, q), like(responsables.area, q), like(responsables.email, q)))
    .limit(10);
  const departamentosR = await db.select().from(departamentos)
    .where(or(like(departamentos.nombre, q), like(departamentos.empresa, q)))
    .limit(10);
  return { tareas: tareasR, responsables: responsablesR, departamentos: departamentosR };
}

// ─── Notas ───
export async function listNotasByTarea(tareaId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("notas").filter(row => row.tareaId === tareaId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(notas).where(eq(notas.tareaId, tareaId)).orderBy(desc(notas.createdAt));
}

export async function createNota(data: InsertNota) {
  if (USE_LOCAL_STORE) {
    return insertRow("notas", data);
  }

  const db = await requireDb();
  const result = await db.insert(notas).values(data);
  return { id: result[0].insertId, ...data };
}

// ─── Archivos ───
export async function listArchivos() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("archivos"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(archivos).orderBy(desc(archivos.createdAt));
}

export async function createArchivo(data: InsertArchivo) {
  if (USE_LOCAL_STORE) {
    return insertRow("archivos", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(archivos).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateArchivo(id: number, data: Partial<InsertArchivo>) {
  if (USE_LOCAL_STORE) {
    updateRow("archivos", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(archivos).set(data).where(eq(archivos.id, id));
}

export async function listArchivosByReunion(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("archivos").filter(row => row.reunionId === reunionId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(archivos).where(eq(archivos.reunionId, reunionId)).orderBy(desc(archivos.createdAt));
}

// ─── Reuniones ───
export async function listReuniones() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("reuniones"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(reuniones).orderBy(desc(reuniones.createdAt));
}

export async function upsertReunionesForWeek(items: InsertReunion[]) {
  if (USE_LOCAL_STORE) {
    for (const item of items) {
      const existing = findRow("reuniones", row => row.area === item.area && String(row.semana ?? "") === String(item.semana ?? ""));
      if (existing) updateRow("reuniones", existing.id, item);
      else insertRow("reuniones", item);
    }
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  for (const item of items) {
    const existing = await db.select().from(reuniones)
      .where(and(eq(reuniones.area, item.area), eq(reuniones.semana, item.semana ?? "")))
      .limit(1);
    if (existing.length > 0) {
      await db.update(reuniones).set(item).where(eq(reuniones.id, existing[0].id));
    } else {
      await db.insert(reuniones).values(item);
    }
  }
}

export async function createReunionDirect(data: InsertReunion) {
  if (USE_LOCAL_STORE) {
    return insertRow("reuniones", {
      ...data,
      dia: data.dia ?? "Lunes",
      hora: data.hora ?? "09:00",
      responsable: data.responsable ?? "Sin asignar",
      status: data.status ?? "pendiente",
      hasAyudaMemoria: data.hasAyudaMemoria ?? false,
      tareasGeneradas: data.tareasGeneradas ?? 0,
    });
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(reuniones).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteReunion(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("reuniones", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(reuniones).where(eq(reuniones.id, id));
}

export async function deleteArchivo(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("archivos", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(archivos).where(eq(archivos.id, id));
}

export async function updateReunion(id: number, data: Partial<InsertReunion>) {
  if (USE_LOCAL_STORE) {
    updateRow("reuniones", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(reuniones).set(data).where(eq(reuniones.id, id));
}

export async function listReunionesByArea(area: string) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("reuniones").filter(row => row.area === area));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(reuniones).where(eq(reuniones.area, area)).orderBy(desc(reuniones.createdAt));
}

// ─── Correos ───
export async function listCorreos() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("correos"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(correos).orderBy(desc(correos.createdAt));
}

export async function createCorreo(data: InsertCorreo) {
  if (USE_LOCAL_STORE) {
    return insertRow("correos", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(correos).values(data);
  return { id: result[0].insertId, ...data };
}

// ─── Etiquetas ───
export async function listEtiquetas() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("etiquetas"), "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(etiquetas).orderBy(etiquetas.nombre);
}

export async function createEtiqueta(data: InsertEtiqueta) {
  if (USE_LOCAL_STORE) {
    return insertRow("etiquetas", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(etiquetas).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteEtiqueta(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("etiquetas", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(etiquetas).where(eq(etiquetas.id, id));
}

// ─── Notificaciones ───
export async function listNotificaciones(limit = 50) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("notificaciones")).slice(0, limit);
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(notificaciones).orderBy(desc(notificaciones.createdAt)).limit(limit);
}

export async function countUnreadNotificaciones() {
  if (USE_LOCAL_STORE) {
    return sumBy(listRows("notificaciones"), row => row.leida === false);
  }

  const db = await getDb(); if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(notificaciones).where(eq(notificaciones.leida, false));
  return result[0]?.count ?? 0;
}

export async function createNotificacion(data: InsertNotificacion) {
  if (USE_LOCAL_STORE) {
    return insertRow("notificaciones", { leida: false, ...data });
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(notificaciones).values(data);
  return { id: result[0].insertId, ...data };
}

export async function markNotificacionRead(id: number) {
  if (USE_LOCAL_STORE) {
    updateRow("notificaciones", id, { leida: true });
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(notificaciones).set({ leida: true }).where(eq(notificaciones.id, id));
}

export async function markAllNotificacionesRead() {
  if (USE_LOCAL_STORE) {
    replaceRows("notificaciones", listRows("notificaciones").map(row => ({ ...row, leida: true, updatedAt: new Date().toISOString() })));
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(notificaciones).set({ leida: true }).where(eq(notificaciones.leida, false));
}

export async function deleteNotificacion(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("notificaciones", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(notificaciones).where(eq(notificaciones.id, id));
}

export async function deleteAllNotificaciones() {
  if (USE_LOCAL_STORE) {
    clearRows("notificaciones");
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(notificaciones);
}

// ─── Stats ───
export async function getAreaStats() {
  if (USE_LOCAL_STORE) {
    const rows = listRows("tareas");
    const groups = new Map<string, any>();
    for (const row of rows) {
      const key = row.area ?? "Sin área";
      const current = groups.get(key) ?? { area: key, total: 0, completadas: 0, pendientes: 0, enProgreso: 0, vencidas: 0, visto: 0 };
      current.total += 1;
      if (row.status === "completada") current.completadas += 1;
      if (row.status === "pendiente") current.pendientes += 1;
      if (row.status === "en_progreso") current.enProgreso += 1;
      if (row.status === "vencida") current.vencidas += 1;
      if (row.status === "visto") current.visto += 1;
      groups.set(key, current);
    }
    return Array.from(groups.values());
  }

  const db = await getDb(); if (!db) return [];
  return db.select({
    area: tareas.area,
    total: sql<number>`count(*)`,
    completadas: sql<number>`sum(case when ${tareas.status} = 'completada' then 1 else 0 end)`,
    pendientes: sql<number>`sum(case when ${tareas.status} = 'pendiente' then 1 else 0 end)`,
    enProgreso: sql<number>`sum(case when ${tareas.status} = 'en_progreso' then 1 else 0 end)`,
    vencidas: sql<number>`sum(case when ${tareas.status} = 'vencida' then 1 else 0 end)`,
    visto: sql<number>`sum(case when ${tareas.status} = 'visto' then 1 else 0 end)`,
  }).from(tareas).groupBy(tareas.area);
}

export async function getResponsableStats() {
  if (USE_LOCAL_STORE) {
    const rows = listRows("tareas");
    const groups = new Map<string, any>();
    for (const row of rows) {
      const key = row.responsable ?? "Sin asignar";
      const current = groups.get(key) ?? { responsable: key, total: 0, completadas: 0, pendientes: 0, enProgreso: 0, vencidas: 0 };
      current.total += 1;
      if (row.status === "completada") current.completadas += 1;
      if (row.status === "pendiente") current.pendientes += 1;
      if (row.status === "en_progreso") current.enProgreso += 1;
      if (row.status === "vencida") current.vencidas += 1;
      groups.set(key, current);
    }
    return Array.from(groups.values());
  }

  const db = await getDb(); if (!db) return [];
  return db.select({
    responsable: tareas.responsable,
    total: sql<number>`count(*)`,
    completadas: sql<number>`sum(case when ${tareas.status} = 'completada' then 1 else 0 end)`,
    pendientes: sql<number>`sum(case when ${tareas.status} = 'pendiente' then 1 else 0 end)`,
    enProgreso: sql<number>`sum(case when ${tareas.status} = 'en_progreso' then 1 else 0 end)`,
    vencidas: sql<number>`sum(case when ${tareas.status} = 'vencida' then 1 else 0 end)`,
  }).from(tareas).groupBy(tareas.responsable);
}

export async function getWeeklyTrend() {
  if (USE_LOCAL_STORE) {
    const groups = new Map<string, { week: string; total: number; completadas: number }>();
    for (const row of listRows("tareas")) {
      const created = new Date(String(row.createdAt ?? new Date().toISOString()));
      const week = `${created.getUTCFullYear()}-${String(Math.ceil((((created.getTime() - Date.UTC(created.getUTCFullYear(), 0, 1)) / 86400000) + 1) / 7)).padStart(2, "0")}`;
      const current = groups.get(week) ?? { week, total: 0, completadas: 0 };
      current.total += 1;
      if (row.status === "completada") current.completadas += 1;
      groups.set(week, current);
    }
    return Array.from(groups.values()).sort((left, right) => left.week.localeCompare(right.week)).slice(-12);
  }

  const db = await getDb(); if (!db) return [];
  const result = await db.execute(sql`SELECT DATE_FORMAT(createdAt, '%Y-%u') as week, count(*) as total, sum(case when status = 'completada' then 1 else 0 end) as completadas FROM tareas GROUP BY week ORDER BY week LIMIT 12`);
  return (result as unknown as any[][])[0] || [];
}

export async function getDashboardSummary() {
  if (USE_LOCAL_STORE) {
    const allTareas = listRows("tareas");
    const total = allTareas.length;
    const completadas = sumBy(allTareas, row => row.status === "completada");
    const pendientes = sumBy(allTareas, row => row.status === "pendiente");
    const enProgreso = sumBy(allTareas, row => row.status === "en_progreso");
    const vencidas = sumBy(allTareas, row => row.status === "vencida");
    const acuerdosPendientes = sumBy(allTareas, row => row.isAcuerdo && ["pendiente", "en_progreso"].includes(row.acuerdoStatus));
    return { total, completadas, pendientes, enProgreso, vencidas, acuerdosPendientes, cumplimiento: total > 0 ? Math.round((completadas / total) * 100) : 0 };
  }

  const db = await getDb(); if (!db) return null;
  const allTareas = await db.select().from(tareas);
  const total = allTareas.length;
  const completadas = allTareas.filter(t => t.status === "completada").length;
  const pendientes = allTareas.filter(t => t.status === "pendiente").length;
  const enProgreso = allTareas.filter(t => t.status === "en_progreso").length;
  const vencidas = allTareas.filter(t => t.status === "vencida").length;
  const acuerdosPendientes = allTareas.filter(t => t.isAcuerdo && (t.acuerdoStatus === "pendiente" || t.acuerdoStatus === "en_progreso")).length;
  return { total, completadas, pendientes, enProgreso, vencidas, acuerdosPendientes, cumplimiento: total > 0 ? Math.round((completadas / total) * 100) : 0 };
}

// ─── V4: Adjuntos de tareas ───
import {
  adjuntos, InsertAdjunto,
  actividadTarea, InsertActividadTarea,
  plantillas, InsertPlantilla,
  automatizaciones, InsertAutomatizacion,
  tiempoRegistros, InsertTiempoRegistro,
} from "../drizzle/schema";

export async function listAdjuntosByTarea(tareaId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("adjuntos").filter(row => row.tareaId === tareaId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(adjuntos).where(eq(adjuntos.tareaId, tareaId)).orderBy(desc(adjuntos.createdAt));
}

export async function createAdjunto(data: InsertAdjunto) {
  if (USE_LOCAL_STORE) {
    return insertRow("adjuntos", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(adjuntos).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteAdjunto(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("adjuntos", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(adjuntos).where(eq(adjuntos.id, id));
}

// ─── V4: Historial de actividad ───
export async function listActividadByTarea(tareaId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("actividadTarea").filter(row => row.tareaId === tareaId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(actividadTarea).where(eq(actividadTarea.tareaId, tareaId)).orderBy(desc(actividadTarea.createdAt));
}

export async function createActividad(data: InsertActividadTarea) {
  if (USE_LOCAL_STORE) {
    return insertRow("actividadTarea", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(actividadTarea).values(data);
  return { id: result[0].insertId, ...data };
}

export async function listActividadGlobal(limit = 100) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("actividadTarea")).slice(0, limit);
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(actividadTarea).orderBy(desc(actividadTarea.createdAt)).limit(limit);
}

// ─── V4: Plantillas ───
export async function listPlantillas() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("plantillas"), "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(plantillas).orderBy(plantillas.nombre);
}

export async function createPlantilla(data: InsertPlantilla) {
  if (USE_LOCAL_STORE) {
    return insertRow("plantillas", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(plantillas).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updatePlantilla(id: number, data: Partial<InsertPlantilla>) {
  if (USE_LOCAL_STORE) {
    updateRow("plantillas", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(plantillas).set(data).where(eq(plantillas.id, id));
}

export async function deletePlantilla(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("plantillas", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(plantillas).where(eq(plantillas.id, id));
}

// ─── V4: Automatizaciones ───
export async function listAutomatizaciones() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("automatizaciones"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(automatizaciones).orderBy(desc(automatizaciones.createdAt));
}

export async function createAutomatizacion(data: InsertAutomatizacion) {
  if (USE_LOCAL_STORE) {
    return insertRow("automatizaciones", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(automatizaciones).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateAutomatizacion(id: number, data: Partial<InsertAutomatizacion>) {
  if (USE_LOCAL_STORE) {
    updateRow("automatizaciones", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(automatizaciones).set(data).where(eq(automatizaciones.id, id));
}

export async function deleteAutomatizacion(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("automatizaciones", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(automatizaciones).where(eq(automatizaciones.id, id));
}

export async function listActiveAutomatizaciones() {
  if (USE_LOCAL_STORE) {
    return listRows("automatizaciones").filter(row => row.activa === true);
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(automatizaciones).where(eq(automatizaciones.activa, true));
}

// ─── V4: Timer / Tiempo registros ───
export async function listTiempoByTarea(tareaId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tiempoRegistros").filter(row => row.tareaId === tareaId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tiempoRegistros).where(eq(tiempoRegistros.tareaId, tareaId)).orderBy(desc(tiempoRegistros.createdAt));
}

export async function createTiempoRegistro(data: InsertTiempoRegistro) {
  if (USE_LOCAL_STORE) {
    return insertRow("tiempoRegistros", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(tiempoRegistros).values(data);
  return { id: result[0].insertId, ...data };
}

export async function updateTiempoRegistro(id: number, data: Partial<InsertTiempoRegistro>) {
  if (USE_LOCAL_STORE) {
    updateRow("tiempoRegistros", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.update(tiempoRegistros).set(data).where(eq(tiempoRegistros.id, id));
}

export async function getRunningTimer(tareaId: number) {
  if (USE_LOCAL_STORE) {
    const running = listRows("tiempoRegistros").filter(row => row.tareaId === tareaId && !row.fin);
    return running[0] ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(tiempoRegistros)
    .where(and(eq(tiempoRegistros.tareaId, tareaId), sql`${tiempoRegistros.fin} IS NULL`))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── V4: Workload stats ───
export async function getWorkloadByResponsable() {
  if (USE_LOCAL_STORE) {
    return getResponsableStats().then(rows => rows.map((row: any) => ({
      responsable: row.responsable,
      activas: Number(row.pendientes) + Number(row.enProgreso),
      vencidas: Number(row.vencidas),
      total: Number(row.total),
      completadas: Number(row.completadas),
    })));
  }

  const db = await getDb(); if (!db) return [];
  return db.select({
    responsable: tareas.responsable,
    activas: sql<number>`sum(case when ${tareas.status} in ('pendiente', 'en_progreso') then 1 else 0 end)`,
    vencidas: sql<number>`sum(case when ${tareas.status} = 'vencida' then 1 else 0 end)`,
    total: sql<number>`count(*)`,
    completadas: sql<number>`sum(case when ${tareas.status} = 'completada' then 1 else 0 end)`,
  }).from(tareas).groupBy(tareas.responsable);
}

// ─── V4: Stats by empresa ───
export async function getEmpresaStats() {
  if (USE_LOCAL_STORE) {
    const groups = new Map<string, any>();
    for (const row of listRows("tareas")) {
      const key = row.empresa ?? "Sin empresa";
      const current = groups.get(key) ?? { empresa: key, total: 0, completadas: 0, pendientes: 0, enProgreso: 0, vencidas: 0 };
      current.total += 1;
      if (row.status === "completada") current.completadas += 1;
      if (row.status === "pendiente") current.pendientes += 1;
      if (row.status === "en_progreso") current.enProgreso += 1;
      if (row.status === "vencida") current.vencidas += 1;
      groups.set(key, current);
    }
    return Array.from(groups.values());
  }

  const db = await getDb(); if (!db) return [];
  return db.select({
    empresa: tareas.empresa,
    total: sql<number>`count(*)`,
    completadas: sql<number>`sum(case when ${tareas.status} = 'completada' then 1 else 0 end)`,
    pendientes: sql<number>`sum(case when ${tareas.status} = 'pendiente' then 1 else 0 end)`,
    enProgreso: sql<number>`sum(case when ${tareas.status} = 'en_progreso' then 1 else 0 end)`,
    vencidas: sql<number>`sum(case when ${tareas.status} = 'vencida' then 1 else 0 end)`,
  }).from(tareas).groupBy(tareas.empresa);
}

// ─── V5: Informes mensuales ───
export async function listInformes() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("informes"), "numero");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(informes).orderBy(informes.numero);
}

export async function createInforme(data: InsertInforme) {
  if (USE_LOCAL_STORE) {
    return insertRow("informes", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(informes).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function listInformesMensuales() {
  if (USE_LOCAL_STORE) {
    return listRows("informesMensuales");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(informesMensuales);
}

export async function upsertInformeMensual(data: { informeId: number; mes: number; estado?: string; observacion?: string; fechaEntrega?: string; documentoUrl?: string; documentoNombre?: string }) {
  if (USE_LOCAL_STORE) {
    const existing = findRow("informesMensuales", row => row.informeId === data.informeId && row.mes === data.mes);
    if (existing) {
      return updateRow("informesMensuales", existing.id, data);
    }

    return insertRow("informesMensuales", {
      informeId: data.informeId,
      mes: data.mes,
      estado: data.estado ?? "pendiente",
      observacion: data.observacion ?? null,
      fechaEntrega: data.fechaEntrega ?? null,
      documentoUrl: data.documentoUrl ?? null,
      documentoNombre: data.documentoNombre ?? null,
    });
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const existing = await db.select().from(informesMensuales)
    .where(and(eq(informesMensuales.informeId, data.informeId), eq(informesMensuales.mes, data.mes)))
    .limit(1);
  if (existing.length > 0) {
    const updateData: Record<string, any> = {};
    if (data.estado !== undefined) updateData.estado = data.estado;
    if (data.observacion !== undefined) updateData.observacion = data.observacion;
    if (data.fechaEntrega !== undefined) updateData.fechaEntrega = data.fechaEntrega;
    if (data.documentoUrl !== undefined) updateData.documentoUrl = data.documentoUrl;
    if (data.documentoNombre !== undefined) updateData.documentoNombre = data.documentoNombre;
    if (Object.keys(updateData).length > 0) {
      await db.update(informesMensuales).set(updateData).where(eq(informesMensuales.id, existing[0].id));
    }
    return { ...existing[0], ...updateData };
  } else {
    const result = await db.insert(informesMensuales).values({
      informeId: data.informeId,
      mes: data.mes,
      estado: (data.estado ?? "pendiente") as any,
      observacion: data.observacion ?? null,
      fechaEntrega: data.fechaEntrega ?? null,
      documentoUrl: data.documentoUrl ?? null,
      documentoNombre: data.documentoNombre ?? null,
    });
    return { id: Number(result[0].insertId), ...data };
  }
}

// ─── V5: Google Drive archivos ───
export async function listDriveArchivos() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("driveArchivos"), "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(driveArchivos).orderBy(driveArchivos.nombre);
}

export async function createDriveArchivo(data: InsertDriveArchivo) {
  if (USE_LOCAL_STORE) {
    return insertRow("driveArchivos", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(driveArchivos).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getDriveArchivoByDriveId(driveId: string) {
  if (USE_LOCAL_STORE) {
    return findRow("driveArchivos", row => row.driveId === driveId) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(driveArchivos).where(eq(driveArchivos.driveId, driveId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── V5.1: Prompt Templates ───
export async function listPromptTemplates() {
  if (USE_LOCAL_STORE) {
    return sortByText(listRows("promptTemplates"), "nombre");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(promptTemplates).orderBy(promptTemplates.nombre);
}

export async function createPromptTemplate(data: InsertPromptTemplate) {
  if (USE_LOCAL_STORE) {
    return insertRow("promptTemplates", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(promptTemplates).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updatePromptTemplate(id: number, data: Partial<InsertPromptTemplate>) {
  if (USE_LOCAL_STORE) {
    updateRow("promptTemplates", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(promptTemplates).set(data).where(eq(promptTemplates.id, id));
}

export async function deletePromptTemplate(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("promptTemplates", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(promptTemplates).where(eq(promptTemplates.id, id));
}

export async function getDefaultPromptTemplate() {
  if (USE_LOCAL_STORE) {
    return findRow("promptTemplates", row => row.isDefault === true) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(promptTemplates).where(eq(promptTemplates.isDefault, true)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function seedDefaultPromptTemplate() {
  if (USE_LOCAL_STORE) {
    const existing = await getDefaultPromptTemplate();
    if (existing) return existing;
    return createPromptTemplate({
      nombre: "Extracción de tareas de reunión (por defecto)",
      descripcion: "Prompt estándar para extraer tareas, acuerdos y compromisos de documentos de reunión",
      prompt: `Analiza este documento de reunión y extrae todas las tareas, acuerdos y compromisos mencionados.`,
      isDefault: true,
    });
  }

  const db = await getDb(); if (!db) return;
  const existing = await getDefaultPromptTemplate();
  if (existing) return existing;
  const defaultPrompt = `Analiza este documento de reunión y extrae todas las tareas, acuerdos y compromisos mencionados. Para cada uno genera:
- nombre: título conciso de la tarea (máximo 100 caracteres)
- descripcion: descripción detallada de lo que se debe hacer
- responsable: nombre de la persona responsable (si se menciona)
- fechaLimite: fecha límite sugerida en formato YYYY-MM-DD (si se menciona)
- prioridad: "alta", "media" o "baja"
- area: departamento o área relacionada (si se menciona)

Devuelve SOLO un array JSON válido con los objetos. No incluyas texto adicional fuera del JSON.`;
  return createPromptTemplate({
    nombre: "Extracción de tareas de reunión (por defecto)",
    descripcion: "Prompt estándar para extraer tareas, acuerdos y compromisos de documentos de reunión",
    prompt: defaultPrompt,
    isDefault: true,
  });
}

// ─── V5.1: Borradores de tarea ───
export async function listBorradores(status?: string) {
  if (USE_LOCAL_STORE) {
    const rows = sortByDateDesc(listRows("tareaBorradores"));
    return status ? rows.filter(row => row.status === status) : rows;
  }

  const db = await getDb(); if (!db) return [];
  if (status) {
    return db.select().from(tareaBorradores)
      .where(eq(tareaBorradores.status, status as any))
      .orderBy(desc(tareaBorradores.createdAt));
  }
  return db.select().from(tareaBorradores).orderBy(desc(tareaBorradores.createdAt));
}

export async function createBorrador(data: InsertTareaBorrador) {
  if (USE_LOCAL_STORE) {
    return insertRow("tareaBorradores", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(tareaBorradores).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function createBorradoresBatch(items: InsertTareaBorrador[]) {
  if (USE_LOCAL_STORE) {
    return items.map(item => insertRow("tareaBorradores", item));
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  if (items.length === 0) return [];
  await db.insert(tareaBorradores).values(items);
  return items;
}

export async function updateBorrador(id: number, data: Partial<InsertTareaBorrador>) {
  if (USE_LOCAL_STORE) {
    updateRow("tareaBorradores", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(tareaBorradores).set(data).where(eq(tareaBorradores.id, id));
}

export async function deleteBorrador(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("tareaBorradores", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(tareaBorradores).where(eq(tareaBorradores.id, id));
}

export async function getBorradorById(id: number) {
  if (USE_LOCAL_STORE) {
    return findRow("tareaBorradores", row => row.id === id) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(tareaBorradores).where(eq(tareaBorradores.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ─── V5.1: Drive sync with upsert ───
export async function upsertDriveArchivo(data: InsertDriveArchivo) {
  if (USE_LOCAL_STORE) {
    const existing = await getDriveArchivoByDriveId(data.driveId);
    if (existing) {
      return updateRow("driveArchivos", existing.id, data);
    }
    return createDriveArchivo(data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const existing = await getDriveArchivoByDriveId(data.driveId);
  if (existing) {
    await db.update(driveArchivos).set({
      nombre: data.nombre,
      mimeType: data.mimeType,
      url: data.url,
      carpeta: data.carpeta,
      area: data.area,
      tamano: data.tamano,
    }).where(eq(driveArchivos.id, existing.id));
    return { ...existing, ...data };
  } else {
    return createDriveArchivo(data);
  }
}

export async function deleteDriveArchivo(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("driveArchivos", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(driveArchivos).where(eq(driveArchivos.id, id));
}

// ─── V5.3: Brief Pre-Reunión ───
export async function listBriefEnviados() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("briefEnviados"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(briefEnviados).orderBy(desc(briefEnviados.createdAt));
}

export async function getBriefByReunionId(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return findRow("briefEnviados", row => row.reunionId === reunionId) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(briefEnviados).where(eq(briefEnviados.reunionId, reunionId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBriefEnviado(data: InsertBriefEnviado) {
  if (USE_LOCAL_STORE) {
    return insertRow("briefEnviados", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(briefEnviados).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function getConfigBrief() {
  if (USE_LOCAL_STORE) {
    return getConfigBriefState();
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(configBrief).limit(1);
  if (result.length === 0) {
    // Seed default config
    await db.insert(configBrief).values({
      activo: true,
      emailDestinatario: "gerencia@cap.hn",
      minutosAnticipacion: 30,
    });
    const seeded = await db.select().from(configBrief).limit(1);
    return seeded[0] ?? null;
  }
  return result[0];
}

export async function updateConfigBrief(data: { activo?: boolean; emailDestinatario?: string; minutosAnticipacion?: number }) {
  if (USE_LOCAL_STORE) {
    return updateConfigBriefState(data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.select().from(configBrief).limit(1);
  const config = result[0] ?? null;
  if (!config) throw new Error("No config found");
  const updateData: Record<string, any> = {};
  if (data.activo !== undefined) updateData.activo = data.activo;
  if (data.emailDestinatario !== undefined) updateData.emailDestinatario = data.emailDestinatario;
  if (data.minutosAnticipacion !== undefined) updateData.minutosAnticipacion = data.minutosAnticipacion;
  if (Object.keys(updateData).length > 0) {
    await db.update(configBrief).set(updateData).where(eq(configBrief.id, config.id));
  }
  return { ...config, ...updateData };
}

// ─── V5.3: Reuniones with brief status ───
export async function listReunionesWithBriefStatus() {
  if (USE_LOCAL_STORE) {
    const allReuniones = sortByDateDesc(listRows("reuniones"));
    const allBriefs = listRows("briefs");
    const briefMap = new Map<number, any>();
    for (const brief of allBriefs) {
      if (!briefMap.has(brief.reunionId)) briefMap.set(brief.reunionId, brief);
    }
    return allReuniones.map(row => ({
      ...row,
      briefEnviado: briefMap.has(row.id),
      briefFecha: briefMap.get(row.id)?.generadoEn ?? null,
    }));
  }

  const db = await getDb(); if (!db) return [];
  const allReuniones = await db.select().from(reuniones).orderBy(desc(reuniones.createdAt));
  const allBriefs = await db.select().from(briefEnviados);
  const briefMap = new Map(allBriefs.map(b => [b.reunionId, b]));
  return allReuniones.map(r => ({
    ...r,
    briefEnviado: briefMap.has(r.id),
    briefFecha: briefMap.get(r.id)?.createdAt ?? null,
  }));
}

// ─── V5.4: Organización ───
export async function listOrganizacion() {
  if (USE_LOCAL_STORE) {
    return [...listRows("organizacion")].sort((left, right) => Number(left.orden ?? 0) - Number(right.orden ?? 0));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(organizacion).orderBy(organizacion.orden);
}

export async function createOrganizacionMember(data: InsertOrganizacion) {
  if (USE_LOCAL_STORE) {
    return insertRow("organizacion", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(organizacion).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateOrganizacionMember(id: number, data: Partial<InsertOrganizacion>) {
  if (USE_LOCAL_STORE) {
    updateRow("organizacion", id, data);
    return { id, ...data };
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(organizacion).set(data).where(eq(organizacion.id, id));
  return { id, ...data };
}

export async function deleteOrganizacionMember(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("organizacion", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(organizacion).where(eq(organizacion.id, id));
}

export async function seedOrganizacion(members: InsertOrganizacion[]) {
  if (USE_LOCAL_STORE) {
    clearRows("organizacion");
    for (const member of members) {
      insertRow("organizacion", member);
    }
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  // Clear existing
  await db.delete(organizacion);
  // Insert all
  if (members.length > 0) {
    await db.insert(organizacion).values(members);
  }
}

// ─── V5.4: Acuerdos ───
export async function listAcuerdos() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("acuerdos"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(acuerdos).orderBy(desc(acuerdos.createdAt));
}

export async function listAcuerdosByReunion(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("acuerdos").filter(row => row.reunionId === reunionId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(acuerdos).where(eq(acuerdos.reunionId, reunionId)).orderBy(desc(acuerdos.createdAt));
}

export async function createAcuerdo(data: InsertAcuerdo) {
  if (USE_LOCAL_STORE) {
    return insertRow("acuerdos", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(acuerdos).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateAcuerdo(id: number, data: Partial<InsertAcuerdo>) {
  if (USE_LOCAL_STORE) {
    updateRow("acuerdos", id, data);
    return { id, ...data };
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(acuerdos).set(data).where(eq(acuerdos.id, id));
  return { id, ...data };
}

export async function deleteAcuerdo(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("acuerdos", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(acuerdos).where(eq(acuerdos.id, id));
}

// ─── V5.4: Prompt Templates for Ayudas Memorias ───
export async function listPromptTemplatesAM() {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("promptTemplatesAM"));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(promptTemplatesAM).orderBy(desc(promptTemplatesAM.createdAt));
}

export async function createPromptTemplateAM(data: InsertPromptTemplateAM) {
  if (USE_LOCAL_STORE) {
    return insertRow("promptTemplatesAM", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(promptTemplatesAM).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updatePromptTemplateAM(id: number, data: Partial<InsertPromptTemplateAM>) {
  if (USE_LOCAL_STORE) {
    updateRow("promptTemplatesAM", id, data);
    return { id, ...data };
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(promptTemplatesAM).set(data).where(eq(promptTemplatesAM.id, id));
  return { id, ...data };
}

export async function deletePromptTemplateAM(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("promptTemplatesAM", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(promptTemplatesAM).where(eq(promptTemplatesAM.id, id));
}

export async function getDefaultPromptTemplateAM(tipo: "ayuda_memoria" | "extraer_tareas") {
  if (USE_LOCAL_STORE) {
    return findRow("promptTemplatesAM", row => row.tipo === tipo && row.isDefault === true) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(promptTemplatesAM)
    .where(and(eq(promptTemplatesAM.tipo, tipo), eq(promptTemplatesAM.isDefault, true)))
    .limit(1);
  return result[0] ?? null;
}

// ─── V5.4: Reuniones enhanced queries ───
export async function getReunionById(id: number) {
  if (USE_LOCAL_STORE) {
    return findRow("reuniones", row => row.id === id) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(reuniones).where(eq(reuniones.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getTareasByReunionId(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareas").filter(row => row.reunionOrigenId === reunionId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareas).where(eq(tareas.reunionOrigenId, reunionId)).orderBy(desc(tareas.createdAt));
}

export async function getBorradoresByReunionId(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("tareaBorradores").filter(row => row.reunionId === reunionId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(tareaBorradores).where(eq(tareaBorradores.reunionId, reunionId)).orderBy(desc(tareaBorradores.createdAt));
}

export async function getArchivosByReunionId(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("archivos").filter(row => row.reunionId === reunionId));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(archivos).where(eq(archivos.reunionId, reunionId)).orderBy(desc(archivos.createdAt));
}

// ─── V5.4: Pending acuerdos for an area (for next meeting) ───
export async function getPendingAcuerdosByArea(area: string) {
  if (USE_LOCAL_STORE) {
    const reunionIds = listRows("reuniones").filter(row => row.area === area).map(row => row.id);
    return sortByDateDesc(listRows("acuerdos").filter(row => reunionIds.includes(row.reunionId) && row.status !== "cumplido"));
  }

  const db = await getDb(); if (!db) return [];
  const allAcuerdos = await db.select().from(acuerdos)
    .where(sql`${acuerdos.status} != 'cumplido'`)
    .orderBy(desc(acuerdos.createdAt));
  // Join with reuniones to filter by area
  const allReuniones = await db.select().from(reuniones);
  const reunionMap = new Map(allReuniones.map(r => [r.id, r]));
  return allAcuerdos.filter(a => {
    const reunion = reunionMap.get(a.reunionId);
    return reunion && reunion.area === area;
  });
}


// ─── V5.6: Area Expediente (accumulated history) ───
export async function getAreaExpediente(area: string) {
  if (USE_LOCAL_STORE) {
    const areaReuniones = sortByDateDesc(listRows("reuniones").filter(row => row.area === area));
    const reunionIds = areaReuniones.map(row => row.id);
    const areaTareas = sortByDateDesc(listRows("tareas").filter(row => reunionIds.includes(row.reunionOrigenId) || row.area === area));
    const areaActividad = sortByDateDesc(listRows("actividadTarea").filter(row => areaTareas.some(task => task.id === row.tareaId))).slice(0, 100);
    return {
      reuniones: areaReuniones,
      archivos: sortByDateDesc(listRows("archivos").filter(row => reunionIds.includes(row.reunionId) || row.area === area)),
      tareas: areaTareas,
      acuerdos: sortByDateDesc(listRows("acuerdos").filter(row => reunionIds.includes(row.reunionId))),
      borradores: sortByDateDesc(listRows("tareaBorradores").filter(row => reunionIds.includes(row.reunionId))),
      actividad: areaActividad,
    };
  }

  const db = await getDb(); if (!db) return { reuniones: [], archivos: [], tareas: [], acuerdos: [], borradores: [], actividad: [] };
  // Get all reuniones for this area
  const areaReuniones = await db.select().from(reuniones).where(eq(reuniones.area, area)).orderBy(desc(reuniones.createdAt));
  const reunionIds = areaReuniones.map(r => r.id);
  if (reunionIds.length === 0) return { reuniones: areaReuniones, archivos: [], tareas: [], acuerdos: [], borradores: [], actividad: [] };
  // Get all related entities across ALL reuniones for this area
  const [areaArchivos, areaTareas, areaAcuerdos, areaBorradores] = await Promise.all([
    db.select().from(archivos).where(
      or(
        inArray(archivos.reunionId, reunionIds),
        eq(archivos.area, area)
      )
    ).orderBy(desc(archivos.createdAt)),
    db.select().from(tareas).where(
      or(
        inArray(tareas.reunionOrigenId, reunionIds),
        eq(tareas.area, area)
      )
    ).orderBy(desc(tareas.createdAt)),
    db.select().from(acuerdos).where(inArray(acuerdos.reunionId, reunionIds)).orderBy(desc(acuerdos.createdAt)),
    db.select().from(tareaBorradores).where(inArray(tareaBorradores.reunionId, reunionIds)).orderBy(desc(tareaBorradores.createdAt)),
  ]);
  // Get activity for all tasks in this area
  const tareaIds = areaTareas.map(t => t.id);
  let areaActividad: any[] = [];
  if (tareaIds.length > 0) {
    areaActividad = await db.select().from(actividadTarea).where(inArray(actividadTarea.tareaId, tareaIds)).orderBy(desc(actividadTarea.createdAt)).limit(100);
  }
  return {
    reuniones: areaReuniones,
    archivos: areaArchivos,
    tareas: areaTareas,
    acuerdos: areaAcuerdos,
    borradores: areaBorradores,
    actividad: areaActividad,
  };
}

// ─── V5.5: Task Sections ───
export async function listTaskSections() {
  if (USE_LOCAL_STORE) {
    return [...listRows("taskSections")].sort((left, right) => Number(left.orden ?? 0) - Number(right.orden ?? 0));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(taskSections).orderBy(taskSections.orden);
}

export async function createTaskSection(data: InsertTaskSection) {
  if (USE_LOCAL_STORE) {
    return insertRow("taskSections", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(taskSections).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateTaskSection(id: number, data: Partial<InsertTaskSection>) {
  if (USE_LOCAL_STORE) {
    updateRow("taskSections", id, data);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.update(taskSections).set(data).where(eq(taskSections.id, id));
}

export async function deleteTaskSection(id: number) {
  if (USE_LOCAL_STORE) {
    replaceRows("tareas", listRows("tareas").map(row => row.sectionId === id ? { ...row, sectionId: null, updatedAt: new Date().toISOString() } : row));
    deleteRow("taskSections", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  // Unset sectionId on tasks that belong to this section
  await db.update(tareas).set({ sectionId: null }).where(eq(tareas.sectionId, id));
  await db.delete(taskSections).where(eq(taskSections.id, id));
}

// ─── V5.5: Task Followers ───
export async function listFollowersByTarea(tareaId: number) {
  if (USE_LOCAL_STORE) {
    return listRows("taskFollowers").filter(row => row.tareaId === tareaId);
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(taskFollowers).where(eq(taskFollowers.tareaId, tareaId));
}

export async function addFollower(data: InsertTaskFollower) {
  if (USE_LOCAL_STORE) {
    return insertRow("taskFollowers", data);
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const result = await db.insert(taskFollowers).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function removeFollower(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("taskFollowers", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  await db.delete(taskFollowers).where(eq(taskFollowers.id, id));
}

// ─── V5.5: System Config ───
export async function getSystemConfig(key: string) {
  if (USE_LOCAL_STORE) {
    return getSystemConfigValue(key);
  }

  const db = await getDb(); if (!db) return null;
  const result = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  return result.length > 0 ? result[0].value : null;
}

export async function setSystemConfig(key: string, value: string) {
  if (USE_LOCAL_STORE) {
    setSystemConfigValue(key, value);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("No DB");
  const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(systemConfig).set({ value }).where(eq(systemConfig.key, key));
  } else {
    await db.insert(systemConfig).values({ key, value });
  }
}

export async function getAllSystemConfig() {
  if (USE_LOCAL_STORE) {
    return Object.entries(getAllSystemConfigValues()).map(([key, value]) => ({ key, value }));
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(systemConfig);
}

// ─── V5.5: Enhanced Reuniones (all by area) ───
export async function listReunionesHistorialByArea(area: string, limit = 50, offset = 0) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("reuniones").filter(row => row.area === area), "fecha").slice(offset, offset + limit);
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(reuniones)
    .where(eq(reuniones.area, area))
    .orderBy(desc(reuniones.fecha))
    .limit(limit)
    .offset(offset);
}

// ─── V5.5: Enhanced Activity (with filters) ───
export async function listActividadFiltered(filters: { usuario?: string; tipo?: string; modulo?: string; desde?: number; hasta?: number; limit?: number }) {
  if (USE_LOCAL_STORE) {
    const all = sortByDateDesc(listRows("actividadTarea")).slice(0, 500);
    return all.filter((row: any) => {
      const createdAt = new Date(String(row.createdAt ?? new Date().toISOString())).getTime();
      if (filters.usuario && row.usuario && !String(row.usuario).toLowerCase().includes(filters.usuario.toLowerCase())) return false;
      if (filters.tipo && row.accion !== filters.tipo) return false;
      if (filters.modulo && row.modulo && !String(row.modulo).toLowerCase().includes(filters.modulo.toLowerCase())) return false;
      if (filters.desde && createdAt < filters.desde) return false;
      if (filters.hasta && createdAt > filters.hasta) return false;
      return true;
    }).slice(0, filters.limit || 200);
  }

  const db = await getDb(); if (!db) return [];
  const all = await db.select().from(actividadTarea).orderBy(desc(actividadTarea.createdAt)).limit(500);
  return all.filter((a: any) => {
    if (filters.usuario && a.usuario && !a.usuario.toLowerCase().includes(filters.usuario.toLowerCase())) return false;
    if (filters.tipo && a.accion !== filters.tipo) return false;
    if (filters.modulo && a.modulo && !a.modulo.toLowerCase().includes(filters.modulo.toLowerCase())) return false;
    if (filters.desde && a.createdAt.getTime() < filters.desde) return false;
    if (filters.hasta && a.createdAt.getTime() > filters.hasta) return false;
    return true;
  }).slice(0, filters.limit || 200);
}

// ─── V5.5: Workload enhanced ───
export async function getWorkloadEnhanced() {
  if (USE_LOCAL_STORE) {
    const allTareas = listRows("tareas");
    const allResponsables = listRows("responsables");
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    return allResponsables.map(row => {
      const myTasks = allTareas.filter(task => task.responsable === row.nombre || task.responsableId === row.id);
      const activas = myTasks.filter(task => task.status === "pendiente" || task.status === "en_progreso");
      const vencidas = myTasks.filter(task => task.status !== "completada" && task.fechaTs && task.fechaTs < now);
      const completadasMes = myTasks.filter(task => task.status === "completada" && new Date(String(task.updatedAt ?? 0)).getTime() >= monthStart.getTime());
      const bloqueadas = myTasks.filter(task => task.dependeDeId != null);
      const totalActivas = activas.length;
      return {
        id: row.id,
        nombre: row.nombre,
        area: row.area,
        empresa: row.empresa,
        activas: totalActivas,
        vencidas: vencidas.length,
        completadasMes: completadasMes.length,
        bloqueadas: bloqueadas.length,
        total: myTasks.length,
        semaforo: totalActivas > 10 ? "rojo" : totalActivas > 5 ? "amarillo" : "verde",
      };
    });
  }

  const db = await getDb(); if (!db) return [];
  const allTareas = await db.select().from(tareas);
  const allResponsables = await db.select().from(responsables);
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  return allResponsables.map(r => {
    const myTasks = allTareas.filter(t => t.responsable === r.nombre || t.responsableId === r.id);
    const activas = myTasks.filter(t => t.status === "pendiente" || t.status === "en_progreso");
    const vencidas = myTasks.filter(t => t.status !== "completada" && t.fechaTs && t.fechaTs < now);
    const completadasMes = myTasks.filter(t => t.status === "completada" && t.updatedAt.getTime() >= monthStart.getTime());
    const bloqueadas = myTasks.filter(t => t.dependeDeId != null);
    const totalActivas = activas.length;
    const semaforo = totalActivas > 10 ? "rojo" : totalActivas > 5 ? "amarillo" : "verde";
    return {
      id: r.id,
      nombre: r.nombre,
      area: r.area,
      empresa: r.empresa,
      activas: totalActivas,
      vencidas: vencidas.length,
      completadasMes: completadasMes.length,
      bloqueadas: bloqueadas.length,
      total: myTasks.length,
      semaforo,
    };
  });
}

// ─── V5.5: Notification for upcoming deadlines ───
export async function getTareasProximasAVencer(horasAntes: number = 24) {
  if (USE_LOCAL_STORE) {
    const now = Date.now();
    const limite = now + horasAntes * 60 * 60 * 1000;
    return listRows("tareas").filter(row => row.status !== "completada" && row.fechaTs && row.fechaTs > now && row.fechaTs <= limite);
  }

  const db = await getDb(); if (!db) return [];
  const now = Date.now();
  const limite = now + horasAntes * 60 * 60 * 1000;
  const allTareas = await db.select().from(tareas)
    .where(sql`${tareas.status} NOT IN ('completada')`);
  return allTareas.filter(t => t.fechaTs && t.fechaTs > now && t.fechaTs <= limite);
}

// ─── Briefs Pre-Reunión (v5.8) ───
export async function listBriefsByReunion(reunionId: number) {
  if (USE_LOCAL_STORE) {
    return sortByDateDesc(listRows("briefs").filter(row => row.reunionId === reunionId), "generadoEn");
  }

  const db = await getDb(); if (!db) return [];
  return db.select().from(briefs)
    .where(eq(briefs.reunionId, reunionId))
    .orderBy(desc(briefs.generadoEn));
}

export async function createBrief(data: InsertBrief) {
  if (USE_LOCAL_STORE) {
    return insertRow("briefs", data);
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  const result = await db.insert(briefs).values(data);
  return { id: result[0].insertId, ...data };
}

export async function deleteBrief(id: number) {
  if (USE_LOCAL_STORE) {
    deleteRow("briefs", id);
    return;
  }

  const db = await getDb(); if (!db) throw new Error("DB not available");
  await db.delete(briefs).where(eq(briefs.id, id));
}

export async function getBriefsByArea(area: string) {
  if (USE_LOCAL_STORE) {
    const reunionIds = listRows("reuniones").filter(row => row.area === area).map(row => row.id);
    return sortByDateDesc(listRows("briefs").filter(row => reunionIds.includes(row.reunionId)), "generadoEn");
  }

  const db = await getDb(); if (!db) return [];
  // Get all reunion IDs for this area
  const areaReuniones = await db.select({ id: reuniones.id })
    .from(reuniones).where(eq(reuniones.area, area));
  if (areaReuniones.length === 0) return [];
  const ids = areaReuniones.map(r => r.id);
  return db.select().from(briefs)
    .where(inArray(briefs.reunionId, ids))
    .orderBy(desc(briefs.generadoEn));
}

// ─── Check for duplicate tasks ───
export async function checkDuplicateTask(nombre: string, area: string) {
  if (USE_LOCAL_STORE) {
    return listRows("tareas").find(row => String(row.area) === area && String(row.tarea ?? "").toLowerCase().includes(nombre.toLowerCase())) ?? null;
  }

  const db = await getDb(); if (!db) return null;
  // Find tasks with similar name in the same area
  const result = await db.select().from(tareas)
    .where(and(
      like(tareas.tarea, `%${nombre}%`),
      eq(tareas.area, area)
    ))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}
