import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  ArrowLeft, FileText, CheckSquare, Handshake, Sparkles, Clock,
  CheckCircle2, XCircle, Users, Calendar, Loader2, Plus, Upload,
  ChevronDown, ChevronUp, Check, X, Edit2, AlertTriangle, Mail, Trash2,
} from "lucide-react";
import FileUploadExtractor from "@/components/FileUploadExtractor";
import { toast } from "sonner";
import { useLocation } from "wouter";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { AlertTriangle as AlertTriangleIcon } from "lucide-react";

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
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-700" },
  completada: { label: "Completada", color: "bg-green-100 text-green-700" },
  vencida: { label: "Vencida", color: "bg-red-100 text-red-700" },
};

type TabKey = "resumen" | "ayudas" | "tareas" | "acuerdos" | "borradores" | "briefs";

export default function ReunionDetailPage({ reunionId }: { reunionId: number }) {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [showUpload, setShowUpload] = useState(false);
  const [showNewAcuerdo, setShowNewAcuerdo] = useState(false);
  const [newAcuerdo, setNewAcuerdo] = useState({ descripcion: "", responsable: "", fechaLimite: "" });
  const [editingDraft, setEditingDraft] = useState<number | null>(null);
  const [draftEdits, setDraftEdits] = useState<Record<string, string>>({});
  const [taskFilter, setTaskFilter] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: string; id: number; name: string } | null>(null);

  const { data, isLoading, refetch } = trpc.reunionDetail.get.useQuery({ id: reunionId });
  const { data: responsables = [] } = trpc.responsables.list.useQuery();
  const { data: briefStatus = [] } = trpc.brief.reunionesWithStatus.useQuery();
  const { data: briefs = [], refetch: refetchBriefs } = trpc.brief.list.useQuery({ reunionId });
  const [expandedBrief, setExpandedBrief] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const updateReunion = trpc.reuniones.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Reunión actualizada"); },
  });

  const generateBrief = trpc.brief.generate.useMutation({
    onSuccess: (d: any) => {
      if (d.success) { toast.success("Brief generado y guardado"); refetchBriefs(); setActiveTab("briefs"); }
      else toast.error(`Error: ${d.error}`);
    },
  });

  const deleteBrief = trpc.brief.delete.useMutation({
    onSuccess: () => { refetchBriefs(); toast.success("Brief eliminado"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const createAcuerdo = trpc.acuerdos.create.useMutation({
    onSuccess: () => { refetch(); setShowNewAcuerdo(false); setNewAcuerdo({ descripcion: "", responsable: "", fechaLimite: "" }); toast.success("Acuerdo creado"); },
  });

  const updateAcuerdo = trpc.acuerdos.update.useMutation({
    onSuccess: () => { refetch(); toast.success("Acuerdo actualizado"); },
  });

  const approveDraft = trpc.borradores.approve.useMutation({
    onSuccess: () => { refetch(); utils.borradores.list.invalidate(); utils.tareas.list.invalidate(); toast.success("Tarea aprobada"); },
  });

  const rejectDraft = trpc.borradores.reject.useMutation({
    onSuccess: () => { refetch(); utils.borradores.list.invalidate(); toast.success("Borrador rechazado"); },
  });

  const deleteArchivo = trpc.reuniones.deleteArchivo.useMutation({
    onSuccess: () => { refetch(); toast.success("Documento eliminado"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const deleteAcuerdo = trpc.acuerdos.delete.useMutation({
    onSuccess: () => { refetch(); toast.success("Acuerdo eliminado"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const deleteTask = trpc.tareas.delete.useMutation({
    onSuccess: () => { refetch(); utils.tareas.list.invalidate(); toast.success("Tarea eliminada"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const [selectedPromptIdAM, setSelectedPromptIdAM] = useState<number | null>(null);
  const [customPromptText, setCustomPromptText] = useState<string>("");
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const { data: promptTemplatesAM = [] } = trpc.promptTemplatesAM.list.useQuery();
  const extraerTareasTemplates = (promptTemplatesAM as any[]).filter((t: any) => t.tipo === "extraer_tareas");

  const generateDrafts = trpc.borradores.generate.useMutation({
    onSuccess: (data: any) => {
      refetch();
      utils.borradores.list.invalidate();
      const duplicates = (data?.borradores ?? []).filter((b: any) => b.isDuplicate).length;
      if (duplicates > 0) {
        toast.warning(`${data?.count ?? 0} borradores generados. ⚠️ ${duplicates} posible${duplicates > 1 ? 's' : ''} duplicado${duplicates > 1 ? 's' : ''} detectado${duplicates > 1 ? 's' : ''}.`);
      } else {
        toast.success(`${data?.count ?? 0} borradores generados`);
      }
    },
    onError: (err: any) => toast.error(`Error al generar: ${err.message}`),
  });

  const reunion = data?.reunion;
  const archivos = data?.archivos ?? [];
  const tareas = data?.tareas ?? [];
  const acuerdos = data?.acuerdos ?? [];
  const borradores = data?.borradores ?? [];

  const briefSent = useMemo(() => {
    return (briefStatus as any[]).some((r: any) => r.id === reunionId && r.briefEnviado);
  }, [briefStatus, reunionId]);

  const filteredTareas = useMemo(() => {
    if (taskFilter === "all") return tareas;
    return tareas.filter((t: any) => t.status === taskFilter);
  }, [tareas, taskFilter]);

  const pendingBorradores = borradores.filter((b: any) => b.status === "borrador");

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: "resumen", label: "Resumen", icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: "briefs", label: "Briefs", icon: <Sparkles className="w-3.5 h-3.5" />, count: (briefs as any[]).length },
    { key: "ayudas", label: "Ayudas Memorias", icon: <FileText className="w-3.5 h-3.5" />, count: archivos.length },
    { key: "tareas", label: "Tareas", icon: <CheckSquare className="w-3.5 h-3.5" />, count: tareas.length },
    { key: "acuerdos", label: "Acuerdos", icon: <Handshake className="w-3.5 h-3.5" />, count: acuerdos.length },
    { key: "borradores", label: "Borradores IA", icon: <Sparkles className="w-3.5 h-3.5" />, count: pendingBorradores.length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#C0392B]" />
      </div>
    );
  }

  if (!reunion) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Reunión no encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/reuniones")}>
          <ArrowLeft className="w-4 h-4 mr-1" />Volver a Reuniones
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/reuniones")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-foreground">{reunion.area}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{reunion.dia} {reunion.hora}</span>
            <span>·</span>
            <span>Semana {reunion.semana}</span>
            {reunion.fecha && <><span>·</span><span>{reunion.fecha}</span></>}
          </div>
        </div>
        <Badge className={`${STATUS_BADGE[reunion.status]} text-xs`}>
          {reunion.status === "pendiente" && <Clock className="w-3 h-3 mr-0.5" />}
          {reunion.status === "realizada" && <CheckCircle2 className="w-3 h-3 mr-0.5" />}
          {reunion.status === "cancelada" && <XCircle className="w-3 h-3 mr-0.5" />}
          {reunion.status}
        </Badge>
        {briefSent && (
          <Badge className="bg-purple-100 text-purple-700 text-[9px] border-purple-200">
            <Mail className="w-2.5 h-2.5 mr-0.5" />Brief enviado
          </Badge>
        )}
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
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${
                activeTab === tab.key ? "bg-[#C0392B] text-white" : "bg-muted text-muted-foreground"
              }`}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Resumen ─── */}
      {activeTab === "resumen" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border border-border">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Información</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Área</span><span className="text-foreground font-medium">{reunion.area}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Día</span><span className="text-foreground">{reunion.dia}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Hora</span><span className="text-foreground">{reunion.hora}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Responsable</span><span className="text-foreground">{reunion.responsable}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Semana</span><span className="text-foreground">{reunion.semana}</span></div>
                  {reunion.fecha && <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span className="text-foreground">{reunion.fecha}</span></div>}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Resumen Rápido</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <div className="text-lg font-bold text-blue-700">{archivos.length}</div>
                    <div className="text-[10px] text-blue-600">Ayudas Memorias</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-green-50 border border-green-100">
                    <div className="text-lg font-bold text-green-700">{tareas.length}</div>
                    <div className="text-[10px] text-green-600">Tareas</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="text-lg font-bold text-amber-700">{acuerdos.length}</div>
                    <div className="text-[10px] text-amber-600">Acuerdos</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-purple-50 border border-purple-100">
                    <div className="text-lg font-bold text-purple-700">{pendingBorradores.length}</div>
                    <div className="text-[10px] text-purple-600">Borradores</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {reunion.status === "pendiente" && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => updateReunion.mutate({ id: reunionId, status: "realizada" })}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />Marcar Realizada
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => updateReunion.mutate({ id: reunionId, status: "cancelada" })}>
                  <XCircle className="w-3.5 h-3.5 mr-1" />Cancelar
                </Button>
              </>
            )}
            {reunion.status !== "pendiente" && (
              <Button size="sm" variant="outline"
                onClick={() => updateReunion.mutate({ id: reunionId, status: "pendiente" })}>
                <Clock className="w-3.5 h-3.5 mr-1" />Reabrir
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-purple-600 border-purple-200"
                onClick={() => generateBrief.mutate({ reunionId })}
                disabled={generateBrief.isPending}>
                {generateBrief.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                Generar Brief
              </Button>
          </div>

          {/* Notas */}
          {reunion.notas && (
            <Card className="border border-border">
              <CardContent className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-2">Notas</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reunion.notas}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ─── Tab: Ayudas Memorias ─── */}
      {activeTab === "ayudas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Documentos ({archivos.length})</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowUpload(!showUpload)}>
                <Upload className="w-3.5 h-3.5 mr-1" />{showUpload ? "Cerrar" : "Subir / Generar"}
              </Button>
            </div>
          </div>

          {showUpload && (
            <Card className="border border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-3">Sube un archivo para guardarlo como ayuda memoria de esta reunión. También puedes pegar el texto para generar borradores de tareas con IA.</p>
                <FileUploadExtractor
                  onTextReady={(text: string) => {
                    generateDrafts.mutate({ contenido: text, reunionId });
                    toast.info("Generando borradores de tareas con IA...");
                  }}
                  onFileUploaded={({ url, filename }) => {
                    refetch();
                    toast.success(`Documento "${filename}" guardado en la reunión`);
                    setShowUpload(false);
                  }}
                  reunionId={reunionId}
                  reunion={reunion?.area}
                  area={reunion?.area}
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
                <p className="text-sm text-muted-foreground">No hay ayudas memorias para esta reunión</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowUpload(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Subir primera ayuda memoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {archivos.map((a: any) => (
                <Card key={a.id} className="border border-border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{a.nombre}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(a.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          {a.mimeType && <span className="ml-2">{a.mimeType}</span>}
                        </div>
                        {a.contenido && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.contenido.substring(0, 200)}...</p>
                        )}
                      </div>
                      {a.url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={a.url} target="_blank" rel="noopener noreferrer">Ver</a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Tareas ─── */}
      {activeTab === "tareas" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-foreground">Tareas ({tareas.length})</h3>
            <div className="flex gap-1.5">
              {["all", "pendiente", "en_proceso", "completada", "vencida"].map(f => (
                <button key={f} onClick={() => setTaskFilter(f)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    taskFilter === f ? "bg-[#C0392B] text-white" : "bg-muted text-muted-foreground hover:bg-accent"
                  }`}>
                  {f === "all" ? "Todas" : f.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Counters */}
          <div className="flex gap-3 text-[10px]">
            <span className="text-amber-600">{tareas.filter((t: any) => t.status === "pendiente").length} pendientes</span>
            <span className="text-blue-600">{tareas.filter((t: any) => t.status === "en_proceso").length} en proceso</span>
            <span className="text-green-600">{tareas.filter((t: any) => t.status === "completada").length} completadas</span>
          </div>

          {filteredTareas.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <CheckSquare className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay tareas {taskFilter !== "all" ? `con estado "${taskFilter}"` : "para esta reunión"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredTareas.map((t: any) => {
                const st = TASK_STATUS[t.status] || TASK_STATUS.pendiente;
                return (
                  <Card key={t.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{t.nombre || t.descripcion?.substring(0, 60)}</div>
                          {t.descripcion && t.nombre && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t.descripcion}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span><Users className="w-3 h-3 inline mr-0.5" />{t.responsable}</span>
                            {t.fechaEntrega && <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(t.fechaEntrega).toLocaleDateString("es-HN")}</span>}
                            {t.prioridad && (
                              <Badge className={`text-[9px] ${t.prioridad === "alta" ? "bg-red-100 text-red-700" : t.prioridad === "media" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                                {t.prioridad}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={`${st.color} text-[9px] flex-shrink-0`}>{st.label}</Badge>
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
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Acuerdos ({acuerdos.length})</h3>
            <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white" onClick={() => setShowNewAcuerdo(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" />Nuevo Acuerdo
            </Button>
          </div>

          {showNewAcuerdo && (
            <Card className="border border-[#C0392B]/20">
              <CardContent className="p-4 space-y-3">
                <h4 className="text-sm font-bold text-foreground">Nuevo Acuerdo</h4>
                <div>
                  <label className="text-xs text-muted-foreground">Descripción *</label>
                  <textarea value={newAcuerdo.descripcion} onChange={e => setNewAcuerdo(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[60px] resize-y"
                    placeholder="Descripción del acuerdo..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Responsable</label>
                    <select value={newAcuerdo.responsable} onChange={e => setNewAcuerdo(p => ({ ...p, responsable: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                      <option value="">Seleccionar...</option>
                      {responsables.map((r: any) => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Fecha límite</label>
                    <input type="date" value={newAcuerdo.fechaLimite} onChange={e => setNewAcuerdo(p => ({ ...p, fechaLimite: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowNewAcuerdo(false)}>Cancelar</Button>
                  <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white"
                    onClick={() => {
                      if (!newAcuerdo.descripcion.trim()) { toast.error("Descripción requerida"); return; }
                      createAcuerdo.mutate({
                        reunionId,
                        descripcion: newAcuerdo.descripcion,
                        responsable: newAcuerdo.responsable || undefined,
                        fechaLimite: newAcuerdo.fechaLimite || undefined,
                      });
                    }}
                    disabled={createAcuerdo.isPending}>
                    {createAcuerdo.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                    Crear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {acuerdos.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Handshake className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay acuerdos registrados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {acuerdos.map((a: any) => {
                const st = ACUERDO_STATUS[a.status] || ACUERDO_STATUS.pendiente;
                return (
                  <Card key={a.id} className="border border-border">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{a.descripcion}</p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            {a.responsable && <span><Users className="w-3 h-3 inline mr-0.5" />{a.responsable}</span>}
                            {a.fechaLimite && <span><Calendar className="w-3 h-3 inline mr-0.5" />{new Date(a.fechaLimite).toLocaleDateString("es-HN")}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Badge className={`${st.color} text-[9px]`}>{st.label}</Badge>
                          {a.status !== "cumplido" && (
                            <select
                              value={a.status}
                              onChange={e => updateAcuerdo.mutate({ id: a.id, status: e.target.value as any })}
                              className="text-[10px] border border-border rounded px-1 py-0.5 bg-background text-foreground">
                              <option value="pendiente">Pendiente</option>
                              <option value="en_seguimiento">En seguimiento</option>
                              <option value="cumplido">Cumplido</option>
                            </select>
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

      {/* ─── Tab: Briefs ─── */}
      {activeTab === "briefs" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#C0392B]" />
              Briefs Generados ({(briefs as any[]).length})
            </h3>
            <Button
              size="sm"
              onClick={() => generateBrief.mutate({ reunionId })}
              disabled={generateBrief.isPending}
              className="bg-[#C0392B] hover:bg-[#a93226] text-white"
            >
              {generateBrief.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1" />
              )}
              Generar Brief
            </Button>
          </div>

          {(briefs as any[]).length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No hay briefs generados para esta reunión.</p>
                <p className="text-xs text-muted-foreground mt-1">Haz clic en "Generar Brief" para crear uno ahora, o espera a que el sistema lo genere automáticamente 30 minutos antes de la reunión.</p>
                <Button
                  size="sm"
                  className="mt-4 bg-[#C0392B] hover:bg-[#a93226] text-white"
                  onClick={() => generateBrief.mutate({ reunionId })}
                  disabled={generateBrief.isPending}
                >
                  {generateBrief.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  Generar Brief Ahora
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {(briefs as any[]).map((brief: any) => (
                <Card key={brief.id} className="border border-border shadow-sm">
                  <CardContent className="p-0">
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setExpandedBrief(expandedBrief === brief.id ? null : brief.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${brief.tipo === "auto" ? "bg-purple-500" : "bg-blue-500"}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            Brief {brief.tipo === "auto" ? "Automático" : "Manual"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(brief.generadoEn).toLocaleString("es-HN")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] ${brief.tipo === "auto" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                          {brief.tipo === "auto" ? "Automático" : "Manual"}
                        </Badge>
                        <button
                          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: "brief", id: brief.id, name: `Brief ${brief.tipo === "auto" ? "automático" : "manual"} del ${new Date(brief.generadoEn).toLocaleDateString("es-HN")}` }); }}
                          title="Eliminar brief"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedBrief === brief.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    {expandedBrief === brief.id && (
                      <div className="border-t border-border p-4">
                        <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-y-auto">
                          {brief.contenido}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Borradores IA ─── */}
      {activeTab === "borradores" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Borradores de Tarea ({borradores.length})</h3>
            <Button size="sm" variant="outline" onClick={() => setShowUpload(!showUpload)}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />{showUpload ? "Cerrar" : "Generar Nuevos"}
            </Button>
          </div>

          {showUpload && (
            <Card className="border border-border">
              <CardContent className="p-4 space-y-3">
                {/* Prompt Template Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />Plantilla de Prompt para Extracción de Tareas
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedPromptIdAM ?? ""}
                      onChange={e => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedPromptIdAM(val);
                        if (val) {
                          const tmpl = extraerTareasTemplates.find((t: any) => t.id === val);
                          if (tmpl) setCustomPromptText(tmpl.prompt);
                          setShowPromptEditor(false);
                        } else {
                          setCustomPromptText("");
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground"
                    >
                      <option value="">Usar prompt por defecto del sistema</option>
                      {extraerTareasTemplates.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.nombre}{t.isDefault ? " ⭐" : ""}</option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowPromptEditor(!showPromptEditor)}
                    >
                      {showPromptEditor ? "Ocultar" : "Ver/Editar"} Prompt
                    </Button>
                  </div>
                  {showPromptEditor && (
                    <textarea
                      value={customPromptText}
                      onChange={e => { setCustomPromptText(e.target.value); setSelectedPromptIdAM(null); }}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground min-h-[100px] resize-y font-mono"
                      placeholder="Escribe un prompt personalizado o edita el de la plantilla seleccionada..."
                    />
                  )}
                </div>
                <FileUploadExtractor
                  onTextReady={(text: string) => {
                    generateDrafts.mutate({
                      contenido: text,
                      reunionId,
                      promptIdAM: selectedPromptIdAM ?? undefined,
                      customPrompt: customPromptText.trim() || undefined,
                    });
                    setShowUpload(false);
                  }}
                  reunionId={reunionId}
                  area={reunion?.area}
                  pastePlaceholder="Pega aquí el contenido del documento para extraer tareas con IA..."
                />
              </CardContent>
            </Card>
          )}

          {borradores.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="p-8 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No hay borradores generados</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => setShowUpload(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />Generar desde ayuda memoria
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {borradores.map((b: any) => {
                const isEditing = editingDraft === b.id;
                return (
                  <Card key={b.id} className={`border ${b.isDuplicate ? "border-orange-300 bg-orange-50/30" : b.status === "borrador" ? "border-amber-200 bg-amber-50/30" : b.status === "aprobado" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <textarea
                              value={draftEdits[b.id] ?? b.nombre}
                              onChange={e => setDraftEdits(prev => ({ ...prev, [b.id]: e.target.value }))}
                              className="w-full px-2 py-1 rounded border border-border bg-background text-sm text-foreground min-h-[40px] resize-y"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {b.isDuplicate && (
                                <span title={`Posible duplicado de: "${b.duplicateNombre}"`}>
                                  <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                                </span>
                              )}
                              <div className="text-sm font-medium text-foreground">{b.nombre}</div>
                            </div>
                          )}
                          {b.isDuplicate && (
                            <div className="text-[10px] text-orange-600 mt-0.5 flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Posible duplicado de: "{b.duplicateNombre?.substring(0, 60)}{(b.duplicateNombre?.length ?? 0) > 60 ? '...' : ''}"
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                            <span><Users className="w-3 h-3 inline mr-0.5" />{b.responsable}</span>
                            <span>{b.area}</span>
                            {b.prioridad && <Badge className="text-[9px] bg-muted">{b.prioridad}</Badge>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {b.status === "borrador" && (
                            <>
                              {isEditing ? (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                    onClick={() => {
                                      approveDraft.mutate({ id: b.id, nombre: draftEdits[b.id] || b.nombre });
                                      setEditingDraft(null);
                                    }}>
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDraft(null)}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600"
                                    onClick={() => approveDraft.mutate({ id: b.id })} disabled={approveDraft.isPending}>
                                    <Check className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"
                                    onClick={() => setEditingDraft(b.id)}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                                    onClick={() => rejectDraft.mutate({ id: b.id })} disabled={rejectDraft.isPending}>
                                    <X className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          {b.status === "aprobado" && <Badge className="bg-green-100 text-green-700 text-[9px]">Aprobado</Badge>}
                          {b.status === "rechazado" && <Badge className="bg-red-100 text-red-700 text-[9px]">Rechazado</Badge>}
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
    </div>

    <DeleteConfirmModal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={() => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === "archivo") deleteArchivo.mutate({ id: deleteConfirm.id });
        else if (deleteConfirm.type === "acuerdo") deleteAcuerdo.mutate({ id: deleteConfirm.id });
        else if (deleteConfirm.type === "tarea") deleteTask.mutate({ id: deleteConfirm.id });
        else if (deleteConfirm.type === "brief") deleteBrief.mutate({ id: deleteConfirm.id });
      }}
      title={deleteConfirm?.type === "archivo" ? "Eliminar documento" : deleteConfirm?.type === "acuerdo" ? "Eliminar acuerdo" : deleteConfirm?.type === "brief" ? "Eliminar brief" : "Eliminar tarea"}
      recordName={deleteConfirm?.name}
      isLoading={deleteArchivo.isPending || deleteAcuerdo.isPending || deleteTask.isPending || deleteBrief.isPending}
    />
    </>
  );
}
