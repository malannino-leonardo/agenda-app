import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';
import {
  HOURS,
  HOUR_HEIGHT,
  DEFAULT_DURATION,
  computeTimedLayout,
  timeToMinutes,
} from '../../lib/calendarUtils';

export interface DayInfo {
  date: Date;
  dateKey: string;
  isToday: boolean;
}

interface TimeGridProps {
  days: DayInfo[];
  timedByDate: Map<string, Task[]>;
  allDayByDate: Map<string, Task[]>;
  locale: string;
  nowMinutes: number;
  allDayLabel: string;
  colorFor: (task: Task) => string;
  calendarNameFor: (task: Task) => string | undefined;
  creatorFor: (task: Task) => string | undefined;
  canEdit: (task: Task) => boolean;
  draggedTaskId: string | null;
  scrollToMinutes: number;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  /** minutes === null means "all day" */
  onMoveTask: (taskId: string, dateKey: string, minutes: number | null) => void;
  onResizeTask: (taskId: string, durationMinutes: number) => void;
  onCreateAt: (dateKey: string, minutes: number | null) => void;
  onOpenTask: (task: Task) => void;
  onToggleTask: (task: Task) => void;
  onSelectDay?: (date: Date) => void;
}

const SNAP = 15;
const snapMinutes = (raw: number) => Math.max(0, Math.min(Math.floor(raw / SNAP) * SNAP, 24 * 60 - SNAP));

export const TimeGrid: React.FC<TimeGridProps> = ({
  days,
  timedByDate,
  allDayByDate,
  locale,
  nowMinutes,
  allDayLabel,
  colorFor,
  calendarNameFor,
  creatorFor,
  canEdit,
  draggedTaskId,
  scrollToMinutes,
  onDragStart,
  onDragEnd,
  onMoveTask,
  onResizeTask,
  onCreateAt,
  onOpenTask,
  onToggleTask,
  onSelectDay,
}) => {
  const isWeek = days.length > 1;
  const scrollRef = useRef<HTMLDivElement>(null);
  const grabOffsetRef = useRef(0);
  const [dropHover, setDropHover] = useState<{ key: string; minutes: number | null } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; duration: number } | null>(null);

  // Scroll to the interesting part of the day when the view/date changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (scrollToMinutes / 60) * HOUR_HEIGHT);
    }
    // only when the visible range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.dateKey, days.length]);

  const layouts = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeTimedLayout>>();
    days.forEach(({ dateKey }) => {
      const list = (timedByDate.get(dateKey) || []).map((t) =>
        resizing && resizing.id === t.id ? { ...t, duration_minutes: resizing.duration } : t
      );
      map.set(dateKey, computeTimedLayout(list));
    });
    return map;
  }, [days, timedByDate, resizing]);

  const minutesFromPointer = (clientY: number, el: HTMLElement, withGrab = false) => {
    const rect = el.getBoundingClientRect();
    const y = clientY - rect.top - (withGrab ? grabOffsetRef.current : 0);
    return snapMinutes((y / HOUR_HEIGHT) * 60);
  };

  const startResize = (task: Task, e: React.PointerEvent) => {
    const startY = e.clientY;
    const startMin = timeToMinutes(task.due_time) ?? 0;
    const startDuration = task.duration_minutes && task.duration_minutes > 0 ? task.duration_minutes : DEFAULT_DURATION;
    let latest = startDuration;

    const onMove = (ev: PointerEvent) => {
      const delta = ((ev.clientY - startY) / HOUR_HEIGHT) * 60;
      const next = Math.round((startDuration + delta) / SNAP) * SNAP;
      latest = Math.max(SNAP, Math.min(next, 24 * 60 - startMin));
      setResizing({ id: task.id, duration: latest });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      setResizing(null);
      if (latest !== startDuration) onResizeTask(task.id, latest);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // 12h locales: "1 PM"; 24h locales: "13:00" (kept to one line so the gutter stays narrow)
  const hour12 = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12;
  const hourLabel = (hour: number) =>
    hour12
      ? new Date(2000, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' })
      : `${String(hour).padStart(2, '0')}:00`;

  const cols = `3.25rem repeat(${days.length}, minmax(0, 1fr))`;

  const renderCard = (task: Task, variant: 'day' | 'week' | 'chip', extra?: Partial<React.ComponentProps<typeof TaskCard>>) => (
    <TaskCard
      key={task.id}
      task={task}
      color={colorFor(task)}
      variant={variant}
      editable={canEdit(task)}
      locale={locale}
      dragging={draggedTaskId === task.id}
      calendarName={calendarNameFor(task)}
      creatorName={creatorFor(task)}
      onOpen={onOpenTask}
      onToggle={onToggleTask}
      onDragStart={(t, e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        grabOffsetRef.current = Math.min(Math.max(e.clientY - rect.top, 0), 28);
        onDragStart(t);
      }}
      onDragEnd={() => {
        setDropHover(null);
        onDragEnd();
      }}
      {...extra}
    />
  );

  return (
    <div
      ref={scrollRef}
      className="overflow-auto relative cal-surface border border-zinc-800 rounded-lg max-h-[calc(100dvh-15rem)] min-h-[420px]"
    >
      <div className={isWeek ? 'min-w-[640px]' : ''}>
        <div className="sticky top-0 z-30 cal-head bg-zinc-950">
        {/* Day headers */}
        {isWeek && (
          <div
            className="grid border-b border-zinc-800"
            style={{ gridTemplateColumns: cols }}
          >
            <div className="border-r border-zinc-800" />
            {days.map(({ date, dateKey, isToday }) => (
              <button
                type="button"
                key={dateKey}
                onClick={() => onSelectDay?.(date)}
                className={`py-2 flex flex-col items-center gap-1 border-r border-zinc-800 last:border-r-0 hover:bg-zinc-900/60 transition-colors ${
                  isToday ? 'bg-indigo-950/30' : ''
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                  {date.toLocaleDateString(locale, { weekday: 'short' })}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                    isToday ? 'bg-indigo-500 text-white' : 'text-zinc-200'
                  }`}
                >
                  {date.getDate()}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* All-day row */}
        <div
          className="grid border-b border-zinc-800"
          style={{ gridTemplateColumns: cols }}
        >
          <div className="border-r border-zinc-800 px-1 py-2 text-[9px] font-mono text-zinc-500 text-center leading-tight flex items-center justify-center">
            {allDayLabel}
          </div>
          {days.map(({ dateKey }) => {
            const list = allDayByDate.get(dateKey) || [];
            const hovered = dropHover?.key === `allday-${dateKey}`;
            return (
              <div
                key={dateKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!hovered) setDropHover({ key: `allday-${dateKey}`, minutes: null });
                }}
                onDragLeave={() => setDropHover((cur) => (cur?.key === `allday-${dateKey}` ? null : cur))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
                  setDropHover(null);
                  if (id) onMoveTask(id, dateKey, null);
                }}
                onClick={() => onCreateAt(dateKey, null)}
                className={`border-r border-zinc-800 last:border-r-0 p-1 space-y-1 min-h-[36px] cursor-pointer transition-colors ${
                  hovered ? 'bg-indigo-500/15 ring-1 ring-inset ring-indigo-500' : ''
                }`}
              >
                {list.map((task) => renderCard(task, 'chip'))}
              </div>
            );
          })}
        </div>
        </div>

        {/* Timeline */}
        <div className="grid" style={{ gridTemplateColumns: cols }}>
          <div className="border-r border-zinc-800 select-none">
            {HOURS.map((hour) => (
              <div
                key={hour}
                style={{ height: HOUR_HEIGHT }}
                className="pr-1.5 text-right text-[10px] font-mono text-zinc-500 border-b border-zinc-800/60"
              >
                <span className="relative -top-1.5">{hour === 0 ? '' : hourLabel(hour)}</span>
              </div>
            ))}
          </div>

          {days.map(({ dateKey, isToday }) => {
            const dayLayout = layouts.get(dateKey) || [];
            const hover = dropHover && dropHover.key === `col-${dateKey}` ? dropHover : null;
            return (
              <div
                key={dateKey}
                data-col={dateKey}
                onDragOver={(e) => {
                  e.preventDefault();
                  const mins = minutesFromPointer(e.clientY, e.currentTarget, true);
                  if (!hover || hover.minutes !== mins) setDropHover({ key: `col-${dateKey}`, minutes: mins });
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDropHover((cur) => (cur?.key === `col-${dateKey}` ? null : cur));
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
                  const mins = minutesFromPointer(e.clientY, e.currentTarget, true);
                  setDropHover(null);
                  if (id) onMoveTask(id, dateKey, mins);
                }}
                onClick={(e) => onCreateAt(dateKey, minutesFromPointer(e.clientY, e.currentTarget))}
                className={`relative border-r border-zinc-800 last:border-r-0 cursor-pointer ${
                  isToday ? 'bg-indigo-950/10 cal-today' : ''
                }`}
                style={{ height: HOUR_HEIGHT * 24 }}
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-zinc-800/60 pointer-events-none"
                  />
                ))}

                {hover && hover.minutes !== null && (
                  <div
                    className="absolute left-0 right-0 z-10 h-0.5 bg-indigo-500 pointer-events-none"
                    style={{ top: (hover.minutes / 60) * HOUR_HEIGHT }}
                  >
                    <span className="absolute -top-2 left-1 px-1 rounded bg-indigo-500 text-white text-[9px] font-mono">
                      {String(Math.floor(hover.minutes / 60)).padStart(2, '0')}:
                      {String(hover.minutes % 60).padStart(2, '0')}
                    </span>
                  </div>
                )}

                {dayLayout.map((l) => {
                  const duration = l.endMin - l.startMin;
                  return (
                    <div
                      key={l.task.id}
                      className="absolute z-20 hover:z-30"
                      style={{
                        top: l.top + 1,
                        height: l.height,
                        left: `calc(${l.leftPercent}% + 2px)`,
                        width: `calc(${l.widthPercent}% - 4px)`,
                      }}
                    >
                      {renderCard(l.task, isWeek ? 'week' : 'day', {
                        style: { height: '100%' },
                        durationMinutes: duration,
                        onResizeStart: startResize,
                      })}
                    </div>
                  );
                })}

                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 border-t-2 border-rose-500 pointer-events-none"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -mt-[6px] -ml-1.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
