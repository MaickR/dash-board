import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo, useRef } from "react";
import {
  ClipboardList, Download, CheckCircle2, AlertTriangle, XCircle,
  Clock, Loader2, RefreshCw, Paperclip, FileText, ExternalLink, Upload, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const ESTADO_ICONS: Record<string, { icon: any; label: string; color: string; bg: string }> = {
  entregado: { icon: CheckCircle2, label: "A tiempo", color: "text-green-600", bg: "bg-green-100" },
  retraso: { icon: AlertTriangle, label: "Con retraso", color: "text-amber-600", bg: "bg-amber-100" },
  no_entregado: { icon: XCircle, label: "No entregado", color: "text-red-600", bg: "bg-red-100" },
  pendiente: { icon: Clock, label: "Pendiente", color: "text-gray-400", bg: "bg-gray-50" },
};

const EMPRESAS = ["Todas", "CAP Honduras", "Auto Repuestos Blessing", "Tecnicentro DIDASA", "Distribuidora Mansiago", "Inversiones S&M"];
const CATEGORIAS = ["Todas", "Gerencia", "Finanzas", "RRHH", "Operaciones", "Legal", "Tecnología", "Marketing"];

type MonthStatus = {
  informeId: number; mes: number; estado: string; observacion?: string;
  id?: number; documentoUrl?: string; documentoNombre?: string;
};

export default function InformesPage() {
  const { data: informes = [], isLoading: loadingInformes } = trpc.informes.list.useQuery();
  const { data: mensuales = [], isLoading: loadingMensuales } = trpc.informes.mensuales.useQuery();
  const seedInformes = trpc.informes.seed.useMutation({ onSuccess: () => { utils.informes.list.invalidate(); utils.informes.mensuales.invalidate(); toast.success("Datos iniciales cargados"); } });
  const updateMensual = trpc.informes.updateMensual.useMutation({ onSuccess: () => utils.informes.mensuales.invalidate() });
  const uploadDoc = trpc.informes.uploadDocumento.useMutation({
    onSuccess: () => { utils.informes.mensuales.invalidate(); toast.success("Documento adjuntado"); },
    onError: (err) => toast.error(err.message),
  });
  const utils = trpc.useUtils();

  const [anio, setAnio] = useState(2026);
  const [filterEmpresa, setFilterEmpresa] = useState("Todas");
  const [filterCategoria, setFilterCategoria] = useState("Todas");
  const [editingCell, setEditingCell] = useState<{ informeId: number; mes: number } | null>(null);
  const [editEstado, setEditEstado] = useState("pendiente");
  const [editObs, setEditObs] = useState("");
  const [editDocUrl, setEditDocUrl] = useState<string | null>(null);
  const [editDocNombre, setEditDocNombre] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteDocConfirm, setDeleteDocConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const statusMap = useMemo(() => {
    const map: Record<number, Record<number, MonthStatus>> = {};
    (mensuales as any[]).forEach(m => {
      if (!map[m.informeId]) map[m.informeId] = {};
      map[m.informeId][m.mes] = m;
    });
    return map;
  }, [mensuales]);

  const filteredInformes = useMemo(() => {
    let result = informes as any[];
    if (filterEmpresa !== "Todas") result = result.filter(i => i.empresa === filterEmpresa);
    if (filterCategoria !== "Todas") result = result.filter(i => i.categoria === filterCategoria);
    return result;
  }, [informes, filterEmpresa, filterCategoria]);

  const getCellStatus = (informeId: number, mes: number): string => {
    return statusMap[informeId]?.[mes]?.estado ?? "pendiente";
  };

  const getCellHasDoc = (informeId: number, mes: number): boolean => {
    return !!statusMap[informeId]?.[mes]?.documentoUrl;
  };

  const getCellColor = (estado: string): string => {
    switch (estado) {
      case "entregado": return "bg-green-100 hover:bg-green-200 text-green-700";
      case "retraso": return "bg-amber-100 hover:bg-amber-200 text-amber-700";
      case "no_entregado": return "bg-red-100 hover:bg-red-200 text-red-700";
      default: return "bg-gray-50 hover:bg-gray-100 text-gray-400";
    }
  };

  const getCellIcon = (estado: string): string => {
    switch (estado) {
      case "entregado": return "\u2713";
      case "retraso": return "\u26A0";
      case "no_entregado": return "\u2717";
      default: return "\u2014";
    }
  };

  const handleCellClick = (informeId: number, mes: number) => {
    const current = statusMap[informeId]?.[mes];
    setEditEstado(current?.estado ?? "pendiente");
    setEditObs(current?.observacion ?? "");
    setEditDocUrl(current?.documentoUrl ?? null);
    setEditDocNombre(current?.documentoNombre ?? null);
    setEditingCell({ informeId, mes });
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    updateMensual.mutate({
      informeId: editingCell.informeId,
      mes: editingCell.mes,
      estado: editEstado as any,
      observacion: editObs || undefined,
      documentoUrl: editDocUrl || undefined,
      documentoNombre: editDocNombre || undefined,
    });
    setEditingCell(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingCell) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error("El archivo no puede superar 16 MB");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadDoc.mutateAsync({
          informeId: editingCell.informeId,
          mes: editingCell.mes,
          base64,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
        });
        setEditDocUrl(result.url);
        setEditDocNombre(result.filename);
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getCumplimiento = (informeId: number): { pct: number; entregados: number; total: number } => {
    const currentMonth = new Date().getMonth() + 1;
    let entregados = 0;
    let total = 0;
    for (let m = 1; m <= currentMonth; m++) {
      total++;
      const st = getCellStatus(informeId, m);
      if (st === "entregado" || st === "retraso") entregados++;
    }
    return { pct: total > 0 ? Math.round((entregados / total) * 100) : 0, entregados, total };
  };

  const monthlySummary = useMemo(() => {
    const summary: Record<number, { entregado: number; retraso: number; no_entregado: number; pendiente: number }> = {};
    for (let m = 1; m <= 12; m++) {
      summary[m] = { entregado: 0, retraso: 0, no_entregado: 0, pendiente: 0 };
      filteredInformes.forEach((inf: any) => {
        const st = getCellStatus(inf.id, m);
        summary[m][st as keyof typeof summary[1]]++;
      });
    }
    return summary;
  }, [filteredInformes, statusMap]);

  const handleExportPDF = () => {
    window.print();
    toast.success("Preparando impresión...");
  };

  if (loadingInformes) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if ((informes as any[]).length === 0) {
    return (
      <div className="text-center py-20">
        <ClipboardList className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
        <h3 className="text-lg font-bold text-foreground mb-2">Control de Informes Mensuales</h3>
        <p className="text-sm text-muted-foreground mb-4">
          No hay áreas registradas. Carga los datos iniciales de las 17 áreas reportantes.
        </p>
        <Button onClick={() => seedInformes.mutate()} disabled={seedInformes.isPending} className="min-h-[44px]">
          {seedInformes.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Cargar Datos Iniciales
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 print-area">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#C0392B]" />
            Control de Informes Mensuales — {anio}
          </h2>
          <p className="text-sm text-muted-foreground">17 áreas reportantes · Fecha límite: día 5 de cada mes</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
            <SelectTrigger className="w-24 min-h-[36px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleExportPDF} className="min-h-[36px]">
            <Download className="w-3.5 h-3.5 mr-1" />PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
          <SelectTrigger className="w-44 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-36 min-h-[36px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <span className="font-semibold text-muted-foreground">Leyenda:</span>
        {Object.entries(ESTADO_ICONS).map(([key, cfg]) => (
          <span key={key} className={`flex items-center gap-1 px-2 py-1 rounded ${cfg.bg} ${cfg.color}`}>
            {getCellIcon(key)} {cfg.label}
          </span>
        ))}
        <span className="flex items-center gap-1 px-2 py-1 rounded bg-blue-50 text-blue-600">
          <Paperclip className="w-3 h-3" /> Con documento
        </span>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto -mx-3 sm:mx-0">
        <table className="w-full text-xs border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground w-8">No.</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground min-w-[180px]">Departamento</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground min-w-[150px]">Responsable</th>
              <th className="text-left py-2 px-2 font-semibold text-muted-foreground">Empresa</th>
              {MESES.map((m, i) => (
                <th key={i} className="text-center py-2 px-1 font-semibold text-muted-foreground w-10">{m}</th>
              ))}
              <th className="text-center py-2 px-2 font-semibold text-muted-foreground w-16">%</th>
            </tr>
          </thead>
          <tbody>
            {filteredInformes.map((inf: any) => {
              const cumpl = getCumplimiento(inf.id);
              const cumplColor = cumpl.pct >= 80 ? "text-green-700 bg-green-50" : cumpl.pct >= 50 ? "text-amber-700 bg-amber-50" : "text-red-700 bg-red-50";
              return (
                <tr key={inf.id} className="border-b border-border/50 hover:bg-accent/20">
                  <td className="py-1.5 px-2 text-muted-foreground font-mono">{inf.numero}</td>
                  <td className="py-1.5 px-2 font-medium text-foreground">{inf.departamento}</td>
                  <td className="py-1.5 px-2 text-muted-foreground">{inf.responsable}</td>
                  <td className="py-1.5 px-2 text-muted-foreground text-[10px]">{inf.empresa}</td>
                  {MESES.map((_, mi) => {
                    const mes = mi + 1;
                    const st = getCellStatus(inf.id, mes);
                    const hasDoc = getCellHasDoc(inf.id, mes);
                    return (
                      <td key={mi} className="py-1 px-0.5 text-center">
                        <button
                          onClick={() => handleCellClick(inf.id, mes)}
                          className={`relative w-8 h-8 rounded text-xs font-bold transition-colors cursor-pointer ${getCellColor(st)} min-w-[32px] min-h-[32px]`}
                          title={`${inf.departamento} - ${MESES[mi]}${hasDoc ? " (con documento)" : ""}`}
                        >
                          {getCellIcon(st)}
                          {hasDoc && (
                            <Paperclip className="absolute -top-1 -right-1 w-3 h-3 text-blue-500" />
                          )}
                        </button>
                      </td>
                    );
                  })}
                  <td className="py-1.5 px-2 text-center">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${cumplColor}`}>
                      {cumpl.pct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-muted/30 border-t-2 border-border font-semibold">
              <td colSpan={4} className="py-2 px-2 text-xs text-muted-foreground">Resumen mensual</td>
              {MESES.map((_, mi) => {
                const mes = mi + 1;
                const s = monthlySummary[mes];
                return (
                  <td key={mi} className="py-2 px-0.5 text-center">
                    <div className="text-[9px] leading-tight">
                      {s.entregado > 0 && <div className="text-green-600">{s.entregado}{"\u2713"}</div>}
                      {s.retraso > 0 && <div className="text-amber-600">{s.retraso}{"\u26A0"}</div>}
                      {s.no_entregado > 0 && <div className="text-red-600">{s.no_entregado}{"\u2717"}</div>}
                    </div>
                  </td>
                );
              })}
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Edit Cell Dialog */}
      <Dialog open={!!editingCell} onOpenChange={() => setEditingCell(null)}>
        <DialogContent className="max-w-sm max-sm:!w-[calc(100vw-1rem)] max-sm:!max-w-none">
          <DialogHeader>
            <DialogTitle className="text-sm">
              Estado de entrega — {editingCell ? MESES[editingCell.mes - 1] : ""} {anio}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {/* Estado selector */}
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(ESTADO_ICONS).map(([key, cfg]) => (
                <button key={key} onClick={() => setEditEstado(key)}
                  className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors min-h-[44px] ${
                    editEstado === key ? "border-[#C0392B] bg-[#C0392B]/5" : "border-border hover:border-[#C0392B]/30"
                  }`}>
                  <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </button>
              ))}
            </div>

            {/* Observación */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Observación</label>
              <Textarea value={editObs} onChange={e => setEditObs(e.target.value)} placeholder="Nota opcional..." rows={2} className="min-h-[60px]" />
            </div>

            {/* Document attachment */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Paperclip className="w-3 h-3" />Documento adjunto
              </label>
              {editDocUrl ? (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200">
                  <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-blue-700 truncate flex-1">{editDocNombre || "Documento"}</span>
                  <a href={editDocUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex-shrink-0">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setDeleteDocConfirm(true)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0 p-0.5"
                    title="Eliminar documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Sin documento adjunto</div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-[40px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />Subiendo...</>
                ) : (
                  <><Upload className="w-3.5 h-3.5 mr-1" />{editDocUrl ? "Reemplazar documento" : "Adjuntar documento"}</>
                )}
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingCell(null)} className="min-h-[44px]">Cancelar</Button>
              <Button onClick={handleSaveCell} disabled={updateMensual.isPending}
                className="min-h-[44px] bg-[#C0392B] hover:bg-[#A93226] text-white">
                {updateMensual.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete document confirmation */}
      <DeleteConfirmModal
        open={deleteDocConfirm}
        onClose={() => setDeleteDocConfirm(false)}
        onConfirm={() => {
          setEditDocUrl(null);
          setEditDocNombre(null);
          setDeleteDocConfirm(false);
          toast.success("Documento eliminado del informe");
        }}
        title="Eliminar documento adjunto"
        recordName={editDocNombre || "Documento"}
        description="El documento será removido del informe. Guarda el informe para confirmar el cambio."
      />
    </div>
  );
}
