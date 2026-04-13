import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  Network, List, Building2, Loader2, Search, Users, ChevronDown, ChevronRight,
  User, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const EMPRESA_COLORS: Record<string, string> = {
  "CAP Honduras": "#C0392B",
  "Auto Repuestos Blessing": "#E67E22",
  "Distribuidora Mansiago": "#27AE60",
  "Inversiones S&M": "#2980B9",
  "Tecnicentro DIDASA": "#8E44AD",
  "JAPAN HN": "#16A085",
};

type OrgPerson = {
  id: number;
  nombre: string;
  cargo: string;
  escala: string | null;
  nivel: string | null;
  empresa: string;
  departamento: string | null;
  equipo: number | null;
  reportaA: number | null;
  esVacante: boolean | null;
  orden: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type ViewMode = "organigrama" | "tabla" | "empresa";

export default function OrganizacionPage() {
  const { data: personas = [], isLoading } = trpc.organizacion.list.useQuery();
  const seedMut = trpc.organizacion.seed.useMutation({
    onSuccess: () => {
      trpc.useUtils().organizacion.list.invalidate();
      toast.success("Organigrama cargado con éxito");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const [viewMode, setViewMode] = useState<ViewMode>("organigrama");
  const [searchQuery, setSearchQuery] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState<string>("all");
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  const allPersonas = personas as OrgPerson[];
  // Map DB fields to display-friendly names
  const getParentId = (p: OrgPerson) => p.reportaA;
  const isVacante = (p: OrgPerson) => !!p.esVacante;

  const filteredPersonas = useMemo(() => {
    let result = allPersonas;
    if (empresaFilter !== "all") {
      result = result.filter(p => p.empresa === empresaFilter);
    }
    if (searchQuery.length >= 2) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.nombre.toLowerCase().includes(q) ||
        p.cargo.toLowerCase().includes(q) ||
        p.empresa.toLowerCase().includes(q) ||
        (p.departamento || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPersonas, empresaFilter, searchQuery]);

  const empresas = useMemo(() => {
    const map = new Map<string, OrgPerson[]>();
    allPersonas.forEach(p => {
      const arr = map.get(p.empresa) || [];
      arr.push(p);
      map.set(p.empresa, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [allPersonas]);

  // Build tree structure
  const treeRoots = useMemo(() => {
    const childMap = new Map<number | null, OrgPerson[]>();
    allPersonas.forEach(p => {
      const arr = childMap.get(getParentId(p)) || [];
      arr.push(p);
      childMap.set(getParentId(p), arr);
    });
    // Sort children by orden then by nombre
    childMap.forEach((children) => {
      children.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));
    });
    return { roots: childMap.get(null) || [], childMap };
  }, [allPersonas]);

  function toggleNode(id: number) {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedNodes(new Set(allPersonas.map(p => p.id)));
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  // Recursive tree node component
  function TreeNode({ person, depth }: { person: OrgPerson; depth: number }) {
    const children = treeRoots.childMap.get(person.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(person.id);
    const color = EMPRESA_COLORS[person.empresa] || "#666";
    const vacant = isVacante(person);

    return (
      <div className={depth > 0 ? "ml-4 sm:ml-6 border-l border-border" : ""}>
        <div className={`flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors ${
          vacant ? "opacity-70" : ""
        }`}>
          {hasChildren ? (
            <button onClick={() => toggleNode(person.id)} className="mt-1 flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}

          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
            vacant ? "bg-gray-400" : ""
          }`} style={vacant ? {} : { backgroundColor: color }}>
            {vacant ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              person.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold ${vacant ? "text-red-600 italic" : "text-foreground"}`}>
                {person.nombre}
              </span>
              {vacant && (
                <Badge className="text-[8px] bg-red-100 text-red-700 border-red-200">VACANTE</Badge>
              )}
              {person.equipo && person.equipo > 0 && (
                <Badge className="text-[8px] bg-muted text-muted-foreground">
                  <Users className="w-2.5 h-2.5 mr-0.5" />{person.equipo}
                </Badge>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">{person.cargo}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-medium" style={{ color }}>{person.empresa}</span>
              {person.departamento && (
                <span className="text-[9px] text-muted-foreground">· {person.departamento}</span>
              )}
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div>
            {children.map(child => (
              <TreeNode key={child.id} person={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#C0392B]" />
      </div>
    );
  }

  if (allPersonas.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Organización</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Estructura organizacional del Grupo CAP</p>
        </div>
        <Card className="border border-border">
          <CardContent className="p-12 text-center">
            <Network className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay datos de organización cargados</p>
            <p className="text-xs text-muted-foreground mt-1">Carga la estructura organizacional del Grupo CAP</p>
            <Button size="sm" className="mt-4 bg-[#C0392B] hover:bg-[#a93226] text-white"
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}>
              {seedMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Network className="w-3.5 h-3.5 mr-1" />}
              Cargar Organigrama
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">Organización</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allPersonas.length} personas · {empresas.length} empresas · {allPersonas.filter(p => isVacante(p)).length} vacantes
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {([
              { key: "organigrama", label: "Organigrama", icon: Network },
              { key: "tabla", label: "Tabla", icon: List },
              { key: "empresa", label: "Por Empresa", icon: Building2 },
            ] as const).map(v => (
              <button key={v.key}
                onClick={() => setViewMode(v.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === v.key
                    ? "bg-[#C0392B] text-white"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}>
                <v.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, cargo, empresa..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground" />
        </div>
        <select value={empresaFilter} onChange={e => setEmpresaFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
          <option value="all">Todas las empresas</option>
          {Object.keys(EMPRESA_COLORS).map(emp => (
            <option key={emp} value={emp}>{emp}</option>
          ))}
        </select>
      </div>

      {/* ORGANIGRAMA VIEW */}
      {viewMode === "organigrama" && (
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-foreground">Árbol Jerárquico</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={expandAll}>
                  Expandir todo
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={collapseAll}>
                  Colapsar todo
                </Button>
              </div>
            </div>
            <div className="space-y-0.5">
              {treeRoots.roots.map(root => (
                <TreeNode key={root.id} person={root} depth={0} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABLA VIEW */}
      {viewMode === "tabla" && (
        <Card className="border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nombre</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Cargo</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Escala</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Nivel</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Empresa</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Departamento</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Equipo</th>
                </tr>
              </thead>
              <tbody>
                {filteredPersonas.map((p, idx) => {
                  const color = EMPRESA_COLORS[p.empresa] || "#666";
                  return (
                    <tr key={p.id} className={`border-b border-border/50 hover:bg-muted/30 ${isVacante(p) ? "opacity-60" : ""}`}>
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                            style={{ backgroundColor: isVacante(p) ? "#9ca3af" : color }}>
                            {isVacante(p) ? "?" : p.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                          </div>
                          <span className={`font-medium ${isVacante(p) ? "text-red-600 italic" : "text-foreground"}`}>
                            {p.nombre}
                          </span>
                          {isVacante(p) && <Badge className="text-[7px] bg-red-100 text-red-700 ml-1">VACANTE</Badge>}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.cargo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.escala || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.nivel ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium" style={{ color }}>{p.empresa}</span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{p.departamento || "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{p.equipo ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* POR EMPRESA VIEW */}
      {viewMode === "empresa" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {empresas
            .filter(([emp]) => empresaFilter === "all" || emp === empresaFilter)
            .map(([empresa, members]) => {
              const color = EMPRESA_COLORS[empresa] || "#666";
              const filtered = searchQuery.length >= 2
                ? members.filter(m => m.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || m.cargo.toLowerCase().includes(searchQuery.toLowerCase()))
                : members;
              const vacantes = members.filter(m => isVacante(m)).length;

              return (
                <Card key={empresa} className="border border-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-border" style={{ backgroundColor: `${color}10` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                        <h3 className="text-sm font-bold" style={{ color }}>{empresa}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[9px] bg-muted text-muted-foreground">
                          <Users className="w-2.5 h-2.5 mr-0.5" />{members.length}
                        </Badge>
                        {vacantes > 0 && (
                          <Badge className="text-[9px] bg-red-100 text-red-700">
                            {vacantes} vacante{vacantes > 1 ? "s" : ""}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
                    {filtered.map(p => (
                          <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 ${
                        isVacante(p) ? "opacity-60" : ""
                      }`}>
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                          style={{ backgroundColor: isVacante(p) ? "#9ca3af" : color }}>
                          {isVacante(p) ? "?" : p.nombre.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-medium truncate ${isVacante(p) ? "text-red-600 italic" : "text-foreground"}`}>
                            {p.nombre}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.cargo}</div>
                        </div>
                        {p.equipo && p.equipo > 0 && (
                          <Badge className="text-[8px] bg-muted text-muted-foreground flex-shrink-0">
                            <Users className="w-2.5 h-2.5 mr-0.5" />{p.equipo}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}
    </div>
  );
}
