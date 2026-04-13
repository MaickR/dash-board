import { useState, useMemo, useEffect, useRef } from "react";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  X, ChevronDown, ChevronRight, Plus, MessageSquare,
  Calendar, User, Flag, Link2, Tag, Percent, ListChecks,
  Clock, AlertTriangle, CheckCircle2, Eye, Trash2,
  Play, Square, Paperclip, History, Edit3, Timer, Building2,
  FolderOpen, Save, Send
} from "lucide-react";

type Tarea = {
  id: number;
  area: string;
  tarea: string;
  responsable: string;
  fecha: string;
  fechaTs: number | null;
  propuesta: string | null;
  status: string;
  prioridad: string;
  avance: number;
  parentId: number | null;
  nombre: string | null;
  descripcion: string | null;
  etiquetas: string | null;
  responsablesIds: string | null;
  dependeDeId: number | null;
  fechaInicio: string | null;
  source: string | null;
  reunion: string | null;
  tiempoRegistrado?: number | null;
  tiempoEstimado?: number | null;
  checklist?: any;
  empresa?: string | null;
  fechaCreacionManual?: string | null;
  esRecurrente?: boolean | null;
  recurrencia?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

interface TaskDrawerProps {
  tarea: Tarea | null;
  allTareas: Tarea[];
  onClose: () => void;
  onDelete?: (id: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-800", icon: Clock },
  en_progreso: { label: "En Progreso", color: "bg-blue-100 text-blue-800", icon: ChevronRight },
  completada: { label: "Completada", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  vencida: { label: "Vencida", color: "bg-red-100 text-red-800", icon: AlertTriangle },
  visto: { label: "Visto", color: "bg-purple-100 text-purple-800", icon: Eye },
  en_revision: { label: "En Revisión", color: "bg-cyan-100 text-cyan-800", icon: Eye },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700 border-red-200" },
  media: { label: "Media", color: "bg-orange-100 text-orange-700 border-orange-200" },
  baja: { label: "Baja", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function formatMinutes(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins > 0 ? `${h}h ${mins}m` : `${h}h`;
}

/* Collapsible section wrapper */
function Section({ title, icon: Icon, count, defaultOpen = true, children }: {
  title: string; icon: any; count?: number; defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="px-4 sm:px-6 py-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 hover:text-gray-700 w-full text-left min-h-[36px]"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        <Icon className="w-3.5 h-3.5" />
        <span className="flex-1">{title}</span>
        {count !== undefined && <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">{count}</span>}
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

export default function TaskDrawer({ tarea, allTareas, onClose, onDelete }: TaskDrawerProps) {
  const [showSubtareaForm, setShowSubtareaForm] = useState(false);
  const [newSubtarea, setNewSubtarea] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSubtareaConfirm, setDeleteSubtareaConfirm] = useState<{ id: number; tarea: string } | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [newCheckItem, setNewCheckItem] = useState("");
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const utils = trpc.useUtils();
  const updateTarea = trpc.tareas.update.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); toast.success("Tarea actualizada"); },
  });
  const deleteTarea = trpc.tareas.delete.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); toast.success("Tarea eliminada"); onClose(); },
  });
  const createSubtarea = trpc.tareas.createSubtarea.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); setNewSubtarea(""); setShowSubtareaForm(false); toast.success("Subtarea creada"); },
  });
  const deleteSubtarea = trpc.tareas.deleteSubtarea.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); setDeleteSubtareaConfirm(null); toast.success("Subtarea eliminada"); },
  });
  const { data: notas = [] } = trpc.notas.list.useQuery(
    { tareaId: tarea?.id ?? 0 },
    { enabled: !!tarea }
  );
  const createNota = trpc.notas.create.useMutation({
    onSuccess: () => { utils.notas.list.invalidate(); setNewComment(""); toast.success("Comentario agregado"); },
  });
  const { data: actividad = [] } = trpc.actividad.byTarea.useQuery(
    { tareaId: tarea?.id ?? 0 },
    { enabled: !!tarea }
  );
  const { data: responsables = [] } = trpc.responsables.list.useQuery();
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();

  const startTimer = trpc.timer.start.useMutation({
    onSuccess: () => { setTimerRunning(true); toast.success("Cronómetro iniciado"); },
  });
  const stopTimer = trpc.timer.stop.useMutation({
    onSuccess: (data) => {
      setTimerRunning(false);
      setTimerElapsed(0);
      if (timerRef.current) clearInterval(timerRef.current);
      utils.tareas.list.invalidate();
      toast.success(`Tiempo registrado: ${formatMinutes(data.duracion ?? 0)}`);
    },
  });
  const { data: runningTimer } = trpc.timer.running.useQuery(
    { tareaId: tarea?.id ?? 0 },
    { enabled: !!tarea }
  );

  useEffect(() => {
    if (runningTimer) {
      setTimerRunning(true);
      const startTime = Number(runningTimer.inicio);
      const update = () => setTimerElapsed(Math.floor((Date.now() - startTime) / 1000));
      update();
      timerRef.current = setInterval(update, 1000);
    } else {
      setTimerRunning(false);
      setTimerElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [runningTimer]);

  const subtareas = useMemo(() => {
    if (!tarea) return [];
    return allTareas.filter(t => t.parentId === tarea.id);
  }, [tarea, allTareas]);

  const dependsOn = useMemo(() => {
    if (!tarea?.dependeDeId) return null;
    return allTareas.find(t => t.id === tarea.dependeDeId) ?? null;
  }, [tarea, allTareas]);

  const blockedBy = useMemo(() => {
    if (!tarea) return [];
    return allTareas.filter(t => t.dependeDeId === tarea.id);
  }, [tarea, allTareas]);

  const etiquetasList: string[] = useMemo(() => {
    if (!tarea?.etiquetas) return [];
    try { return JSON.parse(tarea.etiquetas); } catch { return []; }
  }, [tarea]);

  const checklistItems: { text: string; done: boolean }[] = useMemo(() => {
    if (!tarea?.checklist) return [];
    if (Array.isArray(tarea.checklist)) return tarea.checklist;
    try { return JSON.parse(tarea.checklist as string); } catch { return []; }
  }, [tarea]);

  // Unique areas from departamentos
  const areaOptions = useMemo(() => {
    const areas = departamentos.map((d: any) => d.nombre);
    if (tarea?.area && !areas.includes(tarea.area)) areas.push(tarea.area);
    return Array.from(new Set(areas)).sort();
  }, [departamentos, tarea]);

  // Unique empresas
  const empresaOptions = useMemo(() => {
    const empresas = departamentos.map((d: any) => d.empresa).filter(Boolean);
    return Array.from(new Set(empresas)).sort();
  }, [departamentos]);

  if (!tarea) return null;

  const statusConf = STATUS_CONFIG[tarea.status] ?? STATUS_CONFIG.pendiente;
  const prioConf = PRIORIDAD_CONFIG[tarea.prioridad] ?? PRIORIDAD_CONFIG.media;

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValues(prev => ({ ...prev, [field]: value }));
  };

  const saveField = (field: string) => {
    const val = editValues[field];
    if (val === undefined) return;
    const update: any = {};
    if (field === "nombre") update.nombre = val;
    else if (field === "descripcion") update.descripcion = val;
    else if (field === "tarea") update.tarea = val;
    else if (field === "fecha") {
      const d = new Date(val + "T12:00:00");
      update.fecha = d.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } else if (field === "fechaInicio") {
      const d = new Date(val + "T12:00:00");
      update.fechaInicio = d.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } else if (field === "tiempoEstimado") update.tiempoEstimado = parseInt(val) || null;
    updateTarea.mutate({ id: tarea.id, ...update });
    setEditingField(null);
  };

  const toggleCheckItem = (index: number) => {
    const updated = [...checklistItems];
    updated[index] = { ...updated[index], done: !updated[index].done };
    updateTarea.mutate({ id: tarea.id, checklist: updated });
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const updated = [...checklistItems, { text: newCheckItem.trim(), done: false }];
    updateTarea.mutate({ id: tarea.id, checklist: updated });
    setNewCheckItem("");
  };

  const removeCheckItem = (index: number) => {
    const updated = checklistItems.filter((_, i) => i !== index);
    updateTarea.mutate({ id: tarea.id, checklist: updated });
  };

  const handleAreaChange = (newArea: string) => {
    updateTarea.mutate({ id: tarea.id, area: newArea });
    // Auto-suggest responsable from that department
    const dept = departamentos.find((d: any) => d.nombre === newArea);
    if (dept && (dept as any).responsableActual && (dept as any).responsableActual !== tarea.responsable) {
      toast.info(`Responsable sugerido: ${(dept as any).responsableActual}`, {
        action: {
          label: "Asignar",
          onClick: () => updateTarea.mutate({ id: tarea.id, responsable: (dept as any).responsableActual }),
        },
      });
    }
  };

  const timerDisplay = timerRunning
    ? `${Math.floor(timerElapsed / 3600).toString().padStart(2, "0")}:${Math.floor((timerElapsed % 3600) / 60).toString().padStart(2, "0")}:${(timerElapsed % 60).toString().padStart(2, "0")}`
    : formatMinutes(tarea.tiempoRegistrado ?? 0);

  const checklistDone = checklistItems.filter(c => c.done).length;
  const checklistTotal = checklistItems.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Drawer - full screen on mobile */}
      <div className="fixed z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 bg-background text-foreground shadow-2xl
        inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:bottom-0 sm:w-full sm:max-w-xl">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b bg-card flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge className={prioConf.color + " border text-xs font-semibold"}>
              <Flag className="w-3 h-3 mr-1" />{prioConf.label}
            </Badge>
            <Badge className={statusConf.color + " text-xs"}>{statusConf.label}</Badge>
            {tarea.empresa && (
              <Badge variant="outline" className="text-[10px]"><Building2 className="w-3 h-3 mr-1" />{tarea.empresa}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ===== SCROLLABLE CONTENT ===== */}
        <div className="flex-1 overflow-y-auto">

          {/* Section 1: Title & Description */}
          <div className="px-4 sm:px-5 pt-4 pb-3">
            {editingField === "nombre" ? (
              <Input
                autoFocus
                value={editValues.nombre ?? ""}
                onChange={e => setEditValues(p => ({ ...p, nombre: e.target.value }))}
                onBlur={() => saveField("nombre")}
                onKeyDown={e => e.key === "Enter" && saveField("nombre")}
                maxLength={200}
                className="text-lg font-bold min-h-[44px]"
              />
            ) : (
              <h2
                className="text-lg font-bold text-foreground leading-snug cursor-pointer hover:bg-accent rounded px-1 -mx-1 transition-colors group"
                onDoubleClick={() => startEditing("nombre", tarea.nombre || tarea.tarea)}
              >
                {tarea.nombre || tarea.tarea}
                <Edit3 className="w-3 h-3 inline ml-2 opacity-0 group-hover:opacity-40" />
              </h2>
            )}
            {editingField === "descripcion" ? (
              <Textarea
                autoFocus
                value={editValues.descripcion ?? ""}
                onChange={e => setEditValues(p => ({ ...p, descripcion: e.target.value }))}
                onBlur={() => saveField("descripcion")}
                rows={5}
                className="mt-2 text-sm min-h-[120px] resize-y"
              />
            ) : (
              <p
                className="text-sm text-muted-foreground mt-1 leading-relaxed cursor-pointer hover:bg-accent rounded px-1 -mx-1 transition-colors whitespace-pre-wrap"
                onDoubleClick={() => startEditing("descripcion", tarea.descripcion || tarea.tarea)}
              >
                {tarea.descripcion || tarea.tarea}
                {!tarea.descripcion && <span className="text-xs text-muted-foreground/50 ml-2">(doble clic para editar)</span>}
              </p>
            )}
            {/* Tags */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs"><FolderOpen className="w-3 h-3 mr-1" />{tarea.area}</Badge>
              {etiquetasList.map((et, i) => (
                <Badge key={i} variant="secondary" className="text-xs"><Tag className="w-3 h-3 mr-1" />{et}</Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Section 2: Dates & Assignment */}
          <div className="px-4 sm:px-5 py-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Responsable */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" /> Responsable</span>
                <Select
                  value={tarea.responsable}
                  onValueChange={(val) => updateTarea.mutate({ id: tarea.id, responsable: val })}
                >
                  <SelectTrigger className="h-9 text-xs min-h-[36px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {responsables.map((r: any) => (
                      <SelectItem key={r.id} value={r.nombre}>{r.nombre}</SelectItem>
                    ))}
                    {!responsables.find((r: any) => r.nombre === tarea.responsable) && (
                      <SelectItem value={tarea.responsable}>{tarea.responsable}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Area / Departamento */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><FolderOpen className="w-3 h-3" /> Área</span>
                <Select
                  value={tarea.area}
                  onValueChange={handleAreaChange}
                >
                  <SelectTrigger className="h-9 text-xs min-h-[36px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {areaOptions.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha de entrega */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha entrega</span>
                {editingField === "fecha" ? (
                  <Input
                    type="date"
                    autoFocus
                    value={editValues.fecha ?? ""}
                    onChange={e => setEditValues(p => ({ ...p, fecha: e.target.value }))}
                    onBlur={() => saveField("fecha")}
                    className="h-9 text-xs min-h-[36px]"
                  />
                ) : (
                  <p
                    className="font-medium text-foreground cursor-pointer hover:bg-accent rounded px-1 -mx-1 min-h-[36px] flex items-center"
                    onClick={() => startEditing("fecha", "")}
                  >
                    {tarea.fecha || "Sin fecha"}
                  </p>
                )}
              </div>

              {/* Fecha inicio */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha inicio</span>
                {editingField === "fechaInicio" ? (
                  <Input
                    type="date"
                    autoFocus
                    value={editValues.fechaInicio ?? ""}
                    onChange={e => setEditValues(p => ({ ...p, fechaInicio: e.target.value }))}
                    onBlur={() => saveField("fechaInicio")}
                    className="h-9 text-xs min-h-[36px]"
                  />
                ) : (
                  <p
                    className="font-medium text-foreground cursor-pointer hover:bg-accent rounded px-1 -mx-1 min-h-[36px] flex items-center"
                    onClick={() => startEditing("fechaInicio", "")}
                  >
                    {tarea.fechaInicio || "Sin definir"}
                  </p>
                )}
              </div>

              {/* Prioridad */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Flag className="w-3 h-3" /> Prioridad</span>
                <Select
                  value={tarea.prioridad}
                  onValueChange={(val) => updateTarea.mutate({ id: tarea.id, prioridad: val as any })}
                >
                  <SelectTrigger className="h-9 text-xs min-h-[36px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Estado */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Estado</span>
                <Select
                  value={tarea.status}
                  onValueChange={(val) => updateTarea.mutate({ id: tarea.id, status: val as any })}
                >
                  <SelectTrigger className="h-9 text-xs min-h-[36px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_progreso">En Progreso</SelectItem>
                    <SelectItem value="completada">Completada</SelectItem>
                    <SelectItem value="en_revision">En Revisión</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="visto">Visto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Empresa */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" /> Empresa</span>
                <Select
                  value={tarea.empresa ?? ""}
                  onValueChange={(val) => updateTarea.mutate({ id: tarea.id, empresa: val })}
                >
                  <SelectTrigger className="h-9 text-xs min-h-[36px]"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAP Honduras">CAP Honduras</SelectItem>
                    <SelectItem value="Distribuidora Mansiago">Distribuidora Mansiago</SelectItem>
                    <SelectItem value="Inversiones S&M">Inversiones S&M</SelectItem>
                    <SelectItem value="CAP Soluciones Logísticas">CAP Soluciones Logísticas</SelectItem>
                    <SelectItem value="Auto Repuestos Blessing">Auto Repuestos Blessing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tiempo estimado */}
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" /> Tiempo estimado</span>
                {editingField === "tiempoEstimado" ? (
                  <Input
                    type="number"
                    autoFocus
                    placeholder="Horas"
                    value={editValues.tiempoEstimado ?? ""}
                    onChange={e => setEditValues(p => ({ ...p, tiempoEstimado: e.target.value }))}
                    onBlur={() => saveField("tiempoEstimado")}
                    onKeyDown={e => e.key === "Enter" && saveField("tiempoEstimado")}
                    className="h-9 text-xs min-h-[36px]"
                  />
                ) : (
                  <p
                    className="font-medium text-foreground cursor-pointer hover:bg-accent rounded px-1 -mx-1 min-h-[36px] flex items-center"
                    onClick={() => startEditing("tiempoEstimado", String(tarea.tiempoEstimado ?? ""))}
                  >
                    {tarea.tiempoEstimado ? `${tarea.tiempoEstimado}h` : "Sin estimar"}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 3: Progress */}
          <div className="px-4 sm:px-5 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Percent className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progreso</span>
              <span className="text-sm font-bold ml-auto">{tarea.avance}%</span>
            </div>
            <Slider
              value={[tarea.avance]}
              max={100}
              step={5}
              className="w-full"
              onValueCommit={(val) => updateTarea.mutate({ id: tarea.id, avance: val[0] })}
            />
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${tarea.avance}%`,
                  backgroundColor: tarea.avance === 100 ? "#22c55e" : tarea.avance >= 50 ? "#3b82f6" : "#f59e0b",
                }}
              />
            </div>
          </div>

          <Separator />

          {/* Section 4: Timer */}
          <div className="px-4 sm:px-5 py-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-muted-foreground">Cronómetro</span>
                <p className={`text-lg font-mono font-bold ${timerRunning ? "text-[#C0392B]" : "text-foreground"}`}>
                  {timerDisplay}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {!timerRunning ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white min-h-[36px]"
                    onClick={() => startTimer.mutate({ tareaId: tarea.id })}
                    disabled={startTimer.isPending}
                  >
                    <Play className="w-3 h-3 mr-1" /> Iniciar
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="min-h-[36px]"
                    onClick={() => stopTimer.mutate({ tareaId: tarea.id })}
                    disabled={stopTimer.isPending}
                  >
                    <Square className="w-3 h-3 mr-1" /> Detener
                  </Button>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Section 5: Checklist */}
          <Section title="Checklist" icon={CheckCircle2} count={checklistTotal} defaultOpen={checklistTotal > 0}>
            {checklistTotal > 0 && (
              <div className="mb-2">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${checklistTotal > 0 ? (checklistDone / checklistTotal) * 100 : 0}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{checklistDone}/{checklistTotal} completados</span>
              </div>
            )}
            <div className="space-y-1.5">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 group min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleCheckItem(i)}
                    className="w-4 h-4 rounded accent-[#C0392B] flex-shrink-0"
                  />
                  <span className={`flex-1 text-sm ${item.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.text}</span>
                  <button onClick={() => removeCheckItem(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 items-center mt-2">
                <input
                  type="text"
                  value={newCheckItem}
                  onChange={e => setNewCheckItem(e.target.value)}
                  placeholder="Agregar item..."
                  className="flex-1 text-sm border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C0392B]/30 bg-background min-h-[36px]"
                  onKeyDown={e => e.key === "Enter" && addCheckItem()}
                />
                <Button size="sm" variant="ghost" onClick={addCheckItem} disabled={!newCheckItem.trim()} className="min-h-[36px]">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Section 6: Subtareas */}
          <Section title="Subtareas" icon={ListChecks} count={subtareas.length}>
            <div className="space-y-2">
              {subtareas.map(st => {
                const stConf = STATUS_CONFIG[st.status] ?? STATUS_CONFIG.pendiente;
                return (
                  <div key={st.id} className="group flex items-center gap-3 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors min-h-[40px]">
                    <input
                      type="checkbox"
                      checked={st.status === "completada"}
                      onChange={() => updateTarea.mutate({
                        id: st.id,
                        status: st.status === "completada" ? "pendiente" : "completada",
                        avance: st.status === "completada" ? 0 : 100,
                      })}
                      className="w-4 h-4 rounded accent-[#C0392B] flex-shrink-0"
                    />
                    <span className={`flex-1 text-sm min-w-0 truncate ${st.status === "completada" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {st.tarea}
                    </span>
                    <Badge className={stConf.color + " text-[10px] flex-shrink-0"}>{stConf.label}</Badge>
                    <button
                      onClick={() => setDeleteSubtareaConfirm({ id: st.id, tarea: st.tarea })}
                      className="opacity-0 group-hover:opacity-100 sm:opacity-100 text-muted-foreground hover:text-red-500 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center flex-shrink-0 transition-opacity"
                      title="Eliminar subtarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
              {showSubtareaForm ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={newSubtarea}
                    onChange={(e) => setNewSubtarea(e.target.value)}
                    placeholder="Descripción de la subtarea..."
                    className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C0392B]/30 bg-background min-h-[36px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newSubtarea.trim()) {
                        createSubtarea.mutate({
                          parentId: tarea.id, tarea: newSubtarea.trim(),
                          responsable: tarea.responsable, fecha: tarea.fecha, area: tarea.area,
                        });
                      }
                    }}
                  />
                  <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white min-h-[36px]" disabled={!newSubtarea.trim()}
                    onClick={() => {
                      if (newSubtarea.trim()) {
                        createSubtarea.mutate({
                          parentId: tarea.id, tarea: newSubtarea.trim(),
                          responsable: tarea.responsable, fecha: tarea.fecha, area: tarea.area,
                        });
                      }
                    }}>Agregar</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSubtareaForm(false)} className="min-h-[36px]"><X className="w-4 h-4" /></Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" className="text-[#C0392B] hover:text-[#a93226] text-xs min-h-[36px]" onClick={() => setShowSubtareaForm(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar subtarea
                </Button>
              )}
            </div>
          </Section>

          <Separator />

          {/* Section 7: Dependencies */}
          {(dependsOn || blockedBy.length > 0) && (
            <>
              <Section title="Dependencias" icon={Link2} defaultOpen={true}>
                {dependsOn && (
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <span className="text-muted-foreground text-xs">Depende de:</span>
                    <Badge variant="outline" className="text-xs font-normal">{dependsOn.nombre || dependsOn.tarea.substring(0, 50)}</Badge>
                  </div>
                )}
                {blockedBy.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-xs">Bloquea:</span>
                    {blockedBy.map(b => (
                      <Badge key={b.id} variant="outline" className="text-xs font-normal ml-2">{b.nombre || b.tarea.substring(0, 50)}</Badge>
                    ))}
                  </div>
                )}
              </Section>
              <Separator />
            </>
          )}

          {/* Section 8: Comments */}
          <Section title="Comentarios" icon={MessageSquare} count={notas.length}>
            <div className="space-y-3">
              {notas.map((n: any) => (
                <div key={n.id} className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-foreground">{n.autor}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("es-HN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{n.contenido}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Agregar comentario..."
                  className="flex-1 text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C0392B]/30 bg-background min-h-[36px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newComment.trim()) {
                      createNota.mutate({ tareaId: tarea.id, contenido: newComment.trim(), autor: "Sindy Castro" });
                    }
                  }}
                />
                <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white min-h-[36px]" disabled={!newComment.trim()}
                  onClick={() => {
                    if (newComment.trim()) {
                      createNota.mutate({ tareaId: tarea.id, contenido: newComment.trim(), autor: "Sindy Castro" });
                    }
                  }}>Enviar</Button>
              </div>
            </div>
          </Section>

          <Separator />

          {/* Section 9: Activity log */}
          <Section title="Historial de actividad" icon={History} count={actividad.length} defaultOpen={false}>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {actividad.length === 0 && <p className="text-xs text-muted-foreground">Sin actividad registrada</p>}
              {actividad.map((a: any) => (
                <div key={a.id} className="flex items-start gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-muted-foreground">{a.detalle}</span>
                    <span className="text-muted-foreground/60 ml-2">
                      {new Date(a.createdAt).toLocaleDateString("es-HN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Metadata footer */}
          <div className="px-4 sm:px-5 py-3 bg-muted/30 text-[10px] text-muted-foreground border-t">
            <div className="flex justify-between flex-wrap gap-1">
              <span>ID: #{tarea.id}</span>
              <span>Fuente: {tarea.source ?? "Manual"}</span>
              <span>Creada: {new Date(tarea.createdAt).toLocaleDateString("es-HN")}</span>
              {tarea.esRecurrente && <span className="text-[#C0392B]">Recurrente: {tarea.recurrencia}</span>}
            </div>
          </div>
        </div>

        {/* ===== FOOTER ACTIONS ===== */}
        <div className="px-4 sm:px-5 py-3 border-t bg-card flex items-center gap-2 flex-shrink-0">
          <Select
            value={tarea.status}
            onValueChange={(val) => updateTarea.mutate({ id: tarea.id, status: val as any })}
          >
            <SelectTrigger className="w-36 h-10 text-sm min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_progreso">En Progreso</SelectItem>
              <SelectItem value="completada">Completada</SelectItem>
              <SelectItem value="en_revision">En Revisión</SelectItem>
              <SelectItem value="visto">Visto</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            className="min-h-[44px] text-xs"
            onClick={() => {
              fetch("/api/trpc/teams.notify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ json: { title: `Tarea: ${tarea.nombre || tarea.tarea}`, message: `Responsable: ${tarea.responsable}\nÁrea: ${tarea.area}\nEstado: ${tarea.status}\nFecha: ${tarea.fecha}` } }),
              }).then(r => r.json()).then(() => toast.success("Notificación enviada a Teams")).catch(() => toast.error("Error: configura TEAMS_WEBHOOK_URL en Settings"));
            }}
          >
            <Send className="w-3.5 h-3.5 mr-1" />Teams
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-red-500 hover:text-red-700 min-h-[44px]">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={onClose} className="min-h-[44px]">Cerrar</Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          if (onDelete) {
            onDelete(tarea.id);
          } else {
            deleteTarea.mutate({ id: tarea.id });
          }
          setShowDeleteConfirm(false);
        }}
        title="Eliminar tarea"
        recordName={tarea.nombre || tarea.tarea}
        isLoading={deleteTarea.isPending}
      />

      <DeleteConfirmModal
        open={!!deleteSubtareaConfirm}
        onClose={() => setDeleteSubtareaConfirm(null)}
        onConfirm={() => {
          if (deleteSubtareaConfirm) {
            deleteSubtarea.mutate({ id: deleteSubtareaConfirm.id });
          }
        }}
        title="Eliminar subtarea"
        recordName={deleteSubtareaConfirm?.tarea}
        isLoading={deleteSubtarea.isPending}
      />
    </>
  );
}
