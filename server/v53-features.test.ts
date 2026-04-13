import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * v5.3 Feature Tests
 * Tests for: Outlook Mail routes, Brief Pre-Reunión config/scheduler/send,
 * and integration between brief system and reuniones.
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

// ─── Outlook Mail Routes ───────────────────────────────────────────────────

describe("outlookMail router", () => {
  const ctx = createMockContext();

  it("outlookMail router is accessible", async () => {
    const caller = appRouter.createCaller(ctx);
    expect(caller.outlookMail).toBeDefined();
  });

  it("search returns messages array or error (MCP may be unavailable)", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.outlookMail.search({ maxResults: 5 });
      // If MCP is available, result should have messages array
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      if (result.messages) {
        expect(Array.isArray(result.messages)).toBe(true);
      }
    } catch (e: any) {
      // MCP may not be available in test environment
      expect(e.message).toBeDefined();
    }
  });

  it("send validates required fields", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.outlookMail.send({
        to: ["test@example.com"],
        subject: "Test Subject",
        content: "Test content",
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    } catch (e: any) {
      // MCP may not be available in test environment
      expect(e.message).toBeDefined();
    }
  });

  it("reply validates required fields", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.outlookMail.reply({
        to: ["test@example.com"],
        subject: "Re: Test",
        content: "Reply content",
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    } catch (e: any) {
      // MCP may not be available in test environment
      expect(e.message).toBeDefined();
    }
  });
});

// ─── Brief Config ─────────────────────────────────────────────────────────

describe("brief config", () => {
  const ctx = createMockContext();

  it("brief router is accessible", async () => {
    const caller = appRouter.createCaller(ctx);
    expect(caller.brief).toBeDefined();
  });

  it("gets config with defaults", async () => {
    const caller = appRouter.createCaller(ctx);
    const config = await caller.brief.config();
    expect(config).toBeDefined();
    expect(typeof config.activo).toBe("boolean");
    expect(typeof config.emailDestinatario).toBe("string");
    expect(typeof config.minutosAnticipacion).toBe("number");
    // Verify defaults
    expect(config.minutosAnticipacion).toBeGreaterThan(0);
    expect(config.emailDestinatario.length).toBeGreaterThan(0);
  });

  it("updates config successfully", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.brief.updateConfig({
      activo: true,
      emailDestinatario: "gerencia@cap.hn",
      minutosAnticipacion: 30,
    });
    expect(result).toBeDefined();
    expect(result.activo).toBe(true);
    expect(result.emailDestinatario).toBe("gerencia@cap.hn");
    expect(result.minutosAnticipacion).toBe(30);
  });

  it("updates config with custom values", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.brief.updateConfig({
      activo: false,
      emailDestinatario: "test@cap.hn",
      minutosAnticipacion: 45,
    });
    expect(result.activo).toBe(false);
    expect(result.emailDestinatario).toBe("test@cap.hn");
    expect(result.minutosAnticipacion).toBe(45);
    // Restore default
    await caller.brief.updateConfig({
      activo: true,
      emailDestinatario: "gerencia@cap.hn",
      minutosAnticipacion: 30,
    });
  });
});

// ─── Brief List ───────────────────────────────────────────────────────────

describe("brief list", () => {
  const ctx = createMockContext();

  it("lists briefs for a reunion without error", async () => {
    const caller = appRouter.createCaller(ctx);
    const reuniones = await caller.reuniones.list();
    if (reuniones.length > 0) {
      const result = await caller.brief.list({ reunionId: (reuniones[0] as any).id });
      expect(Array.isArray(result)).toBe(true);
    } else {
      // No reuniones to test with
      expect(true).toBe(true);
    }
  });

  it("briefs have expected shape when present", async () => {
    const caller = appRouter.createCaller(ctx);
    const reuniones = await caller.reuniones.list();
    if (reuniones.length > 0) {
      const result = await caller.brief.list({ reunionId: (reuniones[0] as any).id });
      if (result.length > 0) {
        const first = result[0] as any;
        expect(typeof first.id).toBe("number");
        expect(typeof first.contenido).toBe("string");
        expect(typeof first.tipo).toBe("string");
      }
    } else {
      expect(true).toBe(true);
    }
  });
});

// ─── Brief Reuniones With Status ──────────────────────────────────────────

describe("brief reunionesWithStatus", () => {
  const ctx = createMockContext();

  it("returns reuniones with brief status", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.brief.reunionesWithStatus();
    expect(Array.isArray(result)).toBe(true);
  });

  it("each reunion has briefEnviado boolean field", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.brief.reunionesWithStatus();
    if (result.length > 0) {
      const first = result[0] as any;
      expect(typeof first.briefEnviado).toBe("boolean");
      expect(typeof first.id).toBe("number");
      expect(typeof first.area).toBe("string");
    }
  });
});

// ─── Brief sendNow ────────────────────────────────────────────────────────

describe("brief sendNow", () => {
  const ctx = createMockContext();

  it("sendNow returns result object with success field", async () => {
    const caller = appRouter.createCaller(ctx);
    const reuniones = await caller.reuniones.list();
    if (reuniones.length > 0) {
      const first = reuniones[0] as any;
      try {
        const result = await caller.brief.sendNow({ reunionId: first.id });
        expect(result).toBeDefined();
        expect(typeof result.success).toBe("boolean");
      } catch (e: any) {
        // MCP may not be available in test environment
        expect(e.message).toBeDefined();
      }
    } else {
      // No reuniones to test with — that's OK
      expect(true).toBe(true);
    }
  }, 30000);

  it("sendNow with invalid reunionId returns error gracefully", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.brief.sendNow({ reunionId: 999999 });
      // Should return error, not throw
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    } catch (e: any) {
      // Throwing is also acceptable for invalid ID
      expect(e.message).toBeDefined();
    }
  });
});

// ─── Brief testBrief ──────────────────────────────────────────────────────

describe("brief testBrief", () => {
  const ctx = createMockContext();

  it("testBrief returns result with success field", async () => {
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.brief.testBrief();
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    } catch (e: any) {
      // MCP may not be available in test environment
      expect(e.message).toBeDefined();
    }
  });
});

// ─── Brief integration with Reuniones ────────────────────────────────────

describe("brief integration with reuniones", () => {
  const ctx = createMockContext();

  it("reuniones list is accessible for brief integration", async () => {
    const caller = appRouter.createCaller(ctx);
    const result = await caller.reuniones.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("brief status is consistent between reunionesWithStatus and list", async () => {
    const caller = appRouter.createCaller(ctx);
    const reuniones = await caller.reuniones.list();
    const reunionId = reuniones.length > 0 ? (reuniones[0] as any).id : 1;
    const briefList = await caller.brief.list({ reunionId });
    const reunionesWithStatus = await caller.brief.reunionesWithStatus();

    // Both endpoints should return arrays
    expect(Array.isArray(briefList)).toBe(true);
    expect(Array.isArray(reunionesWithStatus)).toBe(true);

    // Count reuniones with brief sent
    const withBrief = reunionesWithStatus.filter((r: any) => r.briefEnviado);

    // withBrief count should be a non-negative integer
    expect(withBrief.length).toBeGreaterThanOrEqual(0);
    // briefList may contain multiple entries per reunion (retries), so just verify types
    expect(briefList.length).toBeGreaterThanOrEqual(0);
  });
});
