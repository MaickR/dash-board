import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Building2, Plus, History, UserCheck, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

const EMPRESAS = [
  "CAP Honduras",
  "Distribuidora Mansiago",
  "Inversiones S&M",
  "CAP Soluciones Logísticas",
  "Auto Repuestos Blessing",
];

const CATEGORIAS = [
  "Administrativo",
  "Operativo",
  "Comercial",
  "Financiero",
  "Legal",
  "Tecnología",
  "Recursos Humanos",
  "Logística",
  "Marketing",
  "Otro",
];

const EMPRESA_COLORS: Record<string, string> = {
  "CAP Honduras": "bg-red-50 border-red-200 text-red-700",
  "Distribuidora Mansiago": "bg-blue-50 border-blue-200 text-blue-700",
  "Inversiones S&M": "bg-green-50 border-green-200 text-green-700",
  "CAP Soluciones Logísticas": "bg-purple-50 border-purple-200 text-purple-700",
  "Auto Repuestos Blessing": "bg-amber-50 border-amber-200 text-amber-700",
};

export default function DepartamentosPage() {
  const { data: departamentos, isLoading } = trpc.departamentos.list.useQuery();
  const { data: responsables } = trpc.responsables.list.useQuery();
  const utils = trpc.useUtils();

  const [showCreate, setShowCreate] = useState(false);
  const [nombre, setNombre] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [categoria, setCategoria] = useState("");
  const [responsableId, setResponsableId] = useState<string>("");
  const [expandedDept, setExpandedDept] = useState<number | null>(null);
  const [editingDept, setEditingDept] = useState<any | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editEmpresa, setEditEmpresa] = useState("");
  const [editCategoria, setEditCategoria] = useState("");
  const [editResponsableId, setEditResponsableId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editMotivoCambio, setEditMotivoCambio] = useState("");

  const createMut = trpc.departamentos.create.useMutation({
    onSuccess: () => {
      utils.departamentos.list.invalidate();
      setShowCreate(false);
      setNombre(""); setEmpresa(""); setCategoria(""); setResponsableId("");
      toast.success("Departamento creado exitosamente");
    },
    onError: (err) => toast.error(err.message),
  });
  const updateMut = trpc.departamentos.update.useMutation({
    onSuccess: () => {
      utils.departamentos.list.invalidate();
      setEditingDept(null);
      toast.success("Departamento actualizado");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMut = trpc.departamentos.delete.useMutation({
    onSuccess: () => {
      utils.departamentos.list.invalidate();
      setDeleteConfirm(null);
      toast.success("Departamento eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  const grouped = (departamentos ?? []).reduce((acc, d) => {
    const key = d.empresa ?? "Sin empresa";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {} as Record<string, typeof departamentos extends (infer T)[] | undefined ? T[] : never[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#C0392B]" />
            Departamentos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestión de departamentos por empresa con categorías y responsables
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-[#C0392B] hover:bg-[#A93226] text-white min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />Nuevo Departamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear Departamento</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre del departamento *</label>
                <Input placeholder="Ej: Contabilidad" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa *</label>
                <Select value={empresa} onValueChange={setEmpresa}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsable actual (opcional)</label>
                <Select value={responsableId} onValueChange={setResponsableId}>
                  <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {(responsables ?? []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nombre} — {r.area}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white min-h-[44px]"
                disabled={!nombre || !empresa || createMut.isPending}
                onClick={() => createMut.mutate({
                  nombre, empresa,
                  categoria: categoria || undefined,
                  responsableActualId: responsableId && responsableId !== "none" ? Number(responsableId) : null,
                })}>
                {createMut.isPending ? "Creando..." : "Crear Departamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {EMPRESAS.map(emp => {
          const count = grouped[emp]?.length ?? 0;
          return (
            <Card key={emp} className={`border ${EMPRESA_COLORS[emp] ?? ""}`}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs mt-1 truncate">{emp}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando departamentos...</div>
      ) : (
        <div className="space-y-6">
          {EMPRESAS.map(emp => {
            const depts = grouped[emp] ?? [];
            if (depts.length === 0) return (
              <Card key={emp} className="border border-dashed border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />{emp}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">Sin departamentos registrados</p></CardContent>
              </Card>
            );
            return (
              <Card key={emp} className="border border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#C0392B]" />{emp}
                    <Badge variant="outline" className="ml-2">{depts.length} dept{depts.length > 1 ? "s" : ""}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {depts.map((dept: any) => {
                    const respName = dept.responsableActualId
                      ? (responsables ?? []).find(r => r.id === dept.responsableActualId)?.nombre ?? "—"
                      : "Sin asignar";
                    return (
                      <div key={dept.id} className="border border-border rounded-lg">
                        <div className="flex items-center justify-between p-3 hover:bg-accent/30 cursor-pointer"
                          onClick={() => setExpandedDept(expandedDept === dept.id ? null : dept.id)}>
                          <div className="flex items-center gap-3">
                            {expandedDept === dept.id ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                            <div>
                              <div className="font-medium text-foreground flex items-center gap-2">
                                {dept.nombre}
                                {(dept as any).categoria && (
                                  <Badge variant="outline" className="text-[10px]">{(dept as any).categoria}</Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <UserCheck className="w-3 h-3" />
                                {respName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => {
                              e.stopPropagation();
                              setEditingDept(dept);
                              setEditNombre(dept.nombre);
                              setEditEmpresa(dept.empresa ?? "");
                              setEditCategoria((dept as any).categoria ?? "");
                              setEditResponsableId(dept.responsableActualId ? String(dept.responsableActualId) : "none");
                            }}><Pencil className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={e => {
                              e.stopPropagation();
                              setDeleteConfirm(dept.id);
                            }}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                        {expandedDept === dept.id && <DeptHistorial departamentoId={dept.id} />}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editingDept !== null} onOpenChange={() => setEditingDept(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Departamento</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre</label>
              <Input value={editNombre} onChange={e => setEditNombre(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
              <Select value={editEmpresa} onValueChange={setEditEmpresa}>
                <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
                <SelectContent>{EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
              <Select value={editCategoria} onValueChange={setEditCategoria}>
                <SelectTrigger><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Responsable actual</label>
              <Select value={editResponsableId} onValueChange={setEditResponsableId}>
                <SelectTrigger><SelectValue placeholder="Responsable" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {(responsables ?? []).map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nombre} — {r.area}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editingDept && editResponsableId !== (editingDept.responsableActualId ? String(editingDept.responsableActualId) : "none") && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Motivo del cambio de responsable</label>
                <Textarea placeholder="Ej: Rotación de personal, promoción, etc." value={editMotivoCambio} onChange={e => setEditMotivoCambio(e.target.value)} rows={2} />
              </div>
            )}
            <Button className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white min-h-[44px]" disabled={updateMut.isPending}
              onClick={() => editingDept && updateMut.mutate({
                id: editingDept.id,
                nombre: editNombre,
                empresa: editEmpresa,
                categoria: editCategoria && editCategoria !== "none" ? editCategoria : null,
                responsableActualId: editResponsableId && editResponsableId !== "none" ? Number(editResponsableId) : null,
                motivoCambio: editMotivoCambio || undefined,
              })}>
              {updateMut.isPending ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Eliminación</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro de que desea eliminar este departamento? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                disabled={deleteMut.isPending}
                onClick={() => deleteConfirm && deleteMut.mutate({ id: deleteConfirm })}>
                {deleteMut.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DeptHistorial({ departamentoId }: { departamentoId: number }) {
  const { data: historial, isLoading } = trpc.departamentos.historial.useQuery({ departamentoId });
  if (isLoading) return <div className="p-3 text-sm text-muted-foreground">Cargando historial...</div>;
  if (!historial || historial.length === 0) return (
    <div className="p-3 text-sm text-muted-foreground flex items-center gap-2 border-t border-border">
      <History className="w-4 h-4" />Sin historial de cambios de responsable
    </div>
  );
  return (
    <div className="px-4 pb-3 border-t border-border">
      <div className="text-xs font-semibold text-muted-foreground mt-3 mb-2 flex items-center gap-1">
        <History className="w-3 h-3" />Historial de Responsables
      </div>
      <div className="space-y-1.5">
        {historial.map((h: any) => (
          <div key={h.id} className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${h.fechaFin ? "bg-gray-300" : "bg-green-500"}`} />
            <span className="font-medium text-foreground">{h.responsableNombre}</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-muted-foreground text-xs">{h.fechaInicio}{h.fechaFin ? ` → ${h.fechaFin}` : " → Actual"}</span>
            {h.motivoCambio && <span className="text-muted-foreground text-xs italic">({h.motivoCambio})</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
