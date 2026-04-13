import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useMemo } from "react";
import { Upload, FileText, CheckCircle2, Loader2, ExternalLink, Link2, Link2Off, Search } from "lucide-react";
import { toast } from "sonner";
import FileUploadExtractor from "@/components/FileUploadExtractor";

const AREAS = [
  "Coordinadores", "Marketing", "Talento Humano", "Compras", "Legal",
  "Servicios Generales", "Contabilidad y Finanzas", "Procesos y Mejora Continua",
  "Programación y Tecnología", "Gerencia General", "Auditoría", "Comercial",
];

type ExtractedTask = {
  tarea: string; responsable: string; fecha: string; propuesta: string[]; area: string;
};

export default function ArchivosPage() {
  const { data: archivos = [], isLoading, refetch: refetchArchivos } = trpc.archivos.list.useQuery();
  const { data: reuniones = [] } = trpc.reuniones.list.useQuery();
  const utils = trpc.useUtils();
  const processText = trpc.ai.processTranscription.useMutation();
  const saveTasks = trpc.tareas.createBatch.useMutation({ onSuccess: () => utils.tareas.list.invalidate() });
  const updateArchivo = trpc.archivos.update.useMutation({
    onSuccess: () => { refetchArchivos(); toast.success("Archivo actualizado"); },
    onError: () => toast.error("Error al actualizar archivo"),
  });

  const [selectedArea, setSelectedArea] = useState("Gerencia General");
  const [selectedReunion, setSelectedReunion] = useState("");
  const [selectedReunionId, setSelectedReunionId] = useState<number | undefined>(undefined);
  const [extractedTasks, setExtractedTasks] = useState<ExtractedTask[]>([]);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const [searchQuery, setSearchQuery] = useState("");
  const [linkingArchivoId, setLinkingArchivoId] = useState<number | null>(null);
  const [linkReunionId, setLinkReunionId] = useState<string>("");

  // Sort reuniones by date descending for the selector
  const reunionesOrdenadas = useMemo(() => {
    return [...reuniones].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db2 - da;
    });
  }, [reuniones]);

  const filteredArchivos = useMemo(() => {
    if (!searchQuery.trim()) return archivos;
    const q = searchQuery.toLowerCase();
    return archivos.filter(a =>
      a.nombre.toLowerCase().includes(q) ||
      (a.area ?? "").toLowerCase().includes(q) ||
      (a.reunion ?? "").toLowerCase().includes(q)
    );
  }, [archivos, searchQuery]);

  const handleTextReady = async (text: string) => {
    if (text.length > 20) {
      setProcessing(true);
      try {
        const tasks = await processText.mutateAsync({
          text,
          reunion: selectedReunion || undefined,
          area: selectedArea,
        });
        setExtractedTasks(tasks);
        toast.success(`${tasks.length} tareas extraídas con IA`);
      } catch (err: any) {
        toast.error(err.message || "Error al procesar con IA");
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleFileUploaded = ({ filename }: { url: string; filename: string; extractedText: string }) => {
    refetchArchivos();
    toast.success(`Archivo "${filename}" guardado${selectedReunionId ? " y vinculado a la reunión" : ""}`);
  };

  const handleSaveTasks = async () => {
    if (extractedTasks.length === 0) return;
    try {
      await saveTasks.mutateAsync(extractedTasks.map(t => ({
        area: t.area,
        tarea: t.tarea,
        responsable: t.responsable,
        fecha: t.fecha,
        propuesta: JSON.stringify(t.propuesta),
        source: "procesamiento_ia",
        reunion: selectedReunion || undefined,
      })));
      toast.success(`${extractedTasks.length} tareas guardadas en el sistema`);
      setExtractedTasks([]);
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  const handleLinkToReunion = async (archivoId: number) => {
    if (!linkReunionId || linkReunionId === "none") {
      // Unlink
      await updateArchivo.mutateAsync({ id: archivoId, reunionId: null });
    } else {
      await updateArchivo.mutateAsync({ id: archivoId, reunionId: parseInt(linkReunionId) });
    }
    setLinkingArchivoId(null);
    setLinkReunionId("");
  };

  const getReunionLabel = (reunionId: number | null | undefined) => {
    if (!reunionId) return null;
    const r = reuniones.find(r => r.id === reunionId);
    return r ? `${r.area} — ${r.semana ?? ""}` : `Reunión #${reunionId}`;
  };

  return (
    <div className="space-y-6">
      {/* Area & Reunion selectors */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            {AREAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Nombre de reunión (opcional)"
          value={selectedReunion}
          onChange={e => setSelectedReunion(e.target.value)}
          className="w-56"
        />
        <Select
          value={selectedReunionId ? String(selectedReunionId) : "none"}
          onValueChange={v => setSelectedReunionId(v === "none" ? undefined : parseInt(v))}
        >
          <SelectTrigger className="w-72">
            <Link2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Vincular a reunión (opcional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin vincular a reunión</SelectItem>
            {reunionesOrdenadas.map(r => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.area} — {r.semana ?? "Sin semana"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">
            <Upload className="w-3.5 h-3.5 mr-1.5" />Subir / Pegar
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="w-3.5 h-3.5 mr-1.5" />Historial ({archivos.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4 mt-4">
          {selectedReunionId && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
              <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>El archivo se vinculará a: <strong>{getReunionLabel(selectedReunionId)}</strong></span>
            </div>
          )}
          <FileUploadExtractor
            onTextReady={handleTextReady}
            onFileUploaded={handleFileUploaded}
            uploadToS3={true}
            area={selectedArea}
            reunion={selectedReunion || undefined}
            reunionId={selectedReunionId}
            showPreview={true}
            pastePlaceholder="Pega aquí la transcripción completa de la reunión..."
          />

          {processing && (
            <Card className="border-2 border-[#C0392B]/20">
              <CardContent className="p-6 text-center">
                <Loader2 className="w-8 h-8 text-[#C0392B] animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Analizando contenido con IA...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, área o reunión..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>

          {isLoading ? (
            <Card><CardContent className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></CardContent></Card>
          ) : filteredArchivos.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
              {searchQuery ? "No se encontraron archivos con ese criterio" : "No hay archivos subidos aún"}
            </CardContent></Card>
          ) : filteredArchivos.map(a => (
            <Card key={a.id} className="border border-border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground truncate">{a.nombre}</div>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                      {a.area && <Badge variant="outline" className="text-[10px]">{a.area}</Badge>}
                      {a.reunion && <span className="text-muted-foreground">{a.reunion}</span>}
                      <span>{new Date(a.createdAt).toLocaleDateString("es-HN")}</span>
                      {a.procesado && <Badge className="bg-green-100 text-green-700 text-[10px]">Procesado</Badge>}
                    </div>
                    {/* Reunion link indicator */}
                    {a.reunionId && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Link2 className="w-3 h-3 text-blue-500" />
                        <span className="text-[10px] text-blue-600">
                          Vinculado: {getReunionLabel(a.reunionId)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Link/Unlink button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setLinkingArchivoId(linkingArchivoId === a.id ? null : a.id);
                        setLinkReunionId(a.reunionId ? String(a.reunionId) : "none");
                      }}
                    >
                      {a.reunionId ? <Link2Off className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    </Button>
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Inline link panel */}
                {linkingArchivoId === a.id && (
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                    <Select value={linkReunionId} onValueChange={setLinkReunionId}>
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Seleccionar reunión..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin vincular</SelectItem>
                        {reunionesOrdenadas.map(r => (
                          <SelectItem key={r.id} value={String(r.id)}>
                            {r.area} — {r.semana ?? "Sin semana"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="h-8 text-xs bg-[#C0392B] hover:bg-[#a93226] text-white"
                      onClick={() => handleLinkToReunion(a.id)}
                      disabled={updateArchivo.isPending}
                    >
                      {updateArchivo.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Guardar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => { setLinkingArchivoId(null); setLinkReunionId(""); }}
                    >
                      Cancelar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {/* Extracted tasks preview */}
      {extractedTasks.length > 0 && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              {extractedTasks.length} tareas extraídas — Revisa y guarda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {extractedTasks.map((t, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="font-semibold text-foreground">{t.tarea}</div>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span>👤 {t.responsable}</span>
                  <span>📅 {t.fecha}</span>
                  <span>📂 {t.area}</span>
                </div>
                {t.propuesta.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5">
                    {t.propuesta.map((p, j) => (
                      <li key={j} className="text-xs text-muted-foreground">• {p}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <Button onClick={handleSaveTasks} className="w-full" disabled={saveTasks.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" />Guardar {extractedTasks.length} tareas en el sistema
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
