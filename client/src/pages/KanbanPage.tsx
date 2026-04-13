import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GripVertical, Flag, Clock, CheckCircle2, AlertTriangle, Columns3, Trash2 } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";

const COLUMNS = [
  { key: "pendiente", label: "Pendiente", color: "bg-amber-500", icon: Clock, bgCol: "bg-amber-50 border-amber-200" },
  { key: "en_progreso", label: "En Progreso", color: "bg-blue-500", icon: GripVertical, bgCol: "bg-blue-50 border-blue-200" },
  { key: "completada", label: "Completada", color: "bg-green-500", icon: CheckCircle2, bgCol: "bg-green-50 border-green-200" },
  { key: "vencida", label: "Vencida", color: "bg-red-500", icon: AlertTriangle, bgCol: "bg-red-50 border-red-200" },
] as const;

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "text-red-600 bg-red-50",
  media: "text-amber-600 bg-amber-50",
  baja: "text-gray-500 bg-gray-50",
};

export default function KanbanPage() {
  const { data: tareas } = trpc.tareas.list.useQuery();
  const utils = trpc.useUtils();
  const updateMut = trpc.tareas.update.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); },
  });

  const [filterArea, setFilterArea] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; nombre: string } | null>(null);
  const deleteMut = trpc.tareas.delete.useMutation({
    onSuccess: () => { utils.tareas.list.invalidate(); setDeleteConfirm(null); toast.success("Tarea eliminada"); },
    onError: () => { toast.error("Error al eliminar"); setDeleteConfirm(null); },
  });
  const areas = useMemo(() => {
    const set = new Set((tareas ?? []).map(t => t.area));
    return Array.from(set).sort();
  }, [tareas]);

  const filtered = useMemo(() => {
    let items = (tareas ?? []).filter(t => !t.parentId);
    if (filterArea !== "all") items = items.filter(t => t.area === filterArea);
    return items;
  }, [tareas, filterArea]);

  const getColumnTasks = useCallback((status: string) => {
    if (status === "vencida") {
      const now = Date.now();
      return filtered.filter(t => t.fechaTs && Number(t.fechaTs) < now && t.status !== "completada");
    }
    return filtered.filter(t => t.status === status);
  }, [filtered]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    if (newStatus === "vencida") return; // Can't manually drag to vencida
    const taskId = parseInt(draggableId.replace("task-", ""));
    if (isNaN(taskId)) return;
    updateMut.mutate({ id: taskId, status: newStatus as any }, {
      onSuccess: () => toast.success(`Tarea movida a "${COLUMNS.find(c => c.key === newStatus)?.label}"`),
    });
  }, [updateMut]);

  const moveTask = (taskId: number, newStatus: string) => {
    updateMut.mutate({ id: taskId, status: newStatus as any }, {
      onSuccess: () => toast.success("Tarea actualizada"),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-[#C0392B]" />
            Vista Kanban
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Arrastra tareas entre columnas para cambiar su estado</p>
        </div>
        <Select value={filterArea} onValueChange={setFilterArea}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Filtrar por área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las áreas</SelectItem>
            {areas.map(a => a ? <SelectItem key={a} value={a}>{a}</SelectItem> : null)}
          </SelectContent>
        </Select>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[70vh]">
          {COLUMNS.map(col => {
            const colTasks = getColumnTasks(col.key);
            return (
              <Droppable droppableId={col.key} key={col.key}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border ${col.bgCol} p-3 transition-colors ${
                      snapshot.isDraggingOver ? "ring-2 ring-[#C0392B]/30 bg-opacity-80" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-3 h-3 rounded-full ${col.color}`} />
                      <span className="font-semibold text-sm text-foreground">{col.label}</span>
                      <Badge variant="outline" className="ml-auto text-xs">{colTasks.length}</Badge>
                    </div>
                    <div className="space-y-2 max-h-[65vh] overflow-y-auto pr-1">
                      {colTasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="text-center py-8 text-muted-foreground text-xs border-2 border-dashed border-gray-200 rounded-lg">
                          {col.key === "vencida" ? "Sin tareas vencidas" : "Arrastra tareas aquí"}
                        </div>
                      )}
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}
                          isDragDisabled={col.key === "vencida"}>
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                            >
                              <Card className={`border border-white/80 shadow-sm hover:shadow-md transition-shadow cursor-grab bg-white ${
                                dragSnapshot.isDragging ? "shadow-lg ring-2 ring-[#C0392B]/20 rotate-1" : ""
                              }`}>
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    <GripVertical className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-sm text-gray-900 line-clamp-2">{task.nombre || task.tarea}</div>
                                      {task.nombre && task.tarea !== task.nombre && (
                                        <div className="text-xs text-gray-500 mt-1 line-clamp-1">{task.tarea}</div>
                                      )}
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {task.area && <Badge variant="outline" className="text-[10px]">{task.area}</Badge>}
                                        <span className="text-[10px] text-gray-500">{task.responsable}</span>
                                      </div>
                                      <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center gap-1">
                                          <Flag className={`w-3 h-3 ${PRIORIDAD_COLORS[task.prioridad ?? "media"]}`} />
                                          <span className="text-[10px] text-gray-500">{task.fecha}</span>
                                        </div>
                                        {task.avance !== undefined && task.avance > 0 && (
                                          <span className="text-[10px] font-medium text-blue-600">{task.avance}%</span>
                                        )}
                                      </div>
                                      {/* Quick move buttons for mobile */}
                                      <div className="flex gap-1 mt-2 md:hidden">
                                        {COLUMNS.filter(c => c.key !== col.key && c.key !== "vencida").map(target => (
                                          <button key={target.key}
                                            className={`text-[9px] px-2 py-0.5 rounded-full border hover:opacity-80 ${target.bgCol}`}
                                            onClick={e => { e.stopPropagation(); moveTask(task.id, target.key); }}>
                                            → {target.label}
                                          </button>
                                        ))}
                                        <button
                                          className="text-[9px] px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-600 hover:opacity-80"
                                          onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: task.id, nombre: task.nombre ?? task.tarea ?? `Tarea #${task.id}` }); }}>
                                          Eliminar
                                        </button>
                                      </div>
                                    </div>
                                    <button
                                      className="hidden md:flex opacity-0 group-hover:opacity-100 absolute top-2 right-2 text-gray-400 hover:text-red-500 p-1 rounded transition-opacity"
                                      onClick={e => { e.stopPropagation(); setDeleteConfirm({ id: task.id, nombre: task.nombre ?? task.tarea ?? `Tarea #${task.id}` }); }}
                                      title="Eliminar tarea"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      <DeleteConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => { if (deleteConfirm) deleteMut.mutate({ id: deleteConfirm.id }); }}
        title="Eliminar tarea"
        recordName={deleteConfirm?.nombre}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
