/**
 * FASE 2 — Procesamiento Post-Reunión
 * - Seleccionar área de la reunión
 * - Pegar o cargar transcripción
 * - Botón "Procesar con IA" que extrae tareas
 * - Tareas con nombre en NEGRITA
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cpu, Upload, FileText, Sparkles, CheckCircle2, Plus,
  CalendarDays, User, ClipboardPaste, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useTasks } from "@/contexts/TasksContext";
import { REUNIONES_QUINCENALES, AREA_COLORS, type Task, type TaskStatus } from "@/data/tasks";

// Simulated AI extraction — in production this would call an API
function extractTasksFromTranscription(text: string, area: string): Omit<Task, "id">[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const tasks: Omit<Task, "id">[] = [];
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const formatDate = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  // Simple heuristic: look for action-oriented sentences
  const actionKeywords = [
    "hay que", "necesitamos", "se debe", "debemos", "vamos a", "tiene que",
    "revisar", "enviar", "preparar", "coordinar", "contactar", "gestionar",
    "solicitar", "verificar", "confirmar", "implementar", "definir", "elaborar",
    "programar", "agendar", "completar", "actualizar", "crear", "diseñar",
  ];

  const sentences: string[] = [];
  for (const line of lines) {
    const parts = line.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    sentences.push(...parts);
  }

  let count = 0;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const isAction = actionKeywords.some((kw) => lower.includes(kw));
    if (isAction && count < 12) {
      const trimmed = sentence.trim();
      // Try to extract a responsible person
      const nameMatch = trimmed.match(/(?:(?:que|para)\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)/);
      const responsable = nameMatch ? nameMatch[1] : "Por asignar";

      tasks.push({
        area,
        tarea: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        responsable,
        fecha: formatDate(nextWeek),
        propuesta: [
          "Definir alcance y criterios de aceptación",
          "Ejecutar la tarea según los lineamientos acordados",
          "Reportar avance y resultado a gerencia",
        ],
        status: "pendiente" as TaskStatus,
        source: "procesamiento",
        reunion: `${area} ${formatDate(today)}`,
      });
      count++;
    }
  }

  // If no tasks found from heuristics, create at least a few from the longest sentences
  if (tasks.length === 0) {
    const sorted = sentences.sort((a, b) => b.length - a.length).slice(0, 3);
    for (const s of sorted) {
      tasks.push({
        area,
        tarea: s.trim().charAt(0).toUpperCase() + s.trim().slice(1),
        responsable: "Por asignar",
        fecha: formatDate(nextWeek),
        propuesta: [
          "Definir alcance y criterios de aceptación",
          "Ejecutar la tarea según los lineamientos acordados",
          "Reportar avance y resultado a gerencia",
        ],
        status: "pendiente" as TaskStatus,
        source: "procesamiento",
        reunion: `${area} ${formatDate(today)}`,
      });
    }
  }

  return tasks;
}

function ExtractedTaskCard({ task, index, onEdit }: {
  task: Omit<Task, "id">;
  index: number;
  onEdit: (index: number, field: string, value: string) => void;
}) {
  const areaColor = AREA_COLORS[task.area] || "#C0392B";
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-white/[0.06] bg-[#1a1a1a] p-3"
    >
      <div className="flex items-start gap-3">
        <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: areaColor }} />
        <div className="flex-1 min-w-0 space-y-2">
          {/* Task name in BOLD */}
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tarea</span>
            {editing === "tarea" ? (
              <input
                autoFocus
                className="w-full bg-white/[0.06] border border-white/[0.12] rounded px-2 py-1 text-sm text-white mt-0.5"
                defaultValue={task.tarea}
                onBlur={(e) => { onEdit(index, "tarea", e.target.value); setEditing(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { onEdit(index, "tarea", (e.target as HTMLInputElement).value); setEditing(null); } }}
              />
            ) : (
              <p className="text-sm text-white font-bold leading-snug cursor-pointer hover:text-[#C0392B] transition-colors"
                onClick={() => setEditing("tarea")}>
                {task.tarea}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Responsible */}
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <User className="w-2.5 h-2.5" /> Responsable
              </span>
              {editing === "responsable" ? (
                <input
                  autoFocus
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded px-2 py-1 text-xs text-white mt-0.5"
                  defaultValue={task.responsable}
                  onBlur={(e) => { onEdit(index, "responsable", e.target.value); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { onEdit(index, "responsable", (e.target as HTMLInputElement).value); setEditing(null); } }}
                />
              ) : (
                <p className="text-xs text-gray-300 cursor-pointer hover:text-white transition-colors mt-0.5"
                  onClick={() => setEditing("responsable")}>
                  {task.responsable}
                </p>
              )}
            </div>

            {/* Date */}
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <CalendarDays className="w-2.5 h-2.5" /> Fecha de entrega
              </span>
              {editing === "fecha" ? (
                <input
                  autoFocus
                  className="w-full bg-white/[0.06] border border-white/[0.12] rounded px-2 py-1 text-xs text-white font-mono mt-0.5"
                  defaultValue={task.fecha}
                  placeholder="DD/MM/YYYY"
                  onBlur={(e) => { onEdit(index, "fecha", e.target.value); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { onEdit(index, "fecha", (e.target as HTMLInputElement).value); setEditing(null); } }}
                />
              ) : (
                <p className="text-xs text-gray-300 font-mono cursor-pointer hover:text-white transition-colors mt-0.5"
                  onClick={() => setEditing("fecha")}>
                  {task.fecha}
                </p>
              )}
            </div>
          </div>

          {/* Propuesta */}
          <div>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Propuesta de ejecución</span>
            <ol className="mt-1 space-y-0.5">
              {task.propuesta.map((p, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-400">
                  <span className="text-[#C0392B] font-mono font-bold">{i + 1}.</span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function PostReunion() {
  const { addTasks, setMeetingAyudaMemoria } = useTasks();
  const [selectedArea, setSelectedArea] = useState("");
  const [transcription, setTranscription] = useState("");
  const [processing, setProcessing] = useState(false);
  const [extractedTasks, setExtractedTasks] = useState<Omit<Task, "id">[]>([]);
  const [saved, setSaved] = useState(false);

  const handleProcess = () => {
    if (!selectedArea) { toast.error("Selecciona un área primero"); return; }
    if (!transcription.trim()) { toast.error("Pega la transcripción de la reunión"); return; }

    setProcessing(true);
    setSaved(false);

    // Simulate AI processing delay
    setTimeout(() => {
      const tasks = extractTasksFromTranscription(transcription, selectedArea);
      setExtractedTasks(tasks);
      setProcessing(false);
      toast.success(`${tasks.length} tareas extraídas de la transcripción`);
    }, 2000);
  };

  const handleEditTask = (index: number, field: string, value: string) => {
    setExtractedTasks((prev) => {
      const updated = [...prev];
      (updated[index] as any)[field] = value;
      return updated;
    });
  };

  const handleSaveTasks = () => {
    if (extractedTasks.length === 0) return;
    addTasks(extractedTasks as Task[]);
    setMeetingAyudaMemoria(selectedArea, true);
    setSaved(true);
    toast.success(`${extractedTasks.length} tareas guardadas en el sistema`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setTranscription(ev.target?.result as string);
      toast.success(`Archivo "${file.name}" cargado`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Cpu className="w-5 h-5 text-[#C0392B]" />
          <h2 className="text-lg font-bold text-white">Procesamiento Post-Reunión</h2>
        </div>
        <p className="text-xs text-gray-500">
          Pega o carga la transcripción de la reunión. El sistema extraerá tareas automáticamente con IA.
        </p>
      </div>

      {/* Step 1: Select area */}
      <div className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#C0392B] text-white text-[10px] font-bold flex items-center justify-center">1</span>
          Seleccionar reunión
        </h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {REUNIONES_QUINCENALES.map((r) => {
            const color = AREA_COLORS[r.area] || "#C0392B";
            const isSelected = selectedArea === r.area;
            return (
              <button
                key={r.area}
                onClick={() => setSelectedArea(r.area)}
                className={`p-2 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-[#C0392B]/50 bg-[#C0392B]/10"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div className="w-2 h-2 rounded-full mb-1.5" style={{ backgroundColor: color }} />
                <div className="text-[11px] font-semibold text-white leading-tight">{r.area}</div>
                <div className="text-[9px] text-gray-500 mt-0.5">{r.dia} {r.hora.split("-")[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Paste or upload transcription */}
      <div className="rounded-xl border border-white/[0.06] bg-[#1a1a1a] p-4">
        <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-[#C0392B] text-white text-[10px] font-bold flex items-center justify-center">2</span>
          Transcripción de la reunión
        </h3>

        <div className="flex items-center gap-2 mb-3">
          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            Cargar archivo .txt
            <input type="file" accept=".txt,.md,.doc,.docx" className="hidden" onChange={handleFileUpload} />
          </label>
          <button
            onClick={() => navigator.clipboard.readText().then(setTranscription).catch(() => toast.error("No se pudo acceder al portapapeles"))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:text-white transition-colors"
          >
            <ClipboardPaste className="w-3.5 h-3.5" />
            Pegar del portapapeles
          </button>
        </div>

        <textarea
          value={transcription}
          onChange={(e) => setTranscription(e.target.value)}
          placeholder="Pega aquí la transcripción completa de la reunión..."
          className="w-full h-48 md:h-64 bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-[#C0392B]/30 resize-none font-mono leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-600">
            {transcription.length > 0 ? `${transcription.length.toLocaleString()} caracteres` : "Sin contenido"}
          </span>
        </div>
      </div>

      {/* Step 3: Process */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleProcess}
          disabled={processing || !selectedArea || !transcription.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C0392B] text-white text-sm font-semibold hover:bg-[#a93226] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-900/20"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Procesando con IA...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Procesar con IA
            </>
          )}
        </button>

        {extractedTasks.length > 0 && !saved && (
          <button
            onClick={handleSaveTasks}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            Guardar {extractedTasks.length} tareas
          </button>
        )}

        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-1.5 text-green-400 text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" />
            Tareas guardadas exitosamente
          </motion.div>
        )}
      </div>

      {/* Extracted tasks */}
      <AnimatePresence>
        {extractedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <h3 className="text-xs uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-[#C0392B] text-white text-[10px] font-bold flex items-center justify-center">3</span>
              Tareas extraídas ({extractedTasks.length})
              <span className="text-[10px] text-gray-600 ml-2">Haz clic en cualquier campo para editar</span>
            </h3>
            <div className="space-y-2">
              {extractedTasks.map((task, i) => (
                <ExtractedTaskCard key={i} task={task} index={i} onEdit={handleEditTask} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
