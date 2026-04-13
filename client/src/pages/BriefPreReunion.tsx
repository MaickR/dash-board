/**
 * FASE 1 — Brief de Preparación Pre-Reunión
 * Genera automáticamente un brief para cada reunión quincenal:
 * - Acuerdos pendientes de la reunión anterior
 * - Tareas vencidas o sin completar del área
 * - 3 preguntas estratégicas sugeridas
 * - Semáforo de estado del área
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, AlertTriangle, Clock, CheckCircle2, ChevronRight,
  MessageSquareText, ClipboardList, CircleDot, ArrowLeft,
} from "lucide-react";
import { useTasks } from "@/contexts/TasksContext";
import { AREA_COLORS } from "@/data/tasks";

const STRATEGIC_QUESTIONS: Record<string, string[]> = {
  "Coordinadores": [
    "¿Cuáles son los 3 principales bloqueos operativos que requieren decisión de gerencia esta semana?",
    "¿Hay algún proyecto interdepartamental que necesite reasignación de recursos o prioridad?",
    "¿Qué indicadores clave (KPIs) muestran desviación respecto al plan mensual?",
  ],
  "Marketing": [
    "¿Cuál es el ROI de las campañas activas y cuáles necesitan ajuste de presupuesto?",
    "¿Hay oportunidades de mercado identificadas que requieran acción inmediata?",
    "¿Cómo va el pipeline de leads y cuál es la tasa de conversión actual?",
  ],
  "Talento Humano": [
    "¿Cuál es el estado de las vacantes abiertas y el tiempo promedio de contratación?",
    "¿Hay situaciones de clima laboral o rotación que requieran atención prioritaria?",
    "¿Están al día las evaluaciones de desempeño y los planes de desarrollo individual?",
  ],
  "Compras": [
    "¿Hay órdenes de compra pendientes que estén afectando la operación?",
    "¿Cuál es el estado de las negociaciones con proveedores clave?",
    "¿Se identificaron oportunidades de ahorro o consolidación de compras?",
  ],
  "Legal": [
    "¿Cuáles son los trámites legales con fecha límite más próxima y cuál es su estatus?",
    "¿Hay riesgos legales o laborales que requieran acción preventiva inmediata?",
    "¿Cuál es el estado de los contratos en negociación y las conciliaciones pendientes?",
  ],
  "Servicios Generales": [
    "¿Hay solicitudes de mantenimiento críticas pendientes que afecten la operación?",
    "¿Cuál es el estado del inventario de suministros y equipos esenciales?",
    "¿Se han identificado oportunidades de optimización en costos de servicios?",
  ],
  "Contabilidad y Finanzas": [
    "¿Cuál es el estado de cierre contable del mes y hay partidas pendientes de conciliar?",
    "¿Los flujos de caja proyectados muestran algún riesgo de liquidez a corto plazo?",
    "¿Están al día las obligaciones fiscales y hay algún requerimiento pendiente del SAR?",
  ],
  "Procesos y Mejora Continua": [
    "¿Cuáles son los procesos con mayor número de incidencias o reprocesos esta semana?",
    "¿Hay proyectos de mejora continua que estén retrasados respecto al cronograma?",
    "¿Se han identificado nuevas oportunidades de automatización o estandarización?",
  ],
  "Programación y Tecnología": [
    "¿Cuáles son los proyectos de desarrollo con mayor riesgo de retraso?",
    "¿Hay incidentes de infraestructura o seguridad que requieran atención inmediata?",
    "¿Cuál es el estado de las migraciones y despliegues planificados para esta semana?",
  ],
};

function SemaforoIcon({ color }: { color: "verde" | "amarillo" | "rojo" }) {
  const colors = { verde: "#10B981", amarillo: "#F59E0B", rojo: "#EF4444" };
  const labels = { verde: "Bajo control", amarillo: "Requiere atención", rojo: "Crítico" };
  return (
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: colors[color] }} />
      <span className="text-xs font-semibold" style={{ color: colors[color] }}>{labels[color]}</span>
    </div>
  );
}

function BriefCard({ meeting }: { meeting: { area: string; dia: string; hora: string; responsable: string } }) {
  const [expanded, setExpanded] = useState(false);
  const { tasks, getAreaSemaforo, getAreaStats } = useTasks();
  const areaColor = AREA_COLORS[meeting.area] || "#C0392B";

  const areaTasks = useMemo(() => {
    const normalizedArea = meeting.area.toLowerCase();
    return tasks.filter((t) => {
      const taskArea = t.area.toLowerCase();
      return taskArea.includes(normalizedArea) || normalizedArea.includes(taskArea);
    });
  }, [tasks, meeting.area]);

  const pendingTasks = useMemo(() =>
    areaTasks.filter((t) => t.status === "pendiente" || t.status === "vencida" || t.status === "en_progreso"),
    [areaTasks]
  );

  const overdueTasks = useMemo(() =>
    areaTasks.filter((t) => t.status === "vencida"),
    [areaTasks]
  );

  const semaforo = getAreaSemaforo(meeting.area);
  const stats = getAreaStats(meeting.area);
  const questions = STRATEGIC_QUESTIONS[meeting.area] || STRATEGIC_QUESTIONS["Coordinadores"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: areaColor }} />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-bold text-white">{meeting.area}</span>
            <SemaforoIcon color={semaforo} />
          </div>
          <div className="flex items-center gap-4 text-[11px] text-gray-500">
            <span>{meeting.dia} {meeting.hora}</span>
            <span>{meeting.responsable}</span>
            <span className="text-gray-600">|</span>
            <span>{stats.total} tareas ({stats.vencidas} vencidas)</span>
          </div>
        </div>
        <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>

      {/* Expanded Brief */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.04]">
              {/* Semáforo resumen */}
              <div className="mt-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[10px] uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                  <CircleDot className="w-3 h-3" /> Estado del área
                </h4>
                <div className="grid grid-cols-4 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-white font-mono">{stats.total}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400 font-mono">{stats.completadas}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Listas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-400 font-mono">{stats.pendientes + stats.enProgreso}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Pendientes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-400 font-mono">{stats.vencidas}</div>
                    <div className="text-[9px] text-gray-500 uppercase">Vencidas</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: areaColor }} />
                </div>
                <div className="text-right text-[10px] text-gray-500 mt-1">{stats.pct}% completado</div>
              </div>

              {/* Tareas vencidas */}
              {overdueTasks.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3 h-3" /> Tareas vencidas ({overdueTasks.length})
                  </h4>
                  <div className="space-y-1.5">
                    {overdueTasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-white/80 font-semibold leading-snug">{t.tarea}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{t.responsable} · Vencida {t.fecha}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acuerdos pendientes */}
              {pendingTasks.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                    <ClipboardList className="w-3 h-3" /> Acuerdos pendientes ({pendingTasks.length})
                  </h4>
                  <div className="space-y-1">
                    {pendingTasks.slice(0, 5).map((t) => (
                      <div key={t.id} className="flex items-start gap-2 py-1.5 px-2 rounded text-xs">
                        {t.status === "vencida" ? (
                          <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        ) : t.status === "en_progreso" ? (
                          <Clock className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Clock className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        )}
                        <span className="text-gray-300">{t.tarea}</span>
                      </div>
                    ))}
                    {pendingTasks.length > 5 && (
                      <p className="text-[10px] text-gray-500 pl-5">+{pendingTasks.length - 5} tareas más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Preguntas estratégicas */}
              <div>
                <h4 className="text-[10px] uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                  <MessageSquareText className="w-3 h-3" /> Preguntas estratégicas sugeridas
                </h4>
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <span className="text-[10px] font-mono text-blue-400 font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                      <p className="text-xs text-gray-300 leading-relaxed">{q}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BriefPreReunion() {
  const { meetings } = useTasks();

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-[#C0392B]" />
          <h2 className="text-lg font-bold text-white">Brief de Preparación</h2>
        </div>
        <p className="text-xs text-gray-500">
          Resumen automático antes de cada reunión quincenal: acuerdos pendientes, tareas vencidas, preguntas estratégicas y semáforo de estado.
        </p>
      </div>

      {/* Meetings grouped by day */}
      {days.map((day) => {
        const dayMeetings = meetings.filter((m) => m.dia === day);
        if (dayMeetings.length === 0) return null;
        return (
          <div key={day}>
            <h3 className="text-[11px] uppercase tracking-wider text-gray-500 mb-2 pl-1">{day}</h3>
            <div className="space-y-2">
              {dayMeetings.map((m) => (
                <BriefCard key={m.area} meeting={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
