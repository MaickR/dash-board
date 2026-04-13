import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Plus, FileText, Sparkles, Edit2, Trash2, Check, X, Loader2, Star,
} from "lucide-react";
import { toast } from "sonner";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const TIPO_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ayuda_memoria: { label: "Generar Ayuda Memoria", color: "bg-blue-100 text-blue-700", icon: <FileText className="w-3 h-3" /> },
  extraer_tareas: { label: "Extraer Tareas", color: "bg-purple-100 text-purple-700", icon: <Sparkles className="w-3 h-3" /> },
};

type PromptTemplate = {
  id: number;
  nombre: string;
  tipo: string;
  descripcion: string | null;
  prompt: string;
  isDefault: boolean;
  createdAt: any;
  updatedAt: any;
};

export default function PlantillasPromptPage() {
  const { data: templates = [], isLoading } = trpc.promptTemplatesAM.list.useQuery();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    tipo: "ayuda_memoria" as "ayuda_memoria" | "extraer_tareas",
    descripcion: "",
    prompt: "",
    isDefault: false,
  });

  const createMut = trpc.promptTemplatesAM.create.useMutation({
    onSuccess: () => {
      utils.promptTemplatesAM.list.invalidate();
      setShowCreate(false);
      resetForm();
      toast.success("Plantilla creada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMut = trpc.promptTemplatesAM.update.useMutation({
    onSuccess: () => {
      utils.promptTemplatesAM.list.invalidate();
      setEditingId(null);
      resetForm();
      toast.success("Plantilla actualizada");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);
  const deleteMut = trpc.promptTemplatesAM.delete.useMutation({
    onSuccess: () => {
      utils.promptTemplatesAM.list.invalidate();
      toast.success("Plantilla eliminada");
      setDeleteConfirm(null);
    },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });

  function resetForm() {
    setForm({ nombre: "", tipo: "ayuda_memoria", descripcion: "", prompt: "", isDefault: false });
  }

  function startEdit(t: PromptTemplate) {
    setEditingId(t.id);
    setForm({
      nombre: t.nombre,
      tipo: t.tipo as "ayuda_memoria" | "extraer_tareas",
      descripcion: t.descripcion || "",
      prompt: t.prompt,
      isDefault: t.isDefault,
    });
  }

  function handleSave() {
    if (!form.nombre.trim() || !form.prompt.trim()) {
      toast.error("Nombre y prompt son requeridos");
      return;
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, ...form });
    } else {
      createMut.mutate({ ...form, tipo: form.tipo as "ayuda_memoria" | "extraer_tareas" });
    }
  }

  const ayudaMemoriaTemplates = (templates as PromptTemplate[]).filter(t => t.tipo === "ayuda_memoria");
  const extraerTareasTemplates = (templates as PromptTemplate[]).filter(t => t.tipo === "extraer_tareas");

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Plantillas de Prompt</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prompts personalizados para generar ayudas memorias y extraer tareas con IA
          </p>
        </div>
        <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white"
          onClick={() => { resetForm(); setEditingId(null); setShowCreate(true); }}>
          <Plus className="w-3.5 h-3.5 mr-1" />Nueva Plantilla
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreate || editingId) && (
        <Card className="border border-[#C0392B]/20">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-bold text-foreground">
              {editingId ? "Editar Plantilla" : "Nueva Plantilla de Prompt"}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                  placeholder="Ej: Brief ejecutivo CAP" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tipo *</label>
                <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value as "ayuda_memoria" | "extraer_tareas" }))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                  <option value="ayuda_memoria">Generar Ayuda Memoria</option>
                  <option value="extraer_tareas">Extraer Tareas</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Descripción</label>
              <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
                placeholder="Descripción breve de esta plantilla..." />
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Prompt *</label>
              <textarea value={form.prompt} onChange={e => setForm(p => ({ ...p, prompt: e.target.value }))}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[120px] resize-y font-mono text-xs"
                placeholder="Escribe el prompt que se usará para generar contenido con IA...&#10;&#10;Variables disponibles: {{contenido}}, {{area}}, {{fecha}}" />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={form.isDefault}
                onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                className="rounded border-border" />
              <label htmlFor="isDefault" className="text-xs text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" />Plantilla por defecto para su tipo
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white"
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}>
                {(createMut.isPending || updateMut.isPending) ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                ) : editingId ? (
                  <Check className="w-3.5 h-3.5 mr-1" />
                ) : (
                  <Plus className="w-3.5 h-3.5 mr-1" />
                )}
                {editingId ? "Guardar Cambios" : "Crear Plantilla"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates by type */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-[#C0392B]" />
        </div>
      ) : (templates as PromptTemplate[]).length === 0 ? (
        <Card className="border border-border">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay plantillas de prompt creadas</p>
            <p className="text-xs text-muted-foreground mt-1">Crea una plantilla para personalizar la generación de ayudas memorias con IA</p>
            <Button size="sm" className="mt-4 bg-[#C0392B] hover:bg-[#a93226] text-white"
              onClick={() => { resetForm(); setShowCreate(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />Crear primera plantilla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {[
            { title: "Generar Ayuda Memoria", items: ayudaMemoriaTemplates, tipo: "ayuda_memoria" },
            { title: "Extraer Tareas", items: extraerTareasTemplates, tipo: "extraer_tareas" },
          ].map(section => (
            <div key={section.tipo}>
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                {TIPO_LABELS[section.tipo]?.icon}
                {section.title}
                <Badge className="text-[9px] bg-muted text-muted-foreground">{section.items.length}</Badge>
              </h3>
              {section.items.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-5">No hay plantillas de este tipo</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map(t => (
                    <Card key={t.id} className={`border ${t.isDefault ? "border-amber-200 bg-amber-50/20" : "border-border"}`}>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-foreground">{t.nombre}</span>
                              {t.isDefault && (
                                <Badge className="text-[9px] bg-amber-100 text-amber-700 border-amber-200">
                                  <Star className="w-2.5 h-2.5 mr-0.5" />Por defecto
                                </Badge>
                              )}
                            </div>
                            {t.descripcion && (
                              <p className="text-xs text-muted-foreground mt-0.5">{t.descripcion}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600"
                              onClick={() => startEdit(t)}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600"
                              onClick={() => setDeleteConfirm({ id: t.id, nombre: t.nombre })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 border border-border">
                          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                            {t.prompt}
                          </pre>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Creada: {new Date(t.createdAt).toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>

    <DeleteConfirmModal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={() => { if (deleteConfirm) deleteMut.mutate({ id: deleteConfirm.id }); }}
      title="Eliminar plantilla de prompt"
      recordName={deleteConfirm?.nombre}
      isLoading={deleteMut.isPending}
    />
    </>
  );
}
