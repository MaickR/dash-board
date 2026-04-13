import { COOKIE_NAME } from "@shared/const";
import type { InsertActividadTarea } from "../drizzle/schema";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";
import * as db from "./db";

type ActivityPayload = Omit<InsertActividadTarea, "id" | "createdAt">;

async function logActivity(payload: ActivityPayload) {
  return db.createActividad(payload);
}

async function logActivitySafe(payload: ActivityPayload) {
  await logActivity(payload).catch(() => undefined);
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Departamentos ───
  departamentos: router({
    list: publicProcedure.query(() => db.listDepartamentos()),
    create: publicProcedure.input(z.object({
      nombre: z.string().min(1),
      empresa: z.string().min(1),
      categoria: z.string().optional(),
      responsableActualId: z.number().nullable().optional(),
    })).mutation(async ({ input }) => {
      const dept = await db.createDepartamento({
        nombre: input.nombre,
        empresa: input.empresa,
        categoria: input.categoria ?? null,
        responsableActualId: input.responsableActualId ?? null,
      });
      if (input.responsableActualId) {
        const resps = await db.listResponsables();
        const resp = resps.find(r => r.id === input.responsableActualId);
        if (resp) {
          const today = new Date().toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" });
          await db.createDepartamentoHistorial({
            departamentoId: dept.id,
            responsableId: resp.id,
            responsableNombre: resp.nombre,
            fechaInicio: today,
            fechaFin: null,
          });
        }
      }
      return dept;
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      empresa: z.string().optional(),
      categoria: z.string().nullable().optional(),
      responsableActualId: z.number().nullable().optional(),
      motivoCambio: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, motivoCambio, ...data } = input;
      if (data.responsableActualId !== undefined) {
        const today = new Date().toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" });
        await db.closeDepartamentoHistorial(id, today);
        if (data.responsableActualId) {
          const resps = await db.listResponsables();
          const resp = resps.find(r => r.id === data.responsableActualId);
          if (resp) {
            await db.createDepartamentoHistorial({
              departamentoId: id,
              responsableId: resp.id,
              responsableNombre: resp.nombre,
              fechaInicio: today,
              fechaFin: null,
              motivoCambio: motivoCambio ?? null,
            });
          }
        }
      }
      await db.updateDepartamento(id, data);
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteDepartamento(input.id)),
    historial: publicProcedure.input(z.object({ departamentoId: z.number() })).query(({ input }) => db.listDepartamentoHistorial(input.departamentoId)),
  }),

  // ─── Responsables ───
  responsables: router({
    list: publicProcedure.query(() => db.listResponsables()),
    create: publicProcedure.input(z.object({
      nombre: z.string().min(1), area: z.string().min(1), email: z.string().optional(),
      cargo: z.string().optional(), empresa: z.string().optional(), telefono: z.string().optional(), departamentoId: z.number().optional(),
    })).mutation(({ input }) => db.createResponsable({
      nombre: input.nombre, area: input.area, email: input.email ?? null,
      cargo: input.cargo ?? null, empresa: input.empresa ?? null, telefono: input.telefono ?? null, departamentoId: input.departamentoId ?? null,
    })),
    update: publicProcedure.input(z.object({
      id: z.number(), nombre: z.string().optional(), area: z.string().optional(), email: z.string().optional(),
      cargo: z.string().optional(), empresa: z.string().optional(), telefono: z.string().optional(), departamentoId: z.number().nullable().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updateResponsable(id, data); }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteResponsable(input.id)),
    workload: publicProcedure.query(() => db.getWorkloadByResponsable()),
  }),

  // ─── Tareas ───
  tareas: router({
    list: publicProcedure.query(() => db.listTareas()),
    checkDuplicate: publicProcedure.input(z.object({
      nombre: z.string(),
      area: z.string(),
    })).query(async ({ input }) => {
      const existing = await db.checkDuplicateTask(input.nombre, input.area);
      return { isDuplicate: !!existing, existing: existing ?? null };
    }),
    create: publicProcedure.input(z.object({
      nombre: z.string().max(200).optional(),
      descripcion: z.string().optional(),
      area: z.string(),
      tarea: z.string(),
      responsable: z.string(),
      fecha: z.string(),
      propuesta: z.string().optional(),
      status: z.enum(["pendiente", "en_progreso", "completada", "vencida", "visto"]).optional(),
      source: z.string().optional(),
      reunion: z.string().optional(),
      archivoId: z.number().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      departamentoId: z.number().optional(),
      isAcuerdo: z.boolean().optional(),
      acuerdoStatus: z.enum(["pendiente", "en_progreso", "cerrado", "postergado"]).optional(),
      reunionOrigenId: z.number().optional(),
      empresa: z.string().optional(),
      fechaCreacionManual: z.string().optional(),
      fechaInicio: z.string().optional(),
      esRecurrente: z.boolean().optional(),
      recurrencia: z.enum(["diaria", "semanal", "quincenal", "mensual"]).optional(),
      checklist: z.any().optional(),
      tiempoEstimado: z.number().optional(),
      plantillaId: z.number().optional(),
      etiquetas: z.string().optional(),
    })).mutation(async ({ input }) => {
      const fechaTs = parseDateToTs(input.fecha);
      const result = await db.createTarea({
        nombre: input.nombre ?? null,
        descripcion: input.descripcion ?? null,
        area: input.area,
        tarea: input.tarea,
        responsable: input.responsable,
        fecha: input.fecha,
        fechaTs,
        propuesta: input.propuesta ?? null,
        status: input.status ?? "pendiente",
        source: input.source ?? null,
        reunion: input.reunion ?? null,
        archivoId: input.archivoId ?? null,
        responsableId: null,
        departamentoId: input.departamentoId ?? null,
        prioridad: input.prioridad ?? "media",
        avance: 0,
        parentId: null,
        etiquetas: input.etiquetas ?? null,
        responsablesIds: null,
        dependeDeId: null,
        fechaInicio: input.fechaInicio ?? null,
        fechaInicioTs: input.fechaInicio ? parseDateToTs(input.fechaInicio) : null,
        isAcuerdo: input.isAcuerdo ?? false,
        acuerdoStatus: input.acuerdoStatus ?? null,
        reunionOrigenId: input.reunionOrigenId ?? null,
        empresa: input.empresa ?? null,
        fechaCreacionManual: input.fechaCreacionManual ?? null,
        esRecurrente: input.esRecurrente ?? false,
        recurrencia: input.recurrencia ?? null,
        checklist: input.checklist ?? null,
        tiempoEstimado: input.tiempoEstimado ?? null,
        plantillaId: input.plantillaId ?? null,
        tiempoRegistrado: 0,
      });
      // Log activity
      await logActivity({
        tareaId: result.id,
        accion: "creacion",
        detalle: `Tarea creada: ${input.nombre || input.tarea}`,
        usuario: "Sistema",
      });
      return result;
    }),
    createBatch: publicProcedure.input(z.array(z.object({
      area: z.string(), tarea: z.string(), responsable: z.string(), fecha: z.string(),
      nombre: z.string().optional(), descripcion: z.string().optional(),
      propuesta: z.string().optional(), status: z.enum(["pendiente", "en_progreso", "completada", "vencida", "visto"]).optional(),
      source: z.string().optional(), reunion: z.string().optional(), archivoId: z.number().optional(),
      isAcuerdo: z.boolean().optional(), acuerdoStatus: z.enum(["pendiente", "en_progreso", "cerrado", "postergado"]).optional(),
    }))).mutation(async ({ input }) => {
      const items = input.map(t => ({
        nombre: t.nombre ?? null, descripcion: t.descripcion ?? null,
        area: t.area, tarea: t.tarea, responsable: t.responsable, fecha: t.fecha,
        fechaTs: parseDateToTs(t.fecha),
        propuesta: t.propuesta ?? null, status: t.status ?? "pendiente" as const,
        source: t.source ?? null, reunion: t.reunion ?? null, archivoId: t.archivoId ?? null,
        responsableId: null, departamentoId: null, prioridad: "media" as const, avance: 0,
        parentId: null, etiquetas: null, responsablesIds: null, dependeDeId: null,
        fechaInicio: null, fechaInicioTs: null,
        isAcuerdo: t.isAcuerdo ?? false, acuerdoStatus: t.acuerdoStatus ?? null, reunionOrigenId: null,
      }));
      return db.createTareasBatch(items);
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(), descripcion: z.string().optional(),
      tarea: z.string().optional(), responsable: z.string().optional(), fecha: z.string().optional(),
      propuesta: z.string().optional(),
      status: z.enum(["pendiente", "en_progreso", "completada", "vencida", "visto"]).optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      avance: z.number().min(0).max(100).optional(),
      parentId: z.number().nullable().optional(),
      etiquetas: z.string().optional(), responsablesIds: z.string().optional(),
      dependeDeId: z.number().nullable().optional(),
      fechaInicio: z.string().optional(),
      isAcuerdo: z.boolean().optional(),
      acuerdoStatus: z.enum(["pendiente", "en_progreso", "cerrado", "postergado"]).nullable().optional(),
      departamentoId: z.number().nullable().optional(),
      empresa: z.string().nullable().optional(),
      fechaCreacionManual: z.string().nullable().optional(),
      esRecurrente: z.boolean().optional(),
      recurrencia: z.enum(["diaria", "semanal", "quincenal", "mensual"]).nullable().optional(),
      checklist: z.any().optional(),
      tiempoEstimado: z.number().nullable().optional(),
      tiempoRegistrado: z.number().optional(),
      area: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const updateData: any = { ...data };
      if (data.fecha) updateData.fechaTs = parseDateToTs(data.fecha);
      if (data.fechaInicio) updateData.fechaInicioTs = parseDateToTs(data.fechaInicio);

      // Log significant changes
      const changes: string[] = [];
      if (data.status) changes.push(`Estado → ${data.status}`);
      if (data.responsable) changes.push(`Responsable → ${data.responsable}`);
      if (data.prioridad) changes.push(`Prioridad → ${data.prioridad}`);
      if (data.nombre) changes.push(`Nombre actualizado`);
      if (data.fecha) changes.push(`Fecha → ${data.fecha}`);
      if (data.avance !== undefined) changes.push(`Avance → ${data.avance}%`);

      if (changes.length > 0) {
        await logActivitySafe({
          tareaId: id,
          accion: data.status ? "cambio_estado" : data.responsable ? "cambio_responsable" : "actualizacion",
          detalle: changes.join(", "),
          usuario: "Sistema",
        });
      }

      return db.updateTarea(id, updateData);
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await logActivitySafe({
        tareaId: input.id,
        accion: "eliminacion",
        detalle: `Tarea #${input.id} eliminada`,
        usuario: "Sistema",
      });
      return db.deleteTarea(input.id);
    }),
    subtareas: publicProcedure.input(z.object({ parentId: z.number() })).query(({ input }) => db.listSubtareas(input.parentId)),
    deleteSubtarea: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteTarea(input.id)),
    createSubtarea: publicProcedure.input(z.object({
      parentId: z.number(), tarea: z.string(), responsable: z.string(), fecha: z.string(), area: z.string(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
    })).mutation(async ({ input }) => {
      return db.createTarea({
        nombre: null, descripcion: null, area: input.area, tarea: input.tarea, responsable: input.responsable,
        fecha: input.fecha, fechaTs: parseDateToTs(input.fecha), parentId: input.parentId,
        prioridad: input.prioridad ?? "media", avance: 0, status: "pendiente",
        propuesta: null, source: "subtarea", reunion: null, archivoId: null, responsableId: null,
        departamentoId: null, etiquetas: null, responsablesIds: null, dependeDeId: null,
        fechaInicio: null, fechaInicioTs: null, isAcuerdo: false, acuerdoStatus: null, reunionOrigenId: null,
      });
    }),
    stats: publicProcedure.query(() => db.getAreaStats()),
    responsableStats: publicProcedure.query(() => db.getResponsableStats()),
    weeklyTrend: publicProcedure.query(() => db.getWeeklyTrend()),
    acuerdosByArea: publicProcedure.input(z.object({ area: z.string() })).query(({ input }) => db.listAcuerdosByArea(input.area)),
    acuerdosPendientes: publicProcedure.input(z.object({ area: z.string() })).query(({ input }) => db.listAcuerdosPendientesByArea(input.area)),
  }),

  // ─── Notas ───
  notas: router({
    list: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.listNotasByTarea(input.tareaId)),
    create: publicProcedure.input(z.object({
      tareaId: z.number(), contenido: z.string().min(1), autor: z.string().min(1),
    })).mutation(async ({ input }) => {
      const result = await db.createNota(input);
      await logActivitySafe({
        tareaId: input.tareaId,
        accion: "comentario",
        detalle: `Comentario de ${input.autor}: ${input.contenido.substring(0, 100)}`,
        usuario: input.autor,
      });
      return result;
    }),
  }),

  // ─── Adjuntos (v4) ───
  adjuntos: router({
    list: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.listAdjuntosByTarea(input.tareaId)),
    upload: publicProcedure.input(z.object({
      tareaId: z.number(),
      nombre: z.string(),
      contenido: z.string(), // base64
      mimeType: z.string().optional(),
      tamano: z.number().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.contenido, "base64");
      const fileKey = `adjuntos/${nanoid()}-${input.nombre}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType ?? "application/octet-stream");
      const result = await db.createAdjunto({
        tareaId: input.tareaId,
        nombre: input.nombre,
        url,
        fileKey,
        mimeType: input.mimeType ?? null,
        tamano: input.tamano ?? buffer.length,
        subidoPor: "Sistema",
      });
      await logActivitySafe({
        tareaId: input.tareaId,
        accion: "adjunto",
        detalle: `Archivo adjuntado: ${input.nombre}`,
        usuario: "Sistema",
      });
      return result;
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteAdjunto(input.id)),
  }),

  // ─── Actividad (v4) ───
  actividad: router({
    byTarea: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.listActividadByTarea(input.tareaId)),
    global: publicProcedure.input(z.object({ limit: z.number().optional() })).query(({ input }) => db.listActividadGlobal(input.limit ?? 100)),
  }),

  // ─── Plantillas (v4) ───
  plantillas: router({
    list: publicProcedure.query(() => db.listPlantillas()),
    create: publicProcedure.input(z.object({
      nombre: z.string().min(1),
      descripcion: z.string().optional(),
      area: z.string().optional(),
      empresa: z.string().optional(),
      responsableSugerido: z.string().optional(),
      duracionEstimada: z.number().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      checklist: z.any().optional(),
      etiquetas: z.string().optional(),
    })).mutation(({ input }) => db.createPlantilla({
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      area: input.area ?? null,
      empresa: input.empresa ?? null,
      responsableSugerido: input.responsableSugerido ?? null,
      duracionEstimada: input.duracionEstimada ?? null,
      prioridad: input.prioridad ?? "media",
      checklist: input.checklist ?? null,
      etiquetas: input.etiquetas ?? null,
    })),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      descripcion: z.string().optional(),
      area: z.string().optional(),
      empresa: z.string().optional(),
      responsableSugerido: z.string().optional(),
      duracionEstimada: z.number().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      checklist: z.any().optional(),
      etiquetas: z.string().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updatePlantilla(id, data); }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deletePlantilla(input.id)),
  }),

  // ─── Automatizaciones (v4) ───
  automatizaciones: router({
    list: publicProcedure.query(() => db.listAutomatizaciones()),
    create: publicProcedure.input(z.object({
      nombre: z.string().min(1),
      trigger: z.enum(["tarea_completada", "tarea_vencida", "tarea_asignada", "tarea_creada"]),
      accion: z.enum(["notificar_email", "cambiar_estado", "notificar_app", "asignar_responsable"]),
      condicion: z.string().optional(),
      parametros: z.string().optional(),
    })).mutation(({ input }) => db.createAutomatizacion({
      nombre: input.nombre,
      activa: true,
      trigger: input.trigger,
      accion: input.accion,
      condicion: input.condicion ?? null,
      parametros: input.parametros ?? null,
    })),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      activa: z.boolean().optional(),
      condicion: z.string().optional(),
      parametros: z.string().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updateAutomatizacion(id, data); }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteAutomatizacion(input.id)),
  }),

  // ─── Timer / Cronómetro (v4) ───
  timer: router({
    entries: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.listTiempoByTarea(input.tareaId)),
    running: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.getRunningTimer(input.tareaId)),
    start: publicProcedure.input(z.object({ tareaId: z.number() })).mutation(async ({ input }) => {
      // Stop any running timer first
      const running = await db.getRunningTimer(input.tareaId);
      if (running) {
        const dur = Math.round((Date.now() - Number(running.inicio)) / 60000);
        await db.updateTiempoRegistro(running.id, { fin: Date.now(), duracion: dur });
        await db.updateTarea(input.tareaId, { tiempoRegistrado: (await sumTiempo(input.tareaId)) + dur });
      }
      return db.createTiempoRegistro({
        tareaId: input.tareaId,
        inicio: Date.now(),
        fin: null,
        duracion: null,
        usuario: "Sistema",
      });
    }),
    stop: publicProcedure.input(z.object({ tareaId: z.number() })).mutation(async ({ input }) => {
      const running = await db.getRunningTimer(input.tareaId);
      if (!running) return { stopped: false };
      const dur = Math.round((Date.now() - Number(running.inicio)) / 60000);
      await db.updateTiempoRegistro(running.id, { fin: Date.now(), duracion: dur });
      const totalMin = (await sumTiempo(input.tareaId)) + dur;
      await db.updateTarea(input.tareaId, { tiempoRegistrado: totalMin });
      return { stopped: true, duracion: dur, total: totalMin };
    }),
  }),

  // ─── Archivos ───
  archivos: router({
    list: publicProcedure.query(() => db.listArchivos()),
    byReunion: publicProcedure.input(z.object({ reunionId: z.number() })).query(({ input }) => db.listArchivosByReunion(input.reunionId)),
    upload: publicProcedure.input(z.object({
      nombre: z.string(), contenido: z.string(), mimeType: z.string().optional(),
      reunion: z.string().optional(), area: z.string().optional(), reunionId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.contenido, "base64");
      const fileKey = `archivos/${nanoid()}-${input.nombre}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType ?? "application/pdf");
      return db.createArchivo({
        nombre: input.nombre, url, fileKey, mimeType: input.mimeType ?? "application/pdf",
        reunion: input.reunion ?? null, area: input.area ?? null, reunionId: input.reunionId ?? null, procesado: false,
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      reunionId: z.number().nullable().optional(),
      area: z.string().optional(),
      reunion: z.string().optional(),
      procesado: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateArchivo(id, data);
      // If linking to a reunion, update hasAyudaMemoria
      if (data.reunionId) {
        await db.updateReunion(data.reunionId, { hasAyudaMemoria: true });
      }
      return { success: true };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteArchivo(input.id)),
  }),

  // ─── Reuniones ───
  reuniones: router({
    list: publicProcedure.query(() => db.listReuniones()),
    initWeek: publicProcedure.input(z.object({ semana: z.string() })).mutation(async ({ input }) => {
      const QUINCENALES = [
        { dia: "Lunes", hora: "8:30-10:00", area: "Coordinadores", responsable: "Todos" },
        { dia: "Martes", hora: "8:30-10:00", area: "Marketing", responsable: "Daniel Henríquez" },
        { dia: "Martes", hora: "10:00-11:30", area: "Talento Humano", responsable: "Silvia Ruiz" },
        { dia: "Miércoles", hora: "8:30-10:00", area: "Compras", responsable: "Samuel Ávila" },
        { dia: "Miércoles", hora: "10:00-11:30", area: "Legal", responsable: "Ángel Aguirre" },
        { dia: "Jueves", hora: "8:30-10:00", area: "Servicios Generales", responsable: "Ramiro Castejón" },
        { dia: "Jueves", hora: "10:00-11:30", area: "Contabilidad y Finanzas", responsable: "Wilfredo / Jeffrin" },
        { dia: "Viernes", hora: "8:30-10:00", area: "Procesos y Mejora Continua", responsable: "Carlos Rosales" },
        { dia: "Viernes", hora: "10:00-11:30", area: "Programación y Tecnología", responsable: "Víctor Hernández" },
      ];
      await db.upsertReunionesForWeek(QUINCENALES.map(r => ({
        ...r, status: "pendiente" as const, hasAyudaMemoria: false, semana: input.semana, fecha: null,
      })));
      return { success: true };
    }),
    update: publicProcedure.input(z.object({
      id: z.number(), status: z.enum(["pendiente", "realizada", "cancelada"]).optional(),
      hasAyudaMemoria: z.boolean().optional(), notas: z.string().optional(),
    })).mutation(({ input }) => { const { id, ...data } = input; return db.updateReunion(id, data); }),
    historyByArea: publicProcedure.input(z.object({ area: z.string() })).query(({ input }) => db.listReunionesByArea(input.area)),
    areaExpediente: publicProcedure.input(z.object({ area: z.string() })).query(({ input }) => db.getAreaExpediente(input.area)),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteReunion(input.id)),
    deleteArchivo: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteArchivo(input.id)),
  }),

  // ─── Etiquetas ───
  etiquetas: router({
    list: publicProcedure.query(() => db.listEtiquetas()),
    create: publicProcedure.input(z.object({
      nombre: z.string().min(1), color: z.string().min(1), area: z.string().optional(),
    })).mutation(({ input }) => db.createEtiqueta({ nombre: input.nombre, color: input.color, area: input.area ?? null })),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteEtiqueta(input.id)),
  }),

  // ─── Correos ───
  correos: router({
    list: protectedProcedure.query(() => db.listCorreos()),
    send: protectedProcedure.input(z.object({
      destinatario: z.string(), nombreDestinatario: z.string().optional(),
      asunto: z.string(), tipo: z.enum(["tareas", "recordatorio", "resumen_semanal"]),
      tareasIds: z.string().optional(),
    })).mutation(({ input }) => db.createCorreo({
      ...input, nombreDestinatario: input.nombreDestinatario ?? null, tareasIds: input.tareasIds ?? null, enviado: true,
    })),
    sendToAllResponsables: protectedProcedure.input(z.object({
      tareaIds: z.array(z.number()).min(1), baseUrl: z.string(),
    })).mutation(async ({ input }) => {
      const allTareas = await db.getTareasByIds(input.tareaIds);
      const allResps = await db.listResponsables();
      const grouped: Record<string, typeof allTareas> = {};
      for (const t of allTareas) { if (!grouped[t.responsable]) grouped[t.responsable] = []; grouped[t.responsable].push(t); }
      const results: Array<{ responsable: string; email: string | null; tareas: number; sent: boolean }> = [];
      for (const [nombre, tasks] of Object.entries(grouped)) {
        const resp = allResps.find(r => r.nombre === nombre);
        const email = resp?.email ?? null;
        await db.createCorreo({
          destinatario: email ?? nombre, nombreDestinatario: nombre,
          asunto: `Tareas asignadas - ${tasks[0]?.area ?? "Grupo CAP"}`, tipo: "tareas",
          tareasIds: JSON.stringify(tasks.map(t => t.id)), enviado: !!email,
        });
        results.push({ responsable: nombre, email, tareas: tasks.length, sent: !!email });
      }
      return results;
    }),
  }),

  // ─── Notificaciones ───
  notificaciones: router({
    list: publicProcedure.query(() => db.listNotificaciones()),
    unreadCount: publicProcedure.query(() => db.countUnreadNotificaciones()),
    markRead: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.markNotificacionRead(input.id)),
    markAllRead: publicProcedure.mutation(() => db.markAllNotificacionesRead()),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteNotificacion(input.id)),
    deleteAll: publicProcedure.mutation(() => db.deleteAllNotificaciones()),
    create: publicProcedure.input(z.object({
      titulo: z.string(), mensaje: z.string(),
      tipo: z.enum(["tarea_vencida", "acuerdo_pendiente", "nueva_tarea", "recordatorio", "sistema", "asignacion", "comentario", "cambio_estado"]).optional(),
      tareaId: z.number().optional(), link: z.string().optional(),
      categoria: z.string().optional(),
    })).mutation(({ input }) => db.createNotificacion({
      titulo: input.titulo, mensaje: input.mensaje, tipo: input.tipo ?? "sistema",
      tareaId: input.tareaId ?? null, link: input.link ?? null, leida: false,
      categoria: input.categoria ?? null,
    })),
  }),

  // ─── Búsqueda Global ───
  search: router({
    global: protectedProcedure.input(z.object({ query: z.string().min(1) })).query(({ input }) => db.searchGlobal(input.query)),
  }),

  // ─── AI Processing ───
  ai: router({
    processTranscription: protectedProcedure.input(z.object({
      text: z.string().min(10), reunion: z.string().optional(), area: z.string().optional(),
    })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `Eres ARIA, asistente ejecutiva de Sindy Castro, Gerente General del Grupo CAP Honduras.
Extrae TODAS las tareas de la transcripción de reunión. Para cada tarea genera:
- nombre: título corto (máx 100 chars)
- tarea: descripción completa (máx 2 líneas)
- responsable: nombre o rol mencionado
- fecha: fecha de entrega en formato DD/MM/YYYY (si no se menciona, usa 2 semanas desde hoy)
- propuesta: array de 2-3 puntos accionables concretos
- area: departamento al que pertenece
Responde SOLO con un JSON array válido.` },
          { role: "user", content: `Transcripción de reunión${input.reunion ? ` (${input.reunion})` : ""}${input.area ? ` - Área: ${input.area}` : ""}:\n\n${input.text}` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tareas_extraidas", strict: true,
            schema: {
              type: "object",
              properties: {
                tareas: { type: "array", items: { type: "object", properties: {
                  nombre: { type: "string" }, tarea: { type: "string" }, responsable: { type: "string" },
                  fecha: { type: "string" }, propuesta: { type: "array", items: { type: "string" } }, area: { type: "string" },
                }, required: ["nombre", "tarea", "responsable", "fecha", "propuesta", "area"], additionalProperties: false } },
              }, required: ["tareas"], additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") throw new Error("No se pudo procesar la transcripción");
      return JSON.parse(content).tareas;
    }),

    processPdf: protectedProcedure.input(z.object({
      fileUrl: z.string(), reunion: z.string().optional(), area: z.string().optional(),
    })).mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: `Eres ARIA, asistente ejecutiva de Sindy Castro, Gerente General del Grupo CAP Honduras.
Extrae TODAS las tareas del documento PDF. Para cada tarea genera:
- nombre: título corto (máx 100 chars)
- tarea: descripción completa
- responsable: nombre o rol mencionado
- fecha: DD/MM/YYYY (si no se menciona, usa 2 semanas desde hoy)
- propuesta: array de 2-3 puntos accionables
- area: departamento
Responde SOLO con un JSON array válido.` },
          { role: "user", content: [
            { type: "file_url" as const, file_url: { url: input.fileUrl, mime_type: "application/pdf" as const } },
            { type: "text" as const, text: `Procesa este PDF${input.reunion ? ` de la reunión ${input.reunion}` : ""}${input.area ? ` del área ${input.area}` : ""} y extrae todas las tareas.` },
          ] },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "tareas_extraidas", strict: true,
            schema: {
              type: "object",
              properties: {
                tareas: { type: "array", items: { type: "object", properties: {
                  nombre: { type: "string" }, tarea: { type: "string" }, responsable: { type: "string" },
                  fecha: { type: "string" }, propuesta: { type: "array", items: { type: "string" } }, area: { type: "string" },
                }, required: ["nombre", "tarea", "responsable", "fecha", "propuesta", "area"], additionalProperties: false } },
              }, required: ["tareas"], additionalProperties: false,
            },
          },
        },
      });
      const content = response.choices[0]?.message?.content;
      if (!content || typeof content !== "string") throw new Error("No se pudo procesar el PDF");
      return JSON.parse(content).tareas;
    }),

    chat: protectedProcedure.input(z.object({
      message: z.string().min(1),
    })).mutation(async ({ input }) => {
      const summary = await db.getDashboardSummary();
      const areaStats = await db.getAreaStats();
      const respStats = await db.getResponsableStats();
      const recentTareas = await db.listTareas();
      const top20 = recentTareas.slice(0, 30);

      const context = `DATOS ACTUALES DEL TABLERO:
- Total tareas: ${summary?.total ?? 0}
- Completadas: ${summary?.completadas ?? 0} (${summary?.cumplimiento ?? 0}%)
- Pendientes: ${summary?.pendientes ?? 0}
- En progreso: ${summary?.enProgreso ?? 0}
- Vencidas: ${summary?.vencidas ?? 0}
- Acuerdos pendientes: ${summary?.acuerdosPendientes ?? 0}

STATS POR ÁREA:
${areaStats.map(a => `${a.area}: ${a.total} total, ${a.completadas} completadas, ${a.pendientes} pendientes, ${a.vencidas} vencidas`).join("\n")}

STATS POR RESPONSABLE:
${respStats.map(r => `${r.responsable}: ${r.total} total, ${r.completadas} completadas, ${r.pendientes} pendientes, ${r.vencidas} vencidas`).join("\n")}

TAREAS RECIENTES (últimas 30):
${top20.map(t => `[${t.status}] ${t.nombre || t.tarea} | ${t.responsable} | ${t.area} | ${t.fecha} | Avance: ${t.avance}%`).join("\n")}`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: `Eres ARIA, asistente ejecutiva inteligente de Sindy Castro, Gerente General del Grupo CAP Honduras. Tienes acceso a los datos del tablero de control de reuniones. Responde en español de forma concisa y profesional. Si te piden un resumen, genera uno ejecutivo. Si te preguntan datos específicos, responde con precisión basándote en los datos proporcionados. Usa formato markdown para mejor legibilidad.

${context}` },
          { role: "user", content: input.message },
        ],
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      return { response: content ?? "No pude generar una respuesta." };
    }),
  }),

  // ─── Resumen Ejecutivo ───
  resumen: router({
    generate: protectedProcedure.mutation(async () => {
      const allTareas = await db.listTareas();
      const areaStats = await db.getAreaStats();
      const respStats = await db.getResponsableStats();
      const now = Date.now();
      const total = allTareas.length;
      const completadas = allTareas.filter(t => t.status === "completada").length;
      const pendientes = allTareas.filter(t => t.status === "pendiente").length;
      const enProgreso = allTareas.filter(t => t.status === "en_progreso").length;
      const vencidas = allTareas.filter(t => t.fechaTs && t.fechaTs < now && t.status !== "completada").length;
      const cumplimiento = total > 0 ? Math.round((completadas / total) * 100) : 0;
      const topPendientes = [...respStats]
        .sort((a, b) => (Number(b.pendientes) || 0) - (Number(a.pendientes) || 0))
        .slice(0, 3)
        .map(r => ({ nombre: r.responsable, pendientes: Number(r.pendientes) || 0, total: Number(r.total) || 0 }));
      const areasCumplimiento = areaStats.map(a => ({
        area: a.area, total: Number(a.total) || 0, completadas: Number(a.completadas) || 0,
        pendientes: Number(a.pendientes) || 0,
        porcentaje: (Number(a.total) || 0) > 0 ? Math.round(((Number(a.completadas) || 0) / (Number(a.total) || 0)) * 100) : 0,
      }));
      return {
        fecha: new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        total, completadas, pendientes, enProgreso, vencidas, cumplimiento, topPendientes, areasCumplimiento,
      };
    }),
  }),

  // ─── Recordatorios automáticos ───
  recordatorios: router({
    check: protectedProcedure.mutation(async () => {
      const allTareas = await db.listTareas();
      const allResps = await db.listResponsables();
      const now = Date.now();
      const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
      const dueSoon = allTareas.filter(t => {
        if (t.status !== "pendiente") return false;
        if (!t.fechaTs) return false;
        const diff = Number(t.fechaTs) - now;
        return diff > 0 && diff <= twoDaysMs;
      });
      if (dueSoon.length === 0) return { sent: 0, details: [] };
      const grouped: Record<string, typeof dueSoon> = {};
      for (const t of dueSoon) { if (!grouped[t.responsable]) grouped[t.responsable] = []; grouped[t.responsable].push(t); }
      const details: { responsable: string; email: string | null; tareas: number; sent: boolean }[] = [];
      for (const [resp, tasks] of Object.entries(grouped)) {
        const respRecord = allResps.find(r => r.nombre === resp);
        const email = respRecord?.email ?? null;
        await db.createCorreo({
          destinatario: email ?? resp, nombreDestinatario: resp,
          asunto: `Recordatorio: ${tasks.length} tarea(s) próxima(s) a vencer`, tipo: "recordatorio",
          tareasIds: JSON.stringify(tasks.map(t => t.id)), enviado: !!email,
        });
        await db.createNotificacion({
          titulo: `Recordatorio para ${resp}`,
          mensaje: `${tasks.length} tarea(s) vencen en los próximos 2 días`,
          tipo: "recordatorio", tareaId: tasks[0]?.id ?? null, link: null, leida: false,
        });
        details.push({ responsable: resp, email, tareas: tasks.length, sent: !!email });
      }
      return { sent: details.filter(d => d.sent).length, details };
    }),
  }),

  // ─── KPIs avanzados ───
  kpis: router({
    dashboard: protectedProcedure.query(async () => {
      const summary = await db.getDashboardSummary();
      const areaStats = await db.getAreaStats();
      const respStats = await db.getResponsableStats();
      const weeklyTrend = await db.getWeeklyTrend();
      const empresaStats = await db.getEmpresaStats();
      const workload = await db.getWorkloadByResponsable();
      return { summary, areaStats, respStats, weeklyTrend, empresaStats, workload };
    }),
  }),

  // ─── Seed ───
  // ─── V5: Informes mensuales ───
  informes: router({
    list: publicProcedure.query(() => db.listInformes()),
    mensuales: publicProcedure.query(() => db.listInformesMensuales()),
    updateMensual: publicProcedure.input(z.object({
      informeId: z.number(),
      mes: z.number().min(1).max(12),
      estado: z.enum(["entregado", "retraso", "no_entregado", "pendiente"]),
      observacion: z.string().optional(),
      documentoUrl: z.string().optional(),
      documentoNombre: z.string().optional(),
    })).mutation(async ({ input }) => {
      return db.upsertInformeMensual(input);
    }),
    uploadDocumento: publicProcedure.input(z.object({
      informeId: z.number(),
      mes: z.number().min(1).max(12),
      base64: z.string(),
      filename: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.filename.split(".").pop() || "bin";
      const key = `informes/${input.informeId}/${input.mes}/${nanoid(8)}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await db.upsertInformeMensual({
        informeId: input.informeId,
        mes: input.mes,
        documentoUrl: url,
        documentoNombre: input.filename,
      });
      return { url, filename: input.filename };
    }),
    seed: publicProcedure.mutation(async () => {
      const existing = await db.listInformes();
      if (existing.length > 0) return { seeded: false, count: existing.length };
      const areas = [
        { numero: 1, departamento: "Gerencia Administrativa", responsable: "Sindy Sarahi Castro Rivera", cargo: "Gerente Administrativa", empresa: "CAP Honduras", categoria: "Gerencia" },
        { numero: 2, departamento: "Gerencia Operativa", responsable: "Marlon Alexander Pagoaga", cargo: "Gerente Operativo", empresa: "CAP Honduras", categoria: "Gerencia" },
        { numero: 3, departamento: "Contabilidad General", responsable: "Wilfredo Martinez Romero", cargo: "Contador General", empresa: "CAP Honduras", categoria: "Finanzas" },
        { numero: 4, departamento: "Talento Humano", responsable: "Silvia Xiomara Ruiz Espinal", cargo: "Coordinadora RRHH", empresa: "CAP Honduras", categoria: "RRHH" },
        { numero: 5, departamento: "Finanzas y Tesorería", responsable: "Jeffrin Roberto Castro Mendoza", cargo: "Tesorero", empresa: "CAP Honduras", categoria: "Finanzas" },
        { numero: 6, departamento: "Compras e Importaciones", responsable: "Samuel Antonio Avila Torres", cargo: "Jefe de Compras", empresa: "CAP Honduras", categoria: "Operaciones" },
        { numero: 7, departamento: "Legal", responsable: "Angel Humberto Aguirre Lagos", cargo: "Asesor Legal", empresa: "CAP Honduras", categoria: "Legal" },
        { numero: 8, departamento: "Tecnología y Desarrollo", responsable: "Víctor Leonardo Hernández Muñóz", cargo: "Jefe de TI", empresa: "CAP Honduras", categoria: "Tecnología" },
        { numero: 9, departamento: "Marketing y Desarrollo Digital", responsable: "Vacante", cargo: "Coordinador Marketing", empresa: "CAP Honduras", categoria: "Marketing" },
        { numero: 10, departamento: "Servicios Generales", responsable: "Edwin Ramiro Castejon Padilla", cargo: "Jefe Servicios Generales", empresa: "CAP Honduras", categoria: "Operaciones" },
        { numero: 11, departamento: "Cadena de Suministro B2B (Corp)", responsable: "Hector Adan Avelarez Rodriguez", cargo: "Jefe Cadena Suministro", empresa: "CAP Honduras", categoria: "Operaciones" },
        { numero: 12, departamento: "Cadena de Suministro B2C", responsable: "Edwin Gabriel Rodriguez", cargo: "Jefe Cadena Suministro", empresa: "Auto Repuestos Blessing", categoria: "Operaciones" },
        { numero: 13, departamento: "Administrativo Contable (Blessing)", responsable: "Ninfa Marlene Mendoza Enamorado", cargo: "Contadora", empresa: "Auto Repuestos Blessing", categoria: "Finanzas" },
        { numero: 14, departamento: "Tesorería y Finanzas (Blessing)", responsable: "Syljy Yoseny Caballero", cargo: "Tesorera", empresa: "Auto Repuestos Blessing", categoria: "Finanzas" },
        { numero: 15, departamento: "Operaciones Técnicas (DIDASA)", responsable: "Santos Edgardo Castro Lagos", cargo: "Jefe Operaciones", empresa: "Tecnicentro DIDASA", categoria: "Operaciones" },
        { numero: 16, departamento: "Cadena de Suministro (Mansiago)", responsable: "Alvaro Mauricio Bustillo Matute", cargo: "Jefe Cadena Suministro", empresa: "Distribuidora Mansiago", categoria: "Operaciones" },
        { numero: 17, departamento: "Cadena de Suministro (S&M)", responsable: "Erlin Steven Betancourth Barrientos", cargo: "Jefe Cadena Suministro", empresa: "Inversiones S&M", categoria: "Operaciones" },
      ];
      for (const a of areas) {
        await db.createInforme({ numero: a.numero, departamento: a.departamento, responsable: a.responsable, cargo: a.cargo, empresa: a.empresa, categoria: a.categoria, anio: 2026 });
      }
      return { seeded: true, count: areas.length };
    }),
  }),

  // ─── V5: Google Drive ───
  drive: router({
    list: protectedProcedure.query(() => db.listDriveArchivos()),
    sync: adminProcedure.mutation(async () => {
      // Real Google Drive sync using gws CLI
      const { execSync } = await import("child_process");
      const ROOT_FOLDER_ID = "1ZLGvT92wDZT_-Z5KSjsyJ9S3WtLnOChu";

      function listDriveFiles(folderId: string): any[] {
        try {
          const cmd = `gws drive files list --params '{"q": "'\\''${folderId}'\\'' in parents", "fields": "files(id,name,mimeType,size,createdTime,webViewLink,parents)", "pageSize": 200}' --format json`;
          const out = execSync(cmd, { encoding: "utf-8", timeout: 30000 });
          const parsed = JSON.parse(out);
          return parsed.files || [];
        } catch { return []; }
      }

      function extractArea(path: string): string {
        const parts = path.split("/");
        if (parts.length >= 3) return parts[parts.length - 2];
        if (parts.length >= 2) return parts[0];
        return "Sin clasificar";
      }

      async function syncFolder(folderId: string, parentPath = ""): Promise<any[]> {
        const files = listDriveFiles(folderId);
        const results: any[] = [];
        for (const file of files) {
          const isFolder = file.mimeType === "application/vnd.google-apps.folder";
          const currentPath = parentPath ? `${parentPath}/${file.name}` : file.name;
          if (isFolder) {
            if (currentPath.split("/").length <= 3) {
              const sub = await syncFolder(file.id, currentPath);
              results.push(...sub);
            }
          } else {
            results.push({
              driveId: file.id,
              nombre: file.name,
              mimeType: file.mimeType,
              tamano: file.size ? parseInt(file.size) : null,
              carpeta: currentPath.split("/").slice(0, -1).join("/") || parentPath || "Raíz",
              area: extractArea(currentPath),
              url: file.webViewLink,
            });
          }
        }
        return results;
      }

      try {
        const allFiles = await syncFolder(ROOT_FOLDER_ID);
        // Upsert each file into the database
        let synced = 0;
        for (const f of allFiles) {
          await db.upsertDriveArchivo({
            nombre: f.nombre,
            mimeType: f.mimeType,
            tamano: f.tamano,
            carpeta: f.carpeta,
            area: f.area,
            url: f.url,
            driveId: f.driveId,
          });
          synced++;
        }
        return { success: true, message: `Sincronización completada: ${synced} archivos sincronizados` };
      } catch (e: any) {
        return { success: false, message: `Error: ${e.message}` };
      }
    }),
  }),

  seed: router({
    status: protectedProcedure.query(async () => {
      const tasks = await db.listTareas();
      const resps = await db.listResponsables();
      const depts = await db.listDepartamentos();
      return { tasksCount: tasks.length, responsablesCount: resps.length, departamentosCount: depts.length };
    }),
  }),

  // ─── V5.1: Prompt Templates ───
  prompts: router({
    list: protectedProcedure.query(() => db.listPromptTemplates()),
    getDefault: protectedProcedure.query(() => db.getDefaultPromptTemplate()),
    create: adminProcedure.input(z.object({
      nombre: z.string().min(1),
      descripcion: z.string().optional(),
      prompt: z.string().min(1),
      isDefault: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      return db.createPromptTemplate(input);
    }),
    update: adminProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      descripcion: z.string().optional(),
      prompt: z.string().optional(),
      isDefault: z.boolean().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updatePromptTemplate(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePromptTemplate(input.id);
      return { success: true };
    }),
    seedDefault: adminProcedure.mutation(() => db.seedDefaultPromptTemplate()),
  }),

  // ─── V5.1: Borradores de tarea (IA) ───
  borradores: router({
    list: publicProcedure.input(z.object({ status: z.string().optional() }).optional()).query(({ input }) => {
      return db.listBorradores(input?.status);
    }),
    generate: publicProcedure.input(z.object({
      contenido: z.string().min(10),
      promptId: z.number().optional(),
      promptIdAM: z.number().optional(), // promptTemplatesAM id
      customPrompt: z.string().optional(),
      reunionId: z.number().optional(),
      archivoOrigenId: z.number().optional(),
      driveArchivoId: z.number().optional(),
    })).mutation(async ({ input }) => {
      // Get prompt — priority: customPrompt > promptIdAM > promptId > default AM > default legacy > hardcoded
      let promptText = input.customPrompt;

      // Try promptTemplatesAM (extraer_tareas type)
      if (!promptText && input.promptIdAM) {
        const templates = await db.listPromptTemplatesAM();
        const tmpl = templates.find(t => t.id === input.promptIdAM);
        if (tmpl) promptText = tmpl.prompt;
      }

      // Try legacy promptTemplates
      if (!promptText && input.promptId) {
        const templates = await db.listPromptTemplates();
        const tmpl = templates.find(t => t.id === input.promptId);
        if (tmpl) promptText = tmpl.prompt;
      }

      // Try default AM template for extraer_tareas
      if (!promptText) {
        const defAM = await db.getDefaultPromptTemplateAM("extraer_tareas");
        if (defAM) promptText = defAM.prompt;
      }

      // Try legacy default
      if (!promptText) {
        const def = await db.getDefaultPromptTemplate();
        if (def) promptText = def.prompt;
      }

      // Hardcoded fallback with structured output requirement
      if (!promptText) {
        promptText = `Eres ARIA, asistente ejecutiva del Grupo CAP Honduras. Analiza el siguiente documento y extrae TODAS las tareas, compromisos y acciones pendientes.

Para cada tarea devuelve un objeto JSON con estos campos exactos:
- nombre: título corto de la tarea (máx 100 chars)
- descripcion: descripción detallada
- responsable: nombre o rol del responsable
- area: departamento o área
- prioridad: "alta", "media" o "baja"
- fechaLimite: fecha en formato DD/MM/YYYY (si no se menciona, usa 2 semanas desde hoy)

Responde SOLO con un JSON array válido, sin texto adicional:
[{"nombre": "...", "descripcion": "...", "responsable": "...", "area": "...", "prioridad": "...", "fechaLimite": "..."}]`;
      }

      // Replace [CONTENIDO] placeholder if present in prompt
      const finalPrompt = promptText.includes("[CONTENIDO]")
        ? promptText.replace("[CONTENIDO]", input.contenido)
        : promptText;

      const response = await invokeLLM({
        messages: promptText.includes("[CONTENIDO]")
          ? [{ role: "user", content: finalPrompt }]
          : [
              { role: "system", content: finalPrompt },
              { role: "user", content: input.contenido },
            ],
      });

      const rawContent = response.choices?.[0]?.message?.content || "[]";
      const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
      // Parse JSON from response
      let tasks: any[] = [];
      try {
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) tasks = JSON.parse(jsonMatch[0]);
        else tasks = JSON.parse(content as string);
      } catch {
        return { success: false, error: "No se pudo parsear la respuesta de la IA", raw: content, borradores: [] };
      }

      // Create borradores with duplicate detection
      const borradores = [];
      for (const t of tasks) {
        const nombre = (t.nombre || t.title || "Sin nombre").substring(0, 200);
        const area = t.area || "General";
        // Check for duplicates
        const duplicate = await db.checkDuplicateTask(nombre, area);
        const b = await db.createBorrador({
          nombre,
          descripcion: t.descripcion || t.description || null,
          responsable: t.responsable || null,
          area,
          empresa: t.empresa || null,
          prioridad: ["alta", "media", "baja"].includes(t.prioridad) ? t.prioridad : "media",
          fechaLimite: t.fechaLimite || t.fecha_limite || null,
          status: "borrador",
          reunionId: input.reunionId ?? null,
          archivoOrigenId: input.archivoOrigenId ?? null,
          driveArchivoId: input.driveArchivoId ?? null,
          promptUsado: promptText,
        });
        borradores.push({ ...b, isDuplicate: !!duplicate, duplicateId: duplicate?.id ?? null, duplicateNombre: duplicate?.tarea ?? null });
      }

      return { success: true, borradores, count: borradores.length };
    }),
    approve: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      descripcion: z.string().optional(),
      responsable: z.string().optional(),
      area: z.string().optional(),
      empresa: z.string().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      fechaLimite: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...edits } = input;
      const borrador = await db.getBorradorById(id);
      if (!borrador) throw new Error("Borrador no encontrado");
      // Update borrador with any edits
      if (Object.keys(edits).length > 0) {
        await db.updateBorrador(id, edits);
      }
      // Mark as approved
      await db.updateBorrador(id, { status: "aprobado" });
      // Create actual task
      const finalBorrador = { ...borrador, ...edits };
      const tarea = await db.createTarea({
        tarea: finalBorrador.nombre,
        nombre: finalBorrador.nombre,
        descripcion: finalBorrador.descripcion || undefined,
        responsable: finalBorrador.responsable || "Sin asignar",
        area: finalBorrador.area || "General",
        empresa: finalBorrador.empresa || "CAP Honduras",
        prioridad: finalBorrador.prioridad || "media",
        status: "pendiente",
        fecha: finalBorrador.fechaLimite || new Date().toLocaleDateString("es-HN"),
        source: "ia",
      });
      // Log activity
      await logActivity({
        tareaId: tarea.id,
        accion: "creada",
        detalle: "Tarea creada desde borrador IA aprobado",
        usuario: "Sindy (CEO)",
      });
      return { success: true, tarea };
    }),
    reject: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateBorrador(input.id, { status: "rechazado" });
      return { success: true };
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      descripcion: z.string().optional(),
      responsable: z.string().optional(),
      area: z.string().optional(),
      empresa: z.string().optional(),
      prioridad: z.enum(["alta", "media", "baja"]).optional(),
      fechaLimite: z.string().optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateBorrador(id, data);
      return { success: true };
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteBorrador(input.id);
      return { success: true };
    }),
  }),

  // ─── Teams Webhook ───
  teams: router({
    notify: publicProcedure.input(z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      tareaId: z.number().optional(),
      webhookUrl: z.string().url().optional(),
    })).mutation(async ({ input }) => {
      const url = input.webhookUrl || process.env.TEAMS_WEBHOOK_URL;
      if (!url) return { success: false, error: "No se ha configurado la URL del webhook de Teams. Configúrala en Settings > Secrets." };
      try {
        const card = {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          themeColor: "C0392B",
          summary: input.title,
          sections: [{
            activityTitle: `ARIA Dashboard: ${input.title}`,
            activitySubtitle: "Grupo CAP Honduras",
            activityImage: "https://cdn-icons-png.flaticon.com/512/906/906334.png",
            facts: [
              { name: "Mensaje", value: input.message },
              ...(input.tareaId ? [{ name: "Tarea ID", value: `#${input.tareaId}` }] : []),
              { name: "Fecha", value: new Date().toLocaleDateString("es-HN", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) },
            ],
            markdown: true,
          }],
        };
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(card),
        });
        return { success: resp.ok, status: resp.status };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }),
  }),

  // ─── Outlook Calendar ───
  calendar: router({
    events: protectedProcedure.input(z.object({
      timeMin: z.string().optional(),
      timeMax: z.string().optional(),
      query: z.string().optional(),
      maxResults: z.number().optional(),
    })).query(async ({ input }) => {
      const { execSync } = await import("child_process");
      const now = new Date();
      const timeMin = input.timeMin || now.toISOString();
      const timeMax = input.timeMax || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const mcpInput: Record<string, any> = {
        time_min: timeMin,
        time_max: timeMax,
        max_results: input.maxResults ?? 100,
      };
      if (input.query) mcpInput.q = input.query;
      try {
        const cmd = `manus-mcp-cli tool call outlook_calendar_search_events --server outlook-calendar --input '${JSON.stringify(mcpInput).replace(/'/g, "'\\''")}' 2>/dev/null`;
        const stdout = execSync(cmd, { timeout: 30000, encoding: "utf-8" });
        const match = stdout.match(/mcp_result_[a-f0-9]+\.json/);
        if (!match) return { events: [], error: "No result file" };
        const fs = await import("fs");
        const resultPath = `/tmp/manus-mcp/${match[0]}`;
        const raw = JSON.parse(fs.readFileSync(resultPath, "utf-8"));
        const events = (raw.events || []).map((e: any) => ({
          id: e.id,
          subject: e.subject || "(Sin título)",
          start: e.start?.dateTime || "",
          end: e.end?.dateTime || "",
          location: e.location?.displayName || "",
          isAllDay: e.isAllDay || false,
          organizer: e.organizer?.emailAddress?.name || "",
          organizerEmail: e.organizer?.emailAddress?.address || "",
          attendees: (e.attendees || []).map((a: any) => ({
            name: a.emailAddress?.name || "",
            email: a.emailAddress?.address || "",
          })),
          description: e.bodyPreview || "",
          webLink: e.webLink || "",
          isOnlineMeeting: e.isOnlineMeeting || false,
          isCancelled: e.isCancelled || false,
        }));
        return { events, error: null };
      } catch (err: any) {
        return { events: [], error: err.message || "Error fetching calendar" };
      }
    }),
    importAsReunion: protectedProcedure.input(z.object({
      subject: z.string(),
      start: z.string(),
      end: z.string(),
      location: z.string().optional(),
      attendees: z.array(z.object({ name: z.string(), email: z.string() })).optional(),
      description: z.string().optional(),
      eventId: z.string().optional(),
    })).mutation(async ({ input }) => {
      const startDate = new Date(input.start);
      const dia = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][startDate.getUTCDay()];
      const hora = `${startDate.getUTCHours().toString().padStart(2, "0")}:${startDate.getUTCMinutes().toString().padStart(2, "0")}`;
      const endDate = new Date(input.end);
      const horaFin = `${endDate.getUTCHours().toString().padStart(2, "0")}:${endDate.getUTCMinutes().toString().padStart(2, "0")}`;
      const fecha = `${startDate.getUTCDate().toString().padStart(2, "0")}/${(startDate.getUTCMonth() + 1).toString().padStart(2, "0")}/${startDate.getUTCFullYear()}`;
      // Use unique semana based on actual ISO week
      const getISOWeek = (d: Date) => {
        const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
      };
      const semana = `${startDate.getUTCFullYear()}-S${getISOWeek(startDate).toString().padStart(2, "0")}`;
      const attendeeNames = (input.attendees || []).map(a => a.name).filter(Boolean).join(", ");
      // Create unique area name using subject + date to avoid overwriting
      const uniqueArea = `${input.subject} (${fecha})`;
      await db.createReunionDirect({
        area: uniqueArea,
        dia,
        hora: `${hora}-${horaFin}`,
        responsable: attendeeNames || "Sin asignar",
        status: "pendiente",
        hasAyudaMemoria: false,
        semana,
        fecha,
        notas: [input.description, input.location ? `Ubicación: ${input.location}` : ""].filter(Boolean).join("\n"),
      });
      return { success: true };
    }),
  }),

  // ─── V5.3: Outlook Mail ───
  outlookMail: router({
    search: protectedProcedure.input(z.object({
      query: z.string().optional(),
      maxResults: z.number().optional(),
    }).optional()).query(async ({ input }) => {
      const { execSync } = await import("child_process");
      const mcpInput: Record<string, any> = { max_results: input?.maxResults ?? 50 };
      if (input?.query) mcpInput.search = input.query;
      try {
        const cmd = `manus-mcp-cli tool call outlook_search_messages --server outlook-mail --input '${JSON.stringify(mcpInput).replace(/'/g, "'\\''")}'  2>/dev/null`;
        const stdout = execSync(cmd, { timeout: 30000, encoding: "utf-8" });
        const match = stdout.match(/mcp_result_[a-f0-9]+\.json/);
        if (!match) return { messages: [], error: "No result file" };
        const fs = await import("fs");
        const raw = JSON.parse(fs.readFileSync(`/tmp/manus-mcp/${match[0]}`, "utf-8"));
        const messages = (raw.messages || []).map((m: any) => ({
          id: m.id,
          subject: m.subject || "(Sin asunto)",
          from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || "",
          fromEmail: m.from?.emailAddress?.address || "",
          to: (m.toRecipients || []).map((r: any) => ({ name: r.emailAddress?.name || "", email: r.emailAddress?.address || "" })),
          cc: (m.ccRecipients || []).map((r: any) => ({ name: r.emailAddress?.name || "", email: r.emailAddress?.address || "" })),
          date: m.receivedDateTime || m.sentDateTime || "",
          bodyPreview: m.bodyPreview || "",
          bodyHtml: m.body?.content || "",
          isRead: m.isRead ?? true,
          hasAttachments: m.hasAttachments || false,
          importance: m.importance || "normal",
          webLink: m.webLink || "",
        }));
        return { messages, error: null };
      } catch (err: any) {
        return { messages: [], error: err.message || "Error fetching emails" };
      }
    }),
    read: protectedProcedure.input(z.object({
      messageIds: z.array(z.string()).min(1),
    })).query(async ({ input }) => {
      const { execSync } = await import("child_process");
      try {
        const mcpInput = { message_ids: input.messageIds };
        const cmd = `manus-mcp-cli tool call outlook_read_messages --server outlook-mail --input '${JSON.stringify(mcpInput).replace(/'/g, "'\\''")}'  2>/dev/null`;
        const stdout = execSync(cmd, { timeout: 30000, encoding: "utf-8" });
        const match = stdout.match(/mcp_result_[a-f0-9]+\.json/);
        if (!match) return { messages: [], error: "No result file" };
        const fs = await import("fs");
        const raw = JSON.parse(fs.readFileSync(`/tmp/manus-mcp/${match[0]}`, "utf-8"));
        const messages = (raw.messages || []).map((m: any) => ({
          id: m.id,
          subject: m.subject || "(Sin asunto)",
          from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || "",
          fromEmail: m.from?.emailAddress?.address || "",
          to: (m.toRecipients || []).map((r: any) => ({ name: r.emailAddress?.name || "", email: r.emailAddress?.address || "" })),
          cc: (m.ccRecipients || []).map((r: any) => ({ name: r.emailAddress?.name || "", email: r.emailAddress?.address || "" })),
          date: m.receivedDateTime || m.sentDateTime || "",
          bodyPreview: m.bodyPreview || "",
          bodyHtml: m.body?.content || "",
          isRead: m.isRead ?? true,
          hasAttachments: m.hasAttachments || false,
          importance: m.importance || "normal",
          webLink: m.webLink || "",
        }));
        return { messages, error: null };
      } catch (err: any) {
        return { messages: [], error: err.message };
      }
    }),
    send: protectedProcedure.input(z.object({
      to: z.array(z.string()).min(1),
      cc: z.array(z.string()).optional(),
      subject: z.string().min(1),
      content: z.string().min(1),
    })).mutation(async ({ input }) => {
      const { execSync } = await import("child_process");
      try {
        const mcpInput = {
          messages: [{
            to: input.to,
            cc: input.cc || [],
            subject: input.subject,
            content: input.content,
          }],
        };
        const cmd = `manus-mcp-cli tool call outlook_send_messages --server outlook-mail --input '${JSON.stringify(mcpInput).replace(/'/g, "'\\''")}'  2>/dev/null`;
        execSync(cmd, { timeout: 30000, encoding: "utf-8" });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),
    reply: protectedProcedure.input(z.object({
      to: z.array(z.string()).min(1),
      cc: z.array(z.string()).optional(),
      subject: z.string().min(1),
      content: z.string().min(1),
    })).mutation(async ({ input }) => {
      const { execSync } = await import("child_process");
      try {
        const mcpInput = {
          messages: [{
            to: input.to,
            cc: input.cc || [],
            subject: input.subject,
            content: input.content,
          }],
        };
        const cmd = `manus-mcp-cli tool call outlook_send_messages --server outlook-mail --input '${JSON.stringify(mcpInput).replace(/'/g, "'\\''")}'  2>/dev/null`;
        execSync(cmd, { timeout: 30000, encoding: "utf-8" });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }),
  }),

  // ─── V5.3: Brief Pre-Reunión ───
  // ─── V5.8: Brief Pre-Reunión (guardado en DB, no email) ───
  brief: router({
    // List briefs for a specific reunion
    list: protectedProcedure.input(z.object({ reunionId: z.number() })).query(({ input }) => {
      return db.listBriefsByReunion(input.reunionId);
    }),
    // Generate and save a brief for a reunion (manual trigger)
    generate: protectedProcedure.input(z.object({
      reunionId: z.number(),
    })).mutation(async ({ input }) => {
      const { generateAndSaveBrief } = await import("./briefScheduler");
      return generateAndSaveBrief(input.reunionId, "manual");
    }),
    // Delete a brief
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteBrief(input.id);
      return { success: true };
    }),
    // Legacy config endpoints
    config: protectedProcedure.query(() => db.getConfigBrief()),
    updateConfig: adminProcedure.input(z.object({
      activo: z.boolean().optional(),
      emailDestinatario: z.string().optional(),
      minutosAnticipacion: z.number().optional(),
    })).mutation(async ({ input }) => {
      return db.updateConfigBrief(input);
    }),
    reunionesWithStatus: protectedProcedure.query(() => db.listReunionesWithBriefStatus()),
  }),

  // ─── File Text Extraction ───
  files: router({
    extractText: protectedProcedure.input(z.object({
      base64: z.string(),
      filename: z.string(),
      mimeType: z.string().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.filename.split(".").pop()?.toLowerCase() ?? "";
      let text = "";
      try {
        if (ext === "pdf" || input.mimeType === "application/pdf") {
          const pdfParse = (await import("pdf-parse")) as any;
          const fn = pdfParse.default ?? pdfParse;
          const result = await fn(buffer);
          text = result.text;
        } else if (ext === "docx" || input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        } else if (ext === "doc") {
          const mammoth = await import("mammoth");
          try {
            const result = await mammoth.extractRawText({ buffer });
            text = result.value;
          } catch {
            text = "[No se pudo extraer texto de archivo .doc. Intente convertir a .docx o .pdf]";
          }
        } else if (ext === "txt" || input.mimeType?.startsWith("text/")) {
          text = buffer.toString("utf-8");
        } else {
          text = "[Formato no soportado para extracción de texto. Use PDF, Word (.docx) o texto (.txt)]";
        }
      } catch (e: any) {
        text = `[Error al extraer texto: ${e.message}]`;
      }
      return { text: text.trim(), filename: input.filename, charCount: text.trim().length };
    }),

    uploadAndExtract: protectedProcedure.input(z.object({
      base64: z.string(),
      filename: z.string(),
      mimeType: z.string().optional(),
      reunion: z.string().optional(),
      area: z.string().optional(),
      reunionId: z.number().optional(),
    })).mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      // Upload to S3
      const fileKey = `archivos/${nanoid()}-${input.filename}`;
      const { url } = await storagePut(fileKey, buffer, input.mimeType ?? "application/octet-stream");
      // Extract text
      const ext = input.filename.split(".").pop()?.toLowerCase() ?? "";
      let text = "";
      try {
        if (ext === "pdf" || input.mimeType === "application/pdf") {
          const pdfParse2 = (await import("pdf-parse")) as any;
          const fn2 = pdfParse2.default ?? pdfParse2;
          const result = await fn2(buffer);
          text = result.text;
        } else if (ext === "docx" || input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ buffer });
          text = result.value;
        } else if (ext === "txt" || input.mimeType?.startsWith("text/")) {
          text = buffer.toString("utf-8");
        }
      } catch { /* extraction failed, continue without text */ }
      // Save to DB
      const archivo = await db.createArchivo({
        nombre: input.filename, url, fileKey, mimeType: input.mimeType ?? "application/octet-stream",
        reunion: input.reunion ?? null, area: input.area ?? null, reunionId: input.reunionId ?? null, procesado: false,
        contenido: text || null,
      });
      // Update hasAyudaMemoria flag on the reunion
      if (input.reunionId) {
        await db.updateReunion(input.reunionId, { hasAyudaMemoria: true });
      }
      return { ...archivo, extractedText: text.trim(), charCount: text.trim().length };
    }),
  }),

  // ─── Organización (v5.4) ───
  organizacion: router({
    list: protectedProcedure.query(() => db.listOrganizacion()),
    seed: adminProcedure.mutation(async () => {
      const ORG_DATA = [
        // E8 — Directors
        { nombre: "Sindy Sarahi Castro Rivera", cargo: "Gerente Administrativo", escala: "E8", nivel: "Director Ejecutivo", empresa: "CAP Honduras", departamento: "Gerencia Administrativa", equipo: 0, esVacante: false, reportaA: null, orden: 1 },
        { nombre: "Marlon Alexander Pagoaga", cargo: "Gerente Operativo", escala: "E8", nivel: "Director Ejecutivo", empresa: "CAP Honduras", departamento: "Gerencia Operativa", equipo: 0, esVacante: false, reportaA: null, orden: 2 },
        // E6 — Jefes
        { nombre: "Wilfredo Martinez Romero", cargo: "Jefe de Contabilidad", escala: "E6", nivel: "Jefe", empresa: "CAP Honduras", departamento: "Contabilidad General", equipo: 4, esVacante: false, reportaA: null, orden: 10 },
        { nombre: "Silvia Xiomara Ruiz Espinal", cargo: "Jefe de Talento Humano", escala: "E6", nivel: "Jefe", empresa: "CAP Honduras", departamento: "Talento Humano", equipo: 1, esVacante: false, reportaA: null, orden: 11 },
        { nombre: "Santos Edgardo Castro Lagos", cargo: "Jefe de Taller Técnico", escala: "E6", nivel: "Jefe", empresa: "Tecnicentro DIDASA", departamento: "Operaciones Técnicas", equipo: 12, esVacante: false, reportaA: null, orden: 12 },
        // E5 — Coordinadores Sr.
        { nombre: "Edwin Gabriel Rodriguez", cargo: "Coordinador Operativo de Tienda", escala: "E5", nivel: "Coordinador Sr.", empresa: "Auto Repuestos Blessing", departamento: "Cadena de Suministro B2C", equipo: 20, esVacante: false, reportaA: null, orden: 20 },
        { nombre: "Hector Adan Avelarez Rodriguez", cargo: "Coordinador de Cadenas de Suministros", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Cadena de Suministro B2B", equipo: 0, esVacante: false, reportaA: null, orden: 21 },
        { nombre: "Samuel Antonio Avila Torres", cargo: "Coordinador de Compras e Importaciones", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Compras e Importaciones", equipo: 5, esVacante: false, reportaA: null, orden: 22 },
        { nombre: "Jeffrin Roberto Castro Mendoza", cargo: "Coordinador de Finanzas y Tesorería", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Finanzas y Tesorería", equipo: 4, esVacante: false, reportaA: null, orden: 23 },
        { nombre: "Jesica Elizabeth Cárcamo Paredes", cargo: "Coordinadora de Gerencia Administrativa", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Gerencia Administrativa", equipo: 2, esVacante: false, reportaA: null, orden: 24 },
        { nombre: "Angel Humberto Aguirre Lagos", cargo: "Jefe de Legal", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Legal", equipo: 0, esVacante: false, reportaA: null, orden: 25 },
        { nombre: "Edwin Ramiro Castejon Padilla", cargo: "Coordinador de Servicios Generales", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Servicios Generales", equipo: 9, esVacante: false, reportaA: null, orden: 26 },
        { nombre: "Víctor Leonardo Hernández Muñóz", cargo: "Coordinador de Desarrollo Tecnológico IT", escala: "E5", nivel: "Coordinador Sr.", empresa: "CAP Honduras", departamento: "Tecnología y Desarrollo", equipo: 3, esVacante: false, reportaA: null, orden: 27 },
        // E4 — Coordinadores/Supervisores
        { nombre: "Ninfa Marlene Mendoza Enamorado", cargo: "Supervisora Administrativa Contable", escala: "E4", nivel: "Coordinador", empresa: "Auto Repuestos Blessing", departamento: "Administración Contable", equipo: 0, esVacante: false, reportaA: null, orden: 30 },
        { nombre: "Syljy Yoseny Caballero", cargo: "Gestor de Tesorería y Bancos", escala: "E4", nivel: "Coordinador", empresa: "Auto Repuestos Blessing", departamento: "Tesorería y Bancos", equipo: 0, esVacante: false, reportaA: null, orden: 31 },
        { nombre: "Wilber Joan Lopez Lopez", cargo: "Gestor de Compras", escala: "E4", nivel: "Coordinador", empresa: "CAP Honduras", departamento: "Compras", equipo: 0, esVacante: false, reportaA: null, orden: 32 },
        { nombre: "VACANTE", cargo: "Coordinador de Marketing Digital", escala: "E4", nivel: "Coordinador", empresa: "CAP Honduras", departamento: "Marketing Digital", equipo: 0, esVacante: true, reportaA: null, orden: 33 },
        { nombre: "Kevin Antonio Reyes Izaguirre", cargo: "Gestor de Soporte Técnico y Activos Fijos", escala: "E4", nivel: "Coordinador", empresa: "CAP Honduras", departamento: "Soporte Técnico", equipo: 7, esVacante: false, reportaA: null, orden: 34 },
        { nombre: "Roger Enrique Juanes", cargo: "Supervisor de Obra", escala: "E4", nivel: "Coordinador", empresa: "CAP Honduras", departamento: "Obras", equipo: 7, esVacante: false, reportaA: null, orden: 35 },
        { nombre: "Alvaro Mauricio Bustillo Matute", cargo: "Encargado de Cadenas de Suministros", escala: "E4", nivel: "Coordinador", empresa: "Distribuidora Mansiago", departamento: "Cadena de Suministros", equipo: 4, esVacante: false, reportaA: null, orden: 36 },
        { nombre: "Erlin Steven Betancourth Barrientos", cargo: "Encargado de Cadenas de Suministros", escala: "E4", nivel: "Coordinador", empresa: "Inversiones S&M", departamento: "Cadena de Suministros", equipo: 13, esVacante: false, reportaA: null, orden: 37 },
        { nombre: "VACANTE", cargo: "Supervisor Técnico de Pista", escala: "E4", nivel: "Coordinador", empresa: "Tecnicentro DIDASA", departamento: "Operaciones Técnicas", equipo: 11, esVacante: true, reportaA: null, orden: 38 },
        { nombre: "Carlos Augusto Enríquez Moncada", cargo: "Encargado de Cadena y Suministros", escala: "E4", nivel: "Coordinador", empresa: "JAPAN HN", departamento: "Cadena de Suministros", equipo: 0, esVacante: false, reportaA: null, orden: 39 },
      ];
      await db.seedOrganizacion(ORG_DATA as any);
      return { success: true, count: ORG_DATA.length };
    }),
  }),

  // ─── Acuerdos (v5.4) ───
  acuerdos: router({
    list: publicProcedure.query(() => db.listAcuerdos()),
    byReunion: publicProcedure.input(z.object({ reunionId: z.number() })).query(({ input }) => db.listAcuerdosByReunion(input.reunionId)),
    pendingByArea: publicProcedure.input(z.object({ area: z.string() })).query(({ input }) => db.getPendingAcuerdosByArea(input.area)),
    create: publicProcedure.input(z.object({
      reunionId: z.number(),
      descripcion: z.string().min(1),
      responsable: z.string().optional(),
      responsableId: z.number().optional(),
      fechaLimite: z.string().optional(),
      status: z.enum(["pendiente", "en_seguimiento", "cumplido"]).optional(),
    })).mutation(({ input }) => db.createAcuerdo({
      reunionId: input.reunionId,
      descripcion: input.descripcion,
      responsable: input.responsable ?? null,
      responsableId: input.responsableId ?? null,
      fechaLimite: input.fechaLimite ?? null,
      status: input.status ?? "pendiente",
    })),
    update: publicProcedure.input(z.object({
      id: z.number(),
      descripcion: z.string().optional(),
      responsable: z.string().optional(),
      responsableId: z.number().nullable().optional(),
      fechaLimite: z.string().nullable().optional(),
      status: z.enum(["pendiente", "en_seguimiento", "cumplido"]).optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updateAcuerdo(id, data);
    }),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteAcuerdo(input.id)),
  }),

  // ─── Prompt Templates AM (v5.4) ───
  promptTemplatesAM: router({
    list: protectedProcedure.query(() => db.listPromptTemplatesAM()),
    getDefault: protectedProcedure.input(z.object({ tipo: z.enum(["ayuda_memoria", "extraer_tareas"]) })).query(({ input }) => db.getDefaultPromptTemplateAM(input.tipo)),
    create: adminProcedure.input(z.object({
      nombre: z.string().min(1),
      tipo: z.enum(["ayuda_memoria", "extraer_tareas"]),
      descripcion: z.string().optional(),
      prompt: z.string().min(1),
      isDefault: z.boolean().optional(),
    })).mutation(({ input }) => db.createPromptTemplateAM({
      nombre: input.nombre,
      tipo: input.tipo,
      descripcion: input.descripcion ?? null,
      prompt: input.prompt,
      isDefault: input.isDefault ?? false,
    })),
    update: adminProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      descripcion: z.string().optional(),
      prompt: z.string().optional(),
      isDefault: z.boolean().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      return db.updatePromptTemplateAM(id, data);
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deletePromptTemplateAM(input.id)),
    seedDefaults: adminProcedure.mutation(async () => {
      const existing = await db.listPromptTemplatesAM();
      if (existing.length > 0) return { success: true, message: "Ya existen plantillas" };
      await db.createPromptTemplateAM({
        nombre: "Generar Ayuda Memoria (CAP)",
        tipo: "ayuda_memoria",
        descripcion: "Plantilla estándar del Grupo CAP para convertir transcripciones en actas estructuradas",
        prompt: `Eres un asistente ejecutivo del Grupo CAP Honduras. A partir de la siguiente transcripción o notas de reunión, genera una Ayuda Memoria estructurada y profesional con estas secciones:\n\n1. DATOS DE LA REUNIÓN: Fecha, participantes identificados, tipo de reunión\n2. RESUMEN EJECUTIVO: Párrafo de 3-5 líneas con los puntos principales\n3. TEMAS TRATADOS: Lista numerada de temas discutidos\n4. DECISIONES TOMADAS: Lista de decisiones concretas\n5. ACUERDOS Y COMPROMISOS: Tabla con: Acuerdo | Responsable | Fecha Límite\n6. TAREAS ASIGNADAS: Tabla con: Tarea | Responsable | Prioridad | Fecha Límite\n7. PRÓXIMOS PASOS: Lista de acciones inmediatas\n\nTranscripción/Notas:\n[CONTENIDO]`,
        isDefault: true,
      });
      await db.createPromptTemplateAM({
        nombre: "Extraer Tareas (CAP)",
        tipo: "extraer_tareas",
        descripcion: "Plantilla para extraer tareas accionables de documentos de reunión",
        prompt: `Eres un asistente ejecutivo del Grupo CAP Honduras. Analiza el siguiente documento de reunión y extrae TODAS las tareas, compromisos y acciones pendientes. Para cada tarea identifica:\n\n- Nombre de la tarea (acción concreta)\n- Responsable (quién debe ejecutarla)\n- Prioridad (Alta/Media/Baja)\n- Fecha límite (si se menciona)\n- Descripción breve\n\nDevuelve las tareas en formato JSON array:\n[{"nombre": "...", "responsable": "...", "prioridad": "...", "fechaLimite": "...", "descripcion": "..."}]\n\nDocumento:\n[CONTENIDO]`,
        isDefault: true,
      });
      return { success: true, message: "Plantillas por defecto creadas" };
    }),
    generateAyudaMemoria: protectedProcedure.input(z.object({
      contenido: z.string().min(1),
      reunionId: z.number().optional(),
      promptTemplateId: z.number().optional(),
    })).mutation(async ({ input }) => {
      let prompt = "";
      if (input.promptTemplateId) {
        const templates = await db.listPromptTemplatesAM();
        const t = templates.find(t => t.id === input.promptTemplateId);
        if (t) prompt = t.prompt;
      }
      if (!prompt) {
        const defaultT = await db.getDefaultPromptTemplateAM("ayuda_memoria");
        prompt = defaultT?.prompt ?? "Genera una ayuda memoria estructurada a partir del siguiente contenido:\n\n[CONTENIDO]";
      }
      const finalPrompt = prompt.replace("[CONTENIDO]", input.contenido);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres un asistente ejecutivo profesional del Grupo CAP Honduras. Genera documentos estructurados y profesionales." },
          { role: "user", content: finalPrompt },
        ],
      });
      const ayudaMemoria = String(response.choices?.[0]?.message?.content ?? "Error al generar ayuda memoria");
      // If reunionId provided, save as archivo
      if (input.reunionId) {
        const reunion = await db.getReunionById(input.reunionId);
        await db.createArchivo({
          nombre: `Ayuda Memoria - ${reunion?.area ?? "Reunión"} - ${new Date().toLocaleDateString("es-HN")}`,
          url: "",
          fileKey: `ayuda-memoria-${nanoid()}`,
          mimeType: "text/markdown",
          reunion: reunion?.area ?? null,
          area: reunion?.area ?? null,
          reunionId: input.reunionId,
          procesado: true,
          contenido: ayudaMemoria,
        });
        // Mark reunion as having ayuda memoria
        await db.updateReunion(input.reunionId, { hasAyudaMemoria: true });
      }
      return { ayudaMemoria };
    }),
  }),

  // ─── Reunion Detail (v5.4) ───
  reunionDetail: router({
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const reunion = await db.getReunionById(input.id);
      if (!reunion) return null;
      const [archivosData, tareasData, acuerdosData, borradoresData] = await Promise.all([
        db.getArchivosByReunionId(input.id),
        db.getTareasByReunionId(input.id),
        db.listAcuerdosByReunion(input.id),
        db.getBorradoresByReunionId(input.id),
      ]);
      return { reunion, archivos: archivosData, tareas: tareasData, acuerdos: acuerdosData, borradores: borradoresData };
    }),
  }),

  // ─── V5.5: Task Sections (Asana-like) ───
  taskSections: router({
    list: publicProcedure.query(() => db.listTaskSections()),
    create: publicProcedure.input(z.object({ nombre: z.string().min(1), orden: z.number().optional(), color: z.string().optional() }))
      .mutation(({ input }) => db.createTaskSection({ nombre: input.nombre, orden: input.orden ?? 0, color: input.color ?? null })),
    update: publicProcedure.input(z.object({ id: z.number(), nombre: z.string().optional(), orden: z.number().optional(), color: z.string().optional() }))
      .mutation(({ input }) => db.updateTaskSection(input.id, { nombre: input.nombre, orden: input.orden, color: input.color })),
    delete: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.deleteTaskSection(input.id)),
  }),

  // ─── V5.5: Task Followers ───
  taskFollowers: router({
    byTarea: publicProcedure.input(z.object({ tareaId: z.number() })).query(({ input }) => db.listFollowersByTarea(input.tareaId)),
    add: publicProcedure.input(z.object({ tareaId: z.number(), responsableId: z.number(), nombre: z.string() }))
      .mutation(({ input }) => db.addFollower(input)),
    remove: publicProcedure.input(z.object({ id: z.number() })).mutation(({ input }) => db.removeFollower(input.id)),
  }),

  // ─── V5.5: System Config ───
  systemSettings: router({
    getAll: adminProcedure.query(async () => {
      const configs = await db.getAllSystemConfig();
      const map: Record<string, string> = {};
      configs.forEach(c => { map[c.key] = c.value ?? ""; });
      return map;
    }),
    get: adminProcedure.input(z.object({ key: z.string() })).query(({ input }) => db.getSystemConfig(input.key)),
    set: adminProcedure.input(z.object({ key: z.string(), value: z.string() }))
      .mutation(({ input }) => db.setSystemConfig(input.key, input.value)),
    setBatch: adminProcedure.input(z.array(z.object({ key: z.string(), value: z.string() })))
      .mutation(async ({ input }) => {
        for (const item of input) {
          await db.setSystemConfig(item.key, item.value);
        }
        return { success: true };
      }),
  }),

  // ─── V5.5: Telegram Bot Config ───
  telegram: router({
    testConnection: adminProcedure.input(z.object({ token: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const resp = await fetch(`https://api.telegram.org/bot${input.token}/getMe`);
          const data = await resp.json() as any;
          if (data.ok) {
            await db.setSystemConfig("telegram_bot_token", input.token);
            return { success: true, botName: data.result?.username ?? "unknown" };
          }
          return { success: false, error: "Token inválido" };
        } catch {
          return { success: false, error: "Error de conexión" };
        }
      }),
  }),

  // ─── V5.5: Teams Integration ───
  teamsConfig: router({
    testWebhook: adminProcedure.input(z.object({ webhookUrl: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const resp = await fetch(input.webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "@type": "MessageCard",
              summary: "ARIA Test",
              themeColor: "C0392B",
              title: "ARIA — Prueba de Conexión",
              text: "Conexión exitosa con Microsoft Teams desde ARIA - Grupo CAP Honduras.",
            }),
          });
          if (resp.ok) {
            await db.setSystemConfig("teams_webhook_url", input.webhookUrl);
            return { success: true };
          }
          return { success: false, error: `HTTP ${resp.status}` };
        } catch {
          return { success: false, error: "Error de conexión" };
        }
      }),
    notify: adminProcedure.input(z.object({ title: z.string(), text: z.string() }))
      .mutation(async ({ input }) => {
        const webhookUrl = await db.getSystemConfig("teams_webhook_url");
        if (!webhookUrl) return { success: false, error: "Webhook no configurado" };
        try {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "@type": "MessageCard",
              summary: input.title,
              themeColor: "C0392B",
              title: input.title,
              text: input.text,
            }),
          });
          return { success: true };
        } catch {
          return { success: false, error: "Error al enviar" };
        }
      }),
  }),

  // ─── V5.5: Reuniones historial por área ───
  reunionesHistorial: router({
    byArea: publicProcedure.input(z.object({ area: z.string(), limit: z.number().optional(), offset: z.number().optional() }))
      .query(({ input }) => db.listReunionesHistorialByArea(input.area, input.limit ?? 50, input.offset ?? 0)),
  }),

  // ─── V5.5: Enhanced Activity ───
  actividadEnhanced: router({
    filtered: publicProcedure.input(z.object({
      usuario: z.string().optional(),
      tipo: z.string().optional(),
      modulo: z.string().optional(),
      desde: z.number().optional(),
      hasta: z.number().optional(),
      limit: z.number().optional(),
    })).query(({ input }) => db.listActividadFiltered(input)),
  }),

  // ─── V5.5: Enhanced Workload ───
  workloadEnhanced: router({
    get: publicProcedure.query(() => db.getWorkloadEnhanced()),
  }),

  // ─── V5.5: Notification deadlines ───
  notificacionesDeadline: router({
    check: publicProcedure.mutation(async () => {
      const proximas = await db.getTareasProximasAVencer(24);
      let created = 0;
      for (const t of proximas) {
        await db.createNotificacion({
          tipo: "tarea_vencida",
          titulo: "Tarea próxima a vencer",
          mensaje: `La tarea "${t.nombre || t.tarea}" vence mañana (${t.fecha})`,
          tareaId: t.id,
          leida: false,
        });
        created++;
      }
      return { checked: proximas.length, notificationsCreated: created };
    }),
  }),
});

async function sumTiempo(tareaId: number): Promise<number> {
  const entries = await db.listTiempoByTarea(tareaId);
  return entries.reduce((sum, e) => sum + (e.duracion ?? 0), 0);
}

function parseDateToTs(fecha: string): number | null {
  if (!fecha) return null;
  const parts = fecha.split("/");
  if (parts.length !== 3) return null;
  const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
  return d.getTime();
}

export type AppRouter = typeof appRouter;
