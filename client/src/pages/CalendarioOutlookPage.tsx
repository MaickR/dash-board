import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import {
  Calendar, RefreshCw, Loader2, ChevronLeft, ChevronRight, MapPin,
  Users, Clock, ExternalLink, Import, X, Video, Ban, Plus,
} from "lucide-react";
import { toast } from "sonner";

/* ─── Types ─── */
type CalEvent = {
  id: string;
  subject: string;
  start: string;
  end: string;
  location: string;
  isAllDay: boolean;
  organizer: string;
  organizerEmail: string;
  attendees: { name: string; email: string }[];
  description: string;
  webLink: string;
  isOnlineMeeting: boolean;
  isCancelled: boolean;
};

type AriaReunion = {
  id: number;
  area: string;
  dia: string;
  hora: string;
  responsable: string | null;
  status: string | null;
  tipo?: string | null;
  [key: string]: any;
};

type UnifiedEvent = {
  source: "outlook" | "aria";
  id: string;
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  color: string;
  raw: CalEvent | AriaReunion;
};

/* ─── Constants ─── */
const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const MEETING_TYPES = [
  { value: "Coordinadores", label: "Coordinadores", color: "#C0392B" },
  { value: "Departamental", label: "Departamental", color: "#2980B9" },
  { value: "Bilateral", label: "Bilateral", color: "#27AE60" },
  { value: "Estratégica", label: "Estratégica", color: "#8E44AD" },
  { value: "Seguimiento", label: "Seguimiento", color: "#E67E22" },
];

const DURATIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hora" },
  { value: "90", label: "1.5 horas" },
  { value: "120", label: "2 horas" },
  { value: "custom", label: "Personalizado" },
];

function getTypeColor(tipo: string | null | undefined): string {
  const found = MEETING_TYPES.find(t => t.value === tipo);
  return found?.color ?? "#C0392B";
}

/* ─── Helpers ─── */
function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay() - 1;
  if (startDow < 0) startDow = 6;
  const days: { date: Date; inMonth: boolean }[] = [];
  for (let i = startDow - 1; i >= 0; i--) days.push({ date: new Date(year, month, -i), inMonth: false });
  for (let i = 1; i <= lastDay.getDate(); i++) days.push({ date: new Date(year, month, i), inMonth: true });
  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - startDow - lastDay.getDate() + 1);
    days.push({ date: d, inMonth: false });
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getUTCHours().toString().padStart(2, "0")}:${d.getUTCMinutes().toString().padStart(2, "0")}`;
}

function formatDateLong(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function parseAriaDate(dia: string, hora: string): Date {
  // dia = "DD/MM/YYYY" or "YYYY-MM-DD", hora = "HH:MM" or "HH:MM AM/PM"
  let year: number, month: number, day: number;
  if (dia.includes("/")) {
    const parts = dia.split("/");
    day = parseInt(parts[0]); month = parseInt(parts[1]) - 1; year = parseInt(parts[2]);
  } else {
    const parts = dia.split("-");
    year = parseInt(parts[0]); month = parseInt(parts[1]) - 1; day = parseInt(parts[2]);
  }
  let hours = 0, minutes = 0;
  if (hora) {
    const timeParts = hora.replace(/\s*(AM|PM)\s*/i, "").split(":");
    hours = parseInt(timeParts[0]) || 0;
    minutes = parseInt(timeParts[1]) || 0;
    if (/PM/i.test(hora) && hours < 12) hours += 12;
    if (/AM/i.test(hora) && hours === 12) hours = 0;
  }
  return new Date(year, month, day, hours, minutes);
}

export default function CalendarioOutlookPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [selectedEvent, setSelectedEvent] = useState<UnifiedEvent | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState("");
  const [newTipo, setNewTipo] = useState("Coordinadores");
  const [newArea, setNewArea] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [newDuration, setNewDuration] = useState("60");
  const [newCustomDuration, setNewCustomDuration] = useState("45");
  const [newParticipants, setNewParticipants] = useState<number[]>([]);
  const [newDescription, setNewDescription] = useState("");
  const [syncOutlook, setSyncOutlook] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const timeMin = useMemo(() => new Date(year, month - 1, 1).toISOString(), [year, month]);
  const timeMax = useMemo(() => new Date(year, month + 2, 0).toISOString(), [year, month]);

  const { data: outlookData, isLoading: outlookLoading, refetch, isFetching } = trpc.calendar.events.useQuery(
    { timeMin, timeMax, maxResults: 200 },
    { staleTime: 60000 }
  );

  const { data: reunionesData } = trpc.reuniones.list.useQuery();
  const { data: departamentos } = trpc.departamentos.list.useQuery();
  const { data: responsables } = trpc.responsables.list.useQuery();

  const importReunion = trpc.calendar.importAsReunion.useMutation({
    onSuccess: () => { toast.success("Evento importado como reunión"); setSelectedEvent(null); },
    onError: (err: any) => toast.error(err.message),
  });

  const utils = trpc.useUtils();
  const createReunionMut = trpc.calendar.importAsReunion.useMutation({
    onSuccess: () => {
      toast.success("Reunión creada exitosamente");
      setShowCreateForm(false);
      resetForm();
      utils.reuniones.list.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  function resetForm() {
    setNewTitle(""); setNewTipo("Coordinadores"); setNewArea(""); setNewDate("");
    setNewTime("09:00"); setNewDuration("60"); setNewCustomDuration("45");
    setNewParticipants([]); setNewDescription(""); setSyncOutlook(false);
  }

  // Merge Outlook events + ARIA reuniones
  const unifiedEvents: UnifiedEvent[] = useMemo(() => {
    const events: UnifiedEvent[] = [];
    // Outlook events
    (outlookData?.events ?? []).forEach((ev: CalEvent) => {
      events.push({
        source: "outlook",
        id: `outlook-${ev.id}`,
        title: ev.subject,
        start: new Date(ev.start),
        end: new Date(ev.end),
        location: ev.location || undefined,
        color: "#3B82F6", // blue for Outlook
        raw: ev,
      });
    });
    // ARIA reuniones
    (reunionesData ?? []).forEach((r: any) => {
      if (!r.dia) return;
      const start = parseAriaDate(r.dia, r.hora || "09:00");
      events.push({
        source: "aria",
        id: `aria-${r.id}`,
        title: `${r.area || "Reunión"}${r.tipo ? ` (${r.tipo})` : ""}`,
        start,
        end: undefined,
        color: getTypeColor(r.tipo),
        raw: r,
      });
    });
    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  }, [outlookData, reunionesData]);

  const monthDays = useMemo(() => getMonthDays(year, month), [year, month]);

  const getEventsForDay = (date: Date) => unifiedEvents.filter(e => isSameDay(e.start, date));

  const weekDays = useMemo(() => {
    const d = new Date(viewDate);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return day;
    });
  }, [viewDate]);

  const today = new Date();

  const handlePrev = () => {
    if (viewMode === "month") setViewDate(new Date(year, month - 1, 1));
    else { const d = new Date(viewDate); d.setDate(d.getDate() - 7); setViewDate(d); }
  };
  const handleNext = () => {
    if (viewMode === "month") setViewDate(new Date(year, month + 1, 1));
    else { const d = new Date(viewDate); d.setDate(d.getDate() + 7); setViewDate(d); }
  };

  const handleCreateSubmit = () => {
    if (!newTitle.trim() || !newDate) { toast.error("Título y fecha son requeridos"); return; }
    const dur = newDuration === "custom" ? parseInt(newCustomDuration) : parseInt(newDuration);
    const startDt = new Date(`${newDate}T${newTime}:00`);
    const endDt = new Date(startDt.getTime() + dur * 60000);
    const participantNames = newParticipants.map(id => {
      const r = (responsables ?? []).find((resp: any) => resp.id === id);
      return r ? { name: r.nombre, email: r.email || "" } : null;
    }).filter(Boolean) as { name: string; email: string }[];
    createReunionMut.mutate({
      subject: newTitle,
      start: startDt.toISOString(),
      end: endDt.toISOString(),
      description: newDescription || undefined,
      attendees: participantNames.length > 0 ? participantNames : undefined,
    });
    // Optionally sync to Outlook Calendar
    if (syncOutlook) {
      try {
        // Fire and forget - create event in Outlook via backend
        fetch("/api/trpc/calendar.createOutlookEvent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: newTitle, start: startDt.toISOString(), end: endDt.toISOString(), body: newDescription }),
        }).catch(() => {});
      } catch {}
      toast.info("Sincronización con Outlook solicitada");
    }
  };

  const openCreateForDate = (date: Date) => {
    setCreateDate(date);
    setNewDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`);
    setShowCreateForm(true);
  };

  const areas = useMemo(() => {
    const set = new Set<string>();
    (departamentos ?? []).forEach((d: any) => set.add(d.nombre));
    return Array.from(set).sort();
  }, [departamentos]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#C0392B]" />
            Calendario
          </h2>
          <p className="text-sm text-muted-foreground">
            {unifiedEvents.length} eventos totales
            <span className="mx-1.5">·</span>
            <span className="text-blue-400">{(outlookData?.events ?? []).length} Outlook</span>
            <span className="mx-1">·</span>
            <span className="text-[#C0392B]">{(reunionesData ?? []).length} ARIA</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-1 min-h-[36px]" onClick={() => { resetForm(); setShowCreateForm(true); }}>
            <Plus className="w-3.5 h-3.5" />Nueva Reunión
          </Button>
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setViewMode("month")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "month" ? "bg-[#C0392B] text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}>
              Mes
            </button>
            <button onClick={() => setViewMode("week")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === "week" ? "bg-[#C0392B] text-white" : "bg-card text-muted-foreground hover:bg-accent"}`}>
              Semana
            </button>
          </div>
          <Button size="sm" variant="outline" onClick={() => setViewDate(new Date())} className="min-h-[36px]">Hoy</Button>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-[36px]">
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Color Legend */}
      <div className="flex flex-wrap gap-3 text-[10px]">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /><span className="text-muted-foreground">Outlook</span></div>
        {MEETING_TYPES.map(t => (
          <div key={t.value} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} /><span className="text-muted-foreground">{t.label}</span></div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={handlePrev} className="min-h-[44px] min-w-[44px]">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h3 className="text-base font-bold text-foreground">
          {viewMode === "month" ? `${MONTHS[month]} ${year}` : `Semana del ${weekDays[0].toLocaleDateString("es-HN", { day: "numeric", month: "short" })} al ${weekDays[6].toLocaleDateString("es-HN", { day: "numeric", month: "short", year: "numeric" })}`}
        </h3>
        <Button variant="ghost" size="icon" onClick={handleNext} className="min-h-[44px] min-w-[44px]">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {outlookLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#C0392B]" /></div>
      ) : viewMode === "month" ? (
        /* ─── Month View ─── */
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-muted-foreground uppercase py-2 border-b border-border bg-muted/30">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map(({ date, inMonth }, i) => {
              const dayEvents = getEventsForDay(date);
              const isToday = isSameDay(date, today);
              return (
                <div key={i}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-border p-1 cursor-pointer hover:bg-accent/20 transition-colors ${!inMonth ? "bg-muted/20" : ""} ${isToday ? "bg-[#C0392B]/5" : ""}`}
                  onDoubleClick={() => openCreateForDate(date)}
                >
                  <div className={`text-[11px] font-medium mb-0.5 ${isToday ? "w-6 h-6 rounded-full bg-[#C0392B] text-white flex items-center justify-center" : inMonth ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => (
                      <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left text-[10px] px-1 py-0.5 rounded truncate transition-colors hover:opacity-80"
                        style={{ backgroundColor: `${ev.color}15`, color: ev.color }}>
                        {ev.source === "outlook" && !((ev.raw as CalEvent).isAllDay) && (
                          <span className="font-medium">{formatTime((ev.raw as CalEvent).start)} </span>
                        )}
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-muted-foreground text-center">+{dayEvents.length - 3} más</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ─── Week View ─── */
        <div className="space-y-2">
          {weekDays.map(day => {
            const dayEvents = getEventsForDay(day);
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={`rounded-lg border ${isToday ? "border-[#C0392B]/30 bg-[#C0392B]/5" : "border-border"}`}>
                <div className={`px-4 py-2 flex items-center gap-2 ${isToday ? "border-b border-[#C0392B]/20" : "border-b border-border"}`}>
                  <div className={`text-sm font-bold ${isToday ? "text-[#C0392B]" : "text-foreground"}`}>
                    {day.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "short" })}
                  </div>
                  {isToday && <Badge className="bg-[#C0392B] text-white text-[9px]">Hoy</Badge>}
                  <Badge variant="outline" className="text-[10px] ml-auto">{dayEvents.length}</Badge>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-muted-foreground" onClick={() => openCreateForDate(day)}>
                    <Plus className="w-3 h-3 mr-0.5" />Crear
                  </Button>
                </div>
                {dayEvents.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-muted-foreground">Sin eventos</div>
                ) : (
                  <div className="divide-y divide-border">
                    {dayEvents.map(ev => (
                      <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                        className="w-full text-left px-4 py-2.5 hover:bg-accent/30 transition-colors flex items-center gap-3">
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{ev.title}</div>
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                            {ev.source === "outlook" ? (
                              <>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(ev.raw as CalEvent).isAllDay ? "Todo el día" : `${formatTime((ev.raw as CalEvent).start)} - ${formatTime((ev.raw as CalEvent).end)}`}
                                </span>
                                {(ev.raw as CalEvent).location && (
                                  <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" />{(ev.raw as CalEvent).location}</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{(ev.raw as AriaReunion).hora || "Sin hora"}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{(ev.raw as AriaReunion).responsable || "Sin responsable"}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[9px] flex-shrink-0" style={{ borderColor: ev.color, color: ev.color }}>
                          {ev.source === "outlook" ? "Outlook" : (ev.raw as AriaReunion).tipo || "ARIA"}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Event Detail Modal ─── */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                  <Badge variant="outline" className="text-[10px]" style={{ borderColor: selectedEvent.color, color: selectedEvent.color }}>
                    {selectedEvent.source === "outlook" ? "Outlook" : (selectedEvent.raw as AriaReunion).tipo || "ARIA"}
                  </Badge>
                </div>
                <h3 className="text-base font-bold text-foreground">{selectedEvent.title}</h3>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => setSelectedEvent(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground capitalize">
                  {selectedEvent.source === "outlook"
                    ? formatDateLong((selectedEvent.raw as CalEvent).start)
                    : selectedEvent.start.toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">
                  {selectedEvent.source === "outlook"
                    ? ((selectedEvent.raw as CalEvent).isAllDay ? "Todo el día" : `${formatTime((selectedEvent.raw as CalEvent).start)} - ${formatTime((selectedEvent.raw as CalEvent).end)}`)
                    : (selectedEvent.raw as AriaReunion).hora || "Sin hora"}
                </span>
              </div>
              {selectedEvent.source === "outlook" && (selectedEvent.raw as CalEvent).location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{(selectedEvent.raw as CalEvent).location}</span>
                </div>
              )}
              {selectedEvent.source === "outlook" && (selectedEvent.raw as CalEvent).attendees?.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Participantes</div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedEvent.raw as CalEvent).attendees.map((a, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{a.name || a.email}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {selectedEvent.source === "outlook" && (selectedEvent.raw as CalEvent).description && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">Descripción</div>
                  <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {(selectedEvent.raw as CalEvent).description}
                  </p>
                </div>
              )}
              {selectedEvent.source === "aria" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground">{(selectedEvent.raw as AriaReunion).responsable || "Sin responsable"}</span>
                  </div>
                  {(selectedEvent.raw as AriaReunion).status && (
                    <Badge variant="outline" className="text-[10px]">Estado: {(selectedEvent.raw as AriaReunion).status}</Badge>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-2 pt-2 border-t border-border">
              {selectedEvent.source === "outlook" && (selectedEvent.raw as CalEvent).webLink && (
                <Button variant="outline" size="sm" asChild>
                  <a href={(selectedEvent.raw as CalEvent).webLink} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1" />Outlook
                  </a>
                </Button>
              )}
              {selectedEvent.source === "outlook" && (
                <Button className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-1 ml-auto" size="sm"
                  onClick={() => {
                    const ev = selectedEvent.raw as CalEvent;
                    importReunion.mutate({ subject: ev.subject, start: ev.start, end: ev.end, location: ev.location || undefined, attendees: ev.attendees.length > 0 ? ev.attendees : undefined, description: ev.description || undefined });
                  }}
                  disabled={importReunion.isPending || (selectedEvent.raw as CalEvent).isCancelled}>
                  {importReunion.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Import className="w-3.5 h-3.5" />}
                  Importar como Reunión
                </Button>
              )}
              {selectedEvent.source === "aria" && (
                <Button className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-1 ml-auto" size="sm"
                  onClick={() => { toast.info("Navegando a Reuniones..."); setSelectedEvent(null); }}>
                  Ir a Reunión
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Create Meeting Modal ─── */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateForm(false)}>
          <div className="bg-card rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#C0392B]" />Nueva Reunión
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {/* Title */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Título *</label>
                <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#C0392B]"
                  placeholder="Ej: Reunión de Coordinadores Semanal" />
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tipo de Reunión</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MEETING_TYPES.map(t => (
                    <button key={t.value} onClick={() => setNewTipo(t.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${newTipo === t.value ? "text-white border-transparent" : "border-border text-muted-foreground hover:bg-accent"}`}
                      style={newTipo === t.value ? { backgroundColor: t.color } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Area */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Área / Departamento</label>
                <select value={newArea} onChange={e => setNewArea(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground">
                  <option value="">Seleccionar...</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Fecha *</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Hora</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Duración</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setNewDuration(d.value)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${newDuration === d.value ? "bg-[#C0392B] text-white border-transparent" : "border-border text-muted-foreground hover:bg-accent"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                {newDuration === "custom" && (
                  <input type="number" value={newCustomDuration} onChange={e => setNewCustomDuration(e.target.value)}
                    className="w-24 mt-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-sm text-foreground"
                    placeholder="min" min="15" max="480" />
                )}
              </div>

              {/* Participants */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Participantes</label>
                <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-lg p-2 space-y-1">
                  {(responsables ?? []).map((r: any) => (
                    <label key={r.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-accent/30 rounded px-1 py-0.5">
                      <input type="checkbox" checked={newParticipants.includes(r.id)}
                        onChange={e => {
                          if (e.target.checked) setNewParticipants(p => [...p, r.id]);
                          else setNewParticipants(p => p.filter(id => id !== r.id));
                        }}
                        className="rounded border-border" />
                      <span className="text-foreground">{r.nombre}</span>
                      <span className="text-muted-foreground ml-auto">{r.area}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descripción / Agenda</label>
                <textarea value={newDescription} onChange={e => setNewDescription(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground min-h-[80px] resize-y"
                  placeholder="Agenda previa, temas a tratar..." />
              </div>

              {/* Sync Outlook */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={syncOutlook} onChange={e => setSyncOutlook(e.target.checked)}
                  className="rounded border-border" />
                <span className="text-xs text-foreground">Sincronizar con Outlook Calendar</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
              <Button className="bg-[#C0392B] hover:bg-[#a93226] text-white" size="sm"
                onClick={handleCreateSubmit} disabled={createReunionMut.isPending}>
                {createReunionMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                Crear Reunión
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
