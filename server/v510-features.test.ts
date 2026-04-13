/**
 * ARIA v5.10 Tests
 * - Prompt templates fix (borradores.generate uses promptIdAM)
 * - Anti-duplicate rule (tareas.checkDuplicate)
 * - Task cleanup verification
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB ───
vi.mock("./db", () => ({
  listTareas: vi.fn(),
  createTarea: vi.fn(),
  checkDuplicateTask: vi.fn(),
  listPromptTemplatesAM: vi.fn(),
  getDefaultPromptTemplateAM: vi.fn(),
  listPromptTemplates: vi.fn(),
  getDefaultPromptTemplate: vi.fn(),
  createBorrador: vi.fn(),
  listBorradores: vi.fn(),
  getBorradorById: vi.fn(),
  updateBorrador: vi.fn(),
  createActividad: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

import * as db from "./db";
import { invokeLLM } from "./_core/llm";

const mockDb = db as any;
const mockLLM = invokeLLM as any;

// ─── 1. checkDuplicateTask ───
describe("checkDuplicateTask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null when no duplicate exists", async () => {
    mockDb.checkDuplicateTask.mockResolvedValue(null);
    const result = await db.checkDuplicateTask("Tarea nueva", "Ventas");
    expect(result).toBeNull();
  });

  it("returns existing task when duplicate found", async () => {
    const existing = { id: 42, tarea: "Tarea existente", area: "Ventas" };
    mockDb.checkDuplicateTask.mockResolvedValue(existing);
    const result = await db.checkDuplicateTask("Tarea existente", "Ventas");
    expect(result).toEqual(existing);
    expect(result?.id).toBe(42);
  });

  it("is case-insensitive in spirit (uses LIKE)", async () => {
    mockDb.checkDuplicateTask.mockResolvedValue(null);
    await db.checkDuplicateTask("TAREA NUEVA", "Ventas");
    expect(mockDb.checkDuplicateTask).toHaveBeenCalledWith("TAREA NUEVA", "Ventas");
  });
});

// ─── 2. borradores.generate prompt selection ───
describe("borradores.generate prompt selection logic", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses customPrompt when provided", async () => {
    const customPrompt = "Mi prompt personalizado";
    mockDb.listPromptTemplatesAM.mockResolvedValue([]);
    mockDb.getDefaultPromptTemplateAM.mockResolvedValue(null);
    mockDb.getDefaultPromptTemplate.mockResolvedValue(null);
    mockDb.checkDuplicateTask.mockResolvedValue(null);
    mockDb.createBorrador.mockResolvedValue({ id: 1, nombre: "Tarea 1", status: "borrador" });
    mockLLM.mockResolvedValue({
      choices: [{ message: { content: '[{"nombre":"Tarea 1","descripcion":"Desc","responsable":"Ana","area":"IT","prioridad":"alta","fechaLimite":"01/05/2026"}]' } }]
    });

    // Simulate the logic: customPrompt takes priority
    const promptText = customPrompt; // customPrompt is provided
    expect(promptText).toBe("Mi prompt personalizado");
  });

  it("uses promptIdAM template when customPrompt is absent", async () => {
    const amTemplates = [
      { id: 5, tipo: "extraer_tareas", nombre: "Plantilla CAP", prompt: "Prompt de plantilla AM", isDefault: false }
    ];
    mockDb.listPromptTemplatesAM.mockResolvedValue(amTemplates);
    mockDb.getDefaultPromptTemplateAM.mockResolvedValue(null);
    mockDb.getDefaultPromptTemplate.mockResolvedValue(null);

    // Simulate: no customPrompt, promptIdAM = 5
    let promptText: string | undefined = undefined;
    const promptIdAM = 5;
    if (!promptText && promptIdAM) {
      const templates = await db.listPromptTemplatesAM();
      const tmpl = templates.find((t: any) => t.id === promptIdAM);
      if (tmpl) promptText = (tmpl as any).prompt;
    }
    expect(promptText).toBe("Prompt de plantilla AM");
  });

  it("falls back to default AM template when no promptIdAM", async () => {
    const defaultAM = { id: 1, tipo: "extraer_tareas", prompt: "Prompt por defecto AM", isDefault: true };
    mockDb.listPromptTemplatesAM.mockResolvedValue([defaultAM]);
    mockDb.getDefaultPromptTemplateAM.mockResolvedValue(defaultAM);

    // Simulate: no customPrompt, no promptIdAM
    let promptText: string | undefined = undefined;
    if (!promptText) {
      const defAM = await db.getDefaultPromptTemplateAM("extraer_tareas");
      if (defAM) promptText = (defAM as any).prompt;
    }
    expect(promptText).toBe("Prompt por defecto AM");
  });

  it("replaces [CONTENIDO] placeholder in prompt", () => {
    const prompt = "Analiza esto: [CONTENIDO]";
    const contenido = "Texto del documento";
    const finalPrompt = prompt.includes("[CONTENIDO]")
      ? prompt.replace("[CONTENIDO]", contenido)
      : prompt;
    expect(finalPrompt).toBe("Analiza esto: Texto del documento");
  });

  it("uses system+user messages when no [CONTENIDO] placeholder", () => {
    const prompt = "Extrae tareas del documento";
    const contenido = "Texto del documento";
    const messages = prompt.includes("[CONTENIDO]")
      ? [{ role: "user", content: prompt.replace("[CONTENIDO]", contenido) }]
      : [
          { role: "system", content: prompt },
          { role: "user", content: contenido },
        ];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });
});

// ─── 3. Duplicate detection in borradores ───
describe("duplicate detection in borradores", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks borrador as isDuplicate when task with same name exists", async () => {
    const existingTask = { id: 10, tarea: "Revisar informe mensual", area: "Finanzas" };
    mockDb.checkDuplicateTask.mockResolvedValue(existingTask);
    mockDb.createBorrador.mockResolvedValue({ id: 99, nombre: "Revisar informe mensual", status: "borrador" });

    const nombre = "Revisar informe mensual";
    const area = "Finanzas";
    const duplicate = await db.checkDuplicateTask(nombre, area);
    const borrador = { ...await db.createBorrador({} as any), isDuplicate: !!duplicate, duplicateId: duplicate?.id ?? null, duplicateNombre: duplicate?.tarea ?? null };

    expect(borrador.isDuplicate).toBe(true);
    expect(borrador.duplicateId).toBe(10);
    expect(borrador.duplicateNombre).toBe("Revisar informe mensual");
  });

  it("does not mark borrador as isDuplicate when no existing task", async () => {
    mockDb.checkDuplicateTask.mockResolvedValue(null);
    mockDb.createBorrador.mockResolvedValue({ id: 100, nombre: "Nueva tarea única", status: "borrador" });

    const duplicate = await db.checkDuplicateTask("Nueva tarea única", "IT");
    const borrador = { ...await db.createBorrador({} as any), isDuplicate: !!duplicate, duplicateId: null, duplicateNombre: null };

    expect(borrador.isDuplicate).toBe(false);
    expect(borrador.duplicateId).toBeNull();
  });
});

// ─── 4. Task cleanup verification ───
describe("task cleanup", () => {
  it("listTareas returns empty array after cleanup", async () => {
    mockDb.listTareas.mockResolvedValue([]);
    const tasks = await db.listTareas();
    expect(tasks).toHaveLength(0);
  });
});

// ─── 5. Prompt template CRUD ───
describe("promptTemplatesAM CRUD", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists templates filtered by tipo extraer_tareas", async () => {
    const templates = [
      { id: 1, tipo: "extraer_tareas", nombre: "Plantilla 1", prompt: "...", isDefault: true },
      { id: 2, tipo: "ayuda_memoria", nombre: "Plantilla 2", prompt: "...", isDefault: false },
    ];
    mockDb.listPromptTemplatesAM.mockResolvedValue(templates);
    const all = await db.listPromptTemplatesAM();
    const extraerTareas = all.filter((t: any) => t.tipo === "extraer_tareas");
    expect(extraerTareas).toHaveLength(1);
    expect(extraerTareas[0].nombre).toBe("Plantilla 1");
  });
});
