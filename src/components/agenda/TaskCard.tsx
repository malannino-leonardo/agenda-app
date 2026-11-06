import React from 'react';
import { Flag, Lock } from 'lucide-react';
import { Task } from '../../types';
import { QuickCompleteButton } from '../tasks/QuickCompleteButton';
import { formatTimeLabel, getTaskAppearance, minutesToTime, timeToMinutes } from '../../lib/calendarUtils';

export type TaskCardVariant = 'day' | 'week' | 'chip';

interface TaskCardProps {
  task: Task;
  color: string;
  variant: TaskCardVariant;
  editable: boolean;
  locale: string;
  dragging?: boolean;
  calendarName?: string;
  creatorName?: string;
  style?: React.CSSProperties;
  durationMinutes?: number;
  onOpen: (task: Task) => void;
  onToggle: (task: Task) => void;
  onDragStart?: (task: Task, e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onResizeStart?: (task: Task, e: React.PointerEvent) => void;
}

const endTimeLabel = (task: Task, locale: string, durationOverride?: number): string => {
  const start = timeToMinutes(task.due_time);
  if (start === null) return '';
  const duration = durationOverride ?? task.duration_minutes ?? 60;
  return formatTimeLabel(minutesToTime(Math.min(start + duration, 24 * 60 - 1)), locale);
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  color,
  variant,
  editable,
  locale,
  dragging = false,
  calendarName,
  creatorName,
  style,
  durationMinutes,
  onOpen,
  onToggle,
  onDragStart,
  onDragEnd,
  onResizeStart,
}) => {
  const look = getTaskAppearance(task.status, color);
  const timeLabel = formatTimeLabel(task.due_time, locale);
  const isTimed = variant !== 'chip';

  return (
    <div
      draggable={editable}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart?.(task, e);
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(task);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(task);
        }
      }}
      title={`${task.title}${timeLabel ? ` · ${timeLabel}` : ''}${calendarName ? ` · ${calendarName}` : ''}`}
      style={{ ...look.style, ...style }}
      className={`group/card relative rounded-md border border-l-[3px] overflow-hidden text-zinc-100 transition-[filter,opacity] hover:brightness-125 focus:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 ${
        editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${dragging ? 'opacity-40' : ''} ${look.completed ? 'opacity-70' : ''} ${
        variant === 'chip' ? 'flex items-center gap-1.5 px-1.5 py-0.5 text-[11px]' : 'p-1.5 text-xs'
      }`}
    >
      {variant === 'chip' && (
        <>
          <QuickCompleteButton
            isCompleted={look.completed}
            onToggle={() => onToggle(task)}
            disabled={!editable}
            size="sm"
          />
          {task.due_time && <span className="font-mono text-[10px] text-zinc-400 shrink-0">{task.due_time}</span>}
          <span className={`truncate ${look.completed ? 'line-through text-zinc-400' : 'font-medium'}`}>
            {task.title}
          </span>
          {task.priority === 'high' && !look.completed && (
            <Flag className="w-2.5 h-2.5 text-rose-400 shrink-0 ml-auto" />
          )}
        </>
      )}

      {variant === 'week' && (
        <div className="flex flex-col h-full min-w-0">
          <div className="flex items-start gap-1 min-w-0">
            <span
              className={`flex-1 min-w-0 truncate text-[11px] leading-tight ${
                look.completed ? 'line-through text-zinc-400' : 'font-medium'
              }`}
            >
              {task.title}
            </span>
            <span className="shrink-0 mt-px">
              <QuickCompleteButton
                isCompleted={look.completed}
                onToggle={() => onToggle(task)}
                disabled={!editable}
                size="sm"
              />
            </span>
          </div>
          <div className="mt-auto flex items-center gap-1 text-[9px] font-mono text-zinc-400 min-w-0">
            <span className="truncate">{timeLabel}</span>
            {task.priority === 'high' && !look.completed && <Flag className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
            {!editable && <Lock className="w-2.5 h-2.5 shrink-0" />}
          </div>
        </div>
      )}

      {variant === 'day' && (
        <div className="flex items-start gap-2.5 h-full min-w-0">
          <span className="mt-0.5 shrink-0">
            <QuickCompleteButton
              isCompleted={look.completed}
              onToggle={() => onToggle(task)}
              disabled={!editable}
              size="md"
            />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`truncate text-xs ${look.completed ? 'line-through text-zinc-400' : 'font-medium'}`}
              >
                {task.title}
              </span>
              {task.priority === 'high' && !look.completed && (
                <Flag className="w-3 h-3 text-rose-400 shrink-0" />
              )}
              {!editable && <Lock className="w-3 h-3 text-zinc-400 shrink-0" />}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-mono text-zinc-400 min-w-0">
              <span className="shrink-0">
                {timeLabel}
                {isTimed && timeLabel ? ` – ${endTimeLabel(task, locale, durationMinutes)}` : ''}
              </span>
              {calendarName && <span className="truncate">· {calendarName}</span>}
              {creatorName && <span className="truncate">· {creatorName}</span>}
            </div>
          </div>
        </div>
      )}

      {isTimed && editable && onResizeStart && (
        <div
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(task, e);
          }}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
          className="absolute left-0 right-0 bottom-0 h-1.5 cursor-ns-resize opacity-0 group-hover/card:opacity-100 touch-none"
          aria-hidden="true"
        >
          <div className="mx-auto mt-0.5 w-6 h-0.5 rounded bg-zinc-400/70" />
        </div>
      )}
    </div>
  );
};
