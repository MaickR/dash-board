import { describe, it, expect, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * v5.4 Feature Tests
 * Tests for: Calendar enhancements, ReunionDetail tabs, PromptTemplatesAM, Organization module
 */

function createMockContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Calendar Router ───────────────────────────────────────────────────

describe("calendar router", () => {
  const ctx = createMockContext();

  it("calendar router is accessible", async () => {
    expect(appRouter.calendar).toBeDefined();
  });

  it("calendar.events procedure exists", async () => {
    expect(appRouter.calendar.events).toBeDefined();
  });

  it("calendar.importAsReunion procedure exists", async () => {
    expect(appRouter.calendar.importAsReunion).toBeDefined();
  });
});

// ─── Reunion Detail Router ────────────────────────────────────────────

describe("reunionDetail router", () => {
  const ctx = createMockContext();

  it("reunionDetail router is accessible", async () => {
    expect(appRouter.reunionDetail).toBeDefined();
  });

  it("reunionDetail.get procedure exists", async () => {
    expect(appRouter.reunionDetail.get).toBeDefined();
  });
});

// ─── Acuerdos Router ──────────────────────────────────────────────────

describe("acuerdos router", () => {
  const ctx = createMockContext();

  it("acuerdos router is accessible", async () => {
    expect(appRouter.acuerdos).toBeDefined();
  });

  it("acuerdos.list procedure exists", async () => {
    expect(appRouter.acuerdos.list).toBeDefined();
  });

  it("acuerdos.create procedure exists", async () => {
    expect(appRouter.acuerdos.create).toBeDefined();
  });

  it("acuerdos.update procedure exists", async () => {
    expect(appRouter.acuerdos.update).toBeDefined();
  });

  it("acuerdos.delete procedure exists", async () => {
    expect(appRouter.acuerdos.delete).toBeDefined();
  });

  it("acuerdos.list returns array", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.acuerdos.list({ reunionId: 999 });
    expect(Array.isArray(result)).toBe(true);
  });
});

// ─── Prompt Templates AM Router ───────────────────────────────────────

describe("promptTemplatesAM router", () => {
  const ctx = createMockContext();

  it("promptTemplatesAM router is accessible", async () => {
    expect(appRouter.promptTemplatesAM).toBeDefined();
  });

  it("promptTemplatesAM.list procedure exists", async () => {
    expect(appRouter.promptTemplatesAM.list).toBeDefined();
  });

  it("promptTemplatesAM.create procedure exists", async () => {
    expect(appRouter.promptTemplatesAM.create).toBeDefined();
  });

  it("promptTemplatesAM.update procedure exists", async () => {
    expect(appRouter.promptTemplatesAM.update).toBeDefined();
  });

  it("promptTemplatesAM.delete procedure exists", async () => {
    expect(appRouter.promptTemplatesAM.delete).toBeDefined();
  });

  it("promptTemplatesAM.list returns array", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.promptTemplatesAM.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("promptTemplatesAM.create validates required fields", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.promptTemplatesAM.create({
        nombre: "",
        tipo: "ayuda_memoria",
        prompt: "test prompt",
      })
    ).rejects.toThrow();
  });

  it("promptTemplatesAM CRUD flow works", async () => {
    const caller = appRouter.createCaller(ctx);

    // Create
    const created = await caller.promptTemplatesAM.create({
      nombre: "Test Template v54",
      tipo: "ayuda_memoria",
      prompt: "Genera un resumen de: {{contenido}}",
      descripcion: "Test description",
      isDefault: false,
    });
    expect(created).toBeDefined();
    expect(created.id).toBeGreaterThan(0);

    // List and find
    const list = await caller.promptTemplatesAM.list();
    const found = list.find((t: any) => t.nombre === "Test Template v54");
    expect(found).toBeDefined();

    // Update
    await caller.promptTemplatesAM.update({
      id: created.id,
      nombre: "Updated Template v54",
      tipo: "extraer_tareas",
      prompt: "Extrae tareas de: {{contenido}}",
    });

    const listAfterUpdate = await caller.promptTemplatesAM.list();
    const updated = listAfterUpdate.find((t: any) => t.id === created.id);
    expect(updated?.nombre).toBe("Updated Template v54");

    // Delete
    await caller.promptTemplatesAM.delete({ id: created.id });
    const listAfterDelete = await caller.promptTemplatesAM.list();
    const deleted = listAfterDelete.find((t: any) => t.id === created.id);
    expect(deleted).toBeUndefined();
  });
});

// ─── Organization Router ──────────────────────────────────────────────

describe("organizacion router", () => {
  const ctx = createMockContext();

  it("organizacion router is accessible", async () => {
    expect(appRouter.organizacion).toBeDefined();
  });

  it("organizacion.list procedure exists", async () => {
    expect(appRouter.organizacion.list).toBeDefined();
  });

  it("organizacion.seed procedure exists", async () => {
    expect(appRouter.organizacion.seed).toBeDefined();
  });

  it("organizacion.list returns array", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizacion.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("organizacion.seed inserts data", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.organizacion.seed();
    expect(result).toBeDefined();
    expect(result.count).toBeGreaterThan(0);

    // Verify data was inserted
    const list = await caller.organizacion.list();
    expect(list.length).toBeGreaterThan(0);
  }, 30000);

  it("seeded data includes expected companies", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.organizacion.list();
    const empresas = new Set(list.map((p: any) => p.empresa));
    expect(empresas.has("CAP Honduras")).toBe(true);
  });

  it("seeded data includes vacantes", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.organizacion.list();
    const vacantes = list.filter((p: any) => p.esVacante);
    expect(vacantes.length).toBeGreaterThan(0);
  });
});

// ─── Router Structure Consistency ─────────────────────────────────────

describe("v5.4 router structure consistency", () => {
  it("all v5.4 routers exist in appRouter", () => {
    expect(appRouter.calendar).toBeDefined();
    expect(appRouter.reunionDetail).toBeDefined();
    expect(appRouter.acuerdos).toBeDefined();
    expect(appRouter.promptTemplatesAM).toBeDefined();
    expect(appRouter.organizacion).toBeDefined();
  });

  it("existing v5.3 routers still exist", () => {
    expect(appRouter.outlookMail).toBeDefined();
    expect(appRouter.brief).toBeDefined();
  });

  it("core routers still exist", () => {
    expect(appRouter.reuniones).toBeDefined();
    expect(appRouter.tareas).toBeDefined();
    expect(appRouter.responsables).toBeDefined();
    expect(appRouter.departamentos).toBeDefined();
    expect(appRouter.archivos).toBeDefined();
  });
});
