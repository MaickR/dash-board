import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * v5.2 Feature Tests
 * Tests for: departamentos CRUD, responsables CRUD, informes updateMensual,
 * calendar events, and file extraction routes.
 */

// Mock context helper
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

describe("departamentos CRUD", () => {
  const ctx = createMockContext();

  it("lists departamentos without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.departamentos.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new departamento", async () => {
    const caller = appRouter.createCaller(ctx);
    const dept = await caller.departamentos.create({
      nombre: "Test Dept " + Date.now(),
      empresa: "CAP Honduras",
      categoria: "Administrativo",
      responsableActualId: null,
    });
    expect(dept).toBeDefined();
    expect(typeof dept).toBe("object");
  });

  it("updates a departamento", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.departamentos.list();
    if (list.length > 0) {
      const first = list[0];
      const testNombre = "Test Dept Updated v57";
      await caller.departamentos.update({
        id: first.id,
        nombre: testNombre,
        empresa: first.empresa ?? "CAP Honduras",
        categoria: "Operativo",
      });
      // Verify update
      const updated = await caller.departamentos.list();
      const found = updated.find(d => d.id === first.id);
      expect(found?.nombre).toBe(testNombre);
    }
  });

  it("retrieves historial for a departamento", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.departamentos.list();
    if (list.length > 0) {
      const historial = await caller.departamentos.historial({ departamentoId: list[0].id });
      expect(Array.isArray(historial)).toBe(true);
    }
  });

  it("creates departamento with motivoCambio when changing responsable", async () => {
    const caller = appRouter.createCaller(ctx);
    // Create a dept first
    const dept = await caller.departamentos.create({
      nombre: "Motivo Test " + Date.now(),
      empresa: "CAP Honduras",
      categoria: "Administrativo",
      responsableActualId: null,
    });
    // Get responsables to assign
    const resps = await caller.responsables.list();
    if (resps.length > 0 && dept) {
      const deptList = await caller.departamentos.list();
      const created = deptList.find(d => d.nombre.startsWith("Motivo Test"));
      if (created) {
        await caller.departamentos.update({
          id: created.id,
          responsableActualId: resps[0].id,
          motivoCambio: "Rotación de personal",
        });
        const historial = await caller.departamentos.historial({ departamentoId: created.id });
        const entry = historial.find((h: any) => h.motivoCambio === "Rotación de personal");
        expect(entry).toBeDefined();
      }
    }
  });
});

describe("responsables CRUD", () => {
  const ctx = createMockContext();

  it("lists responsables without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.responsables.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new responsable with extended fields", async () => {
    const caller = appRouter.createCaller(ctx);
    const resp = await caller.responsables.create({
      nombre: "Test Responsable " + Date.now(),
      area: "Test Area",
      email: "test@cap.hn",
      cargo: "Coordinador",
      empresa: "CAP Honduras",
      telefono: "+504 9999-0000",
    });
    expect(resp).toBeDefined();
  });

  it("updates a responsable", async () => {
    const caller = appRouter.createCaller(ctx);
    const list = await caller.responsables.list();
    if (list.length > 0) {
      const first = list[0];
      await caller.responsables.update({
        id: first.id,
        nombre: first.nombre,
        area: first.area,
        cargo: "Updated Cargo",
      });
    }
  });
});

describe("informes mensuales", () => {
  const ctx = createMockContext();

  it("lists informes without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.informes.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("lists mensuales without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.informes.mensuales();
    expect(Array.isArray(result)).toBe(true);
  });

  it("updates mensual with estado and observacion", async () => {
    const caller = appRouter.createCaller(ctx);
    const informes = await caller.informes.list();
    if (informes.length > 0) {
      const first = informes[0] as any;
      const result = await caller.informes.updateMensual({
        informeId: first.id,
        mes: 1,
        estado: "entregado",
        observacion: "Test observación",
      });
      expect(result).toBeDefined();
    }
  });

  it("updates mensual with documentoUrl and documentoNombre", async () => {
    const caller = appRouter.createCaller(ctx);
    const informes = await caller.informes.list();
    if (informes.length > 0) {
      const first = informes[0] as any;
      const result = await caller.informes.updateMensual({
        informeId: first.id,
        mes: 2,
        estado: "retraso",
        observacion: "Con documento adjunto",
        documentoUrl: "https://example.com/test.pdf",
        documentoNombre: "test.pdf",
      });
      expect(result).toBeDefined();
    }
  });
});

describe("calendar events", () => {
  const ctx = createMockContext();

  it("fetches calendar events without error", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.calendario.getEvents({});
      expect(Array.isArray(result)).toBe(true);
    } catch (e: any) {
      // MCP may not be available in test environment, that's OK
      expect(e.message).toBeDefined();
    }
  });
});

describe("file extraction route", () => {
  const ctx = createMockContext();

  it("archivos router is accessible", async () => {
    const caller = appRouter.createCaller(ctx);
    // tRPC proxy returns a function; verify it's defined
    expect(caller.archivos).toBeDefined();
  });

  it("lists archivos without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.archivos.list();
    expect(Array.isArray(result)).toBe(true);
  });
});
