import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Settings, Building2, Bell, Mail, MessageSquare, Globe,
  Save, CheckCircle2, XCircle, Loader2, Send, Bot, Sparkles,
  Palette, Clock, Shield, RefreshCw, ExternalLink,
} from "lucide-react";

const TABS = [
  { key: "general", label: "General", icon: Settings },
  { key: "empresas", label: "Empresas", icon: Building2 },
  { key: "notificaciones", label: "Notificaciones", icon: Bell },
  { key: "brief", label: "Brief Pre-Reunión", icon: Mail },
  { key: "integraciones", label: "Integraciones", icon: Globe },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DEFAULT_EMPRESAS = [
  { key: "empresa_1", nombre: "CAP Honduras", color: "#C0392B" },
  { key: "empresa_2", nombre: "Auto Repuestos Blessing", color: "#E67E22" },
  { key: "empresa_3", nombre: "Distribuidora Mansiago", color: "#27AE60" },
  { key: "empresa_4", nombre: "Inversiones S&M", color: "#2980B9" },
  { key: "empresa_5", nombre: "Tecnicentro DIDASA", color: "#8E44AD" },
  { key: "empresa_6", nombre: "JAPAN HN", color: "#16A085" },
];

export default function ConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const config = trpc.systemSettings.getAll.useQuery();
  const setConfig = trpc.systemSettings.set.useMutation({ onSuccess: () => config.refetch() });
  const setBatch = trpc.systemSettings.setBatch.useMutation({ onSuccess: () => config.refetch() });
  const testTelegram = trpc.telegram.testConnection.useMutation();
  const testTeams = trpc.teamsConfig.testWebhook.useMutation();

  // Brief config
  const briefConfig = trpc.brief.config.useQuery();
  const updateBrief = trpc.brief.updateConfig.useMutation({ onSuccess: () => briefConfig.refetch() });

  // Local state
  const [systemName, setSystemName] = useState("ARIA — Grupo CAP Honduras");
  const [timezone, setTimezone] = useState("America/Tegucigalpa");
  const [telegramToken, setTelegramToken] = useState("");
  const [teamsWebhook, setTeamsWebhook] = useState("");
  const [empresas, setEmpresas] = useState(DEFAULT_EMPRESAS);

  // Notification toggles
  const [notifTareaVencida, setNotifTareaVencida] = useState(true);
  const [notifAcuerdoPendiente, setNotifAcuerdoPendiente] = useState(true);
  const [notifNuevaTarea, setNotifNuevaTarea] = useState(true);
  const [notifBriefEnviado, setNotifBriefEnviado] = useState(true);

  // Brief config local
  const [briefActivo, setBriefActivo] = useState(true);
  const [briefEmail, setBriefEmail] = useState("gerencia@cap.hn");
  const [briefMinutos, setBriefMinutos] = useState(30);

  useEffect(() => {
    if (config.data) {
      setSystemName(config.data["system_name"] || "ARIA — Grupo CAP Honduras");
      setTimezone(config.data["timezone"] || "America/Tegucigalpa");
      setTelegramToken(config.data["telegram_bot_token"] || "");
      setTeamsWebhook(config.data["teams_webhook_url"] || "");
      setNotifTareaVencida(config.data["notif_tarea_vencida"] !== "false");
      setNotifAcuerdoPendiente(config.data["notif_acuerdo_pendiente"] !== "false");
      setNotifNuevaTarea(config.data["notif_nueva_tarea"] !== "false");
      setNotifBriefEnviado(config.data["notif_brief_enviado"] !== "false");

      // Parse empresas
      try {
        const saved = config.data["empresas_config"];
        if (saved) setEmpresas(JSON.parse(saved));
      } catch {}
    }
  }, [config.data]);

  useEffect(() => {
    if (briefConfig.data) {
      setBriefActivo(briefConfig.data.activo ?? true);
      setBriefEmail(briefConfig.data.emailDestinatario);
      setBriefMinutos(briefConfig.data.minutosAnticipacion);
    }
  }, [briefConfig.data]);

  const saveGeneral = () => {
    setBatch.mutate([
      { key: "system_name", value: systemName },
      { key: "timezone", value: timezone },
    ], { onSuccess: () => toast.success("Configuración general guardada") });
  };

  const saveEmpresas = () => {
    setConfig.mutate({ key: "empresas_config", value: JSON.stringify(empresas) }, {
      onSuccess: () => toast.success("Empresas actualizadas"),
    });
  };

  const saveNotifications = () => {
    setBatch.mutate([
      { key: "notif_tarea_vencida", value: String(notifTareaVencida) },
      { key: "notif_acuerdo_pendiente", value: String(notifAcuerdoPendiente) },
      { key: "notif_nueva_tarea", value: String(notifNuevaTarea) },
      { key: "notif_brief_enviado", value: String(notifBriefEnviado) },
    ], { onSuccess: () => toast.success("Preferencias de notificación guardadas") });
  };

  const saveBrief = () => {
    updateBrief.mutate({
      activo: briefActivo,
      emailDestinatario: briefEmail,
      minutosAnticipacion: briefMinutos,
    }, { onSuccess: () => toast.success("Configuración de brief actualizada") });
  };

  const handleTestTelegram = () => {
    if (!telegramToken.trim()) return toast.error("Ingresa el token del bot");
    testTelegram.mutate({ token: telegramToken }, {
      onSuccess: (data) => {
        if (data.success) {
          toast.success(`Bot conectado: @${data.botName}`);
          config.refetch();
        } else {
          toast.error(data.error || "Error al conectar");
        }
      },
    });
  };

  const handleTestTeams = () => {
    if (!teamsWebhook.trim()) return toast.error("Ingresa la URL del webhook");
    testTeams.mutate({ webhookUrl: teamsWebhook }, {
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Webhook de Teams verificado correctamente");
          config.refetch();
        } else {
          toast.error(data.error || "Error al conectar");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Configuración del Sistema
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Administra las configuraciones generales, integraciones y notificaciones de ARIA.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar tabs */}
        <div className="lg:w-56 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap transition-all min-h-[44px] ${
                  activeTab === tab.key
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* General */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Información General
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-foreground">Nombre del Sistema</label>
                    <Input value={systemName} onChange={e => setSystemName(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Zona Horaria</label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Tegucigalpa">America/Tegucigalpa (CST)</SelectItem>
                        <SelectItem value="America/Mexico_City">America/Mexico_City (CST)</SelectItem>
                        <SelectItem value="America/Guatemala">America/Guatemala (CST)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={saveGeneral} disabled={setBatch.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar
                </Button>
              </div>
            </div>
          )}

          {/* Empresas */}
          {activeTab === "empresas" && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  Empresas del Grupo
                </h3>
                <p className="text-sm text-muted-foreground">Edita el nombre y color de cada empresa del grupo.</p>
                <div className="space-y-3">
                  {empresas.map((emp, i) => (
                    <div key={emp.key} className="flex items-center gap-3 p-3 rounded-lg bg-accent/30">
                      <input
                        type="color"
                        value={emp.color}
                        onChange={e => {
                          const updated = [...empresas];
                          updated[i] = { ...emp, color: e.target.value };
                          setEmpresas(updated);
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <Input
                        value={emp.nombre}
                        onChange={e => {
                          const updated = [...empresas];
                          updated[i] = { ...emp, nombre: e.target.value };
                          setEmpresas(updated);
                        }}
                        className="flex-1"
                      />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: emp.color }}>
                        {emp.nombre.charAt(0)}
                      </div>
                    </div>
                  ))}
                </div>
                <Button onClick={saveEmpresas} disabled={setConfig.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Empresas
                </Button>
              </div>
            </div>
          )}

          {/* Notificaciones */}
          {activeTab === "notificaciones" && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Preferencias de Notificación
                </h3>
                <p className="text-sm text-muted-foreground">Activa o desactiva cada tipo de notificación del sistema.</p>
                <div className="space-y-4">
                  {[
                    { label: "Tarea próxima a vencer", desc: "Notificar 1 día antes del vencimiento", value: notifTareaVencida, set: setNotifTareaVencida },
                    { label: "Acuerdo pendiente", desc: "Notificar cuando un acuerdo de reunión está próximo a vencer", value: notifAcuerdoPendiente, set: setNotifAcuerdoPendiente },
                    { label: "Nueva tarea asignada", desc: "Notificar cuando se asigna una nueva tarea", value: notifNuevaTarea, set: setNotifNuevaTarea },
                    { label: "Brief enviado", desc: "Notificar cuando se envía un brief pre-reunión", value: notifBriefEnviado, set: setNotifBriefEnviado },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                      <div>
                        <div className="text-sm font-medium text-foreground">{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.desc}</div>
                      </div>
                      <Switch checked={item.value} onCheckedChange={item.set} />
                    </div>
                  ))}
                </div>
                <Button onClick={saveNotifications} disabled={setBatch.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Preferencias
                </Button>
              </div>
            </div>
          )}

          {/* Brief Pre-Reunión */}
          {activeTab === "brief" && (
            <div className="space-y-6">
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Brief Pre-Reunión Automático
                </h3>
                <p className="text-sm text-muted-foreground">El sistema genera automáticamente un brief ejecutivo con IA y lo guarda dentro de cada reunión. No se envía por correo.</p>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                  <strong>Cómo funciona:</strong> 30 minutos antes de cada reunión programada, el sistema genera automáticamente un brief que incluye tareas pendientes del área, acuerdos sin cerrar, KPIs y puntos de agenda sugeridos. También puedes generar un brief manualmente desde el detalle de cualquier reunión.
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                    <div>
                      <div className="text-sm font-medium text-foreground">Generación automática activa</div>
                      <div className="text-xs text-muted-foreground">El sistema generará y guardará briefs automáticamente antes de cada reunión</div>
                    </div>
                    <Switch checked={briefActivo} onCheckedChange={setBriefActivo} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Minutos de anticipación</label>
                    <Input type="number" value={briefMinutos} onChange={e => setBriefMinutos(parseInt(e.target.value) || 30)} className="mt-1" min={5} max={120} />
                    <p className="text-xs text-muted-foreground mt-1">El brief se generará este número de minutos antes de la hora de inicio de la reunión.</p>
                  </div>
                </div>
                <Button onClick={saveBrief} disabled={updateBrief.isPending} className="gap-2">
                  <Save className="w-4 h-4" />
                  Guardar Configuración
                </Button>
              </div>
            </div>
          )}

          {/* Integraciones */}
          {activeTab === "integraciones" && (
            <div className="space-y-6">
              {/* Telegram */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Bot className="w-4 h-4 text-blue-500" />
                    Bot de Telegram
                  </h3>
                  <Badge variant={telegramToken ? "default" : "secondary"} className={telegramToken ? "bg-green-100 text-green-700" : ""}>
                    {telegramToken ? "Configurado" : "No configurado"}
                  </Badge>
                </div>

                <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Instrucciones de configuración:</h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Abre Telegram y busca <strong>@BotFather</strong></li>
                    <li>Envía <code>/newbot</code> y sigue las instrucciones para crear tu bot</li>
                    <li>Copia el token que te proporciona BotFather</li>
                    <li>Pega el token aquí abajo y haz clic en "Probar Conexión"</li>
                    <li>Configura el webhook: envía a BotFather el comando <code>/setwebhook</code> con la URL: <code>https://capdash-hwbnarg4.manus.space/api/telegram/webhook</code></li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Token del Bot</label>
                  <div className="flex gap-2">
                    <Input
                      value={telegramToken}
                      onChange={e => setTelegramToken(e.target.value)}
                      placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                      type="password"
                      className="flex-1"
                    />
                    <Button onClick={handleTestTelegram} disabled={testTelegram.isPending} variant="outline" className="gap-2 min-w-[140px]">
                      {testTelegram.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Probar Conexión
                    </Button>
                  </div>
                </div>

                <div className="bg-accent/30 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Comandos disponibles del bot:</h4>
                  <div className="grid gap-1 text-xs text-muted-foreground font-mono">
                    <div><code>/tarea</code> Nombre | Descripción | Área | Responsable | DD/MM/YYYY</div>
                    <div><code>/pendientes</code> [área] — Ver tareas pendientes</div>
                    <div><code>/kpis</code> [área] — Ver KPIs por área</div>
                    <div><code>/actualizar</code> ID estado — Actualizar estado de tarea</div>
                    <div><code>/help</code> — Ver ayuda</div>
                    <div>Cualquier otro mensaje → Consulta libre con IA</div>
                  </div>
                </div>
              </div>

              {/* Teams */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-500" />
                    Microsoft Teams
                  </h3>
                  <Badge variant={teamsWebhook ? "default" : "secondary"} className={teamsWebhook ? "bg-green-100 text-green-700" : ""}>
                    {teamsWebhook ? "Configurado" : "No configurado"}
                  </Badge>
                </div>

                <div className="bg-accent/30 rounded-lg p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Instrucciones:</h4>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>En Teams, ve al canal donde quieres recibir notificaciones</li>
                    <li>Haz clic en "..." → "Conectores" → "Incoming Webhook"</li>
                    <li>Dale un nombre (ej: "ARIA Notificaciones") y copia la URL</li>
                    <li>Pega la URL aquí y haz clic en "Probar Webhook"</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">URL del Webhook</label>
                  <div className="flex gap-2">
                    <Input
                      value={teamsWebhook}
                      onChange={e => setTeamsWebhook(e.target.value)}
                      placeholder="https://outlook.office.com/webhook/..."
                      className="flex-1"
                    />
                    <Button onClick={handleTestTeams} disabled={testTeams.isPending} variant="outline" className="gap-2 min-w-[140px]">
                      {testTeams.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Probar Webhook
                    </Button>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <strong>Notificaciones automáticas:</strong> Al asignar tareas, aprobar borradores, y desde automatizaciones.
                </div>
              </div>

              {/* Other integrations status */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4 text-primary" />
                  Otras Integraciones
                </h3>
                <div className="space-y-3">
                  {[
                    { name: "Outlook Calendar", desc: "Sincronización de eventos", status: "Activo", color: "bg-green-100 text-green-700" },
                    { name: "Outlook Mail", desc: "Bandeja de correos", status: "Activo", color: "bg-green-100 text-green-700" },
                    { name: "Google Drive", desc: "Documentos compartidos", status: "Activo", color: "bg-green-100 text-green-700" },
                    { name: "IA (LLM)", desc: "Generación de briefs y análisis", status: "Activo", color: "bg-green-100 text-green-700" },
                  ].map(int => (
                    <div key={int.name} className="flex items-center justify-between p-3 rounded-lg bg-accent/30">
                      <div>
                        <div className="text-sm font-medium text-foreground">{int.name}</div>
                        <div className="text-xs text-muted-foreground">{int.desc}</div>
                      </div>
                      <Badge className={int.color}>{int.status}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
