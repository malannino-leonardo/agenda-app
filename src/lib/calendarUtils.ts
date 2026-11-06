import type React from 'react';
import { Task, TaskPriority, TaskStatus } from '../types';

export const HOUR_HEIGHT = 56; // px per hour row in timeline views
export const HOURS = Array.from({ length: 24 }, (_, i) => i);
export const DEFAULT_DURATION = 60; // minutes, used when a task has no explicit duration
export const DEFAULT_CALENDAR_COLOR = '#6366f1';

// ---------------------------------------------------------------------------
// Dates (all in the viewer's local timezone; tasks store a date key + HH:MM)
// ---------------------------------------------------------------------------

export const formatDateKey = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** Parse a YYYY-MM-DD key as a local-midnight Date (never shifts day across timezones). */
export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const taskDateKey = (task: Pick<Task, 'due_date'>): string | null =>
  task.due_date ? task.due_date.split('T')[0] : null;

export const timeToMinutes = (time?: string | null): number | null => {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
};

export const minutesToTime = (minutes: number): string => {
  const clamped = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const formatTimeLabel = (time: string | null | undefined, locale: string): string => {
  const mins = timeToMinutes(time);
  if (mins === null) return '';
  const d = new Date(2000, 0, 1, Math.floor(mins / 60), mins % 60);
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

export const getWeekDays = (anchor: Date, todayKey: string) => {
  const dayOfWeek = anchor.getDay();
  const diffToMon = (dayOfWeek + 6) % 7;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - diffToMon);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateKey = formatDateKey(date);
    return { date, dateKey, isToday: dateKey === todayKey };
  });
};

export const getMonthGrid = (anchor: Date, todayKey: string) => {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  return Array.from({ length: totalCells }, (_, i) => {
    const date = new Date(year, month, 1 - startOffset + i);
    const dateKey = formatDateKey(date);
    return { date, dateKey, isCurrentMonth: date.getMonth() === month, isToday: dateKey === todayKey };
  });
};

// ---------------------------------------------------------------------------
// Colors
// ---------------------------------------------------------------------------

export const hexToRgba = (hex: string, alpha: number): string => {
  let c = (hex || '').replace('#', '');
  if (c.length === 3) c = c.split('').map((ch) => ch + ch).join('');
  const num = parseInt(c, 16);
  if (isNaN(num) || c.length !== 6) return `rgba(99, 102, 241, ${alpha})`;
  return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
};

export const priorityDotClass = (priority: TaskPriority): string =>
  priority === 'high' ? 'bg-rose-400' : priority === 'low' ? 'bg-emerald-400/80' : 'bg-amber-400';

export const priorityTextClass = (priority: TaskPriority): string =>
  priority === 'high' ? 'text-rose-400' : priority === 'low' ? 'text-emerald-400' : 'text-amber-400';

export interface TaskAppearance {
  style: React.CSSProperties;
  completed: boolean;
  inProgress: boolean;
  accent: string;
}

/**
 * Cards take their tone from the calendar color. Status shifts the intensity:
 * in-progress is stronger, completed is muted. Priority is shown with a dot/flag, not a color swap,
 * so one calendar always reads as one color.
 */
export const getTaskAppearance = (
  status: TaskStatus,
  calendarColor?: string | null
): TaskAppearance => {
  const accent = calendarColor || DEFAULT_CALENDAR_COLOR;
  if (status === 'completed') {
    return {
      completed: true,
      inProgress: false,
      accent,
      style: {
        backgroundColor: 'rgba(113, 113, 122, 0.14)',
        borderColor: 'rgba(113, 113, 122, 0.35)',
        borderLeftColor: hexToRgba(accent, 0.55),
      },
    };
  }
  const inProgress = status === 'in_progress';
  return {
    completed: false,
    inProgress,
    accent,
    style: {
      backgroundColor: hexToRgba(accent, inProgress ? 0.36 : 0.2),
      borderColor: hexToRgba(accent, inProgress ? 0.85 : 0.5),
      borderLeftColor: accent,
    },
  };
};

// ---------------------------------------------------------------------------
// Timeline layout: overlapping tasks are placed side by side
// ---------------------------------------------------------------------------

export interface TimedLayout {
  task: Task;
  top: number;
  height: number;
  leftPercent: number;
  widthPercent: number;
  colIndex: number;
  totalCols: number;
  startMin: number;
  endMin: number;
}

const MIN_BLOCK_PX = 26;

export const computeTimedLayout = (tasks: Task[]): TimedLayout[] => {
  const parsed = tasks
    .map((task) => {
      const startMin = timeToMinutes(task.due_time);
      if (startMin === null) return null;
      const duration = task.duration_minutes && task.duration_minutes > 0 ? task.duration_minutes : DEFAULT_DURATION;
      const endMin = Math.min(startMin + duration, 24 * 60);
      const visualEnd = Math.max(endMin, startMin + (MIN_BLOCK_PX / HOUR_HEIGHT) * 60);
      return { task, startMin, endMin, visualEnd, col: 0 };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  parsed.sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const clusters: (typeof parsed)[] = [];
  let current: typeof parsed = [];
  let clusterEnd = -1;
  for (const item of parsed) {
    if (current.length === 0 || item.startMin < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.visualEnd);
    } else {
      clusters.push(current);
      current = [item];
      clusterEnd = item.visualEnd;
    }
  }
  if (current.length) clusters.push(current);

  const out: TimedLayout[] = [];
  for (const cluster of clusters) {
    const colEnds: number[] = [];
    for (const item of cluster) {
      let col = colEnds.findIndex((end) => end <= item.startMin);
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(item.visualEnd);
      } else {
        colEnds[col] = item.visualEnd;
      }
      item.col = col;
    }
    const totalCols = Math.max(colEnds.length, 1);
    for (const item of cluster) {
      out.push({
        task: item.task,
        top: (item.startMin / 60) * HOUR_HEIGHT,
        height: Math.max(((item.endMin - item.startMin) / 60) * HOUR_HEIGHT - 2, MIN_BLOCK_PX - 2),
        leftPercent: (item.col * 100) / totalCols,
        widthPercent: 100 / totalCols,
        colIndex: item.col,
        totalCols,
        startMin: item.startMin,
        endMin: item.endMin,
      });
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Task tree helpers
// ---------------------------------------------------------------------------

/** Within a flat task list, return root tasks with `subtasks` attached (sorted by order_index). */
export const buildTaskTree = (all: Task[], visibleRoots: Task[]): Task[] => {
  const byParent = new Map<string, Task[]>();
  for (const t of all) {
    if (!t.parent_id) continue;
    const list = byParent.get(t.parent_id) || [];
    list.push(t);
    byParent.set(t.parent_id, list);
  }
  return visibleRoots.map((root) => ({
    ...root,
    subtasks: (byParent.get(root.id) || []).sort((a, b) => a.order_index - b.order_index),
  }));
};

export const personName = (p?: { full_name?: string | null; email?: string | null } | null): string => {
  if (!p) return '';
  return (p.full_name && p.full_name.trim()) || (p.email ? p.email.split('@')[0] : '');
};
