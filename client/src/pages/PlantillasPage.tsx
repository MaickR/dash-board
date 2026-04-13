import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { FileStack, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export default function PlantillasPage() {
  const { data: plantillas = [], isLoading } = trpc.plantillas.list.useQuery();
  const utils = trpc.useUtils();
  const createPlantilla = trpc.plantillas.create.useMutation({
    onSuccess: () => { utils.plantillas.list.invalidate(); setShowCreate(false); resetForm(); toast.success("Plantilla creada"); },
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);
  const deletePlantilla = trpc.plantillas.delete.useMutation({
    onSuccess: () => { utils.plantillas.list.invalidate(); toast.success("Plantilla eliminada"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    area: "",
    empresa: "",
    responsableSugerido: "",
    prioridad: "media" as "alta" | "media" | "baja",
    duracionEstimada: "",
    checklistText: "",
    etiquetas: "",
  });

  const resetForm = () => setForm({
    nombre: "", descripcion: "", area: "", empresa: "",
    responsableSugerido: "", prioridad: "media", duracionEstimada: "",
    checklistText: "", etiquetas: "",
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Plantillas de Tareas</h2>
          <p className="text-sm text-muted-foreground">Crea plantillas reutilizables para tareas frecuentes</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#C0392B] hover:bg-[#A93226] text-white">
              <Plus className="w-4 h-4 mr-2" />Nueva Plantilla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Crear Plantilla</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <Input placeholder="Nombre de la plantilla" value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} />
              <Textarea placeholder="Descripción..." value={form.descripcion}
                onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Área" value={form.area}
                  onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
                <Input placeholder="Empresa" value={form.empresa}
                  onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Responsable sugerido" value={form.responsableSugerido}
                  onChange={e => setForm(p => ({ ...p, responsableSugerido: e.target.value }))} />
                <Select value={form.prioridad} onValueChange={v => setForm(p => ({ ...p, prioridad: v as typeof p.prioridad }))}>
                  <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Duración estimada (horas)" value={form.duracionEstimada}
                  onChange={e => setForm(p => ({ ...p, duracionEstimada: e.target.value }))} />
                <Input placeholder="Etiquetas (separadas por coma)" value={form.etiquetas}
                  onChange={e => setForm(p => ({ ...p, etiquetas: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">
                  Checklist (un ítem por línea)
                </label>
                <Textarea
                  placeholder={"Revisar documentos\nEnviar reporte\nConfirmar con equipo"}
                  value={form.checklistText}
                  onChange={e => setForm(p => ({ ...p, checklistText: e.target.value }))}
                  rows={3}
                />
              </div>
              <Button
                className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white"
                disabled={!form.nombre || createPlantilla.isPending}
                onClick={() => {
                  const checklist = form.checklistText
                    ? form.checklistText.split("\n").filter(Boolean).map(text => ({ text: text.trim(), done: false }))
                    : undefined;
                  createPlantilla.mutate({
                    nombre: form.nombre,
                    descripcion: form.descripcion || undefined,
                    area: form.area || undefined,
                    empresa: form.empresa || undefined,
                    responsableSugerido: form.responsableSugerido || undefined,
                    duracionEstimada: form.duracionEstimada ? parseInt(form.duracionEstimada) : undefined,
                    prioridad: form.prioridad,
                    checklist: checklist,
                    etiquetas: form.etiquetas || undefined,
                  });
                }}
              >
                {createPlantilla.isPending ? "Creando..." : "Crear Plantilla"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {plantillas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileStack className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay plantillas creadas</p>
            <p className="text-xs text-muted-foreground mt-1">Las plantillas te permiten crear conjuntos de tareas rápidamente</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plantillas.map(p => {
            let checklist: any[] = [];
            try { checklist = Array.isArray(p.checklist) ? p.checklist as any[] : []; } catch {}
            return (
              <Card key={p.id} className="border border-border">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <FileStack className="w-4 h-4 text-[#C0392B]" />
                      <span className="font-semibold text-sm">{p.nombre}</span>
                    </div>
                    {p.prioridad && (
                      <Badge variant="secondary" className="text-[10px] capitalize">{p.prioridad}</Badge>
                    )}
                  </div>
                  {p.descripcion && (
                    <p className="text-xs text-muted-foreground mb-2">{p.descripcion}</p>
                  )}
                  <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground mb-3">
                    {p.area && <span className="bg-muted px-1.5 py-0.5 rounded">{p.area}</span>}
                    {p.empresa && <span className="bg-muted px-1.5 py-0.5 rounded">{p.empresa}</span>}
                    {p.responsableSugerido && <span className="bg-muted px-1.5 py-0.5 rounded">{p.responsableSugerido}</span>}
                    {p.duracionEstimada && <span className="bg-muted px-1.5 py-0.5 rounded">{p.duracionEstimada}h</span>}
                  </div>
                  {checklist.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {checklist.slice(0, 3).map((item: any, i: number) => (
                        <div key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                          {item.text || "Sin nombre"}
                        </div>
                      ))}
                      {checklist.length > 3 && (
                        <div className="text-[10px] text-muted-foreground pl-3">+{checklist.length - 3} más</div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteConfirm({ id: p.id, nombre: p.nombre })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>

    <DeleteConfirmModal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={() => { if (deleteConfirm) deletePlantilla.mutate({ id: deleteConfirm.id }); }}
      title="Eliminar plantilla"
      recordName={deleteConfirm?.nombre}
      isLoading={deletePlantilla.isPending}
    />
    </>
  );
}
