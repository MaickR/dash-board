import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { UserPlus, Pencil, Trash2, Users, Mail, Phone, Building2, Briefcase } from "lucide-react";
import { toast } from "sonner";

const EMPRESAS = [
  "CAP Honduras",
  "Distribuidora Mansiago",
  "Inversiones S&M",
  "CAP Soluciones Logísticas",
  "Auto Repuestos Blessing",
];

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

const AVATAR_COLORS = [
  "bg-red-100 text-red-700",
  "bg-blue-100 text-blue-700",
  "bg-green-100 text-green-700",
  "bg-purple-100 text-purple-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
  "bg-pink-100 text-pink-700",
  "bg-indigo-100 text-indigo-700",
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function ResponsablesPage() {
  const { data: responsables = [], isLoading } = trpc.responsables.list.useQuery();
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  const utils = trpc.useUtils();
  const createResp = trpc.responsables.create.useMutation({
    onSuccess: () => { utils.responsables.list.invalidate(); toast.success("Responsable agregado"); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const updateResp = trpc.responsables.update.useMutation({
    onSuccess: () => { utils.responsables.list.invalidate(); toast.success("Responsable actualizado"); resetForm(); },
    onError: (err) => toast.error(err.message),
  });
  const deleteResp = trpc.responsables.delete.useMutation({
    onSuccess: () => { utils.responsables.list.invalidate(); setDeleteConfirm(null); toast.success("Responsable eliminado"); },
    onError: (err) => toast.error(err.message),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [telefono, setTelefono] = useState("");
  const [departamentoId, setDepartamentoId] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSave = () => {
    if (!nombre.trim() || !area.trim()) { toast.error("Nombre y área son requeridos"); return; }
    const data = {
      nombre, area,
      email: email || undefined,
      cargo: cargo || undefined,
      empresa: empresa || undefined,
      telefono: telefono || undefined,
      departamentoId: departamentoId && departamentoId !== "none" ? Number(departamentoId) : undefined,
    };
    if (editId) {
      updateResp.mutate({ id: editId, ...data });
    } else {
      createResp.mutate(data);
    }
  };

  const handleEdit = (r: any) => {
    setEditId(r.id);
    setNombre(r.nombre);
    setArea(r.area);
    setEmail(r.email || "");
    setCargo(r.cargo || "");
    setEmpresa(r.empresa || "");
    setTelefono(r.telefono || "");
    setDepartamentoId(r.departamentoId ? String(r.departamentoId) : "none");
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditId(null); setNombre(""); setArea(""); setEmail("");
    setCargo(""); setEmpresa(""); setTelefono(""); setDepartamentoId("");
    setDialogOpen(false);
  };

  const filtered = searchQuery
    ? responsables.filter(r =>
        r.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.email && r.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : responsables;

  const grouped = filtered.reduce((acc: Record<string, typeof responsables>, r) => {
    if (!acc[r.area]) acc[r.area] = [];
    acc[r.area].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-[#C0392B]" />
            Base de Datos de Responsables
          </h2>
          <p className="text-sm text-muted-foreground">{responsables.length} coordinadores y colaboradores registrados</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); else setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#C0392B] hover:bg-[#A93226] text-white min-h-[44px]" onClick={() => setDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />Agregar Responsable
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editId ? "Editar" : "Agregar"} Responsable</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nombre completo *</label>
                <Input placeholder="Ej: Carlos Rosales" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Cargo</label>
                <Input placeholder="Ej: Coordinador de Procesos" value={cargo} onChange={e => setCargo(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Área / Departamento *</label>
                <Input placeholder="Ej: Procesos y Mejora Continua" value={area} onChange={e => setArea(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Empresa</label>
                <Select value={empresa} onValueChange={setEmpresa}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar empresa" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {EMPRESAS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Departamento asignado</label>
                <Select value={departamentoId} onValueChange={setDepartamentoId}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar departamento" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {departamentos.map(d => <SelectItem key={d.id} value={String(d.id)}>{d.nombre} — {d.empresa}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Correo electrónico</label>
                  <Input placeholder="correo@empresa.com" value={email} onChange={e => setEmail(e.target.value)} type="email" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Teléfono</label>
                  <Input placeholder="+504 9999-9999" value={telefono} onChange={e => setTelefono(e.target.value)} type="tel" />
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-[#C0392B] hover:bg-[#A93226] text-white min-h-[44px]"
                disabled={createResp.isPending || updateResp.isPending}>
                {createResp.isPending || updateResp.isPending ? "Guardando..." : editId ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar responsable por nombre, área o correo..."
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        className="max-w-md"
      />

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando responsables...</div>
      ) : (
        Object.entries(grouped).sort().map(([area, members]) => (
          <div key={area}>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C0392B]" />{area}
              <Badge variant="outline" className="text-[10px]">{members.length}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map(r => (
                <Card key={r.id} className="border border-border shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar with initials */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${getAvatarColor(r.nombre)}`}>
                        {getInitials(r.nombre)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{r.nombre}</div>
                        {(r as any).cargo && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Briefcase className="w-3 h-3 flex-shrink-0" /><span className="truncate">{(r as any).cargo}</span>
                          </div>
                        )}
                        {(r as any).empresa && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Building2 className="w-3 h-3 flex-shrink-0" /><span className="truncate">{(r as any).empresa}</span>
                          </div>
                        )}
                        {r.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{r.email}</span>
                          </div>
                        )}
                        {(r as any).telefono && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="w-3 h-3 flex-shrink-0" />{(r as any).telefono}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteConfirm(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirmar Eliminación</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro de que desea eliminar este responsable? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 min-h-[44px]" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white min-h-[44px]"
                disabled={deleteResp.isPending}
                onClick={() => deleteConfirm && deleteResp.mutate({ id: deleteConfirm })}>
                {deleteResp.isPending ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
