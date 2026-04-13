import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useMemo, useEffect, useState } from "react";
import {
  CalendarCheck, CheckCircle2, XCircle, Clock, FileText, History,
  ChevronDown, ChevronUp, Printer, Sparkles, Loader2, Eye, Check, X,
  Edit2, AlertTriangle, Upload, Mail, Handshake, CheckSquare, Activity,
  ArrowLeft, Users, Calendar, ExternalLink, Trash2,
} from "lucide-react";
import FileUploadExtractor from "@/components/FileUploadExtractor";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { toast } from "sonner";
import { useLocation } from "wouter";

const QUINCENALES = [
  { dia: "Lunes", hora: "8:30-10:00", area: "Coordinadores", responsable: "Todos" },
  { dia: "Martes", hora: "8:30-10:00", area: "Marketing", responsable: "Daniel Henríquez" },
  { dia: "Martes", hora: "10:00-11:30", area: "Talento Humano", responsable: "Silvia Ruiz" },
  { dia: "Miércoles", hora: "8:30-10:00", area: "Compras", responsable: "Samuel Ávila" },
  { dia: "Miércoles", hora: "10:00-11:30", area: "Legal", responsable: "Ángel Aguirre" },
  { dia: "Jueves", hora: "8:30-10:00", area: "Servicios Generales", responsable: "Ramiro Castejón" },
  { dia: "Jueves", hora: "10:00-11:30", area: "Contabilidad y Finanzas", responsable: "Wilfredo / Jeffrin" },
  { dia: "Viernes", hora: "8:30-10:00", area: "Procesos y Mejora Continua", responsable: "Carlos Rosales" },
  { dia: "Viernes", hora: "10:00-11:30", area: "Programación y Tecnología", responsable: "Víctor Hernández" },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  pendiente: <Clock className="w-4 h-4 text-amber-500" />,
  realizada: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  cancelada: <XCircle className="w-4 h-4 text-red-500" />,
};

const STATUS_BADGE: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  realizada: "bg-green-100 text-green-700 border-green-200",
  cancelada: "bg-red-100 text-red-700 border-red-200",
};

const ACUERDO_STATUS: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  en_seguimiento: { label: "En seguimiento", color: "bg-blue-100 text-blue-700" },
  cumplido: { label: "Cumplido", color: "bg-green-100 text-green-700" },
};

const TASK_STATUS: Record<string, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  en_progreso: { label: "En progreso", color: "bg-blue-100 text-blue-700" },
  completada: { label: "Completada", color: "bg-green-100 text-green-700" },
  vencida: { label: "Vencida", color: "bg-red-100 text-red-700" },
};

function getCurrentWeek(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.ceil((diff / oneWeek) + 1);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// ─── Area Expediente Sub-Component ───
function AreaExpediente({ area, onBack }: { area: string; onBack: () => void }) {
  const [, navigate] = useLocation();
  const { data: expediente, isLoading } = trpc.reuniones.areaExpediente.useQuery({ area });
  const [activeTab, setActiveTab] = useState<"sesiones" | "documentos" | "tareas" | "acuerdos" | "actividad">("sesiones");
  const [showUpload, setShowUpload] = useState(false);
  const [taskFilter, setTaskFilter] = useState("all");
  const utils = trpc.useUtils();

  const generateDrafts = trpc.borradores.generate.useMutation({
    onSuccess: () => {
      utils.reuniones.areaExpediente.invalidate({ area });
      utils.borradores.list.invalidate();
      toast.success("Borradores generados exitosamente");
    },
  });

  const updateAcuerdo = trpc.acuerdos.update.useMutation({
    onSuccess: () => {
      utils.reuniones.areaExpediente.invalidate({ area });
      toast.success("Acuerdo actualizado");
    },
  });

  const deleteReunion = trpc.reuniones.delete.useMutation({
    onSuccess: () => { utils.reuniones.areaExpediente.invalidate({ area }); toast.success("Sesión eliminada"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar la sesión"); setDeleteConfirm(null); },
  });
  const deleteArchivo = trpc.reuniones.deleteArchivo.useMutation({
    onSuccess: () => { utils.reuniones.areaExpediente.invalidate({ area }); toast.success("Documento eliminado"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar el documento"); setDeleteConfirm(null); },
  });
  const deleteAcuerdo = trpc.acuerdos.delete.useMutation({
    onSuccess: () => { utils.reuniones.areaExpediente.invalidate({ area }); toast.success("Acuerdo eliminado"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar el acuerdo"); setDeleteConfirm(null); },
  });
  const deleteTarea = trpc.tareas.delete.useMutation({
    onSuccess: () => { utils.reuniones.areaExpediente.invalidate({ area }); utils.tareas.list.invalidate(); toast.success("Tarea eliminada"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar la tarea"); setDeleteConfirm(null); },
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "reunion" | "archivo" | "acuerdo" | "tarea"; id: number; nombre: string } | null>(null);

  const areaInfo = QUINCENALES.find(q => q.area === area);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#C0392B]" />
      </div>
    );
  }

  const reuniones = expediente?.reuniones ?? [];
  const archivos = expediente?.archivos ?? [];
  const tareas = expediente?.tareas ?? [];
  const acuerdos = expediente?.acuerdos ?? [];
  const borradores = expediente?.borradores ?? [];
  const actividad = expediente?.actividad ?? [];

  const realizadas = reuniones.filter((r: any) => r.status === "realizada").length;
  const tareasCompletadas = tareas.filter((t: any) => t.status === "completada").length;
  const acuerdosCumplidos = acuerdos.filter((a: any) => a.status === "cumplido").length;

  const filteredTareas = taskFilter === "all" ? tareas : tareas.filter((t: any) => t.status === taskFilter);

  const tabs = [
    { key: "sesiones" as const, label: "Sesiones", icon: <CalendarCheck className="w-3.5 h-3.5" />, count: reuniones.length },
    { key: "documentos" as const, label: "Documentos", icon: <FileText className="w-3.5 h-3.5" />, count: archivos.length },
    { key: "tareas" as const, label: "Tareas", icon: <CheckSquare className="w-3.5 h-3.5" />, count: tareas.length },
    { key: "acuerdos" as const, label: "Acuerdos", icon: <Handshake className="w-3.5 h-3.5" />, count: acuerdos.length },
    { key: "actividad" as const, label: "Bitácora", icon: <Activity className="w-3.5 h-3.5" />, count: actividad.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-[#C0392B]" />
            Expediente: {area}
          </h2>
          {areaInfo && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {areaInfo.dia} {areaInfo.hora} · Responsable: {areaInfo.responsable}
            </div>
          )}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border border-border shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Sesiones</div>
            <div className="text-2xl font-bold text-foreground">{reuniones.length}</div>
            <div className="text-[10px] text-green-600">{realizadas} realizadas</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Documentos</div>
            <div className="text-2xl font-bold text-blue-600">{archivos.length}</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Tareas</div>
            <div className="text-2xl font-bold text-foreground">{tareas.length}</div>
            <div className="text-[10px] text-green-600">{tareasCompletadas} completadas</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Acuerdos</div>
            <div className="text-2xl font-bold text-amber-600">{acuerdos.length}</div>
            <div className="text-[10px] text-green-600">{acuerdosCumplidos} cumplidos</div>
          </CardContent>
        </Card>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Bitácora</div>
            <div className="text-2xl font-bold text-purple-600">{actividad.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-[#C0392B] text-[#C0392B]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}>
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                activeTab === tab.key ? "bg-[#C0392B] text-white" : "bg-muted text-muted-foreground"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Sesiones ─── */}
      {activeTab === "sesiones" && (
        <div className="space-y-3">
          {reuniones.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <CalendarCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay sesiones registradas para esta área</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
              {reuniones.map((r: any) => {
                const rArchivos = archivos.filter((a: any) => a.reunionId === r.id);
                const rTareas = tareas.filter((t: any) => t.reunionOrigenId === r.id);
                const rAcuerdos = acuerdos.filter((a: any) => a.reunionId === r.id);
                return (
                  <div key={r.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    <div className={`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-white ${
                      r.status === "realizada" ? "bg-green-500" :
                      r.status === "cancelada" ? "bg-red-500" : "bg-amber-400"
                    }`} />
                    <Card className="flex-1 border border-border shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">{r.semana}</span>
                            <Badge className={`text-[9px] border ${STATUS_BADGE[r.status] ?? ""}`}>
                              {r.status === "realizada" ? "Realizada" : r.status === "cancelada" ? "Cancelada" : "Pendiente"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#C0392B] hover:text-[#a93226] px-2"
                              onClick={() => navigate(`/reunion/${r.id}`)}>
                              Ver detalle <ExternalLink className="w-3 h-3 ml-1" />
                            </Button>
                            <button
                              onClick={() => setDeleteConfirm({ type: "reunion", id: r.id, nombre: `Sesión ${r.semana}` })}
                              className="text-muted-foreground hover:text-red-500 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded"
                              title="Eliminar sesión"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {r.fecha && (
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(r.fecha).toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long" })}
                          </div>
                        )}
                        {/* Mini summary of what this session contains */}
                        <div className="flex gap-3 text-[10px] text-muted-foreground">
                          {rArchivos.length > 0 && (
                            <span className="flex items-center gap-0.5"><FileText className="w-3 h-3 text-blue-500" />{rArchivos.length} doc{rArchivos.length > 1 ? "s" : ""}</span>
                          )}
                          {rTareas.length > 0 && (
                            <span className="flex items-center gap-0.5"><CheckSquare className="w-3 h-3 text-green-500" />{rTareas.length} tarea{rTareas.length > 1 ? "s" : ""}</span>
                          )}
                          {rAcuerdos.length > 0 && (
                            <span className="flex items-center gap-0.5"><Handshake className="w-3 h-3 text-amber-500" />{rAcuerdos.length} acuerdo{rAcuerdos.length > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        {r.notas && (
                          <p className="text-[10px] text-muted-foreground italic line-clamp-2">{r.notas}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Documentos ─── */}
      {activeTab === "documentos" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Documentos acumulados ({archivos.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setShowUpload(!showUpload)}>
              <Upload className="w-3.5 h-3.5 mr-1" />{showUpload ? "Cerrar" : "Subir documento"}
            </Button>
          </div>

          {showUpload && (
            <Card className="border border-border">
              <CardContent className="p-4">
                <FileUploadExtractor
                  onTextReady={(text: string) => {
                    generateDrafts.mutate({ contenido: text });
                    setShowUpload(false);
                  }}
                  area={area}
                  uploadToS3={true}
                  pastePlaceholder="Pega aquí el contenido de la ayuda memoria..."
                />
              </CardContent>
            </Card>
          )}

          {archivos.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay documentos para esta área</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {archivos.map((a: any) => {
                const linkedReunion = reuniones.find((r: any) => r.id === a.reunionId);
                return (
                  <Card key={a.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{a.nombre}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-2">
                            <span>{new Date(a.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            {a.mimeType && <span>{a.mimeType}</span>}
                            {linkedReunion && <Badge variant="outline" className="text-[9px]">Sesión {linkedReunion.semana}</Badge>}
                          </div>
                          {a.contenido && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.contenido.substring(0, 200)}...</p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          {a.url && (
                            <Button variant="outline" size="sm" className="h-7 text-[10px]" asChild>
                              <a href={a.url} target="_blank" rel="noopener noreferrer">Ver</a>
                            </Button>
                          )}
                          {a.contenido && (
                            <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1"
                              onClick={() => generateDrafts.mutate({ contenido: a.contenido!, reunionId: a.reunionId ?? undefined })}
                              disabled={generateDrafts.isPending}>
                              <Sparkles className="w-3 h-3" /> IA
                            </Button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm({ type: "archivo", id: a.id, nombre: a.nombre })}
                            className="text-muted-foreground hover:text-red-500 p-1 min-w-[28px] min-h-[28px] flex items-center justify-center rounded"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Tareas ─── */}
      {activeTab === "tareas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-foreground">Tareas del área ({tareas.length})</h3>
            <div className="flex gap-1.5">
              {["all", "pendiente", "en_progreso", "completada", "vencida"].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    taskFilter === f ? "bg-[#C0392B] text-white" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}>
                  {f === "all" ? "Todas" : f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 text-[10px]">
            <span className="text-amber-600">{tareas.filter((t: any) => t.status === "pendiente").length} pendientes</span>
            <span className="text-blue-600">{tareas.filter((t: any) => t.status === "en_progreso").length} en progreso</span>
            <span className="text-green-600">{tareasCompletadas} completadas</span>
          </div>

          {filteredTareas.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay tareas {taskFilter !== "all" ? `con estado "${taskFilter}"` : "para esta área"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTareas.map((t: any) => {
                const st = TASK_STATUS[t.status] || TASK_STATUS.pendiente;
                const linkedReunion = reuniones.find((r: any) => r.id === t.reunionOrigenId);
                return (
                  <Card key={t.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{t.nombre || t.tarea}</div>
                          {t.descripcion && t.nombre && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.descripcion}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{t.responsable}</span>
                            {t.fecha && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{t.fecha}</span>}
                            {t.prioridad && (
                              <Badge className={`text-[9px] ${t.prioridad === "alta" ? "bg-red-100 text-red-700" : t.prioridad === "media" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                {t.prioridad}
                              </Badge>
                            )}
                            {linkedReunion && <Badge variant="outline" className="text-[9px]">Sesión {linkedReunion.semana}</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Badge className={`${st.color} text-[9px]`}>{st.label}</Badge>
                          <button
                            onClick={() => setDeleteConfirm({ type: "tarea", id: t.id, nombre: t.nombre ?? t.tarea ?? `Tarea #${t.id}` })}
                            className="text-muted-foreground hover:text-red-500 p-1 min-w-[24px] min-h-[24px] flex items-center justify-center rounded"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Acuerdos ─── */}
      {activeTab === "acuerdos" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Acuerdos acumulados ({acuerdos.length})</h3>

          {acuerdos.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay acuerdos registrados para esta área</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {acuerdos.map((a: any) => {
                const st = ACUERDO_STATUS[a.status] || ACUERDO_STATUS.pendiente;
                const linkedReunion = reuniones.find((r: any) => r.id === a.reunionId);
                return (
                  <Card key={a.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{a.descripcion}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground flex-wrap">
                            {a.responsable && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{a.responsable}</span>}
                            {a.fechaLimite && <span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" />{a.fechaLimite}</span>}
                            {linkedReunion && <Badge variant="outline" className="text-[9px]">Sesión {linkedReunion.semana}</Badge>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <Badge className={`${st.color} text-[9px]`}>{st.label}</Badge>
                            <button
                              onClick={() => setDeleteConfirm({ type: "acuerdo", id: a.id, nombre: a.descripcion?.substring(0, 50) ?? `Acuerdo #${a.id}` })}
                              className="text-muted-foreground hover:text-red-500 p-1 min-w-[24px] min-h-[24px] flex items-center justify-center rounded"
                              title="Eliminar acuerdo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          {a.status !== "cumplido" && (
                            <Select value={a.status} onValueChange={(v) => updateAcuerdo.mutate({ id: a.id, status: v as any })}>
                              <SelectTrigger className="h-6 text-[9px] w-28 border">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_seguimiento">En seguimiento</SelectItem>
                                <SelectItem value="cumplido">Cumplido</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      <DeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "reunion") deleteReunion.mutate({ id: deleteConfirm.id });
          else if (deleteConfirm.type === "archivo") deleteArchivo.mutate({ id: deleteConfirm.id });
          else if (deleteConfirm.type === "acuerdo") deleteAcuerdo.mutate({ id: deleteConfirm.id });
          else if (deleteConfirm.type === "tarea") deleteTarea.mutate({ id: deleteConfirm.id });
        }}
        title={deleteConfirm?.type === "reunion" ? "Eliminar sesión" : deleteConfirm?.type === "archivo" ? "Eliminar documento" : deleteConfirm?.type === "acuerdo" ? "Eliminar acuerdo" : "Eliminar tarea"}
        recordName={deleteConfirm?.nombre}
        isLoading={deleteReunion.isPending || deleteArchivo.isPending || deleteAcuerdo.isPending || deleteTarea.isPending}
        warningMessage={deleteConfirm?.type === "reunion" ? "Al eliminar esta sesión se perderán sus documentos, tareas y acuerdos asociados." : undefined}
      />

      {/* ─── Tab: Bitácora ─── */}
      {activeTab === "actividad" && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Bitácora de actividad ({actividad.length})</h3>

          {actividad.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay actividad registrada para esta área</p>
                <p className="text-xs text-muted-foreground mt-1">La bitácora se genera automáticamente al crear, editar o completar tareas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-200" />
              {actividad.map((act: any) => {
                const linkedTarea = tareas.find((t: any) => t.id === act.tareaId);
                return (
                  <div key={act.id} className="relative flex items-start gap-3 pb-3 last:pb-0">
                    <div className="absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-white" />
                    <Card className="flex-1 border border-border shadow-sm">
                      <CardContent className="p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-foreground">{act.detalle}</p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              {act.usuario && <span>{act.usuario}</span>}
                              <span>{new Date(act.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                              {linkedTarea && (
                                <Badge variant="outline" className="text-[9px]">{linkedTarea.nombre || linkedTarea.tarea}</Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] flex-shrink-0">{act.accion}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Reuniones Page ───
export default function ReunionesPage() {
  const [, navigate] = useLocation();
  const { data: reuniones = [], isLoading } = trpc.reuniones.list.useQuery();
  const { data: archivos = [] } = trpc.archivos.list.useQuery();
  const { data: briefStatus = [] } = trpc.brief.reunionesWithStatus.useQuery();
  const briefMap = useMemo(() => {
    const m = new Map<number, boolean>();
    (briefStatus as any[]).forEach((r: any) => { if (r.briefEnviado) m.set(r.id, true); });
    return m;
  }, [briefStatus]);
  const { data: borradores = [] } = trpc.borradores.list.useQuery();
  const utils = trpc.useUtils();
  const initWeek = trpc.reuniones.initWeek.useMutation({ onSuccess: () => utils.reuniones.list.invalidate() });
  const updateReunion = trpc.reuniones.update.useMutation({ onSuccess: () => utils.reuniones.list.invalidate() });
  const generateDrafts = trpc.borradores.generate.useMutation({
    onSuccess: () => {
      utils.borradores.list.invalidate();
      toast.success("Borradores generados exitosamente");
    },
  });
  const approveDraft = trpc.borradores.approve.useMutation({
    onSuccess: () => {
      utils.borradores.list.invalidate();
      utils.tareas.list.invalidate();
      toast.success("Tarea aprobada y creada");
    },
  });
  const generateBriefNow = trpc.brief.generate.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("Brief generado y guardado");
        utils.brief.reunionesWithStatus.invalidate();
        utils.brief.list.invalidate();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    },
    onError: (err: any) => toast.error(`Error: ${err.message}`),
  });
  const rejectDraft = trpc.borradores.reject.useMutation({
    onSuccess: () => {
      utils.borradores.list.invalidate();
      toast.success("Borrador rechazado");
    },
  });

  const [expandedReunion, setExpandedReunion] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"week" | "history" | "borradores">("week");
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [pasteContent, setPasteContent] = useState("");
  const [showPasteModal, setShowPasteModal] = useState<{ reunionId?: number; area?: string } | null>(null);
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});

  const currentWeek = useMemo(() => getCurrentWeek(), []);

  const weekReuniones = useMemo(() => {
    return reuniones.filter(r => r.semana === currentWeek);
  }, [reuniones, currentWeek]);

  useEffect(() => {
    if (!isLoading && weekReuniones.length === 0) {
      initWeek.mutate({ semana: currentWeek });
    }
  }, [isLoading, weekReuniones.length, currentWeek]);

  const stats = useMemo(() => {
    const total = weekReuniones.length || 9;
    const realizadas = weekReuniones.filter(r => r.status === "realizada").length;
    const canceladas = weekReuniones.filter(r => r.status === "cancelada").length;
    const pendientes = weekReuniones.filter(r => r.status === "pendiente").length;
    const conAyuda = weekReuniones.filter(r => r.hasAyudaMemoria).length;
    return { total, realizadas, canceladas, pendientes, conAyuda };
  }, [weekReuniones]);

  const handleStatusChange = (id: number, status: string) => {
    updateReunion.mutate({ id, status: status as any }, {
      onSuccess: () => toast.success("Estado actualizado"),
    });
  };

  const getArchivosForArea = (area: string) => {
    return archivos.filter(a =>
      a.area?.toLowerCase().includes(area.toLowerCase()) ||
      a.nombre?.toLowerCase().includes(area.toLowerCase())
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const handleGenerateDrafts = (content: string, reunionId?: number) => {
    if (content.trim().length < 10) {
      toast.error("El contenido debe tener al menos 10 caracteres");
      return;
    }
    generateDrafts.mutate({ contenido: content, reunionId });
    setShowPasteModal(null);
    setPasteContent("");
  };

  const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

  const reunionByDia = useMemo(() => {
    const map: Record<string, typeof weekReuniones> = {};
    days.forEach(d => { map[d] = []; });
    if (weekReuniones.length > 0) {
      weekReuniones.forEach(r => {
        if (map[r.dia]) map[r.dia].push(r);
      });
    } else {
      QUINCENALES.forEach(q => {
        if (!map[q.dia]) map[q.dia] = [];
        map[q.dia].push({ ...q, id: 0, status: "pendiente", hasAyudaMemoria: false, semana: currentWeek, fecha: null, createdAt: new Date(), updatedAt: new Date() } as any);
      });
    }
    return map;
  }, [weekReuniones, currentWeek]);

  // Group ALL reuniones by area for history view
  const historyByArea = useMemo(() => {
    const map: Record<string, typeof reuniones> = {};
    for (const q of QUINCENALES) {
      map[q.area] = [];
    }
    for (const r of reuniones) {
      if (!map[r.area]) map[r.area] = [];
      map[r.area].push(r);
    }
    for (const area of Object.keys(map)) {
      map[area].sort((a, b) => (b.semana ?? '').localeCompare(a.semana ?? ''));
    }
    return map;
  }, [reuniones]);

  const pendingBorradores = useMemo(() => {
    return borradores.filter(b => b.status === "borrador");
  }, [borradores]);

  // If an area is selected, show the full expediente
  if (selectedArea) {
    return <AreaExpediente area={selectedArea} onBack={() => setSelectedArea(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-foreground" },
          { label: "Realizadas", value: stats.realizadas, color: "text-green-600" },
          { label: "Canceladas", value: stats.canceladas, color: "text-red-600" },
          { label: "Pendientes", value: stats.pendientes, color: "text-amber-600" },
          { label: "Con ayuda memoria", value: stats.conAyuda, color: "text-blue-600" },
        ].map(s => (
          <Card key={s.label} className="border border-border shadow-sm">
            <CardContent className="p-3 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending borradores alert */}
      {pendingBorradores.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-sm font-medium text-amber-800">
              {pendingBorradores.length} borrador{pendingBorradores.length > 1 ? "es" : ""} de tarea pendiente{pendingBorradores.length > 1 ? "s" : ""} de aprobación
            </span>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100"
            onClick={() => setViewMode("borradores")}>
            Revisar
          </Button>
        </div>
      )}

      {/* View toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">
          {viewMode === "week" ? `Semana ${currentWeek}` : viewMode === "history" ? "Historial por Área — Expediente" : "Borradores IA"}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant={viewMode === "week" ? "default" : "outline"} size="sm"
            className={viewMode === "week" ? "bg-[#C0392B] hover:bg-[#a93226] text-white" : ""}
            onClick={() => setViewMode("week")}>
            <CalendarCheck className="w-3.5 h-3.5 mr-1" /> Semana
          </Button>
          <Button variant={viewMode === "history" ? "default" : "outline"} size="sm"
            className={viewMode === "history" ? "bg-[#C0392B] hover:bg-[#a93226] text-white" : ""}
            onClick={() => setViewMode("history")}>
            <History className="w-3.5 h-3.5 mr-1" /> Historial
          </Button>
          <Button variant={viewMode === "borradores" ? "default" : "outline"} size="sm"
            className={viewMode === "borradores" ? "bg-[#C0392B] hover:bg-[#a93226] text-white" : ""}
            onClick={() => setViewMode("borradores")}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Borradores
            {pendingBorradores.length > 0 && (
              <span className="ml-1 bg-white text-[#C0392B] text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {pendingBorradores.length}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" className="no-print" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {viewMode === "week" ? (
        /* ===== WEEK VIEW ===== */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {days.map(dia => (
            <div key={dia}>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-primary" />{dia}
              </h3>
              <div className="space-y-2">
                {(reunionByDia[dia] || []).map((r, i) => {
                  const areaArchivos = getArchivosForArea(r.area);
                  const isExpanded = expandedReunion === r.id;
                  return (
                    <Card key={r.id || i} className="border border-border shadow-sm">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">{r.area}</span>
                          {STATUS_ICON[r.status]}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{r.hora}</div>
                        <div className="text-[10px] text-muted-foreground">{r.responsable}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          {r.hasAyudaMemoria && (
                            <Badge className="bg-blue-100 text-blue-700 text-[9px] border-blue-200">
                              <FileText className="w-2.5 h-2.5 mr-0.5" />Ayuda memoria
                            </Badge>
                          )}
                          {briefMap.has(r.id) && (
                            <Badge className="bg-purple-100 text-purple-700 text-[9px] border-purple-200">
                              <Mail className="w-2.5 h-2.5 mr-0.5" />Brief enviado
                            </Badge>
                          )}
                          {areaArchivos.length > 0 && (
                            <Badge className="bg-purple-100 text-purple-700 text-[9px] border-purple-200 cursor-pointer"
                              onClick={() => setExpandedReunion(isExpanded ? null : r.id)}>
                              <Eye className="w-2.5 h-2.5 mr-0.5" />{areaArchivos.length} doc{areaArchivos.length > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        {r.id > 0 && (
                          <div className="flex items-center gap-1">
                            <Select value={r.status} onValueChange={(v) => handleStatusChange(r.id, v)}>
                              <SelectTrigger className={`h-6 text-[10px] border flex-1 ${STATUS_BADGE[r.status] ?? ""}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="realizada">Realizada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                              title="Generar borradores de tarea desde texto"
                              onClick={() => setShowPasteModal({ reunionId: r.id, area: r.area })}>
                              <Sparkles className="w-3 h-3 text-[#C0392B]" />
                            </Button>
                          </div>
                        )}

                        {/* Expanded archivos (ayudas memorias) */}
                        {isExpanded && areaArchivos.length > 0 && (
                          <div className="border-t pt-2 mt-2 space-y-2">
                            <div className="text-[10px] font-semibold text-muted-foreground uppercase">Ayudas Memorias</div>
                            {areaArchivos.map(archivo => (
                              <div key={archivo.id} className="bg-gray-50 rounded p-2 space-y-1">
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3 text-blue-500" />
                                  <span className="text-[10px] font-medium text-foreground truncate">{archivo.nombre}</span>
                                </div>
                                <div className="text-[9px] text-muted-foreground">
                                  {new Date(archivo.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}
                                </div>
                                {archivo.contenido && (
                                  <div className="text-[10px] text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto bg-white rounded p-1.5 border">
                                    {archivo.contenido}
                                  </div>
                                )}
                                <Button size="sm" variant="outline" className="h-5 text-[9px] gap-1"
                                  onClick={() => {
                                    if (archivo.contenido) {
                                      handleGenerateDrafts(archivo.contenido, r.id);
                                    } else {
                                      toast.error("Este archivo no tiene contenido de texto para analizar");
                                    }
                                  }}
                                  disabled={generateDrafts.isPending}>
                                  <Sparkles className="w-2.5 h-2.5" />
                                  {generateDrafts.isPending ? "Generando..." : "Generar borradores"}
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === "history" ? (
        /* ===== HISTORY VIEW ===== */
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Seleccione un área para ver su expediente completo: todas las sesiones, documentos, tareas, acuerdos y bitácora acumulada.
          </p>
          {QUINCENALES.map(q => {
            const areaHistory = historyByArea[q.area] || [];
            const realizadas = areaHistory.filter(r => r.status === "realizada").length;
            const total = areaHistory.length;
            const lastReunion = areaHistory[0];
            const areaArchivos = getArchivosForArea(q.area);

            return (
              <Card key={q.area} className="border border-border shadow-sm overflow-hidden hover:border-[#C0392B]/30 transition-colors cursor-pointer"
                onClick={() => setSelectedArea(q.area)}>
                <CardContent className="p-0">
                  <div className="w-full flex items-center gap-4 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-[#C0392B]/10 flex items-center justify-center flex-shrink-0">
                      <CalendarCheck className="w-5 h-5 text-[#C0392B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">{q.area}</div>
                      <div className="text-xs text-muted-foreground">{q.dia} {q.hora} · {q.responsable}</div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xs font-medium text-foreground">{realizadas}/{total} realizadas</div>
                        {areaArchivos.length > 0 && (
                          <div className="text-[10px] text-purple-600">{areaArchivos.length} doc{areaArchivos.length > 1 ? "s" : ""}</div>
                        )}
                        {lastReunion && (
                          <div className="text-[10px] text-muted-foreground">Última: {lastReunion.semana}</div>
                        )}
                      </div>
                      <div className="relative w-8 h-8">
                        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                          <circle cx="16" cy="16" r="12" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                          <circle cx="16" cy="16" r="12" fill="none"
                            stroke={realizadas / Math.max(total, 1) >= 0.7 ? "#22c55e" : realizadas / Math.max(total, 1) >= 0.4 ? "#f59e0b" : "#ef4444"}
                            strokeWidth="3"
                            strokeDasharray={`${(realizadas / Math.max(total, 1)) * 75.4} 75.4`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-muted-foreground">
                          {total > 0 ? Math.round((realizadas / total) * 100) : 0}%
                        </span>
                      </div>
                      <ChevronDown className="w-4 h-4 text-[#C0392B]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ===== BORRADORES VIEW ===== */
        <div className="space-y-4">
          {pendingBorradores.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay borradores pendientes de aprobación</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Genera borradores desde las ayudas memorias en la vista de Semana o Historial
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingBorradores.map(draft => {
              const isEditing = editingDraft === draft.id;
              return (
                <Card key={draft.id} className="border border-amber-200 bg-amber-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            className="text-sm font-semibold text-foreground w-full bg-white border rounded px-2 py-1"
                            value={draftEdits.nombre ?? draft.nombre}
                            onChange={e => setDraftEdits(prev => ({ ...prev, nombre: e.target.value }))}
                          />
                        ) : (
                          <h4 className="text-sm font-semibold text-foreground">{draft.nombre}</h4>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {draft.area && <Badge variant="outline" className="text-[10px]">{draft.area}</Badge>}
                          {draft.responsable && <Badge variant="outline" className="text-[10px]">{draft.responsable}</Badge>}
                          {draft.prioridad && (
                            <Badge className={`text-[10px] ${
                              draft.prioridad === "alta" ? "bg-red-100 text-red-700 border-red-200" :
                              draft.prioridad === "media" ? "bg-amber-100 text-amber-700 border-amber-200" :
                              "bg-green-100 text-green-700 border-green-200"
                            }`}>{draft.prioridad}</Badge>
                          )}
                          {draft.fechaLimite && (
                            <span className="text-[10px] text-muted-foreground">Límite: {draft.fechaLimite}</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] flex-shrink-0">Borrador</Badge>
                    </div>

                    {isEditing ? (
                      <Textarea
                        className="text-xs bg-white"
                        rows={3}
                        value={draftEdits.descripcion ?? draft.descripcion ?? ""}
                        onChange={e => setDraftEdits(prev => ({ ...prev, descripcion: e.target.value }))}
                      />
                    ) : (
                      draft.descripcion && (
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap">{draft.descripcion}</p>
                      )
                    )}

                    {isEditing && (
                      <div className="grid grid-cols-2 gap-2">
                        <input className="text-xs bg-white border rounded px-2 py-1" placeholder="Responsable"
                          value={draftEdits.responsable ?? draft.responsable ?? ""}
                          onChange={e => setDraftEdits(prev => ({ ...prev, responsable: e.target.value }))} />
                        <input className="text-xs bg-white border rounded px-2 py-1" placeholder="Área"
                          value={draftEdits.area ?? draft.area ?? ""}
                          onChange={e => setDraftEdits(prev => ({ ...prev, area: e.target.value }))} />
                        <input className="text-xs bg-white border rounded px-2 py-1" placeholder="Fecha límite (YYYY-MM-DD)"
                          value={draftEdits.fechaLimite ?? draft.fechaLimite ?? ""}
                          onChange={e => setDraftEdits(prev => ({ ...prev, fechaLimite: e.target.value }))} />
                        <Select value={draftEdits.prioridad ?? draft.prioridad ?? "media"}
                          onValueChange={v => setDraftEdits(prev => ({ ...prev, prioridad: v }))}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="baja">Baja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {isEditing ? (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-7 text-xs"
                            onClick={() => {
                              approveDraft.mutate({ id: draft.id, ...draftEdits } as any);
                              setEditingDraft(null);
                              setDraftEdits({});
                            }}
                            disabled={approveDraft.isPending}>
                            <Check className="w-3 h-3" /> Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => { setEditingDraft(null); setDraftEdits({}); }}>
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white gap-1 h-7 text-xs"
                            onClick={() => approveDraft.mutate({ id: draft.id })}
                            disabled={approveDraft.isPending}>
                            {approveDraft.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Aprobar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                            onClick={() => { setEditingDraft(draft.id); setDraftEdits({}); }}>
                            <Edit2 className="w-3 h-3" /> Editar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-red-600 hover:bg-red-50 border-red-200"
                            onClick={() => rejectDraft.mutate({ id: draft.id })}
                            disabled={rejectDraft.isPending}>
                            <X className="w-3 h-3" /> Rechazar
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* Paste content modal */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-sm:max-h-[90vh] max-sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#C0392B]" />
                Generar borradores de tarea
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowPasteModal(null); setPasteContent(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sube un archivo (PDF, Word, TXT) o pega el contenido de la ayuda memoria. La IA extraerá las tareas automáticamente.
              {showPasteModal.area && <span className="font-medium"> Área: {showPasteModal.area}</span>}
            </p>
            <FileUploadExtractor
              onTextReady={(text) => {
                setPasteContent(text);
              }}
              uploadToS3={true}
              area={showPasteModal.area}
              reunionId={showPasteModal.reunionId}
              compact
              showPreview={true}
              pastePlaceholder="Pega aquí el contenido del acta de reunión, ayuda memoria, o transcripción..."
            />
            {pasteContent && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setShowPasteModal(null); setPasteContent(""); }}>
                  Cancelar
                </Button>
                <Button className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-1" size="sm"
                  onClick={() => handleGenerateDrafts(pasteContent, showPasteModal.reunionId)}
                  disabled={generateDrafts.isPending || pasteContent.trim().length < 10}>
                  {generateDrafts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generateDrafts.isPending ? "Analizando con IA..." : "Generar borradores"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
