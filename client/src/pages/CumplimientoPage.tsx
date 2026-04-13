import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMemo, useState, useRef } from "react";
import {
  BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Download,
  Filter, Users, Building2, Printer, Target, Clock, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

function getSemaforo(pct: number): { color: string; label: string; bg: string; textBg: string } {
  if (pct >= 70) return { color: "text-green-600", label: "Verde", bg: "bg-green-500", textBg: "bg-green-100 text-green-700" };
  if (pct >= 40) return { color: "text-amber-600", label: "Amarillo", bg: "bg-amber-500", textBg: "bg-amber-100 text-amber-700" };
  return { color: "text-red-600", label: "Rojo", bg: "bg-red-500", textBg: "bg-red-100 text-red-700" };
}

const COMPANIES = [
  "Todas", "CAP Honduras", "Distribuidora Mansiago", "Inversiones S&M",
  "CAP Soluciones Logísticas", "Auto Repuestos Blessing",
];

export default function CumplimientoPage() {
  const { data: kpiData, isLoading } = trpc.kpis.dashboard.useQuery();
  const { data: departamentos = [] } = trpc.departamentos.list.useQuery();
  const [companyFilter, setCompanyFilter] = useState("Todas");
  const [viewTab, setViewTab] = useState<"coordinador" | "area" | "tendencia" | "empresa">("coordinador");
  const contentRef = useRef<HTMLDivElement>(null);

  const respStats = kpiData?.respStats ?? [];
  const areaStats = kpiData?.areaStats ?? [];
  const summary = kpiData?.summary;
  const weeklyTrend = kpiData?.weeklyTrend ?? [];

  // Filter areas by company through departments
  const filteredAreas = useMemo(() => {
    if (companyFilter === "Todas") return areaStats;
    const deptNames = departamentos
      .filter((d: any) => d.empresa === companyFilter)
      .map((d: any) => d.nombre);
    return areaStats.filter((a: any) => deptNames.some((dn: string) => a.area.toLowerCase().includes(dn.toLowerCase())) || a.area === companyFilter);
  }, [areaStats, departamentos, companyFilter]);

  const sortedResp = useMemo(() => {
    return [...respStats].sort((a: any, b: any) => {
      const pctA = a.total > 0 ? (Number(a.completadas) / a.total) * 100 : 0;
      const pctB = b.total > 0 ? (Number(b.completadas) / b.total) * 100 : 0;
      return pctB - pctA;
    });
  }, [respStats]);

  const sortedAreas = useMemo(() => {
    return [...filteredAreas].sort((a: any, b: any) => {
      const pctA = a.total > 0 ? (Number(a.completadas) / a.total) * 100 : 0;
      const pctB = b.total > 0 ? (Number(b.completadas) / b.total) * 100 : 0;
      return pctB - pctA;
    });
  }, [filteredAreas]);

  // Weekly trend chart data
  const maxWeekTotal = useMemo(() => {
    return Math.max(...weeklyTrend.map((w: any) => Number(w.total) || 1), 1);
  }, [weeklyTrend]);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    // Use print as PDF export mechanism
    window.print();
  };

  return (
    <div className="space-y-6" ref={contentRef}>
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            KPIs y Cumplimiento
          </h2>
          <p className="text-sm text-muted-foreground">Métricas de desempeño por coordinador, área y tendencia semanal</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              {COMPANIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-3.5 h-3.5 mr-1" /> Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only print-header">
        <h1>ARIA — KPIs y Cumplimiento | Grupo CAP Honduras</h1>
        <span className="print-date">{new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
      </div>

      {/* Summary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border border-border shadow-sm kpi-card">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Cumplimiento</span>
              </div>
              <div className={`text-3xl font-bold ${getSemaforo(summary.cumplimiento).color}`}>
                {summary.cumplimiento}%
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {summary.completadas} de {summary.total} tareas
              </div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm kpi-card">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Completadas</span>
              </div>
              <div className="text-3xl font-bold text-green-600">{summary.completadas}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm kpi-card">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Clock className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</span>
              </div>
              <div className="text-3xl font-bold text-amber-600">{summary.pendientes}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm kpi-card">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Vencidas</span>
              </div>
              <div className="text-3xl font-bold text-red-600">{summary.vencidas}</div>
            </CardContent>
          </Card>
          <Card className="border border-border shadow-sm kpi-card">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-muted-foreground uppercase tracking-wide">En Progreso</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">{summary.enProgreso}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex items-center gap-1 border-b border-border no-print">
        {[
          { key: "coordinador" as const, label: "Por Coordinador", icon: Users },
          { key: "area" as const, label: "Por Área", icon: Building2 },
          { key: "tendencia" as const, label: "Tendencia Semanal", icon: TrendingUp },
          { key: "empresa" as const, label: "Por Empresa", icon: Building2 },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              viewTab === tab.key
                ? "border-[#C0392B] text-[#C0392B]"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {viewTab === "coordinador" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Ranking de Cumplimiento por Coordinador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Table view */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Coordinador</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completadas</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendientes</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencidas</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cumplimiento</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedResp.map((r: any, idx: number) => {
                    const pct = r.total > 0 ? Math.round((Number(r.completadas) / r.total) * 100) : 0;
                    const sem = getSemaforo(pct);
                    return (
                      <tr key={r.responsable} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sem.bg}`} />
                            <span className="font-medium text-foreground">{r.responsable}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">{r.total}</td>
                        <td className="py-2.5 px-3 text-center text-green-600 font-medium">{Number(r.completadas)}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600 font-medium">{Number(r.pendientes)}</td>
                        <td className="py-2.5 px-3 text-center text-red-600 font-medium">{Number(r.vencidas)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sem.textBg}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${sem.bg}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewTab === "area" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Cumplimiento por Área / Departamento
              {companyFilter !== "Todas" && (
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Filtrado: {companyFilter}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">#</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Área</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Completadas</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pendientes</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">En Progreso</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vencidas</th>
                    <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cumplimiento</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Progreso</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAreas.map((a: any, idx: number) => {
                    const pct = a.total > 0 ? Math.round((Number(a.completadas) / a.total) * 100) : 0;
                    const sem = getSemaforo(pct);
                    return (
                      <tr key={a.area} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 text-xs text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sem.bg}`} />
                            <span className="font-medium text-foreground">{a.area}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">{a.total}</td>
                        <td className="py-2.5 px-3 text-center text-green-600 font-medium">{Number(a.completadas)}</td>
                        <td className="py-2.5 px-3 text-center text-amber-600 font-medium">{Number(a.pendientes)}</td>
                        <td className="py-2.5 px-3 text-center text-blue-600 font-medium">{Number(a.enProgreso)}</td>
                        <td className="py-2.5 px-3 text-center text-red-600 font-medium">{Number(a.vencidas)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sem.textBg}`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="w-full bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full transition-all ${sem.bg}`} style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {viewTab === "tendencia" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendencia Semanal de Tareas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay datos de tendencia semanal aún</p>
            ) : (
              <div className="space-y-4">
                {/* Bar chart */}
                <div className="flex items-end gap-2 h-48 px-2">
                  {weeklyTrend.map((w: any, idx: number) => {
                    const total = Number(w.total) || 0;
                    const completadas = Number(w.completadas) || 0;
                    const heightPct = (total / maxWeekTotal) * 100;
                    const completedPct = total > 0 ? (completadas / total) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-foreground">{total}</span>
                        <div className="w-full relative" style={{ height: `${Math.max(heightPct, 5)}%` }}>
                          {/* Total bar */}
                          <div className="absolute inset-0 bg-gray-200 rounded-t" />
                          {/* Completed overlay */}
                          <div
                            className="absolute bottom-0 left-0 right-0 bg-[#C0392B] rounded-t transition-all"
                            style={{ height: `${completedPct}%` }}
                          />
                        </div>
                        <span className="text-[8px] text-muted-foreground text-center leading-tight">
                          {w.week?.split("-")[1] ? `S${w.week.split("-")[1]}` : w.week}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-gray-200 rounded" />
                    <span>Total creadas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-[#C0392B] rounded" />
                    <span>Completadas</span>
                  </div>
                </div>

                {/* Weekly data table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Semana</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Completadas</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">% Cierre</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weeklyTrend.map((w: any, idx: number) => {
                        const total = Number(w.total) || 0;
                        const completadas = Number(w.completadas) || 0;
                        const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
                        const sem = getSemaforo(pct);
                        return (
                          <tr key={idx} className="border-b border-border/50">
                            <td className="py-2 px-3 font-medium">{w.week}</td>
                            <td className="py-2 px-3 text-center">{total}</td>
                            <td className="py-2 px-3 text-center text-green-600">{completadas}</td>
                            <td className="py-2 px-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sem.textBg}`}>
                                {pct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {viewTab === "empresa" && (
        <Card className="border border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Comparativa por Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const empresas = ["CAP Honduras", "Distribuidora Mansiago", "Inversiones S&M", "CAP Soluciones Logísticas", "Auto Repuestos Blessing"];
              const deptsByEmpresa: Record<string, string[]> = {};
              for (const d of departamentos as any[]) {
                if (!deptsByEmpresa[d.empresa]) deptsByEmpresa[d.empresa] = [];
                deptsByEmpresa[d.empresa].push(d.nombre);
              }
              const empresaStats = empresas.map(emp => {
                const depts = deptsByEmpresa[emp] ?? [];
                const matching = areaStats.filter((a: any) => depts.some((dn: string) => a.area.toLowerCase().includes(dn.toLowerCase())) || a.area === emp);
                const total = matching.reduce((s: number, a: any) => s + (a.total || 0), 0);
                const completadas = matching.reduce((s: number, a: any) => s + (Number(a.completadas) || 0), 0);
                const vencidas = matching.reduce((s: number, a: any) => s + (Number(a.vencidas) || 0), 0);
                const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
                return { empresa: emp, total, completadas, vencidas, pct };
              });
              const maxTotal = Math.max(...empresaStats.map(e => e.total), 1);
              return (
                <div className="space-y-6">
                  {/* Grouped bar chart */}
                  <div className="flex items-end gap-4 h-56 px-2">
                    {empresaStats.map((e, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-bold text-foreground">{e.pct}%</span>
                        <div className="w-full flex gap-0.5 items-end" style={{ height: `${Math.max((e.total / maxTotal) * 100, 8)}%` }}>
                          <div className="flex-1 bg-green-400 rounded-t transition-all" style={{ height: `${e.total > 0 ? (e.completadas / e.total) * 100 : 0}%` }} title={`Completadas: ${e.completadas}`} />
                          <div className="flex-1 bg-red-400 rounded-t transition-all" style={{ height: `${e.total > 0 ? (e.vencidas / e.total) * 100 : 0}%` }} title={`Vencidas: ${e.vencidas}`} />
                          <div className="flex-1 bg-gray-300 rounded-t transition-all" style={{ height: '100%' }} title={`Total: ${e.total}`} />
                        </div>
                        <span className="text-[8px] text-muted-foreground text-center leading-tight">{e.empresa.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-green-400 rounded" /><span>Completadas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded" /><span>Vencidas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gray-300 rounded" /><span>Total</span></div>
                  </div>
                  {/* Table */}
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Empresa</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Completadas</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Vencidas</th>
                          <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground uppercase">Cumplimiento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {empresaStats.map((e, idx) => {
                          const sem = getSemaforo(e.pct);
                          return (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 px-3 font-medium">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2.5 h-2.5 rounded-full ${sem.bg}`} />
                                  {e.empresa}
                                </div>
                              </td>
                              <td className="py-2 px-3 text-center">{e.total}</td>
                              <td className="py-2 px-3 text-center text-green-600">{e.completadas}</td>
                              <td className="py-2 px-3 text-center text-red-600">{e.vencidas}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${sem.textBg}`}>{e.pct}%</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Print footer */}
      <div className="print-only print-footer">
        ARIA — Grupo CAP Honduras | Generado el {new Date().toLocaleDateString("es-HN")}
      </div>
    </div>
  );
}
