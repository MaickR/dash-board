import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, Check, CheckCheck, X, Filter, Clock, AlertTriangle, CheckCircle2, Mail, ListChecks, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const TIPO_ICONS: Record<string, any> = {
  tarea_vencida: AlertTriangle,
  tarea_completada: CheckCircle2,
  nueva_tarea: ListChecks,
  brief_enviado: Mail,
  acuerdo_pendiente: Clock,
};

const TIPO_COLORS: Record<string, string> = {
  tarea_vencida: "text-red-500",
  tarea_completada: "text-green-500",
  nueva_tarea: "text-blue-500",
  brief_enviado: "text-purple-500",
  acuerdo_pendiente: "text-amber-500",
};

export default function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: notifications } = trpc.notificaciones.list.useQuery();
  const { data: unreadCount } = trpc.notificaciones.unreadCount.useQuery();
  const utils = trpc.useUtils();

  const markReadMut = trpc.notificaciones.markRead.useMutation({
    onSuccess: () => { utils.notificaciones.list.invalidate(); utils.notificaciones.unreadCount.invalidate(); },
  });
  const markAllReadMut = trpc.notificaciones.markAllRead.useMutation({
    onSuccess: () => { utils.notificaciones.list.invalidate(); utils.notificaciones.unreadCount.invalidate(); },
  });
  const deleteMut = trpc.notificaciones.delete.useMutation({
    onSuccess: () => { utils.notificaciones.list.invalidate(); utils.notificaciones.unreadCount.invalidate(); setDeleteConfirm(null); },
  });
  const deleteAllMut = trpc.notificaciones.deleteAll.useMutation({
    onSuccess: () => { utils.notificaciones.list.invalidate(); utils.notificaciones.unreadCount.invalidate(); setDeleteAllConfirm(false); },
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; titulo: string } | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const count = typeof unreadCount === "number" ? unreadCount : (unreadCount as any)?.count ?? 0;

  const filtered = (notifications ?? []).filter((n: any) => {
    if (filter === "unread") return !n.leida;
    return true;
  });

  return (
    <>
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
        <Bell className="w-5 h-5 text-gray-400" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#C0392B] text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 bg-[#1a1a1a] rounded-xl shadow-2xl border border-white/10 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="font-semibold text-sm text-white">Notificaciones</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilter(f => f === "all" ? "unread" : "all")}
                  className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 transition-colors ${
                    filter === "unread" ? "bg-[#C0392B]/20 text-[#C0392B]" : "bg-white/5 text-gray-400 hover:text-white"
                  }`}
                >
                  <Filter className="w-3 h-3" />
                  {filter === "unread" ? "No leídas" : "Todas"}
                </button>
                {count > 0 && (
                  <button onClick={() => markAllReadMut.mutate()} className="text-[10px] text-[#C0392B] hover:underline flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />Marcar todas
                  </button>
                )}
                {(notifications ?? []).length > 0 && (
                  <button onClick={() => setDeleteAllConfirm(true)} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1">
                    <Trash2 className="w-3 h-3" />Limpiar
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p className="text-sm text-gray-500">{filter === "unread" ? "Sin notificaciones no leídas" : "Sin notificaciones"}</p>
                </div>
              ) : (
                filtered.slice(0, 30).map((n: any) => {
                  const Icon = TIPO_ICONS[n.tipo] ?? Bell;
                  const iconColor = TIPO_COLORS[n.tipo] ?? "text-gray-400";
                  return (
                    <div
                      key={n.id}
                      className={`group px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors ${
                        !n.leida ? "bg-[#C0392B]/5" : ""
                      }`}
                      onClick={() => !n.leida && markReadMut.mutate({ id: n.id })}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${iconColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-white">{n.titulo}</span>
                            {!n.leida && <div className="w-2 h-2 rounded-full bg-[#C0392B] flex-shrink-0" />}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.mensaje}</div>
                          <div className="text-[10px] text-gray-600 mt-1">
                            {n.createdAt ? new Date(n.createdAt).toLocaleString("es-HN") : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {!n.leida && (
                            <button
                              onClick={e => { e.stopPropagation(); markReadMut.mutate({ id: n.id }); }}
                              className="p-1.5 hover:bg-white/10 rounded-lg"
                            >
                              <Check className="w-3 h-3 text-gray-500" />
                            </button>
                          )}
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: n.id, titulo: n.titulo }); }}
                            className="p-1.5 hover:bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="w-3 h-3 text-gray-600 hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            {filtered.length > 0 && (
              <div className="px-4 py-2 border-t border-white/10 text-center">
                <span className="text-[10px] text-gray-500">
                  {filtered.length} notificaci{filtered.length !== 1 ? "ones" : "ón"} · {count} sin leer
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
    {/* Delete single notification */}
    <DeleteConfirmModal
      open={!!deleteConfirm}
      onClose={() => setDeleteConfirm(null)}
      onConfirm={() => { if (deleteConfirm) deleteMut.mutate({ id: deleteConfirm.id }); }}
      title="Eliminar notificación"
      recordName={deleteConfirm?.titulo}
      isLoading={deleteMut.isPending}
    />

    {/* Delete all notifications */}
    <DeleteConfirmModal
      open={deleteAllConfirm}
      onClose={() => setDeleteAllConfirm(false)}
      onConfirm={() => deleteAllMut.mutate()}
      title="Limpiar todas las notificaciones"
      description="Se eliminarán todas las notificaciones del sistema."
      isLoading={deleteAllMut.isPending}
    />
    </>
  );
}
