/**
 * FASE 3 — Dashboard de Seguimiento
 * - Vista por coordinador con semáforo
 * - Vista semanal de 9 reuniones
 * - Historial por área
 * - Filtros: área, responsable, estado, fecha
 * - Exportar PDF
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Search, Filter, Download, Users, CalendarDays,
  CheckCircle2, Clock, AlertTriangle, XCircle, ChevronDown,
  TrendingUp, FileText, CircleDot,
} from "lucide-react";
import { useTasks, type MeetingStatus } from "@/contexts/TasksContext";
import { AREA_COLORS, REUNIONES_QUINCENALES, type TaskStatus } from "@/data/tasks";

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  completada: { label: "Completada", color: "#10B981", icon: CheckCircle2 },
  en_progreso: { label: "En progreso", color: "#3B82F6", icon: Clock },
  pendiente: { label: "Pendiente", color: "#F59E0B", icon: Clock },
  vencida: { label: "Vencida", color: "#EF4444", icon: AlertTriangle },
};

const MEETING_STATUS_CONFIG: Record<MeetingStatus, { label: string; color: string }> = {
  realizada: { label: "Realizada", color: "#10B981" },
  pendiente: { label: "Pendiente", color: "#F59E0B" },
  cancelada: { label: "Cancelada", color: "#EF4444" },
};

function SemaforoCircle({ color }: { color: "verde" | "amarillo" | "rojo" }) {
  const colors = { verde: "#10B981", amarillo: "#F59E0B", rojo: "#EF4444" };
  return <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[color] }} />;
}

export default function Dashboard() {
  const { tasks, meetings, updateTaskStatus, updateMeetingStatus, getAreaSemaforo, getAreaStats } = useTasks();
  const [view, setView] = useState<"tareas" | "reuniones" | "areas">("tareas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("todas");
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "todas">("todas");
  const [filterResponsable, setFilterResponsable] = useState("todos");

  // Unique areas and responsables for filters
  const areas = useMemo(() => Array.from(new Set(tasks.map((t) => t.area))).sort(), [tasks]);
  const responsables = useMemo(() => Array.from(new Set(tasks.map((t) => t.responsable))).sort(), [tasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterArea !== "todas" && t.area !== filterArea) return false;
      if (filterStatus !== "todas" && t.status !== filterStatus) return false;
      if (filterResponsable !== "todos" && t.responsable !== filterResponsable) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return t.tarea.toLowerCase().includes(q) || t.responsable.toLowerCase().includes(q) || t.area.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tasks, filterArea, filterStatus, filterResponsable, searchQuery]);

  // Stats
  const totalStats = useMemo(() => {
    const total = tasks.length;
    const completadas = tasks.filter((t) => t.status === "completada").length;
    const pendientes = tasks.filter((t) => t.status === "pendiente").length;
    const vencidas = tasks.filter((t) => t.status === "vencida").length;
    const enProgreso = tasks.filter((t) => t.status === "en_progreso").length;
    return { total, completadas, pendientes, vencidas, enProgreso };
  }, [tasks]);

  const handleExportPDF = () => {
    // Build printable content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const groupedByArea: Record<string, typeof tasks> = {};
    for (const t of filteredTasks) {
      if (!groupedByArea[t.area]) groupedByArea[t.area] = [];
      groupedByArea[t.area].push(t);
    }

    const html = `<!DOCTYPE html>
<html><head><title>Reporte ARIA - Grupo CAP</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1a1a1a; }
  h1 { color: #C0392B; border-bottom: 2px solid #C0392B; padding-bottom: 8px; }
  h2 { color: #333; margin-top: 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th { background: #C0392B; color: white; padding: 8px; text-align: left; }
  td { padding: 8px; border-bottom: 1px solid #eee; }
  tr:nth-child(even) { background: #f9f9f9; }
  .status { font-weight: bold; }
  .vencida { color: #EF4444; }
  .pendiente { color: #F59E0B; }
  .completada { color: #10B981; }
  .en_progreso { color: #3B82F6; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Consolidado de Tareas — ARIA | Grupo CAP</h1>
<p>Generado: ${new Date().toLocaleDateString("es-HN")} · Total: ${filteredTasks.length} tareas</p>
${Object.entries(groupedByArea).map(([area, areaTasks]) => `
<h2>${area} (${areaTasks.length})</h2>
<table>
<tr><th>#</th><th>Tarea</th><th>Responsable</th><th>Fecha</th><th>Estado</th></tr>
${areaTasks.map((t, i) => `<tr>
<td>${i + 1}</td><td>${t.tarea}</td><td>${t.responsable}</td>
<td>${t.fecha}</td><td class="status ${t.status}">${STATUS_CONFIG[t.status].label}</td>
</tr>`).join("")}
</table>`).join("")}
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  const cycleTaskStatus = (id: number, current: TaskStatus) => {
    const order: TaskStatus[] = ["pendiente", "en_progreso", "completada"];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    updateTaskStatus(id, next);
  };

  const cycleMeetingStatus = (area: string, current: MeetingStatus) => {
    const order: MeetingStatus[] = ["pendiente", "realizada", "cancelada"];
    const idx = order.indexOf(current);
    const next = order[(idx + 1) % order.length];
    updateMeetingStatus(area, next);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-[#C0392B]" />
            <h2 className="text-lg font-bold text-white">Dashboard de Seguimiento</h2>
          </div>
          <p className="text-xs text-gray-500">Control integral de tareas, reuniones y avance por área.</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C0392B] text-white text-xs font-semibold hover:bg-[#a93226] transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Exportar PDF
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total", value: totalStats.total, color: "#C0392B", icon: FileText },
          { label: "Completadas", value: totalStats.completadas, color: "#10B981", icon: CheckCircle2 },
          { label: "En progreso", value: totalStats.enProgreso, color: "#3B82F6", icon: TrendingUp },
          { label: "Pendientes", value: totalStats.pendientes, color: "#F59E0B", icon: Clock },
          { label: "Vencidas", value: totalStats.vencidas, color: "#EF4444", icon: AlertTriangle },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-500">{kpi.label}</span>
              <kpi.icon className="w-3.5 h-3.5" style={{ color: kpi.color }} />
            </div>
            <div className="text-2xl font-bold font-mono" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.03] border border-white/[0.06] w-fit">
        {[
          { key: "tareas" as const, label: "Tareas", icon: FileText },
          { key: "reuniones" as const, label: "Reuniones", icon: CalendarDays },
          { key: "areas" as const, label: "Por Área", icon: Users },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              view === tab.key
                ? "bg-[#C0392B] text-white shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === TAREAS VIEW === */}
      {view === "tareas" && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar tarea, responsable o área..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C0392B]/30"
              />
            </div>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-gray-300 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todas">Todas las áreas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | "todas")}
              className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-gray-300 focus:outline-none appearance-none cursor-pointer"
            >
              <option value="todas">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
              <option value="vencida">Vencida</option>
            </select>
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-gray-300 focus:outline-none appearance-none cursor-pointer max-w-[180px]"
            >
              <option value="todos">Todos los responsables</option>
              {responsables.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          {/* Count */}
          <div className="text-[11px] text-gray-500">
            Mostrando {filteredTasks.length} de {tasks.length} tareas
          </div>

          {/* Tasks list */}
          <div className="space-y-1.5">
            {filteredTasks.map((task) => {
              const cfg = STATUS_CONFIG[task.status];
              const areaColor = AREA_COLORS[task.area] || "#C0392B";
              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] bg-[#1a1a1a] hover:bg-white/[0.02] transition-colors group"
                >
                  {/* Status toggle */}
                  <button
                    onClick={() => cycleTaskStatus(task.id, task.status)}
                    className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                    style={{ borderColor: cfg.color }}
                    title={`Estado: ${cfg.label}. Clic para cambiar.`}
                  >
                    {task.status === "completada" && <CheckCircle2 className="w-4 h-4" style={{ color: cfg.color }} />}
                    {task.status === "en_progreso" && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color }} />}
                    {task.status === "vencida" && <AlertTriangle className="w-3 h-3" style={{ color: cfg.color }} />}
                  </button>

                  {/* Area indicator */}
                  <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: areaColor }} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${task.status === "completada" ? "text-gray-500 line-through" : "text-white font-semibold"}`}>
                      {task.tarea}
                    </p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ backgroundColor: `${areaColor}15`, color: areaColor }}>
                        {task.area}
                      </span>
                      <span>{task.responsable}</span>
                      <span className="font-mono">{task.fecha}</span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* === REUNIONES VIEW === */}
      {view === "reuniones" && (
        <div className="space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">Reuniones quincenales — Semana actual</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {meetings.map((m) => {
              const areaColor = AREA_COLORS[m.area] || "#C0392B";
              const mCfg = MEETING_STATUS_CONFIG[m.status];
              const stats = getAreaStats(m.area);
              return (
                <div key={m.area} className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: areaColor }} />
                        <span className="text-sm font-bold text-white">{m.area}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">{m.dia} {m.hora} · {m.responsable}</div>
                    </div>
                    <SemaforoCircle color={getAreaSemaforo(m.area)} />
                  </div>

                  {/* Status toggle */}
                  <button
                    onClick={() => cycleMeetingStatus(m.area, m.status)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all mb-3"
                    style={{ backgroundColor: `${mCfg.color}15`, color: mCfg.color }}
                  >
                    {m.status === "realizada" && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {m.status === "cancelada" && <XCircle className="w-3.5 h-3.5" />}
                    {m.status === "pendiente" && <Clock className="w-3.5 h-3.5" />}
                    {mCfg.label}
                    <span className="text-[9px] opacity-60 ml-1">(clic para cambiar)</span>
                  </button>

                  {/* Mini stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-sm font-bold text-white font-mono">{stats.total}</div>
                      <div className="text-[9px] text-gray-500">Tareas</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-green-400 font-mono">{stats.completadas}</div>
                      <div className="text-[9px] text-gray-500">Listas</div>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-red-400 font-mono">{stats.vencidas}</div>
                      <div className="text-[9px] text-gray-500">Vencidas</div>
                    </div>
                  </div>

                  {/* Ayuda memoria indicator */}
                  <div className="mt-3 pt-2 border-t border-white/[0.04] flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">Ayuda memoria</span>
                    <span className={`text-[10px] font-semibold ${m.hasAyudaMemoria ? "text-green-400" : "text-gray-600"}`}>
                      {m.hasAyudaMemoria ? "Procesada" : "Sin procesar"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === AREAS VIEW === */}
      {view === "areas" && (
        <div className="space-y-3">
          <h3 className="text-xs uppercase tracking-wider text-gray-400">Historial por área</h3>
          {areas.map((area) => {
            const stats = getAreaStats(area);
            const semaforo = getAreaSemaforo(area);
            const areaColor = AREA_COLORS[area] || "#C0392B";
            const meeting = meetings.find((m) => {
              const mArea = m.area.toLowerCase();
              const tArea = area.toLowerCase();
              return mArea.includes(tArea) || tArea.includes(mArea);
            });

            return (
              <div key={area} className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: areaColor }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{area}</span>
                        <SemaforoCircle color={semaforo} />
                      </div>
                      {meeting && (
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {meeting.dia} {meeting.hora} · {meeting.responsable}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold font-mono text-white">{stats.pct}%</div>
                    <div className="text-[9px] text-gray-500">completado</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                  <div className="h-full rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: areaColor }} />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-5 gap-2 text-center">
                  <div>
                    <div className="text-sm font-bold text-white font-mono">{stats.total}</div>
                    <div className="text-[9px] text-gray-500">Total</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-green-400 font-mono">{stats.completadas}</div>
                    <div className="text-[9px] text-gray-500">Listas</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-blue-400 font-mono">{stats.enProgreso}</div>
                    <div className="text-[9px] text-gray-500">En curso</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-amber-400 font-mono">{stats.pendientes}</div>
                    <div className="text-[9px] text-gray-500">Pendientes</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-red-400 font-mono">{stats.vencidas}</div>
                    <div className="text-[9px] text-gray-500">Vencidas</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
