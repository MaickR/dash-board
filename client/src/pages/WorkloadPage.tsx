import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Users, AlertTriangle, Clock, Download, Search, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function WorkloadPage() {
  const { data: tasks = [], isLoading } = trpc.tareas.list.useQuery();
  const { data: responsables = [] } = trpc.responsables.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [empresaFilter, setEmpresaFilter] = useState("all");
  const [semaforoFilter, setSemaforoFilter] = useState("all");

  const workload = useMemo(() => {
    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const map: Record<string, {
      nombre: string; area: string; empresa: string;
      total: number; pendientes: number; enProgreso: number; completadas: number; vencidas: number;
      bloqueadas: number; completadasMes: number;
    }> = {};

    for (const r of responsables) {
      map[r.nombre] = {
        nombre: r.nombre, area: r.area ?? "", empresa: r.empresa ?? "",
        total: 0, pendientes: 0, enProgreso: 0, completadas: 0, vencidas: 0,
        bloqueadas: 0, completadasMes: 0,
      };
    }

    for (const t of tasks as any[]) {
      if (!t.responsable) continue;
      if (!map[t.responsable]) {
        map[t.responsable] = {
          nombre: t.responsable, area: t.area ?? "", empresa: "",
          total: 0, pendientes: 0, enProgreso: 0, completadas: 0, vencidas: 0,
          bloqueadas: 0, completadasMes: 0,
        };
      }
      const m = map[t.responsable];
      m.total++;
      if (t.status === "pendiente") m.pendientes++;
      if (t.status === "en_progreso") m.enProgreso++;
      if (t.status === "completada") {
        m.completadas++;
        if (t.updatedAt && new Date(t.updatedAt).getTime() >= monthStart.getTime()) m.completadasMes++;
      }
      if (t.status !== "completada" && t.fechaTs && t.fechaTs < now) m.vencidas++;
      if (t.dependeDeId != null) m.bloqueadas++;
    }

    return Object.values(map).sort((a, b) => (b.pendientes + b.enProgreso) - (a.pendientes + a.enProgreso));
  }, [tasks, responsables]);

  const getSemaforo = (activas: number, vencidas: number) => {
    if (activas > 10 || vencidas > 3) return { label: "Rojo", color: "bg-red-500", textColor: "text-red-700", bgColor: "bg-red-50 border-red-200", key: "rojo" };
    if (activas > 5 || vencidas > 1) return { label: "Amarillo", color: "bg-amber-400", textColor: "text-amber-700", bgColor: "bg-amber-50 border-amber-200", key: "amarillo" };
    return { label: "Verde", color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50 border-green-200", key: "verde" };
  };

  const empresas = useMemo(() => {
    const set = new Set<string>();
    workload.forEach(w => { if (w.empresa) set.add(w.empresa); });
    return Array.from(set).sort();
  }, [workload]);

  const filtered = useMemo(() => {
    return workload.filter(w => {
      if (searchQuery && !w.nombre.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (empresaFilter !== "all" && w.empresa !== empresaFilter) return false;
      const activas = w.pendientes + w.enProgreso;
      const sem = getSemaforo(activas, w.vencidas);
      if (semaforoFilter !== "all" && sem.key !== semaforoFilter) return false;
      return true;
    });
  }, [workload, searchQuery, empresaFilter, semaforoFilter]);

  const exportCSV = () => {
    const headers = ["Nombre", "Área", "Empresa", "Total", "Pendientes", "En Progreso", "Completadas", "Vencidas", "Bloqueadas", "Completadas este mes", "Semáforo"];
    const rows = filtered.map(w => {
      const activas = w.pendientes + w.enProgreso;
      return [w.nombre, w.area, w.empresa, w.total, w.pendientes, w.enProgreso, w.completadas, w.vencidas, w.bloqueadas, w.completadasMes, getSemaforo(activas, w.vencidas).label];
    });
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carga_trabajo_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  // Summary counts
  const summary = useMemo(() => {
    let verde = 0, amarillo = 0, rojo = 0;
    workload.forEach(w => {
      const activas = w.pendientes + w.enProgreso;
      const sem = getSemaforo(activas, w.vencidas);
      if (sem.key === "verde") verde++;
      else if (sem.key === "amarillo") amarillo++;
      else rojo++;
    });
    return { verde, amarillo, rojo };
  }, [workload]);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Carga de Trabajo
          </h2>
          <p className="text-sm text-muted-foreground">Distribución de tareas por responsable con semáforo de carga</p>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Verde", count: summary.verde, color: "text-green-600", bg: "bg-green-50 border-green-200" },
          { label: "Amarillo", count: summary.amarillo, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
          { label: "Rojo", count: summary.rojo, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map(s => (
          <Card key={s.label} className={`border ${s.bg} cursor-pointer`} onClick={() => setSemaforoFilter(semaforoFilter === s.label.toLowerCase() ? "all" : s.label.toLowerCase())}>
            <CardContent className="p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar por nombre..." className="pl-9" />
        </div>
        <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
          <SelectTrigger className="w-52"><Building2 className="w-3.5 h-3.5 mr-1" /><SelectValue placeholder="Empresa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las empresas</SelectItem>
            {empresas.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Workload list */}
      <div className="space-y-3">
        {filtered.map(w => {
          const activas = w.pendientes + w.enProgreso;
          const level = getSemaforo(activas, w.vencidas);
          const completedPercent = w.total > 0 ? Math.round((w.completadas / w.total) * 100) : 0;
          return (
            <Card key={w.nombre} className={`border ${level.bgColor}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground">
                      {w.nombre.split(" ").map(n => n[0]).join("").substring(0, 2)}
                    </div>
                    <div>
                      <span className="font-semibold text-sm">{w.nombre}</span>
                      <div className="text-xs text-muted-foreground">{w.area}{w.empresa ? ` — ${w.empresa}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {w.vencidas > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="w-3 h-3 mr-1" />{w.vencidas} vencidas
                      </Badge>
                    )}
                    {w.bloqueadas > 0 && (
                      <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-300">
                        {w.bloqueadas} bloqueadas
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[10px] ${level.textColor}`}>
                      {level.label}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="bg-green-400 h-full transition-all" style={{ width: `${completedPercent}%` }} />
                  <div className="bg-blue-400 h-full transition-all" style={{ width: `${w.total > 0 ? Math.round((w.enProgreso / w.total) * 100) : 0}%` }} />
                  <div className="bg-amber-300 h-full transition-all" style={{ width: `${w.total > 0 ? Math.round((w.pendientes / w.total) * 100) : 0}%` }} />
                  <div className="bg-red-400 h-full transition-all" style={{ width: `${w.total > 0 ? Math.round((w.vencidas / w.total) * 100) : 0}%` }} />
                </div>

                <div className="flex items-center gap-3 sm:gap-4 mt-2 text-[10px] text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400" />Completadas: {w.completadas}</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />En progreso: {w.enProgreso}</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-300" />Pendientes: {w.pendientes}</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" />Vencidas: {w.vencidas}</span>
                  <span className="font-medium">Este mes: {w.completadasMes}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
