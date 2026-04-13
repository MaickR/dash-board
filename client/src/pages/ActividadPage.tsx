import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Activity, Clock, Filter, Download, Search, User, Layers, Calendar } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  creacion: "Creación",
  actualizacion: "Actualización",
  cambio_estado: "Cambio de estado",
  asignacion: "Asignación",
  comentario: "Comentario",
  eliminacion: "Eliminación",
};

const TIPO_COLORS: Record<string, string> = {
  creacion: "bg-green-100 text-green-700",
  actualizacion: "bg-blue-100 text-blue-700",
  cambio_estado: "bg-purple-100 text-purple-700",
  asignacion: "bg-amber-100 text-amber-700",
  comentario: "bg-cyan-100 text-cyan-700",
  eliminacion: "bg-red-100 text-red-700",
};

const TIPO_ICONS: Record<string, string> = {
  creacion: "🟢",
  actualizacion: "🔵",
  cambio_estado: "🟣",
  asignacion: "🟡",
  comentario: "🔷",
  eliminacion: "🔴",
};

export default function ActividadPage() {
  const { data: actividades = [], isLoading } = trpc.actividad.global.useQuery({ limit: 500 });
  const [tipoFilter, setTipoFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [moduloFilter, setModuloFilter] = useState("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");

  // Get unique modulos
  const modulos = useMemo(() => {
    const set = new Set<string>();
    (actividades as any[]).forEach((a: any) => {
      if (a.modulo) set.add(a.modulo);
    });
    return Array.from(set).sort();
  }, [actividades]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    return (actividades as any[]).filter((a: any) => {
      if (tipoFilter !== "all" && a.accion !== tipoFilter) return false;
      if (moduloFilter !== "all" && a.modulo !== moduloFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchDetalle = a.detalle?.toLowerCase().includes(q);
        const matchUsuario = a.usuario?.toLowerCase().includes(q);
        if (!matchDetalle && !matchUsuario) return false;
      }
      if (dateRange !== "all") {
        const ts = new Date(a.createdAt).getTime();
        if (dateRange === "today" && ts < now - dayMs) return false;
        if (dateRange === "week" && ts < now - 7 * dayMs) return false;
        if (dateRange === "month" && ts < now - 30 * dayMs) return false;
      }
      return true;
    });
  }, [actividades, tipoFilter, searchQuery, moduloFilter, dateRange]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const a of filtered) {
      const date = new Date(a.createdAt).toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      if (!map[date]) map[date] = [];
      map[date].push(a);
    }
    return Object.entries(map);
  }, [filtered]);

  // Export CSV
  const exportCSV = () => {
    const headers = ["Fecha", "Hora", "Tipo", "Detalle", "Usuario", "Módulo"];
    const rows = filtered.map((a: any) => [
      new Date(a.createdAt).toLocaleDateString("es-HN"),
      new Date(a.createdAt).toLocaleTimeString("es-HN"),
      TIPO_LABELS[a.accion] ?? a.accion,
      `"${(a.detalle ?? "").replace(/"/g, '""')}"`,
      a.usuario ?? "",
      a.modulo ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `actividad_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Actividad Global
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} registros encontrados</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por detalle o usuario..."
            className="pl-9"
          />
        </div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}>
          <SelectTrigger className="w-44"><Filter className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={moduloFilter} onValueChange={setModuloFilter}>
          <SelectTrigger className="w-44"><Layers className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los módulos</SelectItem>
            {modulos.map(m => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={v => setDateRange(v as any)}>
          <SelectTrigger className="w-36"><Calendar className="w-3.5 h-3.5 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo el tiempo</SelectItem>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="week">Última semana</SelectItem>
            <SelectItem value="month">Último mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {grouped.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No hay actividad registrada con los filtros seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, items]) => (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{date}</h3>
              <div className="space-y-2">
                {items.map((a: any) => (
                  <Card key={a.id} className="border border-border hover:border-primary/20 transition-colors">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="text-base mt-0.5 flex-shrink-0">{TIPO_ICONS[a.accion] ?? "⚪"}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Badge variant="secondary" className={`text-[10px] ${TIPO_COLORS[a.accion] ?? ""}`}>
                            {TIPO_LABELS[a.accion] ?? a.accion}
                          </Badge>
                          {a.modulo && (
                            <Badge variant="outline" className="text-[10px]">{a.modulo}</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(a.createdAt).toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{a.detalle}</p>
                        {a.usuario && (
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <User className="w-3 h-3" /> {a.usuario}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
