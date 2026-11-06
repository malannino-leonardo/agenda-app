import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CornerDownLeft,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { CalendarViewMode, Task } from '../../types';
import { TaskModal } from '../tasks/TaskModal';
import { CalendarSidebar } from './CalendarSidebar';
import { TimeGrid } from './TimeGrid';
import { MonthGrid } from './MonthGrid';
import { TaskCard } from './TaskCard';
import {
  DEFAULT_CALENDAR_COLOR,
  formatDateKey,
  getWeekDays,
  minutesToTime,
  parseDateKey,
  personName,
  taskDateKey,
  timeToMinutes,
} from '../../lib/calendarUtils';

const VIEW_MODE_KEY = 'agenda_calendar_view_mode';
const SIDEBAR_KEY = 'agenda_calendar_sidebar_open';

const isEditableTarget = (el: EventTarget | null) => {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
};

const useIsMobile = () => {
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mobile;
};

export const DailyAgendaModule: React.FC = () => {
  const {
    tasks,
    toggleTaskCompletion,
    addTask,
    updateTask,
    canEditTask,
    calendars,
    visibleCalendarIds,
    defaultCalendar,
    writableCalendars,
    profiles,
    searchQuery,
    pendingInvites,
  } = useApp();
  const { t, language } = useTranslation();
  const isMobile = useIsMobile();
  const locale = language === 'it' ? 'it-IT' : 'en-US';

  const [viewMode, setViewModeState] = useState<CalendarViewMode>(() => {
    try {
      const stored = localStorage.getItem(VIEW_MODE_KEY);
      if (stored === 'day' || stored === 'week' || stored === 'month') return stored;
    } catch {
      // ignore
    }
    return 'week';
  });
  const setViewMode = (mode: CalendarViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };

  const [showSidebar, setShowSidebarState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    if (window.innerWidth < 768) return false;
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== '0';
    } catch {
      return true;
    }
  });
  const setShowSidebar = (open: boolean) => {
    setShowSidebarState(open);
    if (window.innerWidth >= 768) {
      try {
        localStorage.setItem(SIDEBAR_KEY, open ? '1' : '0');
      } catch {
        // ignore
      }
    }
  };

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [quickInput, setQuickInput] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [overflowDate, setOverflowDate] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [modalDate, setModalDate] = useState<string | null>(null);
  const [modalTime, setModalTime] = useState<string | null>(null);

  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  const [todayKey, setTodayKey] = useState(() => formatDateKey(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
      setTodayKey(formatDateKey(n));
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const selectedDateKey = formatDateKey(currentDate);

  // ---- derived data ---------------------------------------------------------
  const calendarById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  const colorFor = useCallback(
    (task: Task) => (task.calendar_id ? calendarById.get(task.calendar_id)?.color : undefined) || DEFAULT_CALENDAR_COLOR,
    [calendarById]
  );
  const calendarNameFor = useCallback(
    (task: Task) => (task.calendar_id ? calendarById.get(task.calendar_id)?.name : undefined),
    [calendarById]
  );
  const creatorFor = useCallback(
    (task: Task) => {
      const cal = task.calendar_id ? calendarById.get(task.calendar_id) : undefined;
      // Only worth showing on calendars with more than one person
      if (!cal || (cal.members?.length || 0) === 0 || !task.user_id) return undefined;
      return personName(profiles[task.user_id]) || undefined;
    },
    [calendarById, profiles]
  );

  const visibleTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks.filter((task) => {
      // Tasks with no calendar are always shown; others follow the sidebar checkboxes
      if (task.calendar_id && calendarById.has(task.calendar_id) && !visibleCalendarIds.includes(task.calendar_id)) {
        return false;
      }
      if (q && !task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [tasks, visibleCalendarIds, calendarById, searchQuery]);

  const { timedByDate, allDayByDate, allByDate } = useMemo(() => {
    const timed = new Map<string, Task[]>();
    const allDay = new Map<string, Task[]>();
    const all = new Map<string, Task[]>();
    visibleTasks.forEach((task) => {
      const key = taskDateKey(task);
      if (!key) return;
      const hasTime = timeToMinutes(task.due_time) !== null;
      const bucket = hasTime ? timed : allDay;
      bucket.set(key, [...(bucket.get(key) || []), task]);
      all.set(key, [...(all.get(key) || []), task]);
    });
    timed.forEach((list) => list.sort((a, b) => (timeToMinutes(a.due_time) ?? 0) - (timeToMinutes(b.due_time) ?? 0)));
    all.forEach((list) =>
      list.sort((a, b) => (timeToMinutes(a.due_time) ?? -1) - (timeToMinutes(b.due_time) ?? -1))
    );
    return { timedByDate: timed, allDayByDate: allDay, allByDate: all };
  }, [visibleTasks]);

  const unscheduledTasks = useMemo(
    () => visibleTasks.filter((task) => !task.due_date && task.status !== 'completed' && !task.parent_id),
    [visibleTasks]
  );

  const weekDays = useMemo(() => getWeekDays(currentDate, todayKey), [currentDate, todayKey]);
  const dayInfo = useMemo(
    () => [{ date: currentDate, dateKey: selectedDateKey, isToday: selectedDateKey === todayKey }],
    [currentDate, selectedDateKey, todayKey]
  );

  const periodTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    if (viewMode === 'week') {
      const first = weekDays[0].date;
      const last = weekDays[6].date;
      const firstMonth = first.toLocaleDateString(locale, { month: 'short' });
      const lastMonth = last.toLocaleDateString(locale, { month: 'short' });
      if (first.getMonth() === last.getMonth()) {
        return `${first.getDate()} – ${last.getDate()} ${last.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}`;
      }
      return `${first.getDate()} ${firstMonth} – ${last.getDate()} ${lastMonth} ${last.getFullYear()}`;
    }
    return currentDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [viewMode, currentDate, weekDays, locale]);

  // ---- navigation -----------------------------------------------------------
  const shift = useCallback(
    (direction: 1 | -1) => {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        if (viewMode === 'day') next.setDate(next.getDate() + direction);
        else if (viewMode === 'week') next.setDate(next.getDate() + 7 * direction);
        else {
          next.setDate(1);
          next.setMonth(next.getMonth() + direction);
        }
        return next;
      });
    },
    [viewMode]
  );

  // ---- task actions -----------------------------------------------------------
  const openNewTask = useCallback((dateKey?: string | null, minutes?: number | null) => {
    setEditingTask(null);
    setModalDate(dateKey || formatDateKey(currentDate));
    setModalTime(minutes != null ? minutesToTime(minutes) : null);
    setModalOpen(true);
  }, [currentDate]);

  const openTask = useCallback((task: Task) => {
    setEditingTask(task);
    setModalDate(null);
    setModalTime(null);
    setModalOpen(true);
  }, []);

  const handleToggle = useCallback((task: Task) => toggleTaskCompletion(task.id), [toggleTaskCompletion]);

  const handleMoveTask = (taskId: string, dateKey: string, minutes: number | null) => {
    const task = tasks.find((x) => x.id === taskId);
    setDraggedTaskId(null);
    if (!task || !canEditTask(task)) return;
    const nextTime = minutes === null ? null : minutesToTime(minutes);
    if (taskDateKey(task) === dateKey && (task.due_time || null) === nextTime) return;
    updateTask(taskId, {
      due_date: dateKey,
      due_time: nextTime,
      ...(nextTime === null ? { duration_minutes: null, remind_before: null } : {}),
    });
  };

  const handleMoveToDate = (taskId: string, dateKey: string) => {
    const task = tasks.find((x) => x.id === taskId);
    setDraggedTaskId(null);
    if (!task || !canEditTask(task) || taskDateKey(task) === dateKey) return;
    updateTask(taskId, { due_date: dateKey });
  };

  const handleResize = (taskId: string, durationMinutes: number) => updateTask(taskId, { duration_minutes: durationMinutes });

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    let text = quickInput.trim();
    if (!text) return;

    // "14:30 Call Marco" -> scheduled at 14:30
    let time: string | null = null;
    const match = /^(\d{1,2})[:.](\d{2})\s+(.+)$/.exec(text);
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
      time = `${match[1].padStart(2, '0')}:${match[2]}`;
      text = match[3].trim();
    }

    const visibleWritable = writableCalendars.filter((c) => visibleCalendarIds.includes(c.id));
    const target = visibleWritable.length === 1 ? visibleWritable[0] : defaultCalendar || writableCalendars[0];

    addTask({
      title: text,
      scope: 'agenda',
      status: 'pending',
      priority: 'medium',
      due_date: selectedDateKey,
      due_time: time,
      calendar_id: target?.id || null,
      order_index: 0,
    });
    setQuickInput('');
  };

  // ---- keyboard shortcuts -------------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen || e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target)) return;
      switch (e.key.toLowerCase()) {
        case 't':
          setCurrentDate(new Date());
          break;
        case 'd':
          setViewMode('day');
          break;
        case 'w':
          setViewMode('week');
          break;
        case 'm':
          setViewMode('month');
          break;
        case 'n':
          e.preventDefault();
          openNewTask();
          break;
        case 'arrowleft':
          shift(-1);
          break;
        case 'arrowright':
          shift(1);
          break;
        default:
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, shift, openNewTask]);

  const scrollToMinutes = useMemo(() => {
    const showsToday = viewMode === 'week' ? weekDays.some((d) => d.isToday) : selectedDateKey === todayKey;
    return showsToday ? Math.max(0, nowMinutes - 90) : 8 * 60;
    // recompute only when the visible range changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDateKey]);

  const overflowTasks = overflowDate ? allByDate.get(overflowDate) || [] : [];

  const gridCommon = {
    locale,
    nowMinutes,
    allDayLabel: t.cal.allDay,
    colorFor,
    calendarNameFor,
    creatorFor,
    canEdit: canEditTask,
    draggedTaskId,
    scrollToMinutes,
    onDragStart: (task: Task) => setDraggedTaskId(task.id),
    onDragEnd: () => setDraggedTaskId(null),
    onMoveTask: handleMoveTask,
    onResizeTask: handleResize,
    onCreateAt: (dateKey: string, minutes: number | null) => openNewTask(dateKey, minutes),
    onOpenTask: openTask,
    onToggleTask: handleToggle,
  };

  const sidebar = <CalendarSidebar onClose={() => setShowSidebar(false)} />;

  return (
    <div className="animate-fade-in w-full pb-12">
      <div className="flex items-start gap-4">
        {/* Calendars sidebar: sticky column on desktop, drawer on mobile */}
        {showSidebar && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] md:static md:z-auto md:w-60 lg:w-64 md:shrink-0 md:sticky md:top-0 md:self-start md:max-h-[calc(100dvh-8rem)] flex">
              {sidebar}
            </div>
          </>
        )}

        <div className="flex-1 min-w-0 space-y-4">
          {/* Pending-invite nudge when the sidebar is closed */}
          {!showSidebar && pendingInvites.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-indigo-500/30 bg-indigo-950/30 text-indigo-300 text-xs font-mono text-left"
            >
              <Mail className="w-3.5 h-3.5" />
              {t.cal.pendingInvitesNudge.replace('{n}', String(pendingInvites.length))}
            </button>
          )}

          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <button
                type="button"
                onClick={() => setShowSidebar(!showSidebar)}
                title={showSidebar ? t.cal.hideCalendarList : t.cal.showCalendarList}
                aria-label={showSidebar ? t.cal.hideCalendarList : t.cal.showCalendarList}
                className="p-2 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
              >
                {showSidebar ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => shift(-1)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
                  title={t.agenda.prev}
                  aria-label={t.agenda.prev}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 text-zinc-300 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
                >
                  {t.agenda.today}
                </button>
                <button
                  type="button"
                  onClick={() => shift(1)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded hover:bg-zinc-800 transition-colors"
                  title={t.agenda.next}
                  aria-label={t.agenda.next}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 tracking-tight capitalize truncate">
                {periodTitle}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 lg:flex-none grid grid-cols-3 bg-zinc-900 border border-zinc-800 rounded p-0.5 text-xs font-mono">
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

              <button
                type="button"
                onClick={() => openNewTask()}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">{t.tasks.newTask}</span>
              </button>
            </div>
          </div>

          {/* Quick capture */}
          <form onSubmit={handleQuickCapture} className="relative max-w-2xl">
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder={t.cal.quickCapturePlaceholder.replace(
                '{date}',
                currentDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
              )}
              className="w-full pl-4 pr-12 py-2.5 text-xs bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={!quickInput.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 text-zinc-200 rounded transition-colors"
              aria-label={t.agenda.quickCapture}
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Views */}
          {viewMode === 'month' ? (
            <MonthGrid
              anchor={currentDate}
              todayKey={todayKey}
              locale={locale}
              tasksByDate={allByDate}
              moreLabel={(n) => t.cal.moreCount.replace('{n}', String(n))}
              colorFor={colorFor}
              calendarNameFor={calendarNameFor}
              canEdit={canEditTask}
              draggedTaskId={draggedTaskId}
              onDragStart={(task) => setDraggedTaskId(task.id)}
              onDragEnd={() => setDraggedTaskId(null)}
              onMoveToDate={handleMoveToDate}
              onCreateOn={(dateKey) => openNewTask(dateKey, null)}
              onOpenDay={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              onOpenOverflow={setOverflowDate}
              onOpenTask={openTask}
              onToggleTask={handleToggle}
            />
          ) : viewMode === 'week' && isMobile ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {weekDays.map(({ date, dateKey, isToday }) => {
                  const selected = dateKey === selectedDateKey;
                  const count = (allByDate.get(dateKey) || []).length;
                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => setCurrentDate(date)}
                      className={`flex-1 min-w-[42px] py-2 px-1 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                        selected
                          ? 'bg-zinc-800 border-indigo-500/60 text-zinc-100 shadow-sm'
                          : 'bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <span className="text-[10px] font-mono uppercase">
                        {date.toLocaleDateString(locale, { weekday: 'narrow' })}
                      </span>
                      <span className={`text-xs font-mono font-bold ${isToday ? 'text-indigo-400' : ''}`}>
                        {date.getDate()}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${count > 0 ? 'bg-indigo-400' : 'bg-transparent'}`} />
                    </button>
                  );
                })}
              </div>
              <TimeGrid
                days={dayInfo}
                timedByDate={timedByDate}
                allDayByDate={allDayByDate}
                {...gridCommon}
              />
            </div>
          ) : (
            <TimeGrid
              days={viewMode === 'day' ? dayInfo : weekDays}
              timedByDate={timedByDate}
              allDayByDate={allDayByDate}
              onSelectDay={(date) => {
                setCurrentDate(date);
                setViewMode('day');
              }}
              {...gridCommon}
            />
          )}

          {/* Unscheduled */}
          {unscheduledTasks.length > 0 && (
            <div className="pt-4 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>
                    {t.agenda.unscheduledTasks} ({unscheduledTasks.length})
                  </span>
                </div>
                <span className="text-[11px] text-zinc-500 font-mono hidden sm:inline">{t.cal.unscheduledHint}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {unscheduledTasks.map((task) => {
                  const editable = canEditTask(task);
                  return (
                    <div key={task.id} className="flex items-stretch gap-1.5">
                      <div className="flex-1 min-w-0">
                        <TaskCard
                          task={task}
                          color={colorFor(task)}
                          variant="chip"
                          editable={editable}
                          locale={locale}
                          calendarName={calendarNameFor(task)}
                          onOpen={openTask}
                          onToggle={handleToggle}
                        />
                      </div>
                      {editable && (
                        <button
                          type="button"
                          onClick={() => updateTask(task.id, { due_date: selectedDateKey })}
                          className="px-2 text-[10px] font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors shrink-0"
                        >
                          {t.cal.schedule}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Month "+N more" day sheet */}
      {overflowDate &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
            onClick={() => setOverflowDate(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-modal-pop"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
                <h3 className="text-xs font-semibold tracking-wide text-zinc-100 uppercase font-mono capitalize">
                  {parseDateKey(overflowDate).toLocaleDateString(locale, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
                <button
                  type="button"
                  onClick={() => setOverflowDate(null)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                  aria-label={t.common.close}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 space-y-1.5 max-h-72 overflow-y-auto">
                {overflowTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    color={colorFor(task)}
                    variant="chip"
                    editable={canEditTask(task)}
                    locale={locale}
                    calendarName={calendarNameFor(task)}
                    onOpen={(x) => {
                      setOverflowDate(null);
                      openTask(x);
                    }}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => {
                    const key = overflowDate;
                    setOverflowDate(null);
                    openNewTask(key, null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-mono text-indigo-400 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t.cal.addActivity}
                </button>
                <button
                  type="button"
                  onClick={() => setOverflowDate(null)}
                  className="px-3 py-1.5 text-xs font-mono rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                >
                  {t.common.close}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
        defaultScope="agenda"
        defaultDueDate={modalDate}
        defaultDueTime={modalTime}
      />
    </div>
  );
};

