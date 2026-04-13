import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Loader2, CheckCircle2, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

type FileUploadExtractorProps = {
  /** Called when text is ready (either extracted from file or pasted) */
  onTextReady: (text: string, source: "file" | "paste", filename?: string) => void;
  /** Called when file is uploaded to S3 (optional, for modules that need the URL) */
  onFileUploaded?: (data: { url: string; filename: string; extractedText: string }) => void;
  /** Area context for file upload */
  area?: string;
  /** Reunion context for file upload */
  reunion?: string;
  /** Reunion ID for linking */
  reunionId?: number;
  /** Whether to upload to S3 (true) or just extract text (false) */
  uploadToS3?: boolean;
  /** Placeholder text for the paste textarea */
  pastePlaceholder?: string;
  /** Compact mode for embedding in small modals */
  compact?: boolean;
  /** Show the extracted text preview */
  showPreview?: boolean;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.text";
const MAX_SIZE_MB = 16;

export default function FileUploadExtractor({
  onTextReady,
  onFileUploaded,
  area,
  reunion,
  reunionId,
  uploadToS3 = false,
  pastePlaceholder = "Pega aquí el contenido del acta de reunión, ayuda memoria, o transcripción...",
  compact = false,
  showPreview = true,
}: FileUploadExtractorProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "paste">("upload");
  const [pasteText, setPasteText] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [extractedFilename, setExtractedFilename] = useState("");
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const extractText = trpc.files.extractText.useMutation();
  const uploadAndExtract = trpc.files.uploadAndExtract.useMutation();

  const handleFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Archivo demasiado grande (máx ${MAX_SIZE_MB}MB)`);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["pdf", "doc", "docx", "txt", "text"].includes(ext)) {
      toast.error("Formato no soportado. Use PDF, Word (.docx) o texto (.txt)");
      return;
    }

    setProcessing(true);
    try {
      const base64 = await fileToBase64(file);

      if (uploadToS3) {
        const result = await uploadAndExtract.mutateAsync({
          base64,
          filename: file.name,
          mimeType: file.type || undefined,
          area: area || undefined,
          reunion: reunion || undefined,
          reunionId: reunionId || undefined,
        });
        const text = result.extractedText || "";
        setExtractedText(text);
        setExtractedFilename(file.name);
        if (text) {
          onTextReady(text, "file", file.name);
          toast.success(`Texto extraído de "${file.name}" (${result.charCount} caracteres)`);
        } else {
          toast.warning(`Archivo "${file.name}" subido pero no se pudo extraer texto`);
        }
        onFileUploaded?.({ url: "url" in result ? result.url : "", filename: file.name, extractedText: text });
      } else {
        const result = await extractText.mutateAsync({
          base64,
          filename: file.name,
          mimeType: file.type || undefined,
        });
        setExtractedText(result.text);
        setExtractedFilename(file.name);
        if (result.text && !result.text.startsWith("[")) {
          onTextReady(result.text, "file", file.name);
          toast.success(`Texto extraído de "${file.name}" (${result.charCount} caracteres)`);
        } else {
          toast.warning(result.text || "No se pudo extraer texto del archivo");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Error al procesar archivo");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [uploadToS3, area, reunion, reunionId, onTextReady, onFileUploaded, extractText, uploadAndExtract]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePasteSubmit = () => {
    if (!pasteText.trim()) {
      toast.error("Pega contenido primero");
      return;
    }
    setExtractedText(pasteText.trim());
    onTextReady(pasteText.trim(), "paste");
    toast.success(`Texto recibido (${pasteText.trim().length} caracteres)`);
  };

  const clearExtracted = () => {
    setExtractedText("");
    setExtractedFilename("");
    setPasteText("");
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "paste")}>
        <TabsList className={`grid w-full grid-cols-2 ${compact ? "h-8" : ""}`}>
          <TabsTrigger value="upload" className={compact ? "text-xs h-7" : "text-sm"}>
            <Upload className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1.5`} />
            Subir archivo
          </TabsTrigger>
          <TabsTrigger value="paste" className={compact ? "text-xs h-7" : "text-sm"}>
            <ClipboardPaste className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} mr-1.5`} />
            Pegar texto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <div
            className={`border-2 border-dashed rounded-lg transition-colors text-center ${
              dragOver ? "border-[#C0392B] bg-[#C0392B]/5" : "border-border hover:border-[#C0392B]/50"
            } ${compact ? "p-4" : "p-6"}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            {processing ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-[#C0392B] animate-spin" />
                <p className="text-sm text-muted-foreground">Extrayendo texto del archivo...</p>
              </div>
            ) : (
              <>
                <Upload className={`mx-auto text-muted-foreground mb-2 ${compact ? "w-6 h-6" : "w-8 h-8"}`} />
                <p className={`text-muted-foreground mb-3 ${compact ? "text-xs" : "text-sm"}`}>
                  Arrastra un archivo o haz clic para seleccionar
                </p>
                <p className="text-[10px] text-muted-foreground mb-3">
                  PDF, Word (.docx), texto (.txt) — Máx {MAX_SIZE_MB}MB
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                  className="hidden"
                />
                <Button
                  size={compact ? "sm" : "default"}
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  Seleccionar archivo
                </Button>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="paste" className="mt-3 space-y-3">
          <Textarea
            placeholder={pastePlaceholder}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={compact ? 6 : 8}
            className="text-sm resize-y"
          />
          <Button
            onClick={handlePasteSubmit}
            disabled={!pasteText.trim()}
            className="w-full bg-[#C0392B] hover:bg-[#a93226] text-white"
            size={compact ? "sm" : "default"}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Usar este texto
          </Button>
        </TabsContent>
      </Tabs>

      {/* Extracted text preview */}
      {showPreview && extractedText && !extractedText.startsWith("[") && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs font-medium text-green-800">
                {extractedFilename ? `Texto de "${extractedFilename}"` : "Texto recibido"}
                {" "}({extractedText.length} caracteres)
              </span>
            </div>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={clearExtracted}>
              <X className="w-3 h-3 text-green-600" />
            </Button>
          </div>
          <div className="text-xs text-green-700 whitespace-pre-wrap max-h-32 overflow-y-auto bg-white/50 rounded p-2">
            {extractedText.slice(0, 500)}{extractedText.length > 500 ? "..." : ""}
          </div>
        </div>
      )}
    </div>
  );
}
