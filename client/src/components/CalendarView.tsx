import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Task = {
  id: number;
  nombre: string | null;
  tarea: string;
  area: string;
  responsable: string;
  fecha: string;
  fechaTs: number | null;
  status: string;
  prioridad: string;
};

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

const STATUS_DOT: Record<string, string> = {
  pendiente: "bg-amber-400",
  en_progreso: "bg-blue-500",
  completada: "bg-green-500",
  vencida: "bg-red-500",
  visto: "bg-purple-400",
};

const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function parseDateStr(dateStr: string): Date | null {
  // Parse DD/MM/YYYY
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const d = parseInt(parts[0]);
    const m = parseInt(parts[1]) - 1;
    const y = parseInt(parts[2]);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m, d);
  }
  return null;
}

export default function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const totalDays = lastDay.getDate();

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const t of tasks) {
      let date: Date | null = null;
      if (t.fechaTs) {
        date = new Date(Number(t.fechaTs));
      } else {
        date = parseDateStr(t.fecha);
      }
      if (date && date.getMonth() === month && date.getFullYear() === year) {
        const key = date.getDate().toString();
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    }
    return map;
  }, [tasks, month, year]);

  const today = new Date();
  const isToday = (day: number) => today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h3 className="text-lg font-bold text-foreground min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={goToday} className="text-xs">
          Hoy
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-t-lg overflow-hidden">
        {DAYS.map(d => (
          <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-semibold text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-b-lg overflow-hidden -mt-4">
        {cells.map((day, i) => {
          const dayTasks = day ? (tasksByDate[day.toString()] ?? []) : [];
          return (
            <div
              key={i}
              className={`bg-card min-h-[90px] sm:min-h-[110px] p-1.5 ${
                day === null ? "bg-muted/30" : ""
              } ${isToday(day ?? 0) ? "ring-2 ring-inset ring-primary/40" : ""}`}
            >
              {day !== null && (
                <>
                  <div className={`text-xs font-medium mb-1 ${
                    isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-0.5 overflow-y-auto max-h-[70px] sm:max-h-[85px]">
                    {dayTasks.slice(0, 4).map(t => (
                      <button
                        key={t.id}
                        onClick={() => onTaskClick(t)}
                        className="w-full text-left flex items-center gap-1 px-1 py-0.5 rounded hover:bg-accent transition-colors"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[t.status] ?? "bg-gray-400"}`} />
                        <span className="text-[10px] leading-tight truncate text-foreground">
                          {t.nombre || t.tarea.substring(0, 30)}
                        </span>
                      </button>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="text-[9px] text-muted-foreground pl-3">
                        +{dayTasks.length - 4} más
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
        {Object.entries(STATUS_DOT).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
