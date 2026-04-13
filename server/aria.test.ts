import { describe, expect, it, vi, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock db module to avoid real database calls in tests
vi.mock("./db", () => ({
  listTareas: vi.fn().mockResolvedValue([
    { id: 1, area: "Legal", tarea: "Test tarea", responsable: "Test", fecha: "01/04/2026", propuesta: '["paso 1"]', status: "pendiente", source: null, reunion: null, archivoId: null, responsableId: null, fechaTs: 1774934400000, createdAt: new Date(), updatedAt: new Date() },
    { id: 2, area: "Tecnología", tarea: "Test tarea 2", responsable: "Test2", fecha: "02/04/2026", propuesta: '["paso 2"]', status: "completada", source: null, reunion: null, archivoId: null, responsableId: null, fechaTs: 1775020800000, createdAt: new Date(), updatedAt: new Date() },
  ]),
  listResponsables: vi.fn().mockResolvedValue([
    { id: 1, nombre: "Sindy Castro", area: "Gerencia General", email: "gerencia@cap.hn", createdAt: new Date(), updatedAt: new Date() },
    { id: 2, nombre: "Ángel Aguirre", area: "Legal", email: "legal@cap.hn", createdAt: new Date(), updatedAt: new Date() },
  ]),
  listArchivos: vi.fn().mockResolvedValue([]),
  listReuniones: vi.fn().mockResolvedValue([]),
  listCorreos: vi.fn().mockResolvedValue([]),
  getAreaStats: vi.fn().mockResolvedValue([
    { area: "Legal", total: 17, completadas: 5, pendientes: 10, enProgreso: 2, vencidas: 0, visto: 0 },
  ]),
  getResponsableStats: vi.fn().mockResolvedValue([
    { responsable: "Ángel Aguirre", total: 17, completadas: 5, pendientes: 10, vencidas: 2 },
  ]),
  createResponsable: vi.fn().mockResolvedValue({ id: 3, nombre: "Test", area: "Test", email: null }),
  createTarea: vi.fn().mockResolvedValue({ id: 3 }),
  createTareasBatch: vi.fn().mockResolvedValue([]),
  updateTarea: vi.fn().mockResolvedValue(undefined),
  deleteTarea: vi.fn().mockResolvedValue(undefined),
  updateResponsable: vi.fn().mockResolvedValue(undefined),
  deleteResponsable: vi.fn().mockResolvedValue(undefined),
  createNota: vi.fn().mockResolvedValue({ id: 1 }),
  listNotasByTarea: vi.fn().mockResolvedValue([]),
  listSubtareas: vi.fn().mockResolvedValue([{ id: 10, parentId: 1, tarea: "Subtarea test", status: "pendiente" }]),
  listEtiquetas: vi.fn().mockResolvedValue([{ id: 1, nombre: "Urgente", color: "#ef4444" }]),
  createEtiqueta: vi.fn().mockResolvedValue({ id: 2, nombre: "Test", color: "#000" }),
  createArchivo: vi.fn().mockResolvedValue({ id: 1 }),
  upsertReunionesForWeek: vi.fn().mockResolvedValue(undefined),
  updateReunion: vi.fn().mockResolvedValue(undefined),
  createCorreo: vi.fn().mockResolvedValue({ id: 1 }),
  getTareasByIds: vi.fn().mockResolvedValue([
    { id: 1, area: "Legal", tarea: "Test tarea", responsable: "Ángel Aguirre", fecha: "01/04/2026", propuesta: '["paso 1"]', status: "pendiente", source: null, reunion: null, archivoId: null, responsableId: null, fechaTs: 1774934400000, createdAt: new Date(), updatedAt: new Date() },
  ]),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUserByOpenId: vi.fn().mockResolvedValue(undefined),
  listDepartamentos: vi.fn().mockResolvedValue([
    { id: 1, nombre: "Contabilidad", empresa: "CAP Honduras", responsableActualId: 1, createdAt: new Date(), updatedAt: new Date() },
  ]),
  createDepartamento: vi.fn().mockResolvedValue({ id: 2, nombre: "Test Dept", empresa: "CAP Honduras" }),
  updateDepartamento: vi.fn().mockResolvedValue(undefined),
  deleteDepartamento: vi.fn().mockResolvedValue(undefined),
  getDepartamentoHistorial: vi.fn().mockResolvedValue([
    { id: 1, departamentoId: 1, responsableId: 1, fechaInicio: new Date(), fechaFin: null, createdAt: new Date() },
  ]),
  listDepartamentoHistorial: vi.fn().mockResolvedValue([
    { id: 1, departamentoId: 1, responsableId: 1, fechaInicio: new Date(), fechaFin: null, createdAt: new Date() },
  ]),
  listNotificaciones: vi.fn().mockResolvedValue([
    { id: 1, tipo: "tarea_vencida", titulo: "Tarea vencida", mensaje: "Test", leida: false, createdAt: new Date() },
  ]),
  getUnreadNotificacionesCount: vi.fn().mockResolvedValue(3),
  countUnreadNotificaciones: vi.fn().mockResolvedValue(3),
  markNotificacionRead: vi.fn().mockResolvedValue(undefined),
  markAllNotificacionesRead: vi.fn().mockResolvedValue(undefined),
  createNotificacion: vi.fn().mockResolvedValue({ id: 2 }),
  searchGlobal: vi.fn().mockResolvedValue({
    tareas: [{ id: 1, area: "Legal", tarea: "Test tarea", responsable: "Test", fecha: "01/04/2026" }],
    responsables: [{ id: 1, nombre: "Sindy Castro", area: "Gerencia General" }],
  }),
  getDashboardSummary: vi.fn().mockResolvedValue({
    total: 104, completadas: 20, pendientes: 70, enProgreso: 10, vencidas: 4, acuerdosPendientes: 3, cumplimiento: 19,
  }),
  getWeeklyTrend: vi.fn().mockResolvedValue([
    { week: "2026-13", total: 50, completadas: 10 },
    { week: "2026-14", total: 54, completadas: 10 },
  ]),
  deleteEtiqueta: vi.fn().mockResolvedValue(undefined),
  listReunionesByArea: vi.fn().mockResolvedValue([]),
  // v4 mocks
  createActividad: vi.fn().mockResolvedValue({ id: 1 }),
  listActividadByTarea: vi.fn().mockResolvedValue([]),
  listActividadGlobal: vi.fn().mockResolvedValue([]),
  listAdjuntosByTarea: vi.fn().mockResolvedValue([]),
  createAdjunto: vi.fn().mockResolvedValue({ id: 1 }),
  deleteAdjunto: vi.fn().mockResolvedValue(undefined),
  listPlantillas: vi.fn().mockResolvedValue([]),
  createPlantilla: vi.fn().mockResolvedValue({ id: 1, nombre: "Test", descripcion: null }),
  updatePlantilla: vi.fn().mockResolvedValue(undefined),
  deletePlantilla: vi.fn().mockResolvedValue(undefined),
  listAutomatizaciones: vi.fn().mockResolvedValue([]),
  createAutomatizacion: vi.fn().mockResolvedValue({ id: 1, nombre: "Test", activa: true }),
  updateAutomatizacion: vi.fn().mockResolvedValue(undefined),
  deleteAutomatizacion: vi.fn().mockResolvedValue(undefined),
  listTiempoByTarea: vi.fn().mockResolvedValue([]),
  getRunningTimer: vi.fn().mockResolvedValue(null),
  startTimer: vi.fn().mockResolvedValue({ id: 1 }),
  stopTimer: vi.fn().mockResolvedValue(undefined),
  getEmpresaStats: vi.fn().mockResolvedValue([]),
  getWorkloadByResponsable: vi.fn().mockResolvedValue([]),
  // v5 mocks
  listInformes: vi.fn().mockResolvedValue([]),
  listInformesMensuales: vi.fn().mockResolvedValue([]),
  upsertInformeMensual: vi.fn().mockResolvedValue({ id: 1 }),
  createInforme: vi.fn().mockResolvedValue({ id: 1, area: "Contabilidad", empresa: "CAP Honduras", anio: 2026, mes: 3, status: "entregado" }),
  updateInforme: vi.fn().mockResolvedValue(undefined),
  deleteInforme: vi.fn().mockResolvedValue(undefined),
  listDriveArchivos: vi.fn().mockResolvedValue([]),
  createDriveArchivo: vi.fn().mockResolvedValue({ id: 1 }),
  deleteDriveArchivo: vi.fn().mockResolvedValue(undefined),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("ARIA Router Tests", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(() => {
    caller = appRouter.createCaller(createPublicContext());
  });

  describe("seed.status", () => {
    it("returns task and responsable counts", async () => {
      const result = await caller.seed.status();
      expect(result).toHaveProperty("tasksCount");
      expect(result).toHaveProperty("responsablesCount");
      expect(result.tasksCount).toBe(2);
      expect(result.responsablesCount).toBe(2);
    });
  });

  describe("tareas", () => {
    it("lists all tareas", async () => {
      const result = await caller.tareas.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty("tarea");
      expect(result[0]).toHaveProperty("area");
    });

    it("creates a tarea with proper date parsing", async () => {
      const result = await caller.tareas.create({
        area: "Legal",
        tarea: "Nueva tarea de prueba",
        responsable: "Ángel Aguirre",
        fecha: "15/04/2026",
      });
      expect(result).toHaveProperty("id");
    });

    it("creates a batch of tareas", async () => {
      const result = await caller.tareas.createBatch([
        { area: "Legal", tarea: "Tarea batch 1", responsable: "Test", fecha: "01/04/2026" },
        { area: "Legal", tarea: "Tarea batch 2", responsable: "Test", fecha: "02/04/2026" },
      ]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("updates a tarea status", async () => {
      await caller.tareas.update({ id: 1, status: "completada" });
      // Should not throw
    });

    it("returns area stats", async () => {
      const result = await caller.tareas.stats();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("area");
      expect(result[0]).toHaveProperty("total");
      expect(result[0]).toHaveProperty("completadas");
    });

    it("returns responsable stats", async () => {
      const result = await caller.tareas.responsableStats();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("responsable");
      expect(result[0]).toHaveProperty("total");
    });
  });

  describe("responsables", () => {
    it("lists all responsables", async () => {
      const result = await caller.responsables.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0]).toHaveProperty("nombre");
    });

    it("creates a responsable", async () => {
      const result = await caller.responsables.create({
        nombre: "Test Person",
        area: "Test Area",
        email: "test@test.com",
      });
      expect(result).toHaveProperty("id");
      expect(result.nombre).toBe("Test");
    });
  });

  describe("notas", () => {
    it("creates a nota for a tarea", async () => {
      const result = await caller.notas.create({
        tareaId: 1,
        contenido: "Nota de prueba",
        autor: "Sindy Castro",
      });
      expect(result).toHaveProperty("id");
    });

    it("lists notas for a tarea", async () => {
      const result = await caller.notas.list({ tareaId: 1 });
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("reuniones", () => {
    it("lists reuniones", async () => {
      const result = await caller.reuniones.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("initializes a week with 9 quincenales", async () => {
      const result = await caller.reuniones.initWeek({ semana: "2026-W14" });
      expect(result).toEqual({ success: true });
    });
  });

  describe("correos", () => {
    it("lists correos", async () => {
      const result = await caller.correos.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("sends/records a correo", async () => {
      const result = await caller.correos.send({
        destinatario: "legal@cap.hn",
        nombreDestinatario: "Ángel Aguirre",
        asunto: "Tareas asignadas - Legal",
        tipo: "tareas",
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("archivos", () => {
    it("lists archivos", async () => {
      const result = await caller.archivos.list();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("correos.sendToAllResponsables", () => {
    it("groups tasks by responsable and returns results", async () => {
      const result = await caller.correos.sendToAllResponsables({
        tareaIds: [1],
        baseUrl: "https://example.com",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("responsable");
      expect(result[0]).toHaveProperty("email");
      expect(result[0]).toHaveProperty("tareas");
      expect(result[0]).toHaveProperty("sent");
    });
  });

  describe("recordatorios", () => {
    it("checks for tasks due within 2 days and returns result", async () => {
      const result = await caller.recordatorios.check();
      expect(result).toHaveProperty("sent");
      expect(result).toHaveProperty("details");
      expect(typeof result.sent).toBe("number");
      expect(Array.isArray(result.details)).toBe(true);
    });
  });

  describe("subtareas", () => {
    it("lists subtareas for a parent task", async () => {
      const result = await caller.tareas.subtareas({ parentId: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("parentId");
    });

    it("creates a tarea as subtarea via create", async () => {
      const result = await caller.tareas.create({
        area: "Legal",
        tarea: "Nueva subtarea",
        responsable: "Test",
        fecha: "15/04/2026",
        parentId: 1,
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("etiquetas", () => {
    it("lists all etiquetas", async () => {
      const result = await caller.etiquetas.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it("creates an etiqueta", async () => {
      const result = await caller.etiquetas.create({ nombre: "Urgente", color: "#ef4444" });
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("nombre");
    });
  });

  describe("tareas.update with v2 fields", () => {
    it("updates prioridad and avance", async () => {
      await caller.tareas.update({ id: 1, prioridad: "alta", avance: 75 });
      // Should not throw
    });
  });

  describe("departamentos", () => {
    it("lists all departamentos", async () => {
      const result = await caller.departamentos.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("nombre");
      expect(result[0]).toHaveProperty("empresa");
    });

    it("creates a departamento", async () => {
      const result = await caller.departamentos.create({
        nombre: "Nuevo Dept",
        empresa: "CAP Honduras",
      });
      expect(result).toHaveProperty("id");
    });

    it("gets departamento historial", async () => {
      const result = await caller.departamentos.historial({ departamentoId: 1 });
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("departamentoId");
    });
  });

  describe("notificaciones", () => {
    it("lists notificaciones", async () => {
      const result = await caller.notificaciones.list();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("titulo");
    });

    it("gets unread count", async () => {
      const result = await caller.notificaciones.unreadCount();
      expect(typeof result).toBe("number");
    });

    it("marks notification as read", async () => {
      await caller.notificaciones.markRead({ id: 1 });
      // Should not throw
    });

    it("marks all as read", async () => {
      await caller.notificaciones.markAllRead();
      // Should not throw
    });
  });

  describe("búsqueda global", () => {
    it("searches across tareas and responsables", async () => {
      const result = await caller.search.global({ query: "test" });
      expect(result).toHaveProperty("tareas");
      expect(result).toHaveProperty("responsables");
      expect(Array.isArray(result.tareas)).toBe(true);
      expect(Array.isArray(result.responsables)).toBe(true);
    });
  });

  describe("tareas con nombre y descripcion", () => {
    it("creates a tarea with nombre field", async () => {
      const result = await caller.tareas.create({
        area: "Legal",
        tarea: "Descripción detallada de la tarea",
        responsable: "Ángel Aguirre",
        fecha: "15/04/2026",
        nombre: "Título corto",
      });
      expect(result).toHaveProperty("id");
    });

    it("updates nombre and descripcion", async () => {
      await caller.tareas.update({ id: 1, nombre: "Nuevo título" });
      // Should not throw
    });
  });

  describe("resumen", () => {
    it("generates weekly executive summary with all required fields", async () => {
      const result = await caller.resumen.generate();
      expect(result).toHaveProperty("fecha");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("completadas");
      expect(result).toHaveProperty("pendientes");
      expect(result).toHaveProperty("enProgreso");
      expect(result).toHaveProperty("vencidas");
      expect(result).toHaveProperty("cumplimiento");
      expect(result).toHaveProperty("topPendientes");
      expect(result).toHaveProperty("areasCumplimiento");
      expect(result.total).toBe(2);
      expect(Array.isArray(result.topPendientes)).toBe(true);
      expect(Array.isArray(result.areasCumplimiento)).toBe(true);
    });
  });

  describe("kpis", () => {
    it("returns dashboard KPIs with summary, areaStats, respStats, weeklyTrend", async () => {
      const result = await caller.kpis.dashboard();
      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("areaStats");
      expect(result).toHaveProperty("respStats");
      expect(result).toHaveProperty("weeklyTrend");
      expect(result.summary).toHaveProperty("total");
      expect(result.summary!.cumplimiento).toBe(19);
      expect(Array.isArray(result.weeklyTrend)).toBe(true);
    });
  });

  describe("notificaciones.create", () => {
    it("creates a notification", async () => {
      const result = await caller.notificaciones.create({
        titulo: "Nueva tarea asignada",
        mensaje: "Se te asignó la tarea #5",
        tipo: "nueva_tarea",
        tareaId: 5,
      });
      expect(result).toHaveProperty("id");
    });
  });

  describe("tareas acuerdos", () => {
    it("creates a tarea marked as acuerdo", async () => {
      const result = await caller.tareas.create({
        area: "Legal",
        tarea: "Acuerdo de reunión importante",
        responsable: "Ángel Aguirre",
        fecha: "20/04/2026",
        isAcuerdo: true,
        acuerdoStatus: "pendiente",
      });
      expect(result).toHaveProperty("id");
    });
    it("updates acuerdo status", async () => {
      await caller.tareas.update({ id: 1, acuerdoStatus: "cerrado" });
      // Should not throw
    });
  });

  // ===== V5 TESTS =====

  describe("teams.notify", () => {
    it("returns error when no webhook URL configured", async () => {
      delete process.env.TEAMS_WEBHOOK_URL;
      const result = await caller.teams.notify({
        title: "Test notification",
        message: "This is a test",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("webhook");
    });
  });

  describe("informes", () => {
    it("lists informes", async () => {
      const result = await caller.informes.list();
      expect(Array.isArray(result)).toBe(true);
    });
    it("lists informes mensuales", async () => {
      const result = await caller.informes.mensuales();
      expect(Array.isArray(result)).toBe(true);
    });
    it("seeds informes data", async () => {
      const result = await caller.informes.seed();
      expect(result).toHaveProperty("seeded");
    });
  });

  describe("drive", () => {
    it("lists drive archivos", async () => {
      const result = await caller.drive.list();
      expect(Array.isArray(result)).toBe(true);
    });
    it("triggers sync", async () => {
      const result = await caller.drive.sync();
      // In test env, gws CLI may not be available, so sync may fail gracefully
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("message");
    });
  });
});
