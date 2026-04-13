import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useCallback } from "react";
import {
  ClipboardList, CheckCircle2, Clock, AlertTriangle, TrendingUp,
  Search, MessageSquarePlus, Send, Mail, Download, Flag, ListChecks,
  ChevronRight, Percent, Trash2, Timer, Building2, List, Columns3,
  CalendarDays, GanttChart, ChevronLeft, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import TaskDrawer from "@/components/TaskDrawer";
import SendConfirmModal from "@/components/SendConfirmModal";
import CalendarView from "@/components/CalendarView";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
  vencida: "Vencida",
  visto: "Visto",
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_progreso: "bg-blue-100 text-blue-800 border-blue-200",
  completada: "bg-green-100 text-green-800 border-green-200",
  vencida: "bg-red-100 text-red-800 border-red-200",
  visto: "bg-purple-100 text-purple-800 border-purple-200",
};

const PRIORIDAD_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  alta: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  media: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-400" },
  baja: { bg: "bg-gray-50", text: "text-gray-500", dot: "bg-gray-400" },
};

export default function DashboardPage() {
  const { data: tasks = [], isLoading } = trpc.tareas.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: responsables = [] } = trpc.responsables.list.useQuery(undefined, { refetchInterval: 30000 });
  const utils = trpc.useUtils();
  const updateTask = trpc.tareas.update.useMutation({
    onSuccess: () => utils.tareas.list.invalidate(),
  });
  const createNote = trpc.notas.create.useMutation();
  const sendToAll = trpc.correos.sendToAllResponsables.useMutation();

  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [noteText, setNoteText] = useState("");
  const [noteTaskId, setNoteTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({ nombre: "", descripcion: "", responsable: "", area: "", fecha: "", prioridad: "media", empresa: "", fechaCreacionManual: "", tiempoEstimado: "", status: "pendiente", esRecurrente: false, recurrencia: "semanal", isAcuerdo: false, etiquetas: "", checklistText: "" });
  const createTask = trpc.tareas.create.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); setShowCreateTask(false); setNewTask({ nombre: "", descripcion: "", responsable: "", area: "", fecha: "", prioridad: "media", empresa: "", fechaCreacionManual: "", tiempoEstimado: "", status: "pendiente", esRecurrente: false, recurrencia: "semanal", isAcuerdo: false, etiquetas: "", checklistText: "" }); toast.success("Tarea creada"); },
  });
  const deleteTarea = trpc.tareas.delete.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); toast.success("Tarea eliminada"); },
  });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar" | "timeline">("list");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string>("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 20;

  // Only show parent tasks (not subtareas) in main list
  const parentTasks = useMemo(() => tasks.filter(t => !t.parentId), [tasks]);

  const areas = useMemo(() => {
    const set = new Set(parentTasks.map(t => t.area));
    return Array.from(set).sort();
  }, [parentTasks]);

  const filtered = useMemo(() => {
    return parentTasks.filter(t => {
      const q = search.toLowerCase();
      if (search && !t.tarea.toLowerCase().includes(q) && !t.responsable.toLowerCase().includes(q) && !(t.nombre ?? "").toLowerCase().includes(q)) return false;
      if (areaFilter !== "all" && t.area !== areaFilter) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      return true;
    });
  }, [parentTasks, search, areaFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = parentTasks.length;
    const completadas = parentTasks.filter(t => t.status === "completada").length;
    const pendientes = parentTasks.filter(t => t.status === "pendiente").length;
    const enProgreso = parentTasks.filter(t => t.status === "en_progreso").length;
    const vencidas = parentTasks.filter(t => t.status === "vencida").length;
    return { total, completadas, pendientes, enProgreso, vencidas };
  }, [parentTasks]);

  const subtaskCounts = useMemo(() => {
    const map: Record<number, { total: number; done: number }> = {};
    for (const t of tasks) {
      if (t.parentId) {
        if (!map[t.parentId]) map[t.parentId] = { total: 0, done: 0 };
        map[t.parentId].total++;
        if (t.status === "completada") map[t.parentId].done++;
      }
    }
    return map;
  }, [tasks]);

  const handleStatusChange = (id: number, status: string) => {
    updateTask.mutate({ id, status: status as any }, {
      onSuccess: () => toast.success("Estado actualizado"),
    });
  };

  const handleAddNote = (tareaId: number) => {
    if (!noteText.trim()) return;
    createNote.mutate({ tareaId, contenido: noteText, autor: "Sindy Castro" }, {
      onSuccess: () => {
        toast.success("Nota agregada");
        setNoteText("");
        setNoteTaskId(null);
      },
    });
  };

  const parsePropuesta = (p: string | null): string[] => {
    if (!p) return [];
    try { return JSON.parse(p); } catch { return [p]; }
  };

  const handleConfirmSend = async (tareaIds: number[]) => {
    setSending(true);
    try {
      const results = await sendToAll.mutateAsync({ tareaIds, baseUrl: window.location.origin });
      const withEmail = results.filter(r => r.sent).length;
      toast.success(`Correos registrados para ${results.length} responsables (${withEmail} con email)`);
      utils.correos.list.invalidate();
      setShowSendModal(false);
    } catch (err: any) {
      toast.error(err.message || "Error al enviar");
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, icon: ClipboardList, color: "text-foreground" },
          { label: "Completadas", value: stats.completadas, icon: CheckCircle2, color: "text-green-600" },
          { label: "En progreso", value: stats.enProgreso, icon: TrendingUp, color: "text-blue-600" },
          { label: "Pendientes", value: stats.pendientes, icon: Clock, color: "text-amber-600" },
          { label: "Vencidas", value: stats.vencidas, icon: AlertTriangle, color: "text-red-600" },
        ].map(kpi => (
          <Card key={kpi.label} className="border border-border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Acuerdos vencidos alert */}
      {(() => {
        const acuerdosVencidos = parentTasks.filter(t => t.isAcuerdo && t.acuerdoStatus !== "cerrado" && t.fechaTs && Number(t.fechaTs) < Date.now() && t.status !== "completada");
        if (acuerdosVencidos.length === 0) return null;
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800">
                {acuerdosVencidos.length} acuerdo{acuerdosVencidos.length > 1 ? "s" : ""} de reuni\u00f3n vencido{acuerdosVencidos.length > 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                {acuerdosVencidos.slice(0, 3).map(a => a.nombre || a.tarea).join(" \u2022 ")}
                {acuerdosVencidos.length > 3 ? ` y ${acuerdosVencidos.length - 3} m\u00e1s...` : ""}
              </p>
            </div>
          </div>
        );
      })()}

      {/* View Selector */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        {[
          { key: "list" as const, label: "Lista", icon: List },
          { key: "kanban" as const, label: "Kanban", icon: Columns3 },
          { key: "calendar" as const, label: "Calendario", icon: CalendarDays },
          { key: "timeline" as const, label: "Timeline", icon: GanttChart },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => { setViewMode(v.key); setCurrentPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              viewMode === v.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <v.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{v.label}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input id="dashboard-search" name="dashboardSearch" placeholder="Buscar tarea o responsable..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={areaFilter} onValueChange={setAreaFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Todas las áreas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_progreso">En progreso</SelectItem>
            <SelectItem value="completada">Completada</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="visto">Visto</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Mostrando {filtered.length} de {parentTasks.length} tareas</p>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateTask} onOpenChange={setShowCreateTask}>
            <DialogTrigger asChild>
              <Button variant="default" size="sm" className="bg-[#C0392B] hover:bg-[#A93226] text-white">
                <MessageSquarePlus className="w-4 h-4 mr-2" />Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-sm:max-w-[95vw] max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Crear Nueva Tarea</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-3">
                {/* Nombre */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre de la tarea *</label>
                  <Input placeholder="Título corto (máx 100 caracteres)" value={newTask.nombre} onChange={e => setNewTask(p => ({ ...p, nombre: e.target.value }))} maxLength={100} />
                </div>
                {/* Descripción */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Descripción</label>
                  <Textarea placeholder="Descripción detallada de la tarea..." value={newTask.descripcion} onChange={e => setNewTask(p => ({ ...p, descripcion: e.target.value }))} rows={5} className="resize-y min-h-[150px]" />
                </div>
                {/* Responsable + Área */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsable *</label>
                    <Select value={newTask.responsable} onValueChange={v => setNewTask(p => ({ ...p, responsable: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{responsables.map(r => <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Área *</label>
                    <Select value={newTask.area} onValueChange={v => setNewTask(p => ({ ...p, area: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Empresa + Prioridad */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
                    <Select value={newTask.empresa} onValueChange={v => setNewTask(p => ({ ...p, empresa: v }))}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {["CAP Honduras", "Distribuidora Mansiago", "Inversiones S&M", "CAP Soluciones Logísticas", "Auto Repuestos Blessing"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Prioridad</label>
                    <Select value={newTask.prioridad} onValueChange={v => setNewTask(p => ({ ...p, prioridad: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Alta</span></SelectItem>
                        <SelectItem value="media"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />Media</span></SelectItem>
                        <SelectItem value="baja"><span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-400" />Baja</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Estado + Fecha límite */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Estado inicial</label>
                    <Select value={newTask.status} onValueChange={v => setNewTask(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="en_progreso">En progreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha límite</label>
                    <Input type="date" value={newTask.fecha} onChange={e => setNewTask(p => ({ ...p, fecha: e.target.value }))} />
                  </div>
                </div>
                {/* Fecha creación + Tiempo estimado */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Fecha de creación</label>
                    <Input type="date" value={newTask.fechaCreacionManual} onChange={e => setNewTask(p => ({ ...p, fechaCreacionManual: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tiempo estimado (horas)</label>
                    <Input type="number" min="0" placeholder="Ej: 8" value={newTask.tiempoEstimado} onChange={e => setNewTask(p => ({ ...p, tiempoEstimado: e.target.value }))} />
                  </div>
                </div>
                {/* Etiquetas */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Etiquetas (separadas por coma)</label>
                  <Input placeholder="urgente, revisión, Q2" value={newTask.etiquetas} onChange={e => setNewTask(p => ({ ...p, etiquetas: e.target.value }))} />
                </div>
                {/* Toggles */}
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={newTask.esRecurrente} onChange={e => setNewTask(p => ({ ...p, esRecurrente: e.target.checked }))} className="rounded border-gray-300" />
                    ¿Es recurrente?
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={newTask.isAcuerdo} onChange={e => setNewTask(p => ({ ...p, isAcuerdo: e.target.checked }))} className="rounded border-gray-300" />
                    ¿Es acuerdo de reunión?
                  </label>
                </div>
                {newTask.esRecurrente && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Frecuencia</label>
                    <Select value={newTask.recurrencia} onValueChange={v => setNewTask(p => ({ ...p, recurrencia: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Diaria</SelectItem>
                        <SelectItem value="semanal">Semanal</SelectItem>
                        <SelectItem value="quincenal">Quincenal</SelectItem>
                        <SelectItem value="mensual">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Checklist */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Checklist inicial (un ítem por línea)</label>
                  <Textarea placeholder="Revisar documentos\nEnviar correo\nAgendar seguimiento" value={newTask.checklistText} onChange={e => setNewTask(p => ({ ...p, checklistText: e.target.value }))} rows={3} />
                </div>
                {/* Validation messages */}
                {(!newTask.nombre || !newTask.responsable || !newTask.area) && (
                  <p className="text-[10px] text-red-500">* Nombre, responsable y área son obligatorios</p>
                )}
                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <Button className="flex-1 bg-[#C0392B] hover:bg-[#A93226] text-white" disabled={!newTask.nombre || !newTask.responsable || !newTask.area || createTask.isPending}
                    onClick={() => {
                      const dateStr = newTask.fecha ? new Date(newTask.fecha + "T12:00:00").toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
                      const checklist = newTask.checklistText.split("\n").filter(l => l.trim()).map(l => ({ text: l.trim(), done: false }));
                      const tags = newTask.etiquetas.split(",").map(t => t.trim()).filter(Boolean);
                      createTask.mutate({
                        nombre: newTask.nombre,
                        tarea: newTask.descripcion || newTask.nombre,
                        responsable: newTask.responsable,
                        area: newTask.area,
                        fecha: dateStr,
                        propuesta: "[]",
                        prioridad: newTask.prioridad as any,
                      empresa: newTask.empresa || undefined,
                      status: newTask.status as any,
                      esRecurrente: newTask.esRecurrente || undefined,
                      recurrencia: newTask.esRecurrente ? newTask.recurrencia as any : undefined,
                      isAcuerdo: newTask.isAcuerdo || undefined,
                      tiempoEstimado: newTask.tiempoEstimado ? parseInt(newTask.tiempoEstimado) : undefined,
                      checklist: checklist.length > 0 ? JSON.stringify(checklist) : undefined,
                      etiquetas: tags.length > 0 ? JSON.stringify(tags) : undefined,
                      fechaCreacionManual: newTask.fechaCreacionManual || undefined,
                      });
                    }}>
                    {createTask.isPending ? "Creando..." : "Crear Tarea"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateTask(false)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => setShowSendModal(true)}
          >
            <Mail className="w-4 h-4 mr-2" />
            Enviar tareas a responsables
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const printWindow = window.open("", "_blank");
              if (!printWindow) { toast.error("Habilita popups para exportar PDF"); return; }
              const rows = filtered.map(t => {
                let props: string[] = [];
                try { props = JSON.parse(t.propuesta ?? "[]"); } catch { props = []; }
                return `<tr>
                  <td style="padding:8px;border-bottom:1px solid #eee"><strong>${t.tarea}</strong></td>
                  <td style="padding:8px;border-bottom:1px solid #eee">${t.area}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee">${t.responsable}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee">${t.fecha}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee">${STATUS_LABELS[t.status] ?? t.status}</td>
                  <td style="padding:8px;border-bottom:1px solid #eee;font-size:11px">${props.map(p => `• ${p}`).join("<br/>")}</td>
                </tr>`;
              }).join("");
              const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reporte de Tareas - Grupo CAP</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:1100px;margin:0 auto;padding:30px;color:#1a1a1a;font-size:12px}
              h1{color:#C0392B;border-bottom:3px solid #C0392B;padding-bottom:10px;font-size:20px}
              table{width:100%;border-collapse:collapse;margin:16px 0}
              th{background:#f1f1f1;padding:10px 8px;text-align:left;font-size:11px;text-transform:uppercase;color:#555}
              @media print{body{padding:15px}}</style></head><body>
              <h1>ARIA - Reporte de Tareas</h1>
              <p style="color:#666">Grupo CAP Honduras | ${new Date().toLocaleDateString("es-HN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
              <table><thead><tr><th>Tarea</th><th>Area</th><th>Responsable</th><th>Fecha</th><th>Estado</th><th>Propuesta</th></tr></thead>
              <tbody>${rows}</tbody></table></body></html>`;
              printWindow.document.write(html);
              printWindow.document.close();
              setTimeout(() => { printWindow.print(); }, 500);
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {viewMode === "calendar" && (
        <CalendarView tasks={filtered} onTaskClick={(t) => setSelectedTask(t)} />
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (() => {
        const columns = [
          { key: "pendiente", label: "Pendiente", color: "border-amber-300 bg-amber-50" },
          { key: "en_progreso", label: "En Progreso", color: "border-blue-300 bg-blue-50" },
          { key: "completada", label: "Completada", color: "border-green-300 bg-green-50" },
          { key: "vencida", label: "Vencida", color: "border-red-300 bg-red-50" },
        ];
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {columns.map(col => {
              const colTasks = filtered.filter(t => t.status === col.key);
              return (
                <div key={col.key} className={`rounded-xl border-2 ${col.color} p-3 min-h-[200px]`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold">{col.label}</h3>
                    <Badge variant="outline" className="text-xs">{colTasks.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {colTasks.map(task => (
                      <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setSelectedTask(task)}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium line-clamp-2">{task.nombre || task.tarea}</p>
                          {(task as any).descripcion && (
                            <p className="text-[11px] text-muted-foreground/70 mt-1 line-clamp-2">{((task as any).descripcion as string).substring(0, 80)}{((task as any).descripcion as string).length > 80 ? "..." : ""}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <span>{task.responsable}</span>
                            <span>{task.fecha}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {Object.entries(STATUS_LABELS).filter(([k]) => k !== task.status).map(([k, v]) => (
                              <button key={k}
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, k); }}
                                className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">
                                {v}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* TIMELINE VIEW */}
      {viewMode === "timeline" && (
        <div className="text-center py-12">
          <GanttChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">La vista Timeline completa est\u00e1 disponible en el m\u00f3dulo <strong>L\u00ednea de Tiempo</strong> del sidebar.</p>
          <p className="text-xs text-muted-foreground mt-1">Usa <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px]">Alt+9</kbd> para acceder rápidamente.</p>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === "list" && <div className="space-y-3">
        {filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(task => {
          const prioConf = PRIORIDAD_COLORS[task.prioridad] ?? PRIORIDAD_COLORS.media;
          const stCount = subtaskCounts[task.id];
          return (
            <Card
              key={task.id}
              className="border border-border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1.5">
                      {/* Priority dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${prioConf.dot}`} />
                      <div>
                        {editingTaskId === task.id ? (
                        <input
                          autoFocus
                          value={editingName}
                          onChange={e => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName.trim()) updateTask.mutate({ id: task.id, nombre: editingName.trim() });
                            setEditingTaskId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              if (editingName.trim()) updateTask.mutate({ id: task.id, nombre: editingName.trim() });
                              setEditingTaskId(null);
                            }
                            if (e.key === "Escape") setEditingTaskId(null);
                          }}
                          onClick={e => e.stopPropagation()}
                          className="font-semibold text-sm text-foreground leading-snug border-b-2 border-[#C0392B] bg-transparent outline-none w-full"
                        />
                      ) : (
                        <span
                          className="font-semibold text-sm text-foreground leading-snug"
                          onDoubleClick={e => { e.stopPropagation(); setEditingTaskId(task.id); setEditingName(task.nombre || task.tarea); }}
                        >{task.nombre || task.tarea}</span>
                      )}
                        {task.nombre && task.tarea !== task.nombre && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.tarea}</p>
                        )}
                        {(task as any).descripcion && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-1">{((task as any).descripcion as string).substring(0, 100)}{((task as any).descripcion as string).length > 100 ? "..." : ""}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground ml-4">
                      <Badge variant="outline" className="text-[10px] font-medium">{task.area}</Badge>
                      <span>{task.responsable}</span>
                      <span>{task.fecha}</span>
                      {/* Priority badge */}
                      <Badge className={`${prioConf.bg} ${prioConf.text} border-0 text-[10px]`}>
                        <Flag className="w-2.5 h-2.5 mr-0.5" />
                        {task.prioridad === "alta" ? "Alta" : task.prioridad === "baja" ? "Baja" : "Media"}
                      </Badge>
                      {/* Avance */}
                      {task.avance > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Percent className="w-2.5 h-2.5" /> {task.avance}%
                        </Badge>
                      )}
                      {/* Subtask count */}
                      {stCount && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <ListChecks className="w-2.5 h-2.5" /> {stCount.done}/{stCount.total}
                        </Badge>
                      )}
                      {/* Timer */}
                      {(task as any).tiempoRegistrado > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-0.5">
                          <Timer className="w-2.5 h-2.5" /> {(task as any).tiempoRegistrado}m
                        </Badge>
                      )}
                    </div>
                    {task.propuesta && (
                      <ul className="mt-2 space-y-0.5 ml-4">
                        {parsePropuesta(task.propuesta).slice(0, 2).map((p, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{p}</span>
                          </li>
                        ))}
                        {parsePropuesta(task.propuesta).length > 2 && (
                          <li className="text-xs text-muted-foreground/60 ml-3">+{parsePropuesta(task.propuesta).length - 2} más...</li>
                        )}
                      </ul>
                    )}
                    {/* Progress bar */}
                    {task.avance > 0 && (
                      <div className="mt-2 ml-4 w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${task.avance}%`,
                            backgroundColor: task.avance === 100 ? "#22c55e" : task.avance >= 50 ? "#3b82f6" : "#f59e0b",
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <Select value={task.status} onValueChange={(v) => handleStatusChange(task.id, v)}>
                      <SelectTrigger className={`h-7 text-[11px] w-28 border ${STATUS_COLORS[task.status] ?? ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(task.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            P\u00e1gina {currentPage} de {Math.ceil(filtered.length / PAGE_SIZE)}
          </span>
          <Button variant="outline" size="sm" disabled={currentPage >= Math.ceil(filtered.length / PAGE_SIZE)}
            onClick={() => setCurrentPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
      </div>}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          tarea={selectedTask}
          allTareas={tasks}
          onClose={() => setSelectedTask(null)}
        />
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm !== null && (
        <Dialog open={true} onOpenChange={() => setShowDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="text-red-600">Eliminar tarea</DialogTitle></DialogHeader>
            <p className="text-sm text-gray-600 mt-2">¿Estás seguro? Esta acción no se puede deshacer.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" size="sm" disabled={deleteTarea.isPending}
                onClick={() => { deleteTarea.mutate({ id: showDeleteConfirm }); setShowDeleteConfirm(null); }}>
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Send Confirmation Modal */}
      {showSendModal && (
        <SendConfirmModal
          tareas={filtered}
          responsables={responsables}
          onConfirm={handleConfirmSend}
          onClose={() => setShowSendModal(false)}
          isSending={sending}
        />
      )}
    </div>
  );
}
