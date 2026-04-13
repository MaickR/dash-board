/**
 * CorreosPage — Bandeja de Correo Outlook
 * Sincronización real con MCP outlook-mail
 * Diseño: Corporate Command Center, colores CAP (#C0392B, #1a1a1a)
 */
import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail, RefreshCw, Search, Send, Reply, X, Paperclip,
  Inbox, MailOpen, Plus, ChevronLeft, Clock,
  AlertCircle, ClipboardList,
} from "lucide-react";

type EmailMessage = {
  id: string;
  subject: string;
  from: string;
  fromEmail: string;
  to: { name: string; email: string }[];
  cc: { name: string; email: string }[];
  date: string;
  bodyPreview: string;
  bodyHtml: string;
  isRead: boolean;
  hasAttachments: boolean;
  importance: string;
  webLink: string;
};

type FilterType = "all" | "unread" | "attachments";

export default function CorreosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [composerTo, setComposerTo] = useState("");
  const [composerCc, setComposerCc] = useState("");
  const [composerSubject, setComposerSubject] = useState("");
  const [composerBody, setComposerBody] = useState("");

  // Fetch emails from Outlook via MCP
  const { data: emailData, isLoading, refetch, isFetching } = trpc.outlookMail.search.useQuery(
    { maxResults: 50 },
    { refetchInterval: 5 * 60 * 1000, staleTime: 2 * 60 * 1000 }
  );

  // Send email mutation
  const sendMutation = trpc.outlookMail.send.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Correo enviado exitosamente");
        resetComposer();
        refetch();
      } else {
        toast.error(`Error al enviar: ${data.error}`);
      }
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Reply mutation
  const replyMutation = trpc.outlookMail.reply.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Respuesta enviada");
        setShowReply(false);
        resetComposer();
        refetch();
      } else {
        toast.error(`Error al responder: ${data.error}`);
      }
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // Create task from email mutation
  const createTareaMutation = trpc.tareas.create.useMutation({
    onSuccess: () => {
      toast.success("Tarea creada desde correo");
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const messages = emailData?.messages ?? [];

  // Filter and search
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    if (activeFilter === "unread") filtered = filtered.filter(m => !m.isRead);
    if (activeFilter === "attachments") filtered = filtered.filter(m => m.hasAttachments);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.subject.toLowerCase().includes(q) ||
        m.from.toLowerCase().includes(q) ||
        m.fromEmail.toLowerCase().includes(q) ||
        m.bodyPreview.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [messages, activeFilter, searchQuery]);

  const resetComposer = useCallback(() => {
    setShowComposer(false);
    setShowReply(false);
    setComposerTo("");
    setComposerCc("");
    setComposerSubject("");
    setComposerBody("");
  }, []);

  const handleSend = () => {
    if (!composerTo.trim() || !composerSubject.trim() || !composerBody.trim()) {
      toast.error("Complete todos los campos requeridos");
      return;
    }
    const toList = composerTo.split(",").map(e => e.trim()).filter(Boolean);
    const ccList = composerCc ? composerCc.split(",").map(e => e.trim()).filter(Boolean) : [];
    sendMutation.mutate({ to: toList, cc: ccList, subject: composerSubject, content: composerBody });
  };

  const handleReply = () => {
    if (!selectedEmail || !composerBody.trim()) return;
    const toList = [selectedEmail.fromEmail];
    replyMutation.mutate({
      to: toList,
      subject: composerSubject || `Re: ${selectedEmail.subject}`,
      content: composerBody,
    });
  };

  const handleCreateTask = (email: EmailMessage) => {
    const today = new Date();
    const twoWeeks = new Date(today.getTime() + 14 * 86400000);
    const fechaStr = `${twoWeeks.getDate().toString().padStart(2, "0")}/${(twoWeeks.getMonth() + 1).toString().padStart(2, "0")}/${twoWeeks.getFullYear()}`;
    createTareaMutation.mutate({
      nombre: email.subject,
      descripcion: email.bodyPreview,
      area: "General",
      tarea: email.bodyPreview || email.subject,
      responsable: "Sin asignar",
      fecha: fechaStr,
      prioridad: email.importance === "high" ? "alta" : "media",
      status: "pendiente",
      source: "correo_outlook",
    });
  };

  const openReply = (email: EmailMessage) => {
    setSelectedEmail(email);
    setShowReply(true);
    setComposerTo(email.fromEmail);
    setComposerSubject(`Re: ${email.subject}`);
    setComposerBody("");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) return d.toLocaleTimeString("es-HN", { hour: "2-digit", minute: "2-digit" });
      return d.toLocaleDateString("es-HN", { day: "2-digit", month: "short" });
    } catch {
      return dateStr;
    }
  };

  const formatFullDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("es-HN", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const unreadCount = messages.filter((m: EmailMessage) => !m.isRead).length;
  const attachmentCount = messages.filter((m: EmailMessage) => m.hasAttachments).length;

  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#111111]">
      {/* Email List Panel */}
      <div className={`${selectedEmail ? "hidden lg:flex" : "flex"} flex-col w-full lg:w-[420px] border-r border-white/[0.06] bg-[#141414]`}>
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-[#C0392B]" />
              <h2 className="text-white font-semibold text-lg">Correo Outlook</h2>
              {unreadCount > 0 && (
                <Badge className="bg-[#C0392B] text-white text-xs">{unreadCount}</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="sm"
                onClick={() => { resetComposer(); setShowComposer(true); setSelectedEmail(null); }}
                className="text-gray-400 hover:text-white hover:bg-white/[0.06]"
              >
                <Plus className="w-4 h-4 mr-1" /> Nuevo
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-gray-400 hover:text-white hover:bg-white/[0.06]"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por remitente o asunto..."
              className="pl-9 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500 h-9 text-sm"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {([
              { key: "all" as FilterType, label: "Todos", icon: Inbox, count: messages.length },
              { key: "unread" as FilterType, label: "No leídos", icon: MailOpen, count: unreadCount },
              { key: "attachments" as FilterType, label: "Adjuntos", icon: Paperclip, count: attachmentCount },
            ]).map(f => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeFilter === f.key
                    ? "bg-[#C0392B]/20 text-[#C0392B]"
                    : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
                }`}
              >
                <f.icon className="w-3.5 h-3.5" />
                {f.label}
                {f.count > 0 && <span className="text-[10px] opacity-70">({f.count})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-[#C0392B]/50" />
              <p className="text-sm">Cargando correos de Outlook...</p>
            </div>
          ) : emailData?.error ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-6">
              <AlertCircle className="w-8 h-8 mb-3 text-red-400" />
              <p className="text-sm text-center">Error al cargar correos: {emailData.error}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3 text-xs">
                Reintentar
              </Button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Mail className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">No hay correos{searchQuery ? " que coincidan" : ""}</p>
            </div>
          ) : (
            filteredMessages.map((email) => (
              <button
                key={email.id}
                onClick={() => { setSelectedEmail(email); setShowComposer(false); setShowReply(false); }}
                className={`w-full text-left p-4 border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                  selectedEmail?.id === email.id ? "bg-white/[0.06]" : ""
                } ${!email.isRead ? "bg-white/[0.02]" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    !email.isRead ? "bg-[#C0392B] text-white" : "bg-white/[0.08] text-gray-400"
                  }`}>
                    {email.from.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-sm truncate ${!email.isRead ? "font-semibold text-white" : "text-gray-300"}`}>
                        {email.from}
                      </span>
                      <span className="text-[11px] text-gray-500 ml-2 flex-shrink-0">{formatDate(email.date)}</span>
                    </div>
                    <div className={`text-sm truncate mb-1 ${!email.isRead ? "font-medium text-gray-200" : "text-gray-400"}`}>
                      {email.subject}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{email.bodyPreview.slice(0, 100)}</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {email.importance === "high" && (
                        <Badge className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0">Urgente</Badge>
                      )}
                      {email.hasAttachments && (
                        <Paperclip className="w-3 h-3 text-gray-500" />
                      )}
                      {!email.isRead && (
                        <div className="w-2 h-2 rounded-full bg-[#C0392B]" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Auto-sync indicator */}
        <div className="p-2 border-t border-white/[0.06] text-center">
          <span className="text-[10px] text-gray-600">
            <Clock className="w-3 h-3 inline mr-1" />
            Sincronización automática cada 5 min
          </span>
        </div>
      </div>

      {/* Email Detail / Composer Panel */}
      <div className={`${!selectedEmail && !showComposer ? "hidden lg:flex" : "flex"} flex-col flex-1 bg-[#111111]`}>
        {showComposer ? (
          /* Composer */
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <h3 className="text-white font-semibold">Nuevo correo</h3>
              <Button variant="ghost" size="icon" onClick={resetComposer} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Para *</label>
                <Input
                  value={composerTo}
                  onChange={(e) => setComposerTo(e.target.value)}
                  placeholder="correo@ejemplo.com (separar con comas)"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">CC</label>
                <Input
                  value={composerCc}
                  onChange={(e) => setComposerCc(e.target.value)}
                  placeholder="correo@ejemplo.com (opcional)"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Asunto *</label>
                <Input
                  value={composerSubject}
                  onChange={(e) => setComposerSubject(e.target.value)}
                  placeholder="Asunto del correo"
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Mensaje *</label>
                <Textarea
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder="Escriba su mensaje aquí..."
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500 min-h-[300px] resize-none"
                />
              </div>
            </div>
            <div className="p-4 border-t border-white/[0.06] flex justify-end gap-2">
              <Button variant="outline" onClick={resetComposer} className="text-gray-400 border-white/[0.1]">
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending}
                className="bg-[#C0392B] hover:bg-[#a93226] text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMutation.isPending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>
        ) : selectedEmail ? (
          /* Email Detail */
          <div className="flex flex-col h-full">
            {/* Detail Header */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <Button
                  variant="ghost" size="icon"
                  onClick={() => { setSelectedEmail(null); setShowReply(false); }}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <h3 className="text-white font-semibold text-lg flex-1">{selectedEmail.subject}</h3>
                {selectedEmail.importance === "high" && (
                  <Badge className="bg-red-500/20 text-red-400">Urgente</Badge>
                )}
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C0392B] flex items-center justify-center text-white font-bold">
                  {selectedEmail.from.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{selectedEmail.from}</span>
                      <span className="text-gray-500 text-sm ml-2">&lt;{selectedEmail.fromEmail}&gt;</span>
                    </div>
                    <span className="text-gray-500 text-xs">{formatFullDate(selectedEmail.date)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Para: {selectedEmail.to.map(t => t.name || t.email).join(", ")}
                    {selectedEmail.cc.length > 0 && (
                      <> | CC: {selectedEmail.cc.map(c => c.name || c.email).join(", ")}</>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedEmail.bodyHtml ? (
                <div
                  className="prose prose-invert prose-sm max-w-none [&_*]:!text-gray-300 [&_a]:!text-[#C0392B]"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.bodyHtml }}
                />
              ) : (
                <p className="text-gray-300 whitespace-pre-wrap">{selectedEmail.bodyPreview}</p>
              )}
            </div>

            {/* Reply area */}
            {showReply ? (
              <div className="border-t border-white/[0.06] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Respondiendo a {selectedEmail.from}</span>
                  <Button variant="ghost" size="icon" onClick={() => setShowReply(false)} className="text-gray-400">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  placeholder="Escriba su respuesta..."
                  className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-500 min-h-[120px] resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowReply(false)} className="text-gray-400 border-white/[0.1]">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleReply}
                    disabled={replyMutation.isPending}
                    className="bg-[#C0392B] hover:bg-[#a93226] text-white"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    {replyMutation.isPending ? "Enviando..." : "Enviar respuesta"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/[0.06] p-3 flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => openReply(selectedEmail)}
                  className="text-gray-300 border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <Reply className="w-4 h-4 mr-1" /> Responder
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => handleCreateTask(selectedEmail)}
                  disabled={createTareaMutation.isPending}
                  className="text-gray-300 border-white/[0.1] hover:bg-white/[0.04]"
                >
                  <ClipboardList className="w-4 h-4 mr-1" />
                  {createTareaMutation.isPending ? "Creando..." : "Crear tarea"}
                </Button>
                {selectedEmail.webLink && (
                  <Button
                    variant="outline" size="sm"
                    onClick={() => window.open(selectedEmail.webLink, "_blank")}
                    className="text-gray-300 border-white/[0.1] hover:bg-white/[0.04] ml-auto"
                  >
                    Abrir en Outlook
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Mail className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg font-medium text-gray-400">Seleccione un correo</p>
            <p className="text-sm mt-1">O redacte uno nuevo</p>
          </div>
        )}
      </div>
    </div>
  );
}
