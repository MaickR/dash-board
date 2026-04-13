import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo, useRef } from "react";
import { Clock, Flag, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "#ef4444",
  media: "#f59e0b",
  baja: "#9ca3af",
};

const STATUS_COLORS: Record<string, string> = {
  pendiente: "#f59e0b",
  en_progreso: "#3b82f6",
  completada: "#22c55e",
  vencida: "#ef4444",
  visto: "#a855f7",
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatShortDate(d: Date): string {
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function GanttPage() {
  const { data: tasks = [], isLoading } = trpc.tareas.list.useQuery();
  const [areaFilter, setAreaFilter] = useState("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only parent tasks
  const parentTasks = useMemo(() => tasks.filter(t => !t.parentId), [tasks]);

  const areas = useMemo(() => {
    const set = new Set(parentTasks.map(t => t.area));
    return Array.from(set).sort();
  }, [parentTasks]);

  const filtered = useMemo(() => {
    if (areaFilter === "all") return parentTasks;
    return parentTasks.filter(t => t.area === areaFilter);
  }, [parentTasks, areaFilter]);

  // Calculate date range
  const { startDate, endDate, totalDays, dayWidth } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    let end = addDays(now, 30);

    for (const t of filtered) {
      const d = parseDate(t.fecha);
      if (d && d > end) end = addDays(d, 3);
    }

    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { startDate: start, endDate: end, totalDays: total, dayWidth: 32 };
  }, [filtered]);

  // Generate day columns
  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(startDate, i));
    }
    return result;
  }, [startDate, totalDays]);

  // Group tasks by area
  const groupedByArea = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    for (const t of filtered) {
      if (!map[t.area]) map[t.area] = [];
      map[t.area].push(t);
    }
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const getBarPosition = (task: typeof filtered[0]) => {
    const endD = parseDate(task.fecha);
    if (!endD) return null;
    // Assume task starts 7 days before due date if no start date
    const startD = task.fechaInicio ? parseDate(task.fechaInicio) ?? addDays(endD, -7) : addDays(endD, -7);

    const leftDays = Math.max(0, (startD.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const durationDays = Math.max(1, (endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));

    return {
      left: leftDays * dayWidth,
      width: Math.max(durationDays * dayWidth, dayWidth),
    };
  };

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
  };
  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Clock className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const todayOffset = Math.max(0, (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) * dayWidth;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Línea de Tiempo</h2>
          <p className="text-xs text-gray-500">Vista Gantt simplificada de tareas por área</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las áreas</SelectItem>
              {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={scrollLeft}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={scrollRight}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="flex">
          {/* Left: Task names */}
          <div className="w-64 flex-shrink-0 border-r bg-gray-50">
            {/* Header */}
            <div className="h-12 border-b px-3 flex items-center">
              <span className="text-xs font-semibold text-gray-500 uppercase">Tarea</span>
            </div>
            {/* Rows */}
            {groupedByArea.map(([area, areaTasks]) => (
              <div key={area}>
                <div className="h-8 bg-gray-100 px-3 flex items-center border-b">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">{area}</span>
                  <Badge variant="outline" className="ml-auto text-[9px] h-4">{areaTasks.length}</Badge>
                </div>
                {areaTasks.map(t => (
                  <div key={t.id} className="h-10 px-3 flex items-center border-b hover:bg-gray-50">
                    <div className={`w-1.5 h-1.5 rounded-full mr-2 flex-shrink-0`} style={{ backgroundColor: PRIORIDAD_COLORS[t.prioridad] ?? "#9ca3af" }} />
                    <span className="text-xs text-gray-700 truncate">{t.tarea.substring(0, 35)}{t.tarea.length > 35 ? "..." : ""}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Right: Timeline */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: totalDays * dayWidth, minWidth: "100%" }}>
              {/* Day headers */}
              <div className="h-12 border-b flex relative">
                {days.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const isMonday = d.getDay() === 1;
                  return (
                    <div
                      key={i}
                      className={`flex-shrink-0 border-r flex flex-col items-center justify-center ${isToday ? "bg-red-50" : isWeekend ? "bg-gray-50" : ""}`}
                      style={{ width: dayWidth }}
                    >
                      {isMonday && (
                        <span className="text-[8px] text-gray-400 font-medium">S{Math.ceil((d.getDate()) / 7)}</span>
                      )}
                      <span className={`text-[9px] ${isToday ? "font-bold text-red-600" : "text-gray-400"}`}>
                        {formatShortDate(d)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Task bars */}
              {groupedByArea.map(([area, areaTasks]) => (
                <div key={area}>
                  {/* Area header row */}
                  <div className="h-8 bg-gray-100 border-b relative">
                    {/* Grid lines */}
                    {days.map((d, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-gray-200/50"
                        style={{ left: i * dayWidth, width: dayWidth }}
                      />
                    ))}
                  </div>
                  {/* Task rows */}
                  {areaTasks.map(t => {
                    const bar = getBarPosition(t);
                    return (
                      <div key={t.id} className="h-10 border-b relative">
                        {/* Grid lines */}
                        {days.map((d, i) => {
                          const isToday = d.toDateString() === new Date().toDateString();
                          return (
                            <div
                              key={i}
                              className={`absolute top-0 bottom-0 border-r ${isToday ? "border-red-300 bg-red-50/30" : "border-gray-100"}`}
                              style={{ left: i * dayWidth, width: dayWidth }}
                            />
                          );
                        })}
                        {/* Bar */}
                        {bar && (
                          <div
                            className="absolute top-1.5 h-7 rounded-md flex items-center px-2 text-white text-[9px] font-medium shadow-sm overflow-hidden"
                            style={{
                              left: bar.left,
                              width: bar.width,
                              backgroundColor: STATUS_COLORS[t.status] ?? "#9ca3af",
                              opacity: t.status === "completada" ? 0.6 : 1,
                            }}
                            title={`${t.tarea} (${t.fecha})`}
                          >
                            {/* Progress fill */}
                            {t.avance > 0 && t.avance < 100 && (
                              <div
                                className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-md"
                                style={{ width: `${t.avance}%` }}
                              />
                            )}
                            <span className="relative z-10 truncate">{t.tarea.substring(0, 20)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Today line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: todayOffset + 256 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span className="font-medium">Estado:</span>
        {Object.entries(STATUS_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: c }} />
            <span className="capitalize">{k.replace("_", " ")}</span>
          </div>
        ))}
        <span className="ml-4 font-medium">Prioridad:</span>
        {Object.entries(PRIORIDAD_COLORS).map(([k, c]) => (
          <div key={k} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
            <span className="capitalize">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
