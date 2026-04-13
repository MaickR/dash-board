import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from "react";
import {
  CheckSquare, Search, Plus, Download, List, Columns3, CalendarDays, GanttChart,
  ChevronRight, Flag, Clock, AlertTriangle, CheckCircle2, Trash2, Timer,
  ChevronLeft, ArrowUpDown, Filter, X, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import TaskDrawer from "@/components/TaskDrawer";
import CalendarView from "@/components/CalendarView";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente", en_progreso: "En progreso", completada: "Completada",
  vencida: "Vencida", visto: "Visto", en_revision: "En Revisión",
};
const STATUS_COLORS: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  en_progreso: "bg-blue-100 text-blue-800 border-blue-200",
  completada: "bg-green-100 text-green-800 border-green-200",
  vencida: "bg-red-100 text-red-800 border-red-200",
  visto: "bg-purple-100 text-purple-800 border-purple-200",
  en_revision: "bg-orange-100 text-orange-800 border-orange-200",
};
const PRIO_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700", media: "bg-amber-100 text-amber-700", baja: "bg-gray-100 text-gray-600",
};

const EMPRESAS = ["Todas", "CAP Honduras", "Distribuidora Mansiago", "Inversiones S&M", "CAP Soluciones Logísticas", "Auto Repuestos Blessing", "Tecnicentro DIDASA"];

type ViewMode = "lista" | "kanban" | "calendario" | "gantt";

export default function TareasPage() {
  const { data: tasks = [], isLoading } = trpc.tareas.list.useQuery(undefined, { refetchInterval: 30000 });
  const { data: responsables = [] } = trpc.responsables.list.useQuery();
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  const { data: etiquetas = [] } = trpc.etiquetas.list.useQuery();
  const utils = trpc.useUtils();

  const updateTask = trpc.tareas.update.useMutation({ onSuccess: () => utils.tareas.list.invalidate() });
  const deleteTask = trpc.tareas.delete.useMutation({ onSuccess: () => utils.tareas.list.invalidate() });
  const createTask = trpc.tareas.create.useMutation({ onSuccess: () => { utils.tareas.list.invalidate(); setShowCreate(false); toast.success("Tarea creada"); resetCreateForm(); } });
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [searchQ, setSearchQ] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("Todas");
  const [filterArea, setFilterArea] = useState("Todas");
  const [filterResp, setFilterResp] = useState("Todos");
  const [filterPrio, setFilterPrio] = useState("Todas");
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [sortField, setSortField] = useState<string>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newResp, setNewResp] = useState("");
  const [newPrio, setNewPrio] = useState("media");
  const [newStatus, setNewStatus] = useState("pendiente");
  const [newFecha, setNewFecha] = useState("");
  const [newFechaLimite, setNewFechaLimite] = useState("");
  const [newTiempoEst, setNewTiempoEst] = useState("");
  const [newEsRecurrente, setNewEsRecurrente] = useState(false);
  const [newRecurrencia, setNewRecurrencia] = useState("semanal");
  const [newIsAcuerdo, setNewIsAcuerdo] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ id: number; nombre: string } | null>(null);
  const [forceCreate, setForceCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");

  const checkDuplicate = trpc.tareas.checkDuplicate.useQuery(
    { nombre: newName.trim() || "_", area: newArea || "General" },
    { enabled: false }
  );

  const areas = useMemo(() => {
    const set = new Set(tasks.map((t: any) => t.area).filter(Boolean));
    return ["Todas", ...Array.from(set).sort()];
  }, [tasks]);

  const respNames = useMemo(() => {
    const set = new Set(tasks.map((t: any) => t.responsable).filter(Boolean));
    return ["Todos", ...Array.from(set).sort()];
  }, [tasks]);

  const filtered = useMemo(() => {
    let result = [...tasks] as any[];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(t => (t.nombre || t.tarea || "").toLowerCase().includes(q) || (t.descripcion || "").toLowerCase().includes(q));
    }
    if (filterEmpresa !== "Todas") result = result.filter(t => t.empresa === filterEmpresa);
    if (filterArea !== "Todas") result = result.filter(t => t.area === filterArea);
    if (filterResp !== "Todos") result = result.filter(t => t.responsable === filterResp);
    if (filterPrio !== "Todas") result = result.filter(t => t.prioridad === filterPrio);
    if (filterStatus !== "Todos") result = result.filter(t => t.status === filterStatus);

    result.sort((a: any, b: any) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return result;
  }, [tasks, searchQ, filterEmpresa, filterArea, filterResp, filterPrio, filterStatus, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const resetCreateForm = () => {
    setNewName(""); setNewDesc(""); setNewArea(""); setNewResp("");
    setNewPrio("media"); setNewStatus("pendiente"); setNewFecha(""); setNewFechaLimite("");
    setNewTiempoEst(""); setNewEsRecurrente(false); setNewIsAcuerdo(false);
    setDuplicateWarning(null); setForceCreate(false);
  };

  const doCreate = () => {
    createTask.mutate({
      tarea: newName,
      nombre: newName,
      descripcion: newDesc || undefined,
      area: newArea || "General",
      responsable: newResp || "Sin asignar",
      fecha: newFechaLimite || new Date().toLocaleDateString("es-HN"),
      prioridad: newPrio as any,
      status: newStatus as any,
      fechaCreacionManual: newFecha || undefined,
      tiempoEstimado: newTiempoEst ? parseInt(newTiempoEst) : undefined,
      esRecurrente: newEsRecurrente,
      recurrencia: newEsRecurrente ? newRecurrencia as any : undefined,
      isAcuerdo: newIsAcuerdo,
      empresa: filterEmpresa !== "Todas" ? filterEmpresa : undefined,
    });
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error("El nombre es requerido"); return; }
    if (forceCreate) { doCreate(); return; }
    // Check for duplicates
    const result = await checkDuplicate.refetch();
    if (result.data?.isDuplicate && result.data.existing) {
      setDuplicateWarning({ id: result.data.existing.id, nombre: result.data.existing.tarea || result.data.existing.nombre || "" });
      return;
    }
    doCreate();
  };

  const handleInlineEdit = (id: number) => {
    if (editingName.trim()) {
      updateTask.mutate({ id, nombre: editingName, tarea: editingName });
    }
    setEditingId(null);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Nombre", "Área", "Responsable", "Prioridad", "Estado", "Fecha Límite", "Avance %"];
    const rows = filtered.map((t: any) => [t.id, t.nombre || t.tarea, t.area, t.responsable, t.prioridad, t.status, t.fecha, t.avance]);
    const csv = [headers.join(","), ...rows.map(r => r.map((c: any) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `tareas-aria-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  // Kanban columns
  const kanbanCols = ["pendiente", "en_progreso", "completada", "vencida"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            Gestión de Tareas
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} tareas {filterArea !== "Todas" || filterResp !== "Todos" ? "(filtradas)" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode selector */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {[
              { key: "lista" as const, icon: List, label: "Lista" },
              { key: "kanban" as const, icon: Columns3, label: "Kanban" },
              { key: "calendario" as const, icon: CalendarDays, label: "Cal" },
              { key: "gantt" as const, icon: GanttChart, label: "Gantt" },
            ].map(v => (
              <button key={v.key} onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-colors min-h-[36px] ${
                  viewMode === v.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}>
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="min-h-[36px]">
            <Filter className="w-3.5 h-3.5 mr-1" /><span className="hidden sm:inline">Filtros</span>
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} className="min-h-[36px]">
            <Download className="w-3.5 h-3.5 mr-1" /><span className="hidden sm:inline">CSV</span>
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary text-primary-foreground min-h-[36px]">
            <Plus className="w-3.5 h-3.5 mr-1" />Nueva Tarea
          </Button>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQ} onChange={e => { setSearchQ(e.target.value); setPage(1); }}
          placeholder="Buscar por nombre o descripción..." className="pl-10 min-h-[44px]" />
      </div>

      {/* Filters panel */}
      {showFilters && (
        <Card className="border border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Empresa</label>
                <Select value={filterEmpresa} onValueChange={v => { setFilterEmpresa(v); setPage(1); }}>
                  <SelectTrigger className="min-h-[40px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Área</label>
                <Select value={filterArea} onValueChange={v => { setFilterArea(v); setPage(1); }}>
                  <SelectTrigger className="min-h-[40px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Responsable</label>
                <Select value={filterResp} onValueChange={v => { setFilterResp(v); setPage(1); }}>
                  <SelectTrigger className="min-h-[40px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{respNames.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Prioridad</label>
                <Select value={filterPrio} onValueChange={v => { setFilterPrio(v); setPage(1); }}>
                  <SelectTrigger className="min-h-[40px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Estado</label>
                <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
                  <SelectTrigger className="min-h-[40px] text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* LIST VIEW */}
      {viewMode === "lista" && (
        <>
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {[
                    { field: "nombre", label: "Nombre" },
                    { field: "area", label: "Área" },
                    { field: "responsable", label: "Responsable" },
                    { field: "prioridad", label: "Prioridad" },
                    { field: "status", label: "Estado" },
                    { field: "fecha", label: "Fecha Límite" },
                    { field: "avance", label: "Avance" },
                  ].map(col => (
                    <th key={col.field} className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground"
                      onClick={() => toggleSort(col.field)}>
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortField === col.field && <ArrowUpDown className="w-3 h-3" />}
                      </div>
                    </th>
                  ))}
                  <th className="w-20 py-2.5 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((t: any) => (
                  <tr key={t.id} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                    <td className="py-2 px-3 max-w-[250px]">
                      {editingId === t.id ? (
                        <input autoFocus value={editingName} onChange={e => setEditingName(e.target.value)}
                          onBlur={() => handleInlineEdit(t.id)} onKeyDown={e => e.key === "Enter" && handleInlineEdit(t.id)}
                          className="w-full text-sm border border-primary rounded px-2 py-1 bg-background" />
                      ) : (
                        <div className="truncate font-medium text-foreground cursor-pointer"
                          onDoubleClick={() => { setEditingId(t.id); setEditingName(t.nombre || t.tarea); }}>
                          {t.nombre || t.tarea}
                        </div>
                      )}
                      {t.descripcion && <div className="text-[11px] text-muted-foreground truncate max-w-[250px]">{t.descripcion}</div>}
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{t.area}</td>
                    <td className="py-2 px-3">
                      <select value={t.responsable} onChange={e => updateTask.mutate({ id: t.id, responsable: e.target.value })}
                        className="text-xs bg-transparent border-none cursor-pointer text-foreground max-w-[120px]">
                        {respNames.filter(r => r !== "Todos").map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select value={t.prioridad} onChange={e => updateTask.mutate({ id: t.id, prioridad: e.target.value as any })}
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-none cursor-pointer ${PRIO_COLORS[t.prioridad] ?? ""}`}>
                        <option value="alta">Alta</option>
                        <option value="media">Media</option>
                        <option value="baja">Baja</option>
                      </select>
                    </td>
                    <td className="py-2 px-3">
                      <select value={t.status} onChange={e => updateTask.mutate({ id: t.id, status: e.target.value as any })}
                        className={`text-[10px] font-bold rounded-full px-2 py-0.5 border-none cursor-pointer ${STATUS_COLORS[t.status] ?? ""}`}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{t.fecha}</td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${t.avance}%` }} />
                        </div>
                        <span className="text-[10px] text-muted-foreground">{t.avance}%</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDeleteConfirm({ id: t.id, nombre: t.nombre ?? t.tarea ?? `Tarea #${t.id}` })}
                          className="text-muted-foreground hover:text-red-500 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center" title="Eliminar tarea">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setSelectedTask(t)}
                          className="text-muted-foreground hover:text-foreground p-1 min-w-[32px] min-h-[32px] flex items-center justify-center">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="min-h-[36px]">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="min-h-[36px]">
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* KANBAN VIEW */}
      {viewMode === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-3 px-3 sm:mx-0 sm:px-0">
          {kanbanCols.map(col => {
            const colTasks = filtered.filter((t: any) => t.status === col);
            return (
              <div key={col} className="flex-shrink-0 w-72 sm:w-80 bg-muted/30 rounded-xl p-3">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={`text-xs font-bold ${STATUS_COLORS[col] ?? ""}`}>
                    {STATUS_LABELS[col]} ({colTasks.length})
                  </Badge>
                </div>
                <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                  {colTasks.map((t: any) => (
                    <Card key={t.id} className="border border-border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTask(t)}>
                      <CardContent className="p-3">
                        <div className="font-medium text-sm text-foreground mb-1">{t.nombre || t.tarea}</div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{t.area}</span>
                          <span>·</span>
                          <span>{t.responsable}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className={`text-[9px] ${PRIO_COLORS[t.prioridad] ?? ""}`}>{t.prioridad}</Badge>
                          <span className="text-[10px] text-muted-foreground">{t.avance}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-8">Sin tareas</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CALENDAR VIEW */}
      {viewMode === "calendario" && <CalendarView tasks={filtered} onTaskClick={setSelectedTask} />}

      {/* GANTT VIEW */}
      {viewMode === "gantt" && (() => {
        const ganttTasks = filtered.filter((t: any) => !t.parentId);
        const now = new Date();
        const gStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        let gEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
        for (const t of ganttTasks) {
          const d = t.fecha ? (() => { const p = t.fecha.split('/'); return p.length === 3 ? new Date(+p[2], +p[1]-1, +p[0]) : null; })() : null;
          if (d && d > gEnd) gEnd = new Date(d.getTime() + 3 * 86400000);
        }
        const gDays = Math.ceil((gEnd.getTime() - gStart.getTime()) / 86400000);
        const dw = 28;
        const dayArr: Date[] = [];
        for (let i = 0; i < gDays; i++) dayArr.push(new Date(gStart.getTime() + i * 86400000));
        const grouped: Record<string, any[]> = {};
        for (const t of ganttTasks) { if (!grouped[t.area]) grouped[t.area] = []; grouped[t.area].push(t); }
        const sortedGroups = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]));
        const parseD = (s: string) => { const p = s.split('/'); return p.length === 3 ? new Date(+p[2], +p[1]-1, +p[0]) : null; };
        const getBar = (t: any) => {
          const end = t.fecha ? parseD(t.fecha) : null;
          if (!end) return null;
          const start = t.fechaInicio ? (parseD(t.fechaInicio) ?? new Date(end.getTime() - 7 * 86400000)) : new Date(end.getTime() - 7 * 86400000);
          const leftD = Math.max(0, (start.getTime() - gStart.getTime()) / 86400000);
          const dur = Math.max(1, (end.getTime() - start.getTime()) / 86400000);
          return { left: leftD * dw, width: Math.max(dur * dw, dw) };
        };
        const SC: Record<string, string> = { pendiente: '#f59e0b', en_progreso: '#3b82f6', completada: '#22c55e', vencida: '#ef4444', visto: '#a855f7' };
        const todayOff = Math.max(0, (now.getTime() - gStart.getTime()) / 86400000) * dw;
        return (
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <div className="flex">
              <div className="w-56 flex-shrink-0 border-r border-border bg-muted/30">
                <div className="h-10 border-b border-border px-3 flex items-center"><span className="text-[10px] font-semibold text-muted-foreground uppercase">Tarea</span></div>
                {sortedGroups.map(([area, at]) => (
                  <div key={area}>
                    <div className="h-7 bg-muted/50 px-3 flex items-center border-b border-border">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider truncate">{area}</span>
                      <Badge variant="outline" className="ml-auto text-[8px] h-3.5 px-1">{at.length}</Badge>
                    </div>
                    {at.map((t: any) => (
                      <div key={t.id} className="h-8 px-3 flex items-center border-b border-border/50 hover:bg-accent/20 cursor-pointer" onClick={() => setSelectedTask(t)}>
                        <span className="text-[10px] text-foreground truncate">{(t.nombre || t.tarea).substring(0, 30)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex-1 overflow-x-auto">
                <div style={{ width: gDays * dw, minWidth: '100%' }} className="relative">
                  <div className="h-10 border-b border-border flex">
                    {dayArr.map((d, i) => {
                      const isT = d.toDateString() === now.toDateString();
                      const isW = d.getDay() === 0 || d.getDay() === 6;
                      return <div key={i} className={`flex-shrink-0 border-r border-border/30 flex items-center justify-center ${isT ? 'bg-red-500/10' : isW ? 'bg-muted/30' : ''}`} style={{ width: dw }}><span className={`text-[8px] ${isT ? 'font-bold text-red-500' : 'text-muted-foreground'}`}>{d.getDate()}/{d.getMonth()+1}</span></div>;
                    })}
                  </div>
                  {sortedGroups.map(([area, at]) => (
                    <div key={area}>
                      <div className="h-7 bg-muted/30 border-b border-border" />
                      {at.map((t: any) => {
                        const bar = getBar(t);
                        return <div key={t.id} className="h-8 border-b border-border/30 relative">
                          {bar && <div className="absolute top-1 h-6 rounded flex items-center px-1.5 text-white text-[8px] font-medium shadow-sm overflow-hidden cursor-pointer" style={{ left: bar.left, width: bar.width, backgroundColor: SC[t.status] ?? '#9ca3af', opacity: t.status === 'completada' ? 0.6 : 1 }} onClick={() => setSelectedTask(t)} title={t.nombre || t.tarea}>
                            {t.avance > 0 && t.avance < 100 && <div className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l" style={{ width: `${t.avance}%` }} />}
                            <span className="relative z-10 truncate">{(t.nombre || t.tarea).substring(0, 18)}</span>
                          </div>}
                        </div>;
                      })}
                    </div>
                  ))}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none" style={{ left: todayOff }} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-3 py-2 border-t border-border text-[10px] text-muted-foreground">
              {Object.entries(SC).map(([k, c]) => <div key={k} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c }} /><span className="capitalize">{k.replace('_', ' ')}</span></div>)}
            </div>
          </div>
        );
      })()}

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-lg max-sm:!w-[calc(100vw-1rem)] max-sm:!max-w-none max-sm:!h-[100dvh] max-sm:!max-h-none max-sm:!rounded-none max-sm:!top-0 max-sm:!left-0 max-sm:!translate-x-0 max-sm:!translate-y-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />Nueva Tarea
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Nombre *</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nombre de la tarea" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Descripción</label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detalle completo..." rows={3} className="min-h-[80px]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Área</label>
                <Select value={newArea} onValueChange={v => {
                  setNewArea(v);
                  const dept = (departamentos as any[]).find(d => d.nombre === v);
                  if (dept?.responsableActualId) {
                    const resp = (responsables as any[]).find(r => r.id === dept.responsableActualId);
                    if (resp) setNewResp(resp.nombre);
                  }
                }}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(departamentos as any[]).map(d => <SelectItem key={d.id} value={d.nombre}>{d.nombre} ({d.empresa})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Responsable</label>
                <Select value={newResp} onValueChange={setNewResp}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {(responsables as any[]).map(r => <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Prioridad</label>
                <Select value={newPrio} onValueChange={setNewPrio}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Estado</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Fecha creación</label>
                <Input type="date" value={newFecha} onChange={e => setNewFecha(e.target.value)} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Fecha límite</label>
                <Input type="date" value={newFechaLimite} onChange={e => setNewFechaLimite(e.target.value)} className="min-h-[44px]" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tiempo estimado (horas)</label>
              <Input type="number" value={newTiempoEst} onChange={e => setNewTiempoEst(e.target.value)} placeholder="0" className="min-h-[44px]" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={newEsRecurrente} onChange={e => setNewEsRecurrente(e.target.checked)} className="rounded" />
                Recurrente
              </label>
              {newEsRecurrente && (
                <Select value={newRecurrencia} onValueChange={setNewRecurrencia}>
                  <SelectTrigger className="w-36 min-h-[40px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diaria">Diaria</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer min-h-[44px]">
                <input type="checkbox" checked={newIsAcuerdo} onChange={e => setNewIsAcuerdo(e.target.checked)} className="rounded" />
                Acuerdo de reunión
              </label>
            </div>
            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-800">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  Ya existe una tarea similar en este área
                </div>
                <p className="text-xs text-orange-700">
                  "{duplicateWarning.nombre.substring(0, 80)}{duplicateWarning.nombre.length > 80 ? '...' : ''}"
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="text-xs min-h-[36px]"
                    onClick={() => { setDuplicateWarning(null); setShowCreate(false); setSelectedTask({ id: duplicateWarning.id }); }}>
                    Ver tarea existente
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs min-h-[36px] border-orange-300 text-orange-700 hover:bg-orange-100"
                    onClick={() => { setForceCreate(true); setDuplicateWarning(null); doCreate(); }}>
                    Crear de todas formas
                  </Button>
                  <Button size="sm" variant="ghost" className="text-xs min-h-[36px]"
                    onClick={() => setDuplicateWarning(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); resetCreateForm(); }} className="min-h-[44px]">Cancelar</Button>
              <Button onClick={handleCreate} disabled={createTask.isPending || checkDuplicate.isFetching} className="min-h-[44px]">
                {(createTask.isPending || checkDuplicate.isFetching) ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Crear Tarea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          tarea={selectedTask}
          allTareas={tasks as any[]}
          onClose={() => setSelectedTask(null)}
          onDelete={(id) => {
            setSelectedTask(null);
            setDeleteConfirm({ id, nombre: selectedTask?.nombre ?? selectedTask?.tarea ?? `Tarea #${id}` });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteTask.mutate({ id: deleteConfirm.id }, {
              onSuccess: () => { toast.success("Tarea eliminada correctamente"); setDeleteConfirm(null); },
              onError: () => { toast.error("Error al eliminar la tarea"); setDeleteConfirm(null); },
            });
          }
        }}
        title="Eliminar tarea"
        recordName={deleteConfirm?.nombre}
        isLoading={deleteTask.isPending}
      />
    </div>
  );
}
