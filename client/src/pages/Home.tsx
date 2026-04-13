import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl, hasOAuthLoginConfig } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, FileUp, CalendarCheck, Mail,
  BarChart3, Menu, X, Shield, Loader2, FileText, GanttChart,
  Building2, Columns3, Search, Zap, Activity,
  CheckSquare, FolderOpen, ClipboardList, CalendarDays,
  Network, Sparkles, type LucideIcon,
} from "lucide-react";
import NotificationsDropdown from "@/components/NotificationsDropdown";

const AIChatWidget = lazy(() => import("@/components/AIChatWidget"));
const DashboardPage = lazy(() => import("./DashboardPage"));
const ResponsablesPage = lazy(() => import("./ResponsablesPage"));
const ArchivosPage = lazy(() => import("./ArchivosPage"));
const ReunionesPage = lazy(() => import("./ReunionesPage"));
const CorreosPage = lazy(() => import("./CorreosPage"));
const CumplimientoPage = lazy(() => import("./CumplimientoPage"));
const ResumenPage = lazy(() => import("./ResumenPage"));
const GanttPage = lazy(() => import("./GanttPage"));
const DepartamentosPage = lazy(() => import("./DepartamentosPage"));
const KanbanPage = lazy(() => import("./KanbanPage"));
const AutomatizacionesPage = lazy(() => import("./AutomatizacionesPage"));
const WorkloadPage = lazy(() => import("./WorkloadPage"));
const ActividadPage = lazy(() => import("./ActividadPage"));
const TareasPage = lazy(() => import("./TareasPage"));
const InformesPage = lazy(() => import("./InformesPage"));
const DrivePage = lazy(() => import("./DrivePage"));
const CalendarioOutlookPage = lazy(() => import("./CalendarioOutlookPage"));
const ConfigBriefPage = lazy(() => import("./ConfigBriefPage"));
const ReunionDetailPage = lazy(() => import("./ReunionDetailPage"));
const OrganizacionPage = lazy(() => import("./OrganizacionPage"));
const PlantillasPromptPage = lazy(() => import("./PlantillasPromptPage"));
const ConfiguracionPage = lazy(() => import("./ConfiguracionPage"));

type NavGroup = { title: string; items: NavItem[] };
type NavItem = { key: string; label: string; sublabel: string; icon: LucideIcon };
type PageComponent = LazyExoticComponent<ComponentType<any>>;

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Principal",
    items: [
      { key: "/", label: "Dashboard", sublabel: "Vista general", icon: LayoutDashboard },
      { key: "/tareas", label: "Tareas", sublabel: "Gestión completa", icon: CheckSquare },
      { key: "/kanban", label: "Kanban", sublabel: "Vista por columnas", icon: Columns3 },
    ],
  },
  {
    title: "Reuniones",
    items: [
      { key: "/reuniones", label: "Reuniones", sublabel: "Control semanal", icon: CalendarCheck },
      { key: "/calendario", label: "Calendario Outlook", sublabel: "Eventos sincronizados", icon: CalendarDays },
      { key: "/archivos", label: "Archivos", sublabel: "PDFs y transcripciones", icon: FileUp },
    ],
  },
  {
    title: "Organización",
    items: [
      { key: "/departamentos", label: "Departamentos", sublabel: "5 empresas", icon: Building2 },
      { key: "/responsables", label: "Responsables", sublabel: "Base de datos", icon: Users },
      { key: "/informes", label: "Informes", sublabel: "Control mensual", icon: ClipboardList },
      { key: "/organizacion", label: "Organización", sublabel: "Organigrama Grupo CAP", icon: Network },
    ],
  },
  {
    title: "Análisis",
    items: [
      { key: "/cumplimiento", label: "Cumplimiento", sublabel: "KPIs por coordinador", icon: BarChart3 },
      { key: "/gantt", label: "Línea de Tiempo", sublabel: "Vista Gantt", icon: GanttChart },
      { key: "/carga", label: "Carga de Trabajo", sublabel: "Por persona", icon: Users },
      { key: "/resumen", label: "Resumen Ejecutivo", sublabel: "Reporte semanal", icon: FileText },
    ],
  },
  {
    title: "Herramientas",
    items: [
      { key: "/drive", label: "Drive", sublabel: "Documentos Google Drive", icon: FolderOpen },
      { key: "/correos", label: "Correos Outlook", sublabel: "Bandeja de entrada", icon: Mail },
      { key: "/automatizaciones", label: "Automatizaciones", sublabel: "Reglas y recurrencia", icon: Zap },
      { key: "/plantillas-prompt", label: "Plantillas Prompt", sublabel: "Prompts para IA", icon: Sparkles },
      { key: "/actividad", label: "Actividad", sublabel: "Log global", icon: Activity },
    ],
  },
  {
    title: "Configuración",
    items: [
      { key: "/configuracion", label: "Configuración", sublabel: "Sistema completo", icon: Zap },
      { key: "/config-brief", label: "Brief Pre-Reunión", sublabel: "Envío automático", icon: Mail },
    ],
  },
];

const ALL_NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

const SHORTCUTS: Record<string, string> = {
  "1": "/", "2": "/tareas", "3": "/kanban", "4": "/reuniones",
  "5": "/departamentos", "6": "/responsables", "7": "/informes",
  "8": "/cumplimiento", "9": "/gantt", "0": "/resumen",
};

const PAGE_COMPONENTS: Record<string, PageComponent> = {
  "/": DashboardPage,
  "/tareas": TareasPage,
  "/kanban": KanbanPage,
  "/reuniones": ReunionesPage,
  "/archivos": ArchivosPage,
  "/departamentos": DepartamentosPage,
  "/responsables": ResponsablesPage,
  "/informes": InformesPage,
  "/correos": CorreosPage,
  "/cumplimiento": CumplimientoPage,
  "/gantt": GanttPage,
  "/resumen": ResumenPage,
  "/drive": DrivePage,
  "/automatizaciones": AutomatizacionesPage,
  "/plantillas-prompt": PlantillasPromptPage,
  "/organizacion": OrganizacionPage,
  "/carga": WorkloadPage,
  "/actividad": ActividadPage,
  "/calendario": CalendarioOutlookPage,
  "/config-brief": ConfigBriefPage,
  "/configuracion": ConfiguracionPage,
};

function PageLoadingFallback() {
  return (
    <div className="min-h-[240px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const loginUrl = getLoginUrl();
  const canLogin = hasOAuthLoginConfig() && Boolean(loginUrl);
  const searchResults = trpc.search.global.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Check for reunion detail route
  const reunionDetailMatch = location.match(/^\/reunion\/(\d+)$/);
  const reunionDetailId = reunionDetailMatch ? parseInt(reunionDetailMatch[1]) : null;

  const activeKey = useMemo(() => {
    if (reunionDetailId) return "/reuniones";
    const match = ALL_NAV_ITEMS.find(n => n.key === location);
    return match ? match.key : "/";
  }, [location, reunionDetailId]);
  const ActivePage = PAGE_COMPONENTS[activeKey];

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.altKey && SHORTCUTS[e.key]) {
      e.preventDefault();
      setLocation(SHORTCUTS[e.key]);
    }
    if (e.altKey && e.key === "k") {
      e.preventDefault();
      setSearchOpen(prev => !prev);
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  }, [setLocation]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("es-HN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="flex flex-col items-center gap-6 p-8 max-w-md">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">ARIA — Grupo CAP</h1>
          <p className="text-muted-foreground text-center">
            Inicia sesión para acceder al tablero de control de reuniones.
          </p>
          {!canLogin && (
            <p className="text-sm text-amber-700 text-center">
              El acceso OAuth no está configurado en este entorno local.
            </p>
          )}
          <Button
            onClick={() => {
              if (!loginUrl) return;
              window.location.href = loginUrl;
            }}
            size="lg"
            className="w-full min-h-[44px]"
            disabled={!canLogin}
          >
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="p-4 border-b border-border flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-foreground tracking-tight">ARIA</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Grupo CAP Honduras</div>
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto space-y-3">
        {NAV_GROUPS.map(group => (
          <div key={group.title}>
            <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest px-3 py-1">
              {group.title}
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const isActive = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => { setLocation(item.key); onNavigate?.(); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-sm min-h-[44px] ${
                      isActive
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-[13px]">{item.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          <div className="font-semibold text-foreground">Sindy Castro</div>
          <div>Gerente General</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 border-r border-border bg-card flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-72 bg-card border-r border-border z-50 lg:hidden flex flex-col animate-in slide-in-from-left duration-200">
            <div className="absolute top-3 right-3 z-10">
              <button onClick={() => setSidebarOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent">
                <X className="w-5 h-5" />
              </button>
            </div>
            <SidebarContent onNavigate={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-between px-3 sm:px-4 lg:px-6 py-2.5 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">
                {ALL_NAV_ITEMS.find(n => n.key === activeKey)?.label ?? "Dashboard"}
              </h1>
              <p className="text-[11px] text-muted-foreground capitalize hidden sm:block">{dateStr}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button onClick={() => setSearchOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-accent text-xs min-h-[36px]">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden md:inline text-[9px] bg-muted px-1.5 py-0.5 rounded font-mono">Alt+K</kbd>
            </button>
            <NotificationsDropdown />
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-green-700 font-medium">ARIA Activa</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Suspense fallback={<PageLoadingFallback />}>
            {ActivePage ? <ActivePage /> : null}
            {reunionDetailId ? <ReunionDetailPage reunionId={reunionDetailId} /> : null}
          </Suspense>
        </div>
      </main>

      {/* Global Search Modal */}
      {searchOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-50" onClick={() => { setSearchOpen(false); setSearchQuery(""); }} />
          <div className="fixed top-[10%] sm:top-[15%] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-lg z-50 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                id="global-search"
                name="globalSearch"
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar tareas, responsables..."
                className="flex-1 text-sm outline-none bg-transparent text-foreground min-h-[36px]"
              />
              <button onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 min-h-[36px]">ESC</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {searchQuery.length < 2 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">Escribe al menos 2 caracteres</div>
              ) : searchResults.isLoading ? (
                <div className="py-8 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />Buscando...
                </div>
              ) : (
                <div className="p-2">
                  {(searchResults.data?.tareas ?? []).length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Tareas</div>
                      {(searchResults.data?.tareas ?? []).map((t: any) => (
                        <button key={`t-${t.id}`} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent text-sm min-h-[44px]"
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); setLocation("/tareas"); }}>
                          <div className="font-medium text-foreground">{t.nombre || t.tarea}</div>
                          <div className="text-xs text-muted-foreground">{t.area} — {t.responsable}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults.data?.responsables ?? []).length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Responsables</div>
                      {(searchResults.data?.responsables ?? []).map((r: any) => (
                        <button key={`r-${r.id}`} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent text-sm min-h-[44px]"
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); setLocation("/responsables"); }}>
                          <div className="font-medium text-foreground">{r.nombre}</div>
                          <div className="text-xs text-muted-foreground">{r.area}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults.data?.departamentos ?? []).length > 0 && (
                    <div className="mb-2">
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase px-2 py-1">Departamentos</div>
                      {(searchResults.data?.departamentos ?? []).map((d: any) => (
                        <button key={`d-${d.id}`} className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent text-sm min-h-[44px]"
                          onClick={() => { setSearchOpen(false); setSearchQuery(""); setLocation("/departamentos"); }}>
                          <div className="font-medium text-foreground">{d.nombre}</div>
                          <div className="text-xs text-muted-foreground">{d.empresa}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  {(searchResults.data?.tareas ?? []).length === 0 &&
                   (searchResults.data?.responsables ?? []).length === 0 &&
                   (searchResults.data?.departamentos ?? []).length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">Sin resultados para "{searchQuery}"</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* AI Chat Widget */}
      <Suspense fallback={null}>
        <AIChatWidget />
      </Suspense>
    </div>
  );
}
