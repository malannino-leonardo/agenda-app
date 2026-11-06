import React, { useState } from 'react';
import { Task } from '../../types';
import { TaskCard } from './TaskCard';
import { getMonthGrid } from '../../lib/calendarUtils';

interface MonthGridProps {
  anchor: Date;
  todayKey: string;
  locale: string;
  tasksByDate: Map<string, Task[]>;
  moreLabel: (count: number) => string;
  colorFor: (task: Task) => string;
  calendarNameFor: (task: Task) => string | undefined;
  canEdit: (task: Task) => boolean;
  draggedTaskId: string | null;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onMoveToDate: (taskId: string, dateKey: string) => void;
  onCreateOn: (dateKey: string) => void;
  onOpenDay: (date: Date) => void;
  onOpenOverflow: (dateKey: string) => void;
  onOpenTask: (task: Task) => void;
  onToggleTask: (task: Task) => void;
}

const MAX_CHIPS = 3;

export const MonthGrid: React.FC<MonthGridProps> = ({
  anchor,
  todayKey,
  locale,
  tasksByDate,
  moreLabel,
  colorFor,
  calendarNameFor,
  canEdit,
  draggedTaskId,
  onDragStart,
  onDragEnd,
  onMoveToDate,
  onCreateOn,
  onOpenDay,
  onOpenOverflow,
  onOpenTask,
  onToggleTask,
}) => {
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const cells = getMonthGrid(anchor, todayKey);

  // Monday-first weekday labels (2026-09-21 is a Monday)
  const weekdayLabels = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 8, 21 + i).toLocaleDateString(locale, { weekday: 'short' })
  );

  return (
    <div className="cal-surface border border-zinc-800 rounded-lg overflow-hidden">
      <div className="cal-head bg-zinc-950 border-b border-zinc-800">
      <div className="grid grid-cols-7 text-center font-mono text-[11px] font-semibold text-zinc-400 uppercase py-2">
        {weekdayLabels.map((label, i) => (
          <span key={i} className="capitalize">
            {label}
          </span>
        ))}
      </div>
      </div>

      <div className="grid grid-cols-7">
        {cells.map(({ date, dateKey, isCurrentMonth, isToday }, idx) => {
          const list = tasksByDate.get(dateKey) || [];
          const hovered = hoverKey === dateKey;
          const overflow = list.length - MAX_CHIPS;

          return (
            <div
              key={dateKey}
              onDragOver={(e) => {
                e.preventDefault();
                if (!hovered) setHoverKey(dateKey);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setHoverKey((cur) => (cur === dateKey ? null : cur));
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain') || draggedTaskId;
                setHoverKey(null);
                if (id) onMoveToDate(id, dateKey);
              }}
              onClick={() => {
                if (window.innerWidth < 640) onOpenDay(date);
                else onCreateOn(dateKey);
              }}
              className={`min-h-[64px] sm:min-h-[128px] lg:min-h-[148px] p-1 sm:p-1.5 border-b border-r border-zinc-800 cursor-pointer transition-colors ${
                idx % 7 === 6 ? 'border-r-0' : ''
              } ${
                hovered
                  ? 'ring-2 ring-inset ring-indigo-500 bg-indigo-500/10'
                  : isToday
                  ? 'bg-indigo-950/30'
                  : isCurrentMonth
                  ? 'hover:bg-zinc-900/60'
                  : 'bg-zinc-950/40 opacity-50 hover:opacity-80'
              }`}
            >
              <div className="flex items-center justify-between pb-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDay(date);
                  }}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-[11px] sm:text-xs font-semibold hover:bg-zinc-800 transition-colors ${
                    isToday ? 'bg-indigo-500 text-white hover:bg-indigo-400' : isCurrentMonth ? 'text-zinc-200' : 'text-zinc-600'
                  }`}
                  aria-label={date.toLocaleDateString(locale, { dateStyle: 'full' })}
                >
                  {date.getDate()}
                </button>
              </div>

              {/* Mobile: color dots */}
              <div className="flex sm:hidden flex-wrap items-center justify-center gap-1 mt-0.5">
                {list.slice(0, 4).map((task) => (
                  <span
                    key={task.id}
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: task.status === 'completed' ? '#71717a' : colorFor(task) }}
                  />
                ))}
                {list.length > 4 && (
                  <span className="text-[8px] font-mono text-zinc-500 font-bold leading-none">+{list.length - 4}</span>
                )}
              </div>

              {/* Desktop: chips */}
              <div className="hidden sm:block space-y-1">
                {list.slice(0, MAX_CHIPS).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    color={colorFor(task)}
                    variant="chip"
                    editable={canEdit(task)}
                    locale={locale}
                    dragging={draggedTaskId === task.id}
                    calendarName={calendarNameFor(task)}
                    onOpen={onOpenTask}
                    onToggle={onToggleTask}
                    onDragStart={(t) => onDragStart(t)}
                    onDragEnd={() => {
                      setHoverKey(null);
                      onDragEnd();
                    }}
                  />
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenOverflow(dateKey);
                    }}
                    className="text-[11px] font-mono text-zinc-400 hover:text-indigo-400 pl-1 font-semibold block text-left"
                  >
                    {moreLabel(overflow)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
