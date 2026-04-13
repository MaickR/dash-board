import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { X, Mail, User, Trash2, Send, CheckCircle2 } from "lucide-react";

type Tarea = {
  id: number;
  area: string;
  tarea: string;
  responsable: string;
  fecha: string;
  status: string;
};

type Responsable = {
  id: number;
  nombre: string;
  area: string;
  email: string | null;
};

interface SendConfirmModalProps {
  tareas: Tarea[];
  responsables: Responsable[];
  onConfirm: (tareaIds: number[]) => void;
  onClose: () => void;
  isSending: boolean;
}

export default function SendConfirmModal({ tareas, responsables, onConfirm, onClose, isSending }: SendConfirmModalProps) {
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set());

  const activeTareas = useMemo(() => tareas.filter(t => !excludedIds.has(t.id)), [tareas, excludedIds]);

  const grouped = useMemo(() => {
    const map: Record<string, { responsable: Responsable | null; tareas: Tarea[] }> = {};
    for (const t of activeTareas) {
      if (!map[t.responsable]) {
        const resp = responsables.find(r => r.nombre === t.responsable) ?? null;
        map[t.responsable] = { responsable: resp, tareas: [] };
      }
      map[t.responsable].tareas.push(t);
    }
    return Object.entries(map).sort((a, b) => b[1].tareas.length - a[1].tareas.length);
  }, [activeTareas, responsables]);

  const totalDestinatarios = grouped.length;
  const conEmail = grouped.filter(([, g]) => g.responsable?.email).length;
  const sinEmail = totalDestinatarios - conEmail;

  const toggleExclude = (id: number) => {
    setExcludedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[640px] md:max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C0392B]/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-[#C0392B]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Confirmar envío de tareas</h2>
              <p className="text-xs text-gray-500">Revisa los destinatarios y tareas antes de enviar</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Summary bar */}
        <div className="px-6 py-3 bg-blue-50 border-b flex items-center gap-4 text-xs">
          <span className="font-semibold text-blue-800">{totalDestinatarios} destinatarios</span>
          <span className="text-blue-600">{activeTareas.length} tareas</span>
          {sinEmail > 0 && (
            <span className="text-amber-600 font-medium">{sinEmail} sin correo</span>
          )}
          {excludedIds.size > 0 && (
            <span className="text-gray-500">{excludedIds.size} excluidas</span>
          )}
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {grouped.map(([nombre, group]) => (
            <div key={nombre} className="border rounded-lg overflow-hidden">
              {/* Responsable header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-[#C0392B]/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-[#C0392B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900">{nombre}</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    {group.responsable?.email ? (
                      <><Mail className="w-3 h-3" /> {group.responsable.email}</>
                    ) : (
                      <span className="text-amber-600">Sin correo registrado</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">{group.tareas.length} tareas</Badge>
              </div>
              {/* Tasks list */}
              <div className="divide-y">
                {group.tareas.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{t.tarea}</p>
                      <p className="text-[10px] text-gray-400">{t.area} · {t.fecha}</p>
                    </div>
                    <button
                      onClick={() => toggleExclude(t.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      title="Quitar de este envío"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Excluded tasks */}
          {excludedIds.size > 0 && (
            <div className="border border-dashed rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-2">Tareas excluidas del envío ({excludedIds.size}):</p>
              <div className="flex flex-wrap gap-1">
                {tareas.filter(t => excludedIds.has(t.id)).map(t => (
                  <Badge
                    key={t.id}
                    variant="outline"
                    className="text-[10px] cursor-pointer hover:bg-green-50"
                    onClick={() => toggleExclude(t.id)}
                  >
                    {t.tarea.substring(0, 30)}... ↩
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancelar
          </Button>
          <Button
            className="bg-[#C0392B] hover:bg-[#a93226] text-white gap-2"
            disabled={activeTareas.length === 0 || isSending}
            onClick={() => onConfirm(activeTareas.map(t => t.id))}
          >
            {isSending ? (
              <>Enviando...</>
            ) : (
              <><Send className="w-4 h-4" /> Confirmar y Enviar ({activeTareas.length} tareas)</>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
