/**
 * TasksContext — Estado global de tareas y reuniones
 * Persiste en localStorage para mantener cambios entre sesiones
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { INITIAL_TASKS, REUNIONES_QUINCENALES, type Task, type TaskStatus } from "@/data/tasks";

export type MeetingStatus = "pendiente" | "realizada" | "cancelada";

export interface MeetingState {
  area: string;
  dia: string;
  hora: string;
  responsable: string;
  status: MeetingStatus;
  hasAyudaMemoria: boolean;
  lastMeetingDate: string | null;
}

interface TasksContextType {
  tasks: Task[];
  meetings: MeetingState[];
  updateTaskStatus: (id: number, status: TaskStatus) => void;
  updateMeetingStatus: (area: string, status: MeetingStatus) => void;
  setMeetingAyudaMemoria: (area: string, has: boolean) => void;
  addTasks: (newTasks: Task[]) => void;
  getTasksByArea: (area: string) => Task[];
  getAreaSemaforo: (area: string) => "verde" | "amarillo" | "rojo";
  getAreaStats: (area: string) => { total: number; completadas: number; pendientes: number; vencidas: number; enProgreso: number; pct: number };
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = "aria_tasks_v2";
const MEETINGS_KEY = "aria_meetings_v1";

function loadTasks(): Task[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error loading tasks from localStorage:", e);
  }
  return INITIAL_TASKS;
}

function loadMeetings(): MeetingState[] {
  try {
    const stored = localStorage.getItem(MEETINGS_KEY);
    if (stored && stored.trim()) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error loading meetings from localStorage:", e);
  }
  return REUNIONES_QUINCENALES.map((r) => ({
    area: r.area,
    dia: r.dia,
    hora: r.hora,
    responsable: r.responsable,
    status: "pendiente" as MeetingStatus,
    hasAyudaMemoria: false,
    lastMeetingDate: null,
  }));
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [meetings, setMeetings] = useState<MeetingState[]>(loadMeetings);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings)); }, [meetings]);

  const updateTaskStatus = useCallback((id: number, status: TaskStatus) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }, []);

  const updateMeetingStatus = useCallback((area: string, status: MeetingStatus) => {
    setMeetings((prev) => prev.map((m) => (m.area === area ? { ...m, status } : m)));
  }, []);

  const setMeetingAyudaMemoria = useCallback((area: string, has: boolean) => {
    setMeetings((prev) => prev.map((m) => (m.area === area ? { ...m, hasAyudaMemoria: has } : m)));
  }, []);

  const addTasks = useCallback((newTasks: Task[]) => {
    setTasks((prev) => {
      const maxId = prev.reduce((max, t) => Math.max(max, t.id), 0);
      const withIds = newTasks.map((t, i) => ({ ...t, id: maxId + i + 1 }));
      return [...prev, ...withIds];
    });
  }, []);

  const getTasksByArea = useCallback((area: string) => {
    return tasks.filter((t) => {
      const normalizedArea = area.toLowerCase();
      const taskArea = t.area.toLowerCase();
      return taskArea.includes(normalizedArea) || normalizedArea.includes(taskArea);
    });
  }, [tasks]);

  const getAreaStats = useCallback((area: string) => {
    const areaTasks = getTasksByArea(area);
    const total = areaTasks.length;
    const completadas = areaTasks.filter((t) => t.status === "completada").length;
    const pendientes = areaTasks.filter((t) => t.status === "pendiente").length;
    const vencidas = areaTasks.filter((t) => t.status === "vencida").length;
    const enProgreso = areaTasks.filter((t) => t.status === "en_progreso").length;
    const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;
    return { total, completadas, pendientes, vencidas, enProgreso, pct };
  }, [getTasksByArea]);

  const getAreaSemaforo = useCallback((area: string): "verde" | "amarillo" | "rojo" => {
    const stats = getAreaStats(area);
    if (stats.total === 0) return "verde";
    if (stats.vencidas > 0) return "rojo";
    if (stats.pct >= 70) return "verde";
    if (stats.pct >= 30) return "amarillo";
    return "rojo";
  }, [getAreaStats]);

  return (
    <TasksContext.Provider value={{
      tasks, meetings, updateTaskStatus, updateMeetingStatus,
      setMeetingAyudaMemoria, addTasks, getTasksByArea,
      getAreaSemaforo, getAreaStats,
    }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
