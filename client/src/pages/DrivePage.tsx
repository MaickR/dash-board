import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import {
  FolderOpen, RefreshCw, Search, FileText, File, Image,
  Download, ExternalLink, Loader2, Upload, Sparkles, CheckCircle2, XCircle, X,
} from "lucide-react";
import { toast } from "sonner";
import FileUploadExtractor from "@/components/FileUploadExtractor";

const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1ZLGvT92wDZT_-Z5KSjsyJ9S3WtLnOChu";

const MIME_ICONS: Record<string, any> = {
  "application/pdf": FileText,
  "application/vnd.google-apps.document": FileText,
  "application/vnd.google-apps.spreadsheet": FileText,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": FileText,
  "image/png": Image,
  "image/jpeg": Image,
};

export default function DrivePage() {
  const { data: archivos = [], isLoading } = trpc.drive.list.useQuery();
  const utils = trpc.useUtils();
  const syncDrive = trpc.drive.sync.useMutation({
    onSuccess: (data: any) => {
      toast.success(data?.message || "Sincronización completada");
      utils.drive.list.invalidate();
      setLastSync(new Date().toLocaleString("es-HN"));
    },
    onError: (err: any) => { toast.error(`Error: ${err.message}`); },
  });
  const generateDrafts = trpc.borradores.generate.useMutation({
    onSuccess: () => {
      utils.borradores.list.invalidate();
      toast.success("Borradores generados exitosamente. Revísalos en Reuniones > Borradores.");
    },
  });

  const [searchQ, setSearchQ] = useState("");
  const [filterArea, setFilterArea] = useState("Todas");
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedText, setUploadedText] = useState("");

  const areas = useMemo(() => {
    const set = new Set((archivos as any[]).map(a => a.area || a.carpeta || "Sin clasificar").filter(Boolean));
    return ["Todas", ...Array.from(set).sort()];
  }, [archivos]);

  const filtered = useMemo(() => {
    let result = archivos as any[];
    if (searchQ) {
      const q = searchQ.toLowerCase();
      result = result.filter(a => a.nombre.toLowerCase().includes(q) || (a.carpeta || "").toLowerCase().includes(q));
    }
    if (filterArea !== "Todas") result = result.filter(a => (a.area || a.carpeta) === filterArea);
    return result;
  }, [archivos, searchQ, filterArea]);

  const groupedByFolder = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filtered.forEach(a => {
      const folder = a.carpeta || a.area || "Sin clasificar";
      if (!groups[folder]) groups[folder] = [];
      groups[folder].push(a);
    });
    return groups;
  }, [filtered]);

  const getIcon = (mimeType: string) => {
    return MIME_ICONS[mimeType] || File;
  };

  const handleAnalyzeText = (text: string) => {
    if (text.length < 20) {
      toast.error("El texto es demasiado corto para analizar");
      return;
    }
    generateDrafts.mutate({ contenido: text });
    setShowUploadModal(false);
    setUploadedText("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            Google Drive — Documentos
          </h2>
          <p className="text-sm text-muted-foreground">
            {(archivos as any[]).length} archivos sincronizados
            {lastSync && <span className="ml-2 text-[10px] text-muted-foreground/70">· Última sync: {lastSync}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)} className="min-h-[36px]">
            <Upload className="w-3.5 h-3.5 mr-1" />
            Subir / Analizar
          </Button>
          <Button size="sm" variant="outline" onClick={() => syncDrive.mutate()} disabled={syncDrive.isPending} className="min-h-[36px]">
            {syncDrive.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Sincronizar Drive
          </Button>
          <Button size="sm" variant="outline" asChild className="min-h-[36px]">
            <a href={DRIVE_FOLDER_URL} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 mr-1" />Abrir en Drive
            </a>
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Buscar archivos..." className="pl-10 min-h-[44px]" />
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-48 min-h-[44px]"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>{areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Files */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (archivos as any[]).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-bold text-foreground mb-2">Carpeta de Drive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecta la carpeta de Google Drive para sincronizar documentos automáticamente.
              Los archivos se organizarán por área/departamento.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
              <Button onClick={() => syncDrive.mutate()} disabled={syncDrive.isPending} className="min-h-[44px]">
                {syncDrive.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Sincronizar Ahora
              </Button>
              <Button variant="outline" asChild className="min-h-[44px]">
                <a href={DRIVE_FOLDER_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />Ver Carpeta en Drive
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Carpeta: /ARIA Dashboard/ — Organizada por empresa y departamento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedByFolder).map(([folder, files]) => (
            <Card key={folder} className="border border-border">
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  {folder}
                  <Badge variant="outline" className="text-[10px]">{files.length} archivos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="space-y-1">
                  {files.map((file: any) => {
                    const Icon = getIcon(file.mimeType);
                    return (
                      <div key={file.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-accent/30 transition-colors">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{file.nombre}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {file.mimeType} {file.tamano ? `· ${(file.tamano / 1024).toFixed(0)} KB` : ""}
                            {file.createdAt && ` · ${new Date(file.createdAt).toLocaleDateString("es-HN")}`}
                          </div>
                        </div>
                        {file.url && (
                          <Button size="sm" variant="ghost" asChild className="min-h-[32px]">
                            <a href={file.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload/Analyze Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4 max-sm:max-h-[90vh] max-sm:overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#C0392B]" />
                Subir y Analizar Documento
              </h3>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowUploadModal(false); setUploadedText(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Sube un archivo (PDF, Word, TXT) o pega texto. El contenido se puede analizar con IA para generar borradores de tareas.
            </p>
            <FileUploadExtractor
              onTextReady={(text) => setUploadedText(text)}
              onFileUploaded={() => utils.archivos.list.invalidate()}
              uploadToS3={true}
              compact
              showPreview={true}
              pastePlaceholder="Pega aquí el contenido del documento para analizar..."
            />
            {uploadedText && (
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => { setShowUploadModal(false); setUploadedText(""); }}>
                  Cerrar
                </Button>
                <Button className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-1" size="sm"
                  onClick={() => handleAnalyzeText(uploadedText)}
                  disabled={generateDrafts.isPending || uploadedText.length < 20}>
                  {generateDrafts.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {generateDrafts.isPending ? "Analizando..." : "Generar borradores de tarea"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
