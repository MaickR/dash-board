/**
 * v5.7 Feature Tests — Delete with Confirmation
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

const ctx = {
  user: {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    role: "admin" as const,
    avatarUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

describe("v5.7 — Delete Reunion Procedures", () => {
  it("reuniones router has delete procedure", () => {
    const router = appRouter._def.procedures;
    expect(router["reuniones.delete"]).toBeDefined();
  });

  it("reuniones router has deleteArchivo procedure", () => {
    const router = appRouter._def.procedures;
    expect(router["reuniones.deleteArchivo"]).toBeDefined();
  });

  it("reuniones.list returns array", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.reuniones.list();
    expect(Array.isArray(list)).toBe(true);
  });

  it("reuniones.historyByArea returns array for a given area", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.reuniones.historyByArea({ area: "Coordinadores" });
    expect(Array.isArray(list)).toBe(true);
  });
});

describe("v5.7 — Delete Notificacion Procedures", () => {
  it("notificaciones router has delete procedure", () => {
    const router = appRouter._def.procedures;
    expect(router["notificaciones.delete"]).toBeDefined();
  });

  it("notificaciones router has deleteAll procedure", () => {
    const router = appRouter._def.procedures;
    expect(router["notificaciones.deleteAll"]).toBeDefined();
  });

  it("creates and deletes a notificacion", async () => {
    const caller = appRouter.createCaller(ctx);
    await caller.notificaciones.create({
      titulo: "Test v5.7 Delete",
      mensaje: "Notification for delete test",
      tipo: "sistema",
    });
    const before = await caller.notificaciones.list();
    const testNotif = (before as any[]).find((n: any) => n.titulo === "Test v5.7 Delete");
    expect(testNotif).toBeDefined();
    if (testNotif) {
      await caller.notificaciones.delete({ id: testNotif.id });
      const after = await caller.notificaciones.list();
      const found = (after as any[]).find((n: any) => n.id === testNotif.id);
      expect(found).toBeUndefined();
    }
  });

  it("deleteAll removes all notifications", async () => {
    const caller = appRouter.createCaller(ctx);
    await caller.notificaciones.create({ titulo: "Bulk1", mensaje: "T", tipo: "sistema" });
    await caller.notificaciones.create({ titulo: "Bulk2", mensaje: "T", tipo: "sistema" });
    await caller.notificaciones.deleteAll();
    const after = await caller.notificaciones.list();
    expect((after as any[]).length).toBe(0);
  });
});

describe("v5.7 — Delete Subtarea Procedure", () => {
  it("tareas router has deleteSubtarea procedure", () => {
    const router = appRouter._def.procedures;
    expect(router["tareas.deleteSubtarea"]).toBeDefined();
  });

  it("creates and deletes a subtarea", async () => {
    const caller = appRouter.createCaller(ctx);
    const tareas = await caller.tareas.list({});
    if ((tareas as any[]).length === 0) return;
    const tarea = (tareas as any[])[0];
    await caller.tareas.createSubtarea({
      parentId: tarea.id,
      tarea: "Subtarea v5.7 delete test",
      responsable: "Test",
      fecha: "31/12/2026",
      area: tarea.area ?? "Test",
    });
    const subtareas = await caller.tareas.subtareas({ parentId: tarea.id });
    const testSub = (subtareas as any[]).find((s: any) => s.tarea === "Subtarea v5.7 delete test");
    expect(testSub).toBeDefined();
    if (testSub) {
      await caller.tareas.deleteSubtarea({ id: testSub.id });
      const after = await caller.tareas.subtareas({ parentId: tarea.id });
      const found = (after as any[]).find((s: any) => s.id === testSub.id);
      expect(found).toBeUndefined();
    }
  });
});

describe("v5.7 — DeleteConfirmModal Component", () => {
  it("DeleteConfirmModal component file exists", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "client/src/components/DeleteConfirmModal.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("DeleteConfirmModal has required props", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "client/src/components/DeleteConfirmModal.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain("open");
    expect(content).toContain("onClose");
    expect(content).toContain("onConfirm");
    expect(content).toContain("recordName");
    expect(content).toContain("isLoading");
  });
});

describe("v5.7 — Delete in All Frontend Modules", () => {
  const modulesWithDelete = [
    { file: "client/src/pages/TareasPage.tsx", module: "Tareas" },
    { file: "client/src/pages/KanbanPage.tsx", module: "Kanban" },
    { file: "client/src/pages/ReunionesPage.tsx", module: "Reuniones" },
    { file: "client/src/pages/AutomatizacionesPage.tsx", module: "Automatizaciones" },
    { file: "client/src/pages/PlantillasPage.tsx", module: "Plantillas" },
    { file: "client/src/pages/PlantillasPromptPage.tsx", module: "PlantillasPrompt" },
    { file: "client/src/pages/InformesPage.tsx", module: "Informes" },
    { file: "client/src/components/NotificationsDropdown.tsx", module: "Notificaciones" },
    { file: "client/src/components/TaskDrawer.tsx", module: "TaskDrawer" },
    { file: "client/src/pages/ReunionDetailPage.tsx", module: "ReunionDetail" },
  ];

  modulesWithDelete.forEach(({ file, module }) => {
    it(`${module} uses DeleteConfirmModal`, async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("DeleteConfirmModal");
    });

    it(`${module} has Trash2 icon`, async () => {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), file);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain("Trash2");
    });
  });
});
