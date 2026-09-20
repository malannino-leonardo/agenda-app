import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CornerDownLeft,
  Check,
  Clock,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { CalendarViewMode, Task } from '../../types';
import { TaskModal } from '../tasks/TaskModal';

export const DailyAgendaModule: React.FC = () => {
  const { tasks, toggleTaskCompletion, addTask, projects } = useApp();
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [quickInput, setQuickInput] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [modalDueDate, setModalDueDate] = useState<string | null>(null);

  // Format YYYY-MM-DD
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const selectedDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  // Tasks indexed by due_date
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date.split('T')[0];
        const existing = map.get(dateKey) || [];
        existing.push(task);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [tasks]);

  const unscheduledTasks = useMemo(() => {
    return tasks.filter((t) => !t.due_date && t.status !== 'completed');
  }, [tasks]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Quick Capture for current date
  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    addTask({
      title: quickInput.trim(),
      scope: 'agenda',
      status: 'pending',
      priority: 'medium',
      due_date: selectedDateKey,
      order_index: 0,
    });

    setQuickInput('');
  };

  // Open modal with preselected due date
  const handleOpenNewTask = (dateString?: string) => {
    setModalDueDate(dateString || selectedDateKey);
    setIsTaskModalOpen(true);
  };

  // Week View Days Calculation (Mon-Sun)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    // Get Monday of current week
    const dayOfWeek = curr.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMon = (dayOfWeek + 6) % 7;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - diffToMon);

    const days: { date: Date; dateKey: string; isToday: boolean }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const k = formatDateKey(d);
      days.push({
        date: d,
        dateKey: k,
        isToday: k === todayKey,
      });
    }
    return days;
  }, [currentDate, todayKey]);

  // Month View Days Calculation
  const monthGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Monday offset
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: { date: Date; dateKey: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const cellDate = new Date(year, month, 1 - startOffset + i);
      const k = formatDateKey(cellDate);
      cells.push({
        date: cellDate,
        dateKey: k,
        isCurrentMonth: cellDate.getMonth() === month,
        isToday: k === todayKey,
      });
    }

    return cells;
  }, [currentDate, todayKey]);

  // Localized Header Title
  const headerDateLabel = useMemo(() => {
    if (viewMode === 'day') {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(currentDate);
    }
    if (viewMode === 'week') {
      const start = weekDays[0].date;
      const end = weekDays[6].date;
      return `${new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(start)} – ${new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(end)}`;
    }
    return new Intl.DateTimeFormat(undefined, {
      month: 'long',
      year: 'numeric',
    }).format(currentDate);
  }, [viewMode, currentDate, weekDays]);

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      {/* Calendar Header & View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Workspace Schedule</span>
          </div>
          <h1 className="text-xl font-medium text-zinc-100 tracking-tight mt-1">
            {t.agenda.title}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            {headerDateLabel}
          </p>
        </div>

        {/* Controls: Nav (Prev/Today/Next) + View (Day/Week/Month) */}
        <div className="flex items-center flex-wrap gap-3">
          {/* Previous / Today / Next */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
              title={t.agenda.prev}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
            >
              {t.agenda.today}
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-1 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
              title={t.agenda.next}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* View Mode Switcher: Day | Week | Month */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-mono">
            {(['day', 'week', 'month'] as CalendarViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 rounded capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.agenda[`${mode}View` as 'dayView' | 'weekView' | 'monthView']}
              </button>
            ))}
          </div>

          {/* New Task Trigger */}
          <button
            type="button"
            onClick={() => handleOpenNewTask()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t.tasks.newTask}</span>
          </button>
        </div>
      </div>

      {/* Quick Capture Form */}
      <form onSubmit={handleQuickCapture} className="relative max-w-2xl">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          placeholder={`Add task for ${selectedDateKey} and press Enter...`}
          className="w-full pl-4 pr-12 py-2.5 text-xs bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
        />
        <button
          type="submit"
          disabled={!quickInput.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded transition-colors"
        >
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* ========================================================================= */}
      {/* 1. DAY VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'day' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg flex items-center justify-between">
            <div className="text-xs font-mono text-zinc-400">
              Tasks for <span className="text-zinc-100">{selectedDateKey}</span>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              {(tasksByDate.get(selectedDateKey) || []).filter((t) => t.status === 'completed').length} /{' '}
              {(tasksByDate.get(selectedDateKey) || []).length} completed
            </div>
          </div>

          <div className="space-y-2">
            {(tasksByDate.get(selectedDateKey) || []).length === 0 ? (
              <div className="p-12 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/20">
                <Clock className="w-8 h-8 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
                <p className="text-xs font-mono text-zinc-400">{t.agenda.noTasksScheduled}</p>
                <button
                  type="button"
                  onClick={() => handleOpenNewTask(selectedDateKey)}
                  className="mt-3 text-xs font-mono text-zinc-300 hover:underline"
                >
                  + Add task for today
                </button>
              </div>
            ) : (
              (tasksByDate.get(selectedDateKey) || []).map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                    task.status === 'completed'
                      ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/90'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTaskCompletion(task.id)}
                      className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-colors ${
                        task.status === 'completed'
                          ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                          : 'border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {task.status === 'completed' && <Check className="w-3 h-3 stroke-[3]" />}
                    </button>

                    <div>
                      <div
                        className={`text-xs font-medium text-zinc-100 ${
                          task.status === 'completed' ? 'line-through text-zinc-500' : ''
                        }`}
                      >
                        {task.title}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
                        <span
                          className={`capitalize ${
                            task.priority === 'high'
                              ? 'text-rose-400'
                              : task.priority === 'medium'
                              ? 'text-amber-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {task.priority} priority
                        </span>
                        {task.project_id && (
                          <span className="text-indigo-400">
                            {projects.find((p) => p.id === task.project_id)?.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEK VIEW (7 COLUMNS) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map(({ date, dateKey, isToday }) => {
            const dayTasks = tasksByDate.get(dateKey) || [];
            const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
            const dayNum = date.getDate();

            return (
              <div
                key={dateKey}
                className={`min-h-[380px] p-3 rounded-lg border flex flex-col justify-between transition-all duration-150 ${
                  isToday
                    ? 'bg-zinc-900/70 border-indigo-500/50 shadow-sm hover:border-indigo-400'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-600 hover:bg-zinc-900/40'
                }`}
              >
                <div>
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
                    <div className="flex items-baseline gap-1.5 font-mono">
                      <span className={`text-xs font-bold uppercase ${isToday ? 'text-indigo-400' : 'text-zinc-400'}`}>
                        {dayName}
                      </span>
                      <span className={`text-xs ${isToday ? 'text-indigo-300 font-semibold' : 'text-zinc-500'}`}>
                        {dayNum}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenNewTask(dateKey)}
                      className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                      title="Add task to this day"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-1.5">
                    {dayTasks.map((task) => {
                      const isCompleted = task.status === 'completed';
                      return (
                        <div
                          key={task.id}
                          className={`p-2 rounded border transition-all text-xs ${
                            isCompleted
                              ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                              : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850'
                          }`}
                        >
                          <div className="flex items-start gap-1.5">
                            <button
                              type="button"
                              onClick={() => toggleTaskCompletion(task.id)}
                              className={`w-3.5 h-3.5 rounded border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                                isCompleted
                                  ? 'bg-zinc-100 border-zinc-100 text-zinc-950'
                                  : 'border-zinc-700 hover:border-zinc-500'
                              }`}
                            >
                              {isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </button>

                            <div className="flex-1 min-w-0">
                              <span
                                className={`block truncate ${
                                  isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'
                                }`}
                              >
                                {task.title}
                              </span>

                              {task.project_id && (
                                <span className="block text-[9px] font-mono text-indigo-400 truncate mt-0.5">
                                  {projects.find((p) => p.id === task.project_id)?.title}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {dayTasks.length === 0 && (
                      <div className="py-8 text-center text-[10px] font-mono text-zinc-600">
                        No tasks
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-[10px] font-mono text-zinc-600 text-right pt-2">
                  {dayTasks.filter((t) => t.status === 'completed').length}/{dayTasks.length}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTH VIEW (CALENDAR GRID) */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div className="space-y-2">
          {/* Weekday Labels Mon-Sun */}
          <div className="grid grid-cols-7 text-center font-mono text-[11px] text-zinc-500 pb-1">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          {/* Month Cells */}
          <div className="grid grid-cols-7 gap-1.5 bg-zinc-950">
            {monthGrid.map(({ date, dateKey, isCurrentMonth, isToday }) => {
              const dayTasks = tasksByDate.get(dateKey) || [];

              return (
                <div
                  key={dateKey}
                  onClick={() => {
                    setCurrentDate(date);
                    handleOpenNewTask(dateKey);
                  }}
                  className={`min-h-[96px] p-2 rounded border flex flex-col justify-between cursor-pointer transition-all ${
                    isToday
                      ? 'bg-indigo-950/20 border-indigo-500/50 shadow-sm hover:border-indigo-400'
                      : isCurrentMonth
                      ? 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/60 hover:border-zinc-600'
                      : 'bg-zinc-950/40 border-zinc-900/80 opacity-40 hover:opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-medium ${
                        isToday
                          ? 'text-indigo-400 font-bold'
                          : isCurrentMonth
                          ? 'text-zinc-300'
                          : 'text-zinc-600'
                      }`}
                    >
                      {date.getDate()}
                    </span>

                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono text-zinc-500">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Micro task chips */}
                  <div className="space-y-1 mt-1">
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task.id}
                        className={`text-[10px] font-mono truncate px-1 py-0.5 rounded ${
                          task.status === 'completed'
                            ? 'line-through text-zinc-600 bg-zinc-950/40'
                            : 'text-zinc-300 bg-zinc-850/80'
                        }`}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[9px] font-mono text-zinc-500 pl-1">
                        +{dayTasks.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* UNSCHEDULED TASKS SECTION */}
      {/* ========================================================================= */}
      {unscheduledTasks.length > 0 && (
        <div className="pt-6 border-t border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
              <Layers className="w-3.5 h-3.5" />
              <span>{t.agenda.unscheduledTasks} ({unscheduledTasks.length})</span>
            </div>
            <span className="text-xs text-zinc-500 font-mono">
              Click &quot;Schedule Today&quot; to assign
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 rounded flex items-center justify-between gap-2 text-xs transition-all"
              >
                <div className="truncate text-zinc-200">
                  {task.title}
                </div>

                <button
                  type="button"
                  onClick={() => addTask({ ...task, due_date: selectedDateKey })}
                  className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded shrink-0 transition-colors"
                >
                  Schedule
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        defaultScope="agenda"
        defaultDueDate={modalDueDate || selectedDateKey}
      />
    </div>
  );
};
