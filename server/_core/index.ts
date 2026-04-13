import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Confirmation endpoint for task status updates from email links
  app.get("/api/confirm", async (req, res) => {
    try {
      const { token, status } = req.query as { token?: string; status?: string };
      if (!token || !status) {
        return res.status(400).send("<html><body><h2>Enlace inválido</h2></body></html>");
      }
      const validStatuses = ["visto", "en_progreso", "completada"];
      if (!validStatuses.includes(status)) {
        return res.status(400).send("<html><body><h2>Estado no válido</h2></body></html>");
      }
      const decoded = JSON.parse(Buffer.from(token, "base64url").toString());
      const tareaId = decoded.tareaId;
      if (!tareaId) {
        return res.status(400).send("<html><body><h2>Token inválido</h2></body></html>");
      }
      // Dynamic import to avoid circular deps
      const { updateTarea } = await import("../db");
      await updateTarea(tareaId, { status: status as any });
      const statusLabel = status === "visto" ? "Visto \u2705" : status === "en_progreso" ? "En Proceso \u23F3" : "Completada \u2705";
      res.send(`<html><head><meta charset="utf-8"><style>body{font-family:Inter,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8f8f8}div{text-align:center;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}h1{color:#C0392B}p{color:#666}</style></head><body><div><h1>ARIA - Grupo CAP</h1><h2>Estado actualizado: ${statusLabel}</h2><p>La tarea ha sido marcada correctamente. Puedes cerrar esta ventana.</p></div></body></html>`);
    } catch (e) {
      console.error("[Confirm] Error:", e);
      res.status(500).send("<html><body><h2>Error al procesar la confirmación</h2></body></html>");
    }
  });

  // ─── Telegram Bot Webhook ───
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_BOT_TOKEN) {
        return res.status(200).json({ ok: true, msg: "Bot not configured" });
      }
      const update = req.body;
      const message = update?.message;
      if (!message?.text) return res.status(200).json({ ok: true });

      const chatId = message.chat.id;
      const text = message.text.trim();
      const { listTareas, createTarea, updateTarea, listResponsables, getAreaStats } = await import("../db");

      let reply = "";

      if (text.startsWith("/nueva")) {
        // /nueva Nombre | Descripción | Responsable | DD/MM/YYYY
        const parts = text.replace("/nueva", "").trim().split("|").map((s: string) => s.trim());
        if (parts.length < 3) {
          reply = "Formato: /nueva Nombre | Descripción | Responsable | DD/MM/YYYY";
        } else {
          const [nombre, desc, responsable, fecha] = parts;
          const fechaStr = fecha || new Date(Date.now() + 14 * 86400000).toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" });
          const parseParts = fechaStr.split("/");
          const fechaTs = parseParts.length === 3 ? new Date(parseInt(parseParts[2]), parseInt(parseParts[1]) - 1, parseInt(parseParts[0])).getTime() : null;
          await createTarea({
            nombre: nombre || null, descripcion: desc || null, area: "General", tarea: desc || nombre || "",
            responsable: responsable || "Sin asignar", fecha: fechaStr, fechaTs,
            propuesta: null, status: "pendiente", source: "telegram", reunion: null,
            archivoId: null, responsableId: null, departamentoId: null,
            prioridad: "media", avance: 0, parentId: null, etiquetas: null,
            responsablesIds: null, dependeDeId: null, fechaInicio: null, fechaInicioTs: null,
            isAcuerdo: false, acuerdoStatus: null, reunionOrigenId: null,
          });
          reply = `✅ Tarea creada:\n📌 ${nombre}\n👤 ${responsable}\n📅 ${fechaStr}`;
        }
      } else if (text.startsWith("/pendientes")) {
        const area = text.replace("/pendientes", "").trim();
        const tareas = await listTareas();
        const filtered = area
          ? tareas.filter(t => t.area.toLowerCase().includes(area.toLowerCase()) && t.status === "pendiente")
          : tareas.filter(t => t.status === "pendiente");
        if (filtered.length === 0) {
          reply = area ? `No hay tareas pendientes en ${area}` : "No hay tareas pendientes";
        } else {
          reply = `📋 Pendientes${area ? ` (${area})` : ""}: ${filtered.length}\n\n`;
          reply += filtered.slice(0, 10).map((t, i) => `${i + 1}. [#${t.id}] ${t.nombre || t.tarea}\n   👤 ${t.responsable} | 📅 ${t.fecha}`).join("\n");
          if (filtered.length > 10) reply += `\n\n...y ${filtered.length - 10} más`;
        }
      } else if (text.startsWith("/actualizar")) {
        // /actualizar ID estado
        const parts = text.replace("/actualizar", "").trim().split(/\s+/);
        const id = parseInt(parts[0]);
        const status = parts[1];
        const validStatuses = ["pendiente", "en_progreso", "completada"];
        if (!id || !status || !validStatuses.includes(status)) {
          reply = "Formato: /actualizar ID estado\nEstados: pendiente, en_progreso, completada";
        } else {
          await updateTarea(id, { status: status as any });
          reply = `✅ Tarea #${id} actualizada a: ${status}`;
        }
      } else if (text.startsWith("/kpis")) {
        const area = text.replace("/kpis", "").trim();
        const stats = await getAreaStats();
        if (area) {
          const s = stats.find(a => a.area.toLowerCase().includes(area.toLowerCase()));
          if (s) {
            reply = `📊 KPIs ${s.area}:\n• Total: ${s.total}\n• Completadas: ${s.completadas}\n• Pendientes: ${s.pendientes}\n• Vencidas: ${s.vencidas}`;
          } else {
            reply = `No se encontró el área: ${area}`;
          }
        } else {
          reply = "📊 KPIs por Área:\n\n" + stats.map(s => `${s.area}: ${s.total} total | ${s.completadas} ✅ | ${s.pendientes} ⏳ | ${s.vencidas} 🔴`).join("\n");
        }
      } else if (text === "/help" || text === "/start") {
        reply = `🤖 ARIA Bot - Grupo CAP Honduras\n\nComandos disponibles:\n/nueva Nombre | Descripción | Responsable | DD/MM/YYYY\n/pendientes [departamento]\n/actualizar ID estado\n/kpis [departamento]\n/help - Mostrar ayuda`;
      } else {
        reply = "Comando no reconocido. Usa /help para ver los comandos disponibles.";
      }

      // Send reply to Telegram
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: "Markdown" }),
      }).catch(() => {});

      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[Telegram] Error:", e);
      res.status(200).json({ ok: true });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ─── V5.3: Brief Pre-Reunión Scheduler ───
  try {
    const cron = await import("node-cron");
    const { checkAndSendBriefs } = await import("../briefScheduler");
    cron.schedule("* * * * *", () => {
      checkAndSendBriefs().catch(err => console.error("[BriefCron] Error:", err));
    });
    console.log("[BriefScheduler] Cron job started — checking every minute for upcoming meetings");
  } catch (err) {
    console.warn("[BriefScheduler] Failed to start cron:", err);
  }
}

startServer().catch(console.error);
