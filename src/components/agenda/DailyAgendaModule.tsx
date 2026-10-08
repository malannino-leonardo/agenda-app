import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  CornerDownLeft,
  Clock,
  Layers,
  Pencil,
  Share2,
  FolderPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { CalendarViewMode, Task, Calendar as CalendarType } from '../../types';
import { TaskModal } from '../tasks/TaskModal';
import { QuickCompleteButton } from '../tasks/QuickCompleteButton';
import { CalendarModal } from './CalendarModal';
import { ShareCalendarModal } from './ShareCalendarModal';

const AGENDA_VIEW_MODE_KEY = 'agenda_calendar_view_mode';

export const DailyAgendaModule: React.FC = () => {
  const { user, openSignUp } = useAuth();
  const {
    tasks,
    toggleTaskCompletion,
    addTask,
    projects,
    calendars,
    activeCalendarId,
    setActiveCalendarId,
    guestEmail,
    setGuestEmail,
  } = useApp();
  const { t } = useTranslation();

  const isGuest = !user && Boolean(guestEmail);

  const [viewMode, setViewModeState] = useState<CalendarViewMode>(() => {
    try {
      const stored = localStorage.getItem(AGENDA_VIEW_MODE_KEY);
      if (stored === 'day' || stored === 'week' || stored === 'month') {
        return stored;
      }
    } catch {
      // Ignore storage error
    }
    return 'week';
  });

  const setViewMode = (mode: CalendarViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(AGENDA_VIEW_MODE_KEY, mode);
    } catch {
      // Ignore storage error
    }
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [quickInput, setQuickInput] = useState('');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [modalDueDate, setModalDueDate] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Calendar Management Modals
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState<CalendarType | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Format YYYY-MM-DD
  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const selectedDateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  // Active Calendar Object
  const selectedCalendar = useMemo(() => {
    if (activeCalendarId === 'all') return null;
    return calendars.find((c) => c.id === activeCalendarId) || null;
  }, [calendars, activeCalendarId]);

  // Filter tasks by active calendar
  const filteredTasks = useMemo(() => {
    if (activeCalendarId === 'all') return tasks;
    return tasks.filter((t) => t.calendar_id === activeCalendarId);
  }, [tasks, activeCalendarId]);

  // Tasks indexed by due_date, sorted chronologically by due_time
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    filteredTasks.forEach((task) => {
      if (task.due_date) {
        const dateKey = task.due_date.split('T')[0];
        const existing = map.get(dateKey) || [];
        existing.push(task);
        map.set(dateKey, existing);
      }
    });

    map.forEach((dayList) => {
      dayList.sort((a, b) => {
        if (a.due_time && b.due_time) return a.due_time.localeCompare(b.due_time);
        if (a.due_time) return -1;
        if (b.due_time) return 1;
        return a.order_index - b.order_index;
      });
    });

    return map;
  }, [filteredTasks]);

  const unscheduledTasks = useMemo(() => {
    return filteredTasks.filter((t) => !t.due_date && t.status !== 'completed');
  }, [filteredTasks]);

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
      calendar_id: activeCalendarId !== 'all' ? activeCalendarId : calendars[0]?.id || null,
      order_index: 0,
    });

    setQuickInput('');
  };

  const handleToggleTask = (taskId: string) => {
    if (isGuest) {
      openSignUp();
      return;
    }
    toggleTaskCompletion(taskId);
  };

  // Open modal for task creation or edit
  const handleOpenNewTask = (dateString?: string) => {
    if (isGuest) {
      openSignUp();
      return;
    }
    setEditingTask(null);
    setModalDueDate(dateString || selectedDateKey);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    if (isGuest) {
      openSignUp();
      return;
    }
    setEditingTask(task);
    setModalDueDate(task.due_date ? task.due_date.split('T')[0] : selectedDateKey);
    setIsTaskModalOpen(true);
  };

  // Week View Days Calculation (Mon-Sun)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay();
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
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
      {/* Guest Mode Notice */}
      {isGuest && (
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>
              Viewing shared calendar as guest (<strong className="text-zinc-100">{guestEmail}</strong>) • <strong>View Only</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openSignUp}
              className="px-3 py-1 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors uppercase text-[11px]"
            >
              Create Account to Edit
            </button>
            <button
              type="button"
              onClick={() => setGuestEmail(null)}
              className="px-2.5 py-1 text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors text-[11px]"
            >
              Exit View
            </button>
          </div>
        </div>
      )}

      {/* Calendar Bar: Switcher, New Calendar, and Share */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
        {/* Calendars Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCalendarId('all')}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
              activeCalendarId === 'all'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All Calendars
          </button>

          {calendars.map((cal) => {
            const isSelected = activeCalendarId === cal.id;
            return (
              <button
                key={cal.id}
                type="button"
                onClick={() => setActiveCalendarId(cal.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: cal.color }}
                />
                <span>{cal.name}</span>
                {cal.shares && cal.shares.length > 0 && (
                  <span className="text-[10px] text-zinc-500">({cal.shares.length})</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Calendar Actions (Hidden for guests) */}
        {!isGuest && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {selectedCalendar && (
              <button
                type="button"
                onClick={() => setIsShareModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-zinc-300 hover:text-zinc-100 bg-zinc-900 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
                title="Share this calendar"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCalendarToEdit(null);
                setIsCalendarModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800 rounded hover:border-zinc-700 transition-colors"
              title="Create new calendar"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Calendar</span>
            </button>
          </div>
        )}
      </div>

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

        {/* Controls: Nav (Prev/Today/Next) + View (Day/Week/Month) + New Activity */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Previous / Today / Next */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={handlePrev}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
              title={t.agenda.prev}
              aria-label={t.agenda.prev}
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
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
              title={t.agenda.next}
              aria-label={t.agenda.next}
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

          {/* New Task Trigger (Hidden for guests) */}
          {!isGuest && (
            <button
              type="button"
              onClick={() => handleOpenNewTask()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{t.tasks.newTask}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Capture Form (Hidden or read-only for guests) */}
      {!isGuest ? (
        <form onSubmit={handleQuickCapture} className="relative max-w-2xl">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder={`Add activity for ${selectedDateKey} and press Enter...`}
            className="w-full pl-4 pr-12 py-2.5 text-xs bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
          />
          <button
            type="submit"
            disabled={!quickInput.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded transition-colors"
            aria-label="Submit quick capture"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      ) : (
        <div className="p-2.5 bg-zinc-900/40 border border-zinc-800 rounded-md max-w-2xl text-xs font-mono text-zinc-400 flex items-center justify-between">
          <span>Read-only shared calendar. To add or edit activities, create an account.</span>
          <button
            type="button"
            onClick={openSignUp}
            className="text-zinc-200 hover:underline text-[11px] font-semibold uppercase"
          >
            Create Account
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. DAY VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'day' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg flex items-center justify-between">
            <div className="text-xs font-mono text-zinc-400">
              Activities for <span className="text-zinc-100">{selectedDateKey}</span>
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
                  + Add activity for today
                </button>
              </div>
            ) : (
              (tasksByDate.get(selectedDateKey) || []).map((task) => {
                const cal = task.calendar_id
                  ? calendars.find((c) => c.id === task.calendar_id)
                  : null;

                return (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                      task.status === 'completed'
                        ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/90'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <QuickCompleteButton
                        isCompleted={task.status === 'completed'}
                        onToggle={() => handleToggleTask(task.id)}
                        disabled={isGuest}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {cal && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cal.color }}
                              title={cal.name}
                            />
                          )}

                          <span
                            className={`text-xs font-medium ${
                              task.status === 'completed'
                                ? 'line-through text-zinc-500'
                                : 'text-zinc-100'
                            }`}
                          >
                            {task.title}
                          </span>

                          {task.due_time && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-300 font-semibold">
                              <Clock className="w-3 h-3 text-zinc-400" />
                              <span>{task.due_time}</span>
                            </span>
                          )}
                        </div>

                        {task.description && (
                          <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                            {task.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono flex-wrap">
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

                    {!isGuest && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditTask(task)}
                          className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                          title={t.common.edit}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WEEK VIEW (Mobile Friendly + 7 Column Desktop Grid) */}
      {/* ========================================================================= */}
      {viewMode === 'week' && (
        <div className="space-y-4">
          {/* Mobile Strip View (< 768px): Tap any day to focus on it */}
          <div className="md:hidden space-y-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {weekDays.map(({ date, dateKey, isToday }) => {
                const isSelected = selectedDateKey === dateKey;
                const count = (tasksByDate.get(dateKey) || []).length;
                const dayName = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setCurrentDate(date)}
                    className={`flex-1 min-w-[42px] py-2 px-1 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                      isSelected
                        ? 'bg-zinc-800 border-indigo-500/60 text-zinc-100 shadow-sm'
                        : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-[10px] font-mono uppercase">{dayName}</span>
                    <span className={`text-xs font-mono font-bold ${isToday ? 'text-indigo-400' : ''}`}>
                      {date.getDate()}
                    </span>
                    {count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </button>
                );
              })}
            </div>

            {/* Mobile Selected Day Detail Card */}
            <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                <span className="text-xs font-mono text-zinc-300">
                  {new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(currentDate)}
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenNewTask(selectedDateKey)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add activity</span>
                </button>
              </div>

              <div className="space-y-2">
                {(tasksByDate.get(selectedDateKey) || []).length === 0 ? (
                  <div className="py-8 text-center text-xs font-mono text-zinc-500">
                    No activities scheduled for this day.
                  </div>
                ) : (
                  (tasksByDate.get(selectedDateKey) || []).map((task) => {
                    const isCompleted = task.status === 'completed';
                    const cal = task.calendar_id
                      ? calendars.find((c) => c.id === task.calendar_id)
                      : null;

                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded border flex items-center justify-between gap-3 text-xs ${
                          isCompleted
                            ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                            : 'bg-zinc-900/70 border-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <QuickCompleteButton
                            isCompleted={isCompleted}
                            onToggle={() => handleToggleTask(task.id)}
                            disabled={isGuest}
                            size="sm"
                          />

                          {cal && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: cal.color }}
                            />
                          )}

                          <div className="min-w-0 flex-1">
                            <span className={`block truncate ${isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                              {task.title}
                            </span>
                            {task.due_time && (
                              <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 mt-0.5">
                                <Clock className="w-2.5 h-2.5" />
                                <span>{task.due_time}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {!isGuest && (
                          <button
                            type="button"
                            onClick={() => handleEditTask(task)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded"
                            title="Edit activity"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Desktop 7-Column Grid (>= 768px) */}
          <div className="hidden md:grid md:grid-cols-7 gap-3">
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

                      {!isGuest && (
                        <button
                          type="button"
                          onClick={() => handleOpenNewTask(dateKey)}
                          className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                          title="Add activity to this day"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-1.5">
                      {dayTasks.map((task) => {
                        const isCompleted = task.status === 'completed';
                        const cal = task.calendar_id
                          ? calendars.find((c) => c.id === task.calendar_id)
                          : null;

                        return (
                          <div
                            key={task.id}
                            className={`p-2 rounded border transition-all text-xs group/chip ${
                              isCompleted
                                ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                                : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-850'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                <QuickCompleteButton
                                  isCompleted={isCompleted}
                                  onToggle={() => handleToggleTask(task.id)}
                                  disabled={isGuest}
                                  size="sm"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1">
                                    {cal && (
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: cal.color }}
                                      />
                                    )}
                                    <span
                                      className={`truncate block ${
                                        isCompleted ? 'line-through text-zinc-500' : 'text-zinc-200'
                                      }`}
                                    >
                                      {task.title}
                                    </span>
                                  </div>

                                  {task.due_time && (
                                    <span className="text-[10px] font-mono text-zinc-400 block mt-0.5">
                                      {task.due_time}
                                    </span>
                                  )}

                                  {task.project_id && (
                                    <span className="block text-[9px] font-mono text-indigo-400 truncate mt-0.5">
                                      {projects.find((p) => p.id === task.project_id)?.title}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {!isGuest && (
                                <button
                                  type="button"
                                  onClick={() => handleEditTask(task)}
                                  className="p-0.5 text-zinc-500 hover:text-zinc-200 opacity-60 group-hover/chip:opacity-100 rounded transition-opacity shrink-0"
                                  title="Edit activity"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {dayTasks.length === 0 && (
                        <div className="py-8 text-center text-[10px] font-mono text-zinc-600">
                          No activities
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-600 text-right pt-2 border-t border-zinc-850">
                    {dayTasks.filter((t) => t.status === 'completed').length}/{dayTasks.length}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MONTH VIEW (CALENDAR GRID) */}
      {/* ========================================================================= */}
      {viewMode === 'month' && (
        <div className="space-y-4">
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
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 bg-zinc-950">
              {monthGrid.map(({ date, dateKey, isCurrentMonth, isToday }) => {
                const dayTasks = tasksByDate.get(dateKey) || [];
                const isSelected = selectedDateKey === dateKey;

                return (
                  <div
                    key={dateKey}
                    onClick={() => {
                      setCurrentDate(date);
                    }}
                    className={`min-h-[64px] sm:min-h-[96px] p-1.5 sm:p-2 rounded border flex flex-col justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-zinc-850 shadow-sm'
                        : isToday
                        ? 'bg-indigo-950/20 border-indigo-500/50 shadow-sm'
                        : isCurrentMonth
                        ? 'bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/60'
                        : 'bg-zinc-950/40 border-zinc-900/80 opacity-40'
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

                    {/* Micro task chips or mobile dots */}
                    <div className="mt-1">
                      {/* Desktop chips */}
                      <div className="hidden sm:block space-y-1">
                        {dayTasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className={`text-[10px] font-mono truncate px-1 py-0.5 rounded flex items-center gap-1 ${
                              task.status === 'completed'
                                ? 'line-through text-zinc-600 bg-zinc-950/40'
                                : 'text-zinc-300 bg-zinc-850/80'
                            }`}
                          >
                            {task.due_time && (
                              <span className="text-zinc-400">{task.due_time}</span>
                            )}
                            <span className="truncate">{task.title}</span>
                          </div>
                        ))}
                        {dayTasks.length > 2 && (
                          <div className="text-[9px] font-mono text-zinc-500 pl-1">
                            +{dayTasks.length - 2} more
                          </div>
                        )}
                      </div>

                      {/* Mobile dot indicator */}
                      <div className="flex sm:hidden items-center justify-center gap-0.5 pt-1">
                        {dayTasks.slice(0, 3).map((t) => (
                          <span
                            key={t.id}
                            className={`w-1 h-1 rounded-full ${
                              t.status === 'completed' ? 'bg-zinc-600' : 'bg-indigo-400'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month Selected Day Task Drawer */}
          <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-zinc-300">
                Activities for {selectedDateKey}
              </span>
              {!isGuest && (
                <button
                  type="button"
                  onClick={() => handleOpenNewTask(selectedDateKey)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add activity</span>
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {(tasksByDate.get(selectedDateKey) || []).length === 0 ? (
                <div className="py-4 text-center text-xs font-mono text-zinc-500">
                  No activities scheduled for this date.
                </div>
              ) : (
                (tasksByDate.get(selectedDateKey) || []).map((task) => (
                  <div
                    key={task.id}
                    className="p-2.5 bg-zinc-900/70 border border-zinc-800 rounded flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <QuickCompleteButton
                        isCompleted={task.status === 'completed'}
                        onToggle={() => handleToggleTask(task.id)}
                        disabled={isGuest}
                        size="sm"
                      />

                      <div className="min-w-0 flex-1">
                        <span className={`block truncate ${task.status === 'completed' ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                          {task.title}
                        </span>
                        {task.due_time && (
                          <span className="text-[10px] font-mono text-zinc-400 block">
                            {task.due_time}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isGuest && (
                      <button
                        type="button"
                        onClick={() => handleEditTask(task)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded"
                        title="Edit activity"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
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
            <span className="text-xs text-zinc-500 font-mono hidden sm:inline">
              Click &quot;Schedule Today&quot; to assign
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {unscheduledTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 bg-zinc-900/30 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/50 rounded flex items-center justify-between gap-2 text-xs transition-all"
              >
                <div className="truncate text-zinc-200 flex-1">
                  {task.title}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEditTask(task)}
                    className="p-1 text-zinc-400 hover:text-zinc-200 rounded"
                    title="Edit activity"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={() => addTask({ ...task, due_date: selectedDateKey })}
                    className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Task Creation / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
        defaultScope="agenda"
        defaultDueDate={modalDueDate || selectedDateKey}
      />

      {/* Calendar Creation / Edit Modal */}
      <CalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => {
          setIsCalendarModalOpen(false);
          setCalendarToEdit(null);
        }}
        calendarToEdit={calendarToEdit}
      />

      {/* Share Calendar Modal */}
      <ShareCalendarModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        calendar={selectedCalendar}
      />
    </div>
  );
};
