/**
 * Brief Pre-Reunión Scheduler (v5.8)
 * Generates and SAVES executive briefs to the database (no email sending)
 * - Auto: 30 minutes before each scheduled meeting
 * - Manual: on-demand via tRPC brief.generate endpoint
 */
import { invokeLLM } from "./_core/llm";
import * as db from "./db";

/**
 * Generate and SAVE a brief for a specific reunion to the database.
 * tipo: 'auto' (scheduled) | 'manual' (user-triggered)
 */
export async function generateAndSaveBrief(
  reunionId: number,
  tipo: "auto" | "manual" = "manual"
): Promise<{ success: boolean; briefId?: number; contenido?: string; error?: string }> {
  try {
    // Get reunion data
    const allReuniones = await db.listReunionesWithBriefStatus();
    const reunion = allReuniones.find(r => r.id === reunionId);
    if (!reunion) return { success: false, error: "Reunión no encontrada" };

    // Gather data for the brief
    const allTareas = await db.listTareas();
    const areaName = reunion.area.replace(/\s*\(.*\)$/, ""); // Remove date suffix if present

    // Filter tasks by area
    const tareasPendientes = allTareas.filter(t =>
      (t.area.toLowerCase().includes(areaName.toLowerCase()) ||
        t.responsable.toLowerCase().includes(reunion.responsable.toLowerCase())) &&
      (t.status === "pendiente" || t.status === "en_progreso" || t.status === "vencida")
    );

    // Get acuerdos pendientes
    const acuerdosPendientes = allTareas.filter(t =>
      t.isAcuerdo && t.acuerdoStatus !== "cerrado" &&
      (t.area.toLowerCase().includes(areaName.toLowerCase()) || t.reunionOrigenId === reunionId)
    );

    // Calculate KPIs
    const tareasArea = allTareas.filter(t => t.area.toLowerCase().includes(areaName.toLowerCase()));
    const totalTareas = tareasArea.length;
    const completadas = tareasArea.filter(t => t.status === "completada").length;
    const vencidas = tareasArea.filter(t => t.status === "vencida").length;
    const cumplimiento = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

    // Generate AI-powered agenda suggestions
    let agendaSugerida = "";
    try {
      const promptData = `
Reunión: ${reunion.area}
Responsable: ${reunion.responsable}
Tareas pendientes (${tareasPendientes.length}):
${tareasPendientes.slice(0, 10).map(t => `- ${t.nombre || t.tarea} (${t.status}, prioridad: ${t.prioridad})`).join("\n")}
Acuerdos pendientes (${acuerdosPendientes.length}):
${acuerdosPendientes.slice(0, 5).map(t => `- ${t.nombre || t.tarea} (${t.acuerdoStatus})`).join("\n")}
KPIs: ${cumplimiento}% cumplimiento, ${vencidas} vencidas, ${completadas} completadas de ${totalTareas}
`;
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Eres un asistente ejecutivo de Grupo CAP Honduras. Genera 5 puntos de agenda sugeridos para la reunión basándote en las tareas pendientes, acuerdos y KPIs. Sé conciso y directo. Responde solo con los puntos numerados, sin introducción ni cierre."
          },
          { role: "user", content: promptData },
        ],
      });
      const rawContent = response.choices?.[0]?.message?.content;
      agendaSugerida = typeof rawContent === "string" ? rawContent : "";
    } catch {
      agendaSugerida = "No se pudo generar agenda sugerida con IA.";
    }

    // Build the brief content as Markdown (stored in DB, rendered in UI)
    const fechaHoy = new Date().toLocaleDateString("es-HN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const fechaReunion = reunion.fecha || fechaHoy;

    const contenido = buildBriefMarkdown({
      reunionNombre: reunion.area,
      responsable: reunion.responsable,
      dia: reunion.dia,
      hora: reunion.hora,
      fecha: fechaReunion,
      tareasPendientes,
      acuerdosPendientes,
      kpis: { cumplimiento, completadas, vencidas, totalTareas },
      agendaSugerida,
      tipo,
    });

    // Save to database
    const saved = await db.createBrief({
      reunionId,
      contenido,
      tipo,
    });

    console.log(`[BriefScheduler] Brief ${tipo} guardado para reunión: ${reunion.area} (id: ${saved.id})`);
    return { success: true, briefId: saved.id, contenido };
  } catch (err: any) {
    console.error("[BriefScheduler] Error generando brief:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Check for upcoming meetings and auto-generate briefs.
 * Called by the cron scheduler every minute.
 */
export async function checkAndGenerateBriefs(): Promise<void> {
  try {
    const config = await db.getConfigBrief();
    if (!config || !config.activo) return;

    const minutosAnticipacion = config.minutosAnticipacion || 30;
    const now = new Date();

    // Get all pending reuniones
    const reuniones = await db.listReunionesWithBriefStatus();
    const pendientes = reuniones.filter(r => r.status === "pendiente");

    for (const reunion of pendientes) {
      // Parse reunion date and time
      const reunionTime = parseReunionDateTime(reunion.fecha, reunion.hora);
      if (!reunionTime) continue;

      // Check if within anticipation window
      const diffMs = reunionTime.getTime() - now.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      // Generate if within the anticipation window (between 0 and minutosAnticipacion)
      if (diffMinutes > 0 && diffMinutes <= minutosAnticipacion) {
        // Check if auto brief already generated for this reunion in the last hour
        const existingBriefs = await db.listBriefsByReunion(reunion.id);
        const recentAuto = existingBriefs.find(b => {
          if (b.tipo !== "auto") return false;
          const age = now.getTime() - new Date(b.generadoEn).getTime();
          return age < 60 * 60 * 1000; // within last hour
        });
        if (recentAuto) continue; // Already generated recently

        console.log(`[BriefScheduler] Auto-generando brief para: ${reunion.area} (en ${Math.round(diffMinutes)} min)`);
        await generateAndSaveBrief(reunion.id, "auto");
      }
    }
  } catch (err) {
    console.error("[BriefScheduler] Error en checkAndGenerateBriefs:", err);
  }
}

// Keep legacy export for backward compatibility
export const checkAndSendBriefs = checkAndGenerateBriefs;

function parseReunionDateTime(fecha?: string | null, hora?: string | null): Date | null {
  if (!fecha) return null;
  // fecha format: DD/MM/YYYY
  const parts = fecha.split("/");
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const year = parseInt(parts[2]);

  // hora format: "HH:MM" or "HH:MM-HH:MM"
  let hours = 9, minutes = 0;
  if (hora) {
    const timePart = hora.split("-")[0].trim();
    const timeParts = timePart.split(":");
    if (timeParts.length >= 2) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
    }
  }

  return new Date(year, month, day, hours, minutes);
}

interface BriefData {
  reunionNombre: string;
  responsable: string;
  dia: string;
  hora: string;
  fecha: string;
  tareasPendientes: any[];
  acuerdosPendientes: any[];
  kpis: { cumplimiento: number; completadas: number; vencidas: number; totalTareas: number };
  agendaSugerida: string;
  tipo: "auto" | "manual";
}

function buildBriefMarkdown(data: BriefData): string {
  const lines: string[] = [];

  lines.push(`# Brief Pre-Reunión: ${data.reunionNombre}`);
  lines.push(`**Generado:** ${new Date().toLocaleString("es-HN")} | **Tipo:** ${data.tipo === "auto" ? "Automático (30 min antes)" : "Manual"}`);
  lines.push("");
  lines.push(`| Campo | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Fecha | ${data.fecha} |`);
  lines.push(`| Día | ${data.dia} |`);
  lines.push(`| Hora | ${data.hora} |`);
  lines.push(`| Responsable | ${data.responsable} |`);
  lines.push("");

  lines.push(`## KPIs del Área`);
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---|---|`);
  lines.push(`| Cumplimiento | **${data.kpis.cumplimiento}%** |`);
  lines.push(`| Completadas | ${data.kpis.completadas} de ${data.kpis.totalTareas} |`);
  lines.push(`| Vencidas | ${data.kpis.vencidas} |`);
  lines.push(`| Total tareas | ${data.kpis.totalTareas} |`);
  lines.push("");

  if (data.tareasPendientes.length > 0) {
    lines.push(`## Tareas Pendientes (${data.tareasPendientes.length})`);
    data.tareasPendientes.slice(0, 15).forEach((t, i) => {
      const prioLabel = t.prioridad === "alta" ? "🔴" : t.prioridad === "media" ? "🟡" : "🟢";
      lines.push(`${i + 1}. ${prioLabel} **${t.nombre || t.tarea}**`);
      lines.push(`   - Responsable: ${t.responsable} | Fecha límite: ${t.fecha} | Estado: ${t.status}`);
    });
    lines.push("");
  } else {
    lines.push(`## Tareas Pendientes`);
    lines.push(`*No hay tareas pendientes para esta área.*`);
    lines.push("");
  }

  if (data.acuerdosPendientes.length > 0) {
    lines.push(`## Acuerdos Sin Cerrar (${data.acuerdosPendientes.length})`);
    data.acuerdosPendientes.forEach((a, i) => {
      const statusLabel = a.acuerdoStatus === "en_progreso" ? "🔄" : "⏳";
      lines.push(`${i + 1}. ${statusLabel} **${a.nombre || a.tarea}** — ${a.acuerdoStatus || "pendiente"}`);
    });
    lines.push("");
  }

  if (data.agendaSugerida) {
    lines.push(`## Agenda Sugerida (IA)`);
    lines.push(data.agendaSugerida);
    lines.push("");
  }

  lines.push("---");
  lines.push("*ARIA — Sistema de Gestión de Reuniones | Grupo CAP Honduras*");

  return lines.join("\n");
}
