/**
 * v5.8 Feature Tests — Brief Pre-Reunión (DB-backed, no email)
 * Tests cover: briefs table CRUD, generate endpoint, delete endpoint, scheduler logic
 */
import { describe, it, expect, beforeAll } from "vitest";
import * as db from "./db";

// ─── Brief DB Helper Tests ───────────────────────────────────────────────────

describe("v5.8 — Brief DB Helpers", () => {
  let testReunionId: number;
  let createdBriefId: number;

  beforeAll(async () => {
    // Create a test reunion to attach briefs to
    const reuniones = await db.listReuniones();
    if (reuniones.length > 0) {
      testReunionId = reuniones[0].id;
    } else {
      // Create a minimal reunion
      const result = await db.createReunionDirect({
        area: "Test Area v5.8",
        fecha: new Date().toISOString().split("T")[0],
        hora: "09:00",
        semana: "2026-W01",
        status: "pendiente",
      });
      testReunionId = result.id;
    }
  });

  it("should create a brief record in the database", async () => {
    const brief = await db.createBrief({
      reunionId: testReunionId,
      contenido: "# Brief de Prueba v5.8\n\n## Tareas Pendientes\n- Tarea de prueba\n\n## KPIs\n- Cumplimiento: 75%",
      tipo: "manual",
    });
    expect(brief).toBeDefined();
    expect(brief.id).toBeGreaterThan(0);
    expect(brief.reunionId).toBe(testReunionId);
    expect(brief.tipo).toBe("manual");
    expect(brief.contenido).toContain("Brief de Prueba v5.8");
    createdBriefId = brief.id;
  });

  it("should list briefs for a specific reunion", async () => {
    const briefs = await db.listBriefsByReunion(testReunionId);
    expect(Array.isArray(briefs)).toBe(true);
    const found = briefs.find((b: any) => b.id === createdBriefId);
    expect(found).toBeDefined();
    expect(found?.tipo).toBe("manual");
  });

  it("should return an empty array for a reunion with no briefs", async () => {
    const briefs = await db.listBriefsByReunion(999999);
    expect(Array.isArray(briefs)).toBe(true);
    expect(briefs.length).toBe(0);
  });

  it("should delete a brief by id", async () => {
    await db.deleteBrief(createdBriefId);
    const briefs = await db.listBriefsByReunion(testReunionId);
    const found = briefs.find((b: any) => b.id === createdBriefId);
    expect(found).toBeUndefined();
  });

  it("should create a brief with tipo=auto", async () => {
    const brief = await db.createBrief({
      reunionId: testReunionId,
      contenido: "Brief automático generado por el scheduler",
      tipo: "auto",
    });
    expect(brief).toBeDefined();
    expect(brief.tipo).toBe("auto");
    // Cleanup
    await db.deleteBrief(brief.id);
  });
});

// ─── Brief Router (tRPC) Tests ────────────────────────────────────────────────

describe("v5.8 — Brief tRPC Router", () => {
  it("should have brief.list procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief).toBeDefined();
    expect(appRouter.brief.list).toBeDefined();
  });

  it("should have brief.generate procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief.generate).toBeDefined();
  });

  it("should have brief.delete procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief.delete).toBeDefined();
  });

  it("should have brief.config procedure (legacy)", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief.config).toBeDefined();
  });

  it("should have brief.updateConfig procedure (legacy)", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief.updateConfig).toBeDefined();
  });

  it("should have brief.reunionesWithStatus procedure", async () => {
    const { appRouter } = await import("./routers");
    expect(appRouter.brief.reunionesWithStatus).toBeDefined();
  });
});

// ─── Brief Scheduler Tests ────────────────────────────────────────────────────

describe("v5.8 — Brief Scheduler", () => {
  it("should export checkAndGenerateBriefs function", async () => {
    const scheduler = await import("./briefScheduler");
    expect(typeof scheduler.checkAndGenerateBriefs).toBe("function");
  });

  it("should export generateAndSaveBrief function", async () => {
    const scheduler = await import("./briefScheduler");
    expect(typeof scheduler.generateAndSaveBrief).toBe("function");
  });

  it("should export checkAndSendBriefs as alias for backward compatibility", async () => {
    const scheduler = await import("./briefScheduler");
    // The server/index.ts still imports checkAndSendBriefs for the cron job
    expect(typeof scheduler.checkAndSendBriefs).toBe("function");
  });

  it("should run checkAndGenerateBriefs without throwing", async () => {
    const { checkAndGenerateBriefs } = await import("./briefScheduler");
    // Should not throw even if no meetings are due
    await expect(checkAndGenerateBriefs()).resolves.not.toThrow();
  });
});

// ─── Brief Config Tests ───────────────────────────────────────────────────────

describe("v5.8 — Brief Config", () => {
  it("should get brief config with default values", async () => {
    const config = await db.getConfigBrief();
    expect(config).toBeDefined();
    // MySQL boolean may return 0/1 or true/false
    expect(config.activo === true || config.activo === false || config.activo === 1 || config.activo === 0).toBe(true);
    expect(typeof config.minutosAnticipacion).toBe("number");
    expect(config.minutosAnticipacion).toBeGreaterThan(0);
  });

  it("should update brief config minutosAnticipacion", async () => {
    const original = await db.getConfigBrief();
    const newMinutos = original.minutosAnticipacion === 30 ? 45 : 30;

    await db.updateConfigBrief({ minutosAnticipacion: newMinutos });
    const updated = await db.getConfigBrief();
    expect(updated.minutosAnticipacion).toBe(newMinutos);

    // Restore original
    await db.updateConfigBrief({ minutosAnticipacion: original.minutosAnticipacion });
  });

  it("should update brief config activo flag", async () => {
    const original = await db.getConfigBrief();
    // MySQL boolean may return 0/1 or true/false depending on driver
    const originalBool = Boolean(original.activo);
    const newActivo = !originalBool;

    await db.updateConfigBrief({ activo: newActivo });
    const updated = await db.getConfigBrief();
    // Compare as boolean to handle MySQL 0/1 vs true/false
    expect(Boolean(updated.activo)).toBe(newActivo);

    // Restore original
    await db.updateConfigBrief({ activo: originalBool });
  });
});

// ─── getBriefsByArea Tests ────────────────────────────────────────────────────

describe("v5.8 — getBriefsByArea", () => {
  it("should return an array for any area string", async () => {
    const briefs = await db.getBriefsByArea("Servicios Generales");
    expect(Array.isArray(briefs)).toBe(true);
  });

  it("should return empty array for non-existent area", async () => {
    const briefs = await db.getBriefsByArea("Area Inexistente XYZ 999");
    expect(Array.isArray(briefs)).toBe(true);
    expect(briefs.length).toBe(0);
  });
});

// ─── Brief Integration Tests ──────────────────────────────────────────────────

describe("v5.8 — Brief Integration (create + list + delete)", () => {
  it("should create, list, and delete a brief in sequence", async () => {
    const reuniones = await db.listReuniones();
    if (reuniones.length === 0) {
      // Skip if no reuniones exist
      return;
    }
    const reunionId = reuniones[0].id;

    // Create
    const brief = await db.createBrief({
      reunionId,
      contenido: "Brief de integración v5.8",
      tipo: "manual",
    });
    expect(brief.id).toBeGreaterThan(0);

    // List — should include the new brief
    const listBefore = await db.listBriefsByReunion(reunionId);
    const found = listBefore.find((b: any) => b.id === brief.id);
    expect(found).toBeDefined();

    // Delete
    await db.deleteBrief(brief.id);

    // List — should NOT include the deleted brief
    const listAfter = await db.listBriefsByReunion(reunionId);
    const notFound = listAfter.find((b: any) => b.id === brief.id);
    expect(notFound).toBeUndefined();
  });
});
