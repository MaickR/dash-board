import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hola Sindy, soy **ARIA**. Puedo responder preguntas sobre el tablero de control. Por ejemplo:\n- ¿Cuántas tareas tiene pendientes Finanzas?\n- ¿Quién tiene más tareas vencidas?\n- Genera un resumen ejecutivo" },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMut = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, ocurrió un error al procesar tu consulta. Intenta de nuevo." }]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, chatMut.isPending]);

  const handleSend = () => {
    if (!input.trim() || chatMut.isPending) return;
    const msg = input.trim();
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setInput("");
    chatMut.mutate({ message: msg });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="ai-chat-trigger fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#C0392B] text-white shadow-lg hover:bg-[#A93226] transition-all flex items-center justify-center group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </button>
    );
  }

  return (
    <div className="ai-chat-widget fixed z-50 bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden bottom-2 right-2 left-2 sm:left-auto sm:bottom-6 sm:right-6 sm:w-[380px] h-[70vh] sm:h-[520px] rounded-xl sm:rounded-2xl">
      {/* Header */}
      <div className="bg-[#C0392B] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <div>
            <div className="font-semibold text-sm">ARIA — Asistente IA</div>
            <div className="text-[10px] opacity-80">Consultas sobre el tablero</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded"><Minimize2 className="w-4 h-4" /></button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded"><X className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#C0392B] flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
              msg.role === "user"
                ? "bg-[#C0392B] text-white rounded-br-sm"
                : "bg-white border border-gray-200 text-gray-800 rounded-bl-sm"
            }`}>
              {msg.role === "assistant" ? (
                <MarkdownRenderer
                  content={msg.content}
                  className="prose prose-sm max-w-none [&_p]:mb-1 [&_ul]:my-1 [&_li]:my-0"
                />
              ) : msg.content}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}
        {chatMut.isPending && (
          <div className="flex gap-2 items-center">
            <div className="w-7 h-7 rounded-full bg-[#C0392B] flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />Analizando datos...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-3 bg-white flex-shrink-0">
        <div className="flex gap-2">
          <input
            id="ai-chat-input"
            name="aiChatInput"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Pregunta sobre el tablero..."
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C0392B]/30"
            disabled={chatMut.isPending}
          />
          <Button size="sm" className="bg-[#C0392B] hover:bg-[#A93226] text-white px-3" onClick={handleSend} disabled={chatMut.isPending || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="text-[10px] text-gray-400 mt-1 text-center">Powered by GPT-4.1-mini — Datos en tiempo real</div>
      </div>
    </div>
  );
}
