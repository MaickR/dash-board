import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  FileText, TrendingUp, AlertTriangle, CheckCircle2, Clock, Download, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

export default function ResumenPage() {
  const [resumen, setResumen] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const generateMut = trpc.resumen.generate.useMutation();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateMut.mutateAsync();
      setResumen(data);
      toast.success("Resumen ejecutivo generado");
    } catch (err) {
      toast.error("Error al generar resumen");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = () => {
    if (!resumen) return;
    // Build printable HTML and trigger print dialog for PDF
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Habilita popups para exportar PDF"); return; }

    const areasRows = resumen.areasCumplimiento
      .map((a: any) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;font-weight:600">${a.area}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${a.total}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:#27ae60">${a.completadas}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;color:#e67e22">${a.pendientes}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${a.porcentaje}%</td>
      </tr>`).join("");

    const topRows = resumen.topPendientes
      .map((r: any) => `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee">${r.nombre}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${r.pendientes}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${r.total}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Resumen Ejecutivo Semanal - Grupo CAP</title>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  h1 { color: #C0392B; border-bottom: 3px solid #C0392B; padding-bottom: 12px; font-size: 24px; }
  h2 { color: #333; margin-top: 30px; font-size: 18px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 20px 0; }
  .kpi { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
  .kpi-value { font-size: 28px; font-weight: 700; }
  .kpi-label { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #f1f1f1; padding: 10px 8px; text-align: left; font-size: 12px; text-transform: uppercase; color: #555; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>ARIA - Resumen Ejecutivo Semanal</h1>
<p style="color:#666">Grupo CAP Honduras | ${resumen.fecha}</p>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-value">${resumen.total}</div><div class="kpi-label">Total</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#27ae60">${resumen.completadas}</div><div class="kpi-label">Completadas</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#2980b9">${resumen.enProgreso}</div><div class="kpi-label">En Progreso</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#e67e22">${resumen.pendientes}</div><div class="kpi-label">Pendientes</div></div>
  <div class="kpi"><div class="kpi-value" style="color:#C0392B">${resumen.vencidas}</div><div class="kpi-label">Vencidas</div></div>
</div>

<div style="background:#f8f9fa;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
  <div style="font-size:14px;color:#666;margin-bottom:8px">Cumplimiento General</div>
  <div style="font-size:48px;font-weight:700;color:${resumen.cumplimiento >= 70 ? '#27ae60' : resumen.cumplimiento >= 40 ? '#e67e22' : '#C0392B'}">${resumen.cumplimiento}%</div>
</div>

<h2>Cumplimiento por Area</h2>
<table>
  <thead><tr><th>Area</th><th style="text-align:center">Total</th><th style="text-align:center">Completadas</th><th style="text-align:center">Pendientes</th><th style="text-align:center">%</th></tr></thead>
  <tbody>${areasRows}</tbody>
</table>

<h2>Coordinadores con Mas Pendientes</h2>
<table>
  <thead><tr><th>Coordinador</th><th style="text-align:center">Pendientes</th><th style="text-align:center">Total</th></tr></thead>
  <tbody>${topRows}</tbody>
</table>

<div class="footer">Generado por ARIA - Asistente Ejecutiva | Grupo CAP Honduras | ${new Date().toLocaleString("es-HN")}</div>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumen Ejecutivo</h2>
          <p className="text-sm text-gray-500 mt-1">Genera un resumen semanal con indicadores clave de cumplimiento</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading} className="bg-[#C0392B] hover:bg-[#a93226] text-white">
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
            Generar Resumen
          </Button>
          {resumen && (
            <Button variant="outline" onClick={handleExportPdf}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          )}
        </div>
      </div>

      {!resumen && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500 text-center">Haz clic en "Generar Resumen" para crear el reporte ejecutivo semanal</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-[#C0392B] animate-spin mb-4" />
            <p className="text-gray-500">Generando resumen ejecutivo...</p>
          </CardContent>
        </Card>
      )}

      {resumen && !loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{resumen.total}</p>
                <p className="text-xs text-gray-500 uppercase mt-1">Total Tareas</p>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-green-600">{resumen.completadas}</p>
                <p className="text-xs text-green-700 uppercase mt-1">Completadas</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{resumen.enProgreso}</p>
                <p className="text-xs text-blue-700 uppercase mt-1">En Progreso</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{resumen.pendientes}</p>
                <p className="text-xs text-amber-700 uppercase mt-1">Pendientes</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-3xl font-bold text-red-600">{resumen.vencidas}</p>
                <p className="text-xs text-red-700 uppercase mt-1">Vencidas</p>
              </CardContent>
            </Card>
          </div>

          {/* Cumplimiento General */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#C0392B]" />
                Cumplimiento General
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-4">
                <span className={`text-5xl font-bold ${
                  resumen.cumplimiento >= 70 ? "text-green-600" :
                  resumen.cumplimiento >= 40 ? "text-amber-600" : "text-red-600"
                }`}>
                  {resumen.cumplimiento}%
                </span>
              </div>
              <Progress
                value={resumen.cumplimiento}
                className="h-3"
              />
            </CardContent>
          </Card>

          {/* Areas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cumplimiento por Area</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {resumen.areasCumplimiento.map((a: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-48 font-medium text-sm truncate">{a.area}</div>
                    <div className="flex-1">
                      <Progress value={a.porcentaje} className="h-2" />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 w-48 justify-end">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-green-500" />{a.completadas}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />{a.pendientes}
                      </span>
                      <span className="font-semibold text-gray-700">{a.porcentaje}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Pendientes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Coordinadores con Mas Pendientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resumen.topPendientes.map((r: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        i === 0 ? "bg-red-500" : i === 1 ? "bg-amber-500" : "bg-gray-400"
                      }`}>
                        {i + 1}
                      </div>
                      <span className="font-medium">{r.nombre}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-amber-600 font-semibold">{r.pendientes} pendientes</span>
                      <span className="text-gray-400">de {r.total} total</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
