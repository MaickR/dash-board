import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Zap, Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

export default function AutomatizacionesPage() {
  const { data: automatizaciones = [], isLoading } = trpc.automatizaciones.list.useQuery();
  const utils = trpc.useUtils();
  const createAuto = trpc.automatizaciones.create.useMutation({
    onSuccess: () => { utils.automatizaciones.list.invalidate(); setShowCreate(false); resetForm(); toast.success("Automatización creada"); },
  });
  const updateAuto = trpc.automatizaciones.update.useMutation({
    onSuccess: () => { utils.automatizaciones.list.invalidate(); toast.success("Estado actualizado"); },
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);
  const deleteAuto = trpc.automatizaciones.delete.useMutation({
    onSuccess: () => { utils.automatizaciones.list.invalidate(); toast.success("Automatización eliminada"); setDeleteConfirm(null); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    trigger: "tarea_vencida" as const,
    accion: "notificar_email" as const,
    condicion: "",
    parametros: "",
  });

  const resetForm = () => setForm({ nombre: "", trigger: "tarea_vencida" as const, accion: "notificar_email" as const, condicion: "", parametros: "" });

  const TRIGGERS: Record<string, string> = {
    tarea_vencida: "Cuando una tarea se vence",
    tarea_completada: "Cuando una tarea se completa",
    tarea_creada: "Cuando se crea una tarea",
    tarea_asignada: "Cuando se asigna una tarea",
  };

  const ACCIONES: Record<string, string> = {
    notificar_email: "Enviar notificación por email",
    notificar_teams: "Enviar notificación a Teams",
    cambiar_estado: "Cambiar estado automáticamente",
    notificar_app: "Notificación en la app",
    asignar_responsable: "Asignar a responsable",
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Automatizaciones</h2>
          <p className="text-sm text-muted-foreground">Reglas que se ejecutan automáticamente cuando se cumplen condiciones</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#C0392B] hover:bg-[#A93226] text-white">
              <Plus className="w-4 h-4 mr-2" />Nueva Regla
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Crear Automatización</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-3">
              <Input
                placeholder="Nombre de la regla"
                value={form.nombre}
                onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
              />
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Cuando...</label>
                <Select value={form.trigger} onValueChange={v => setForm(p => ({ ...p, trigger: v as typeof p.trigger }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRIGGERS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Entonces...</label>
                <Select value={form.accion} onValueChange={v => setForm(p => ({ ...p, accion: v as typeof p.accion }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCIONES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Condición (JSON, opcional)"
                value={form.condicion}
                onChange={e => setForm(p => ({ ...p, condicion: e.target.value }))}
              />
              <Input
                placeholder="Parámetros (JSON, opcional)"
                value={form.parametros}
                onChange={e => setForm(p => ({ ...p, parametros: e.target.value }))}
              />
              <Button
                className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white"
                disabled={!form.nombre || createAuto.isPending}
                onClick={() => createAuto.mutate({
                  nombre: form.nombre,
                  trigger: form.trigger as any,
                  accion: form.accion as any,
                  condicion: form.condicion || undefined,
                  parametros: form.parametros || undefined,
                })}
              >
                {createAuto.isPending ? "Creando..." : "Crear Automatización"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {automatizaciones.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay automatizaciones configuradas</p>
            <p className="text-xs text-muted-foreground mt-1">Crea reglas para automatizar acciones repetitivas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {automatizaciones.map(auto => (
            <Card key={auto.id} className="border border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`w-4 h-4 ${auto.activa ? "text-amber-500" : "text-gray-300"}`} />
                      <span className="font-semibold text-sm">{auto.nombre}</span>
                      <Badge variant={auto.activa ? "default" : "secondary"} className="text-[10px]">
                        {auto.activa ? "Activa" : "Inactiva"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        <span>Cuando: {TRIGGERS[auto.trigger] ?? auto.trigger}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Entonces: {ACCIONES[auto.accion] ?? auto.accion}</span>
                      </div>
                    </div>
                    {auto.condicion && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Condición: {auto.condicion}</p>
                    )}
                    {auto.parametros && (
                      <p className="text-xs text-muted-foreground mt-1 italic">Parámetros: {auto.parametros}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateAuto.mutate({ id: auto.id, activa: !auto.activa })}
                    >
                      {auto.activa ? (
                        <ToggleRight className="w-5 h-5 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-600"
                      onClick={() => setDeleteConfirm({ id: auto.id, nombre: auto.nombre })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>

    <DeleteConfirmModal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={() => { if (deleteConfirm) deleteAuto.mutate({ id: deleteConfirm.id }); }}
      title="Eliminar automatización"
      recordName={deleteConfirm?.nombre}
      isLoading={deleteAuto.isPending}
    />
    </>
  );
}
