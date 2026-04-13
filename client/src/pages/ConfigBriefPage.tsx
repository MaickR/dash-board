/**
 * ConfigBriefPage — Configuración de Brief Pre-Reunión (v5.8)
 * Los briefs se generan y guardan en la base de datos (no se envían por correo).
 * Diseño: Corporate Command Center, colores CAP (#C0392B, #1a1a1a)
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Clock, Settings, Zap, CheckCircle2,
  Loader2, FileText, CalendarCheck, BrainCircuit,
} from "lucide-react";

export default function ConfigBriefPage() {
  const [activo, setActivo] = useState(true);
  const [minutos, setMinutos] = useState(30);
  const [dirty, setDirty] = useState(false);

  // Fetch config
  const { data: config, isLoading: configLoading, refetch: refetchConfig } = trpc.brief.config.useQuery();

  // Fetch reuniones with brief status
  const { data: reuniones = [] } = trpc.brief.reunionesWithStatus.useQuery();

  // Update config mutation
  const updateMutation = trpc.brief.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuración actualizada");
      setDirty(false);
      refetchConfig();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Generate brief mutation (replaces sendNow)
  const generateMutation = trpc.brief.generate.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Brief generado y guardado exitosamente");
      } else {
        toast.error(`Error: ${data.error}`);
      }
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Sync state from server config
  useEffect(() => {
    if (config) {
      setActivo(config.activo ?? true);
      setMinutos(config.minutosAnticipacion ?? 30);
    }
  }, [config]);

  const handleSave = () => {
    updateMutation.mutate({ activo, minutosAnticipacion: minutos });
  };

  const pendientesSinBrief = (reuniones as any[]).filter((r: any) => r.status === "pendiente");

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#C0392B]" />
          Configuración Brief Pre-Reunión
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          ARIA genera automáticamente un brief ejecutivo antes de cada reunión con tareas pendientes, acuerdos y KPIs del área. Los briefs se guardan en el historial de cada reunión.
        </p>
      </div>

      {/* Config Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#C0392B]" />
            Generación Automática
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {configLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Generación automática de briefs</p>
                  <p className="text-xs text-muted-foreground">El sistema revisa cada minuto si hay reuniones próximas y genera el brief automáticamente</p>
                </div>
                <Switch
                  checked={activo}
                  onCheckedChange={(v) => { setActivo(v); setDirty(true); }}
                />
              </div>

              {/* Minutes */}
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Minutos de anticipación</label>
                <div className="flex items-center gap-3 max-w-md">
                  <Input
                    type="number"
                    value={minutos}
                    onChange={(e) => { setMinutos(parseInt(e.target.value) || 30); setDirty(true); }}
                    min={5}
                    max={120}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">minutos antes de la reunión</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">El brief se generará y guardará automáticamente {minutos} minutos antes de cada reunión</p>
              </div>

              {/* Save */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!dirty || updateMutation.isPending}
                  className="bg-[#C0392B] hover:bg-[#a93226] text-white"
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Guardar configuración
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Reuniones pendientes */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-[#C0392B]" />
            Reuniones Pendientes — Generar Brief Manual ({pendientesSinBrief.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendientesSinBrief.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay reuniones pendientes en este momento.
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {pendientesSinBrief.slice(0, 10).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.area}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.dia} {r.hora} — {r.responsable}
                      {r.fecha && <> | {r.fecha}</>}
                    </p>
                  </div>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => generateMutation.mutate({ reunionId: r.id })}
                    disabled={generateMutation.isPending}
                    className="ml-2 flex-shrink-0"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    {generateMutation.isPending ? "Generando..." : "Generar brief"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C0392B]" />
            ¿Cómo funciona?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Clock className="w-4 h-4 text-[#C0392B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Generación automática</p>
              <p className="text-xs text-muted-foreground">ARIA genera el brief {minutos} minutos antes de cada reunión programada y lo guarda en el historial de esa reunión.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <Zap className="w-4 h-4 text-[#C0392B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Generación manual</p>
              <p className="text-xs text-muted-foreground">Puedes generar un brief en cualquier momento desde el detalle de cada reunión o desde esta página.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <CheckCircle2 className="w-4 h-4 text-[#C0392B] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Contenido del brief</p>
              <p className="text-xs text-muted-foreground">Cada brief incluye: tareas pendientes del área, acuerdos sin cerrar, KPIs (% cumplimiento, vencidas, completadas) y agenda sugerida por IA.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
