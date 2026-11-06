import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Trash2,
  Lock,
  X,
  CornerDownRight,
  Pencil,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { Task, TaskPriority, TaskScope, TaskStatus } from '../../types';
import { QuickCompleteButton } from './QuickCompleteButton';
import { InlineSelect, InlineOption } from './InlineSelect';
import { TaskModal } from './TaskModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { buildTaskTree, priorityDotClass, taskDateKey } from '../../lib/calendarUtils';

type StatusFilter = 'all' | TaskStatus;
type SortField = 'status' | 'priority' | 'due' | 'created';
type SortDir = 'asc' | 'desc';

const SORT_KEY = 'agenda_todo_sort';
const STATUS_ORDER: Record<TaskStatus, number> = { pending: 0, in_progress: 1, completed: 2 };
const PRIORITY_WEIGHT: Record<TaskPriority, number> = { low: 0, medium: 1, high: 2 };
const STATUS_DOT: Record<TaskStatus, string> = {
  pending: 'bg-zinc-400',
  in_progress: 'bg-amber-400',
  completed: 'bg-emerald-400',
};

const readSort = (): { field: SortField; dir: SortDir } | null => {
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (['status', 'priority', 'due', 'created'].includes(parsed?.field) && ['asc', 'desc'].includes(parsed?.dir)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
};

const GRID = 'md:grid md:grid-cols-[3.5rem_minmax(0,1fr)_8.5rem_7.5rem_11rem_9rem] md:items-center md:gap-2';

export const AllTasksView: React.FC = () => {
  const {
    tasks,
    calendars,
    defaultCalendar,
    writableCalendars,
    searchQuery,
    addTask,
    updateTask,
    toggleTaskCompletion,
    bulkUpdateTasks,
    bulkDeleteTasks,
    canEditTask,
  } = useApp();
  const { t } = useTranslation();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [scopeFilter, setScopeFilter] = useState<TaskScope | 'all'>('all');
  const [calendarFilter, setCalendarFilter] = useState<string>('all');
  const [sort, setSort] = useState<{ field: SortField; dir: SortDir } | null>(readSort);
  const [quickTitle, setQuickTitle] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTask, setModalTask] = useState<Task | null>(null);
  const [modalParent, setModalParent] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.select();
  }, [editingId]);

  const cycleSort = (field: SortField) => {
    setSort((prev) => {
      let next: { field: SortField; dir: SortDir } | null;
      if (!prev || prev.field !== field) next = { field, dir: 'asc' };
      else if (prev.dir === 'asc') next = { field, dir: 'desc' };
      else next = null;
      try {
        if (next) localStorage.setItem(SORT_KEY, JSON.stringify(next));
        else localStorage.removeItem(SORT_KEY);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const calendarById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);

  const matchesBase = (task: Task) => {
    if (scopeFilter !== 'all') {
      const isProject = task.scope === 'freelance' || task.scope === 'projects';
      if (scopeFilter === 'agenda' ? isProject : !isProject) return false;
    }
    if (calendarFilter === 'none' && task.calendar_id) return false;
    if (calendarFilter !== 'all' && calendarFilter !== 'none' && task.calendar_id !== calendarFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !(task.description || '').toLowerCase().includes(q)) return false;
    }
    return true;
  };

  const roots = useMemo(() => tasks.filter((x) => !x.parent_id && matchesBase(x)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, scopeFilter, calendarFilter, searchQuery]);

  const counts = useMemo(
    () => ({
      all: roots.length,
      pending: roots.filter((x) => x.status === 'pending').length,
      in_progress: roots.filter((x) => x.status === 'in_progress').length,
      completed: roots.filter((x) => x.status === 'completed').length,
    }),
    [roots]
  );

  const rows = useMemo(() => {
    const filtered = roots.filter((x) => statusFilter === 'all' || x.status === statusFilter);
    const dir = sort?.dir === 'desc' ? -1 : 1;
    const sorted = [...filtered].sort((a, b) => {
      if (!sort) {
        // Default: open work first, newest first
        const done = Number(a.status === 'completed') - Number(b.status === 'completed');
        if (done !== 0) return done;
        return (b.created_at || '').localeCompare(a.created_at || '');
      }
      switch (sort.field) {
        case 'status':
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
        case 'priority':
          return (PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]) * dir;
        case 'created':
          return (a.created_at || '').localeCompare(b.created_at || '') * dir;
        case 'due': {
          const ka = taskDateKey(a) ? `${taskDateKey(a)}T${a.due_time || '00:00'}` : null;
          const kb = taskDateKey(b) ? `${taskDateKey(b)}T${b.due_time || '00:00'}` : null;
          if (ka === null && kb === null) return 0;
          if (ka === null) return 1;
          if (kb === null) return -1;
          return ka.localeCompare(kb) * dir;
        }
      }
    });
    return buildTaskTree(tasks, sorted);
  }, [roots, statusFilter, sort, tasks]);

  const visibleIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const selectedEditable = useMemo(
    () => Array.from(selected).filter((id) => tasks.some((x) => x.id === id && canEditTask(x))),
    [selected, tasks, canEditTask]
  );

  // Drop selections that disappeared (deleted / filtered out)
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(Array.from(prev).filter((id) => visibleIds.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleIds]);

  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const statusOptions: InlineOption<TaskStatus>[] = [
    { value: 'pending', label: t.tasks.statusPending, dotClass: STATUS_DOT.pending },
    { value: 'in_progress', label: t.tasks.statusInProgress, dotClass: STATUS_DOT.in_progress },
    { value: 'completed', label: t.tasks.statusCompleted, dotClass: STATUS_DOT.completed },
  ];
  const priorityOptions: InlineOption<TaskPriority>[] = [
    { value: 'high', label: t.tasks.priorityHigh, dotClass: priorityDotClass('high') },
    { value: 'medium', label: t.tasks.priorityMedium, dotClass: priorityDotClass('medium') },
    { value: 'low', label: t.tasks.priorityLow, dotClass: priorityDotClass('low') },
  ];

  const quickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    const calId = calendarFilter !== 'all' && calendarFilter !== 'none'
      ? writableCalendars.find((c) => c.id === calendarFilter)?.id
      : defaultCalendar?.id;
    addTask({
      title,
      scope: scopeFilter === 'freelance' ? 'freelance' : 'agenda',
      status: 'pending',
      priority: 'medium',
      calendar_id: calendarFilter === 'none' ? null : calId || null,
      order_index: 0,
    });
    setQuickTitle('');
  };

  const addSubtask = (parent: Task) => {
    const title = subtaskTitle.trim();
    if (!title) {
      setSubtaskFor(null);
      return;
    }
    addTask({
      title,
      scope: parent.scope,
      project_id: parent.project_id,
      parent_id: parent.id,
      calendar_id: parent.calendar_id || null,
      status: 'pending',
      priority: 'medium',
      order_index: (parent.subtasks?.length || 0) + 1,
    });
    setSubtaskTitle('');
    setExpanded((prev) => ({ ...prev, [parent.id]: true }));
  };

  const commitTitle = (task: Task) => {
    const next = editingValue.trim();
    setEditingId(null);
    if (next && next !== task.title) updateTask(task.id, { title: next });
  };

  const openModal = (task: Task | null, parentId: string | null = null) => {
    setModalTask(task);
    setModalParent(parentId);
    setModalOpen(true);
  };

  const sortIcon = (field: SortField) =>
    sort?.field === field ? (
      sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
    ) : (
      <ArrowUpDown className="w-3 h-3 opacity-40" />
    );

  const headerCell = (field: SortField, label: string) => (
    <button
      type="button"
      onClick={() => cycleSort(field)}
      className={`inline-flex items-center gap-1 text-left hover:text-zinc-200 transition-colors ${
        sort?.field === field ? 'text-zinc-200' : ''
      }`}
    >
      {label}
      {sortIcon(field)}
    </button>
  );

  const renderRow = (task: Task, isSub = false) => {
    const editable = canEditTask(task);
    const cal = task.calendar_id ? calendarById.get(task.calendar_id) : undefined;
    const isDone = task.status === 'completed';
    const hasSubs = Boolean(task.subtasks && task.subtasks.length > 0);
    const isOpen = expanded[task.id] ?? true;
    const dateKey = taskDateKey(task);

    return (
      <div key={task.id}>
        <div
          className={`group/row relative flex flex-wrap items-center gap-x-2 gap-y-1.5 px-2 py-2 border-b border-zinc-800/80 transition-colors hover:bg-zinc-900/40 ${GRID} ${
            selected.has(task.id) ? 'bg-indigo-950/20' : ''
          } ${isSub ? 'pl-6 md:pl-8' : ''}`}
        >
          {/* select + complete */}
          <div className="flex items-center gap-2 shrink-0">
            {!isSub ? (
              <input
                type="checkbox"
                checked={selected.has(task.id)}
                onChange={() => toggleSelect(task.id)}
                aria-label={t.cal.selectTask}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
            ) : (
              <CornerDownRight className="w-3 h-3 text-zinc-600" />
            )}
            <QuickCompleteButton
              isCompleted={isDone}
              onToggle={() => toggleTaskCompletion(task.id)}
              disabled={!editable}
              size={isSub ? 'sm' : 'md'}
            />
          </div>

          {/* title */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 md:flex-none">
            {!isSub && (
              <button
                type="button"
                onClick={() => setExpanded((prev) => ({ ...prev, [task.id]: !isOpen }))}
                className={`p-0.5 text-zinc-500 hover:text-zinc-200 shrink-0 ${hasSubs ? '' : 'invisible'}`}
                aria-label={isOpen ? t.cal.collapse : t.cal.expand}
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
            {editingId === task.id ? (
              <input
                ref={editInputRef}
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => commitTitle(task)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle(task);
                  if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 min-w-0 px-2 py-1 text-sm bg-zinc-900 border border-zinc-600 rounded text-zinc-100"
              />
            ) : (
              <button
                type="button"
                disabled={!editable}
                onClick={() => {
                  setEditingId(task.id);
                  setEditingValue(task.title);
                }}
                className={`min-w-0 text-left text-sm truncate ${
                  isDone ? 'line-through text-zinc-500' : 'text-zinc-100'
                } ${editable ? 'hover:text-white cursor-text' : 'cursor-default'}`}
                title={task.title}
              >
                {task.title}
              </button>
            )}
            {hasSubs && !isSub && (
              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                {task.subtasks!.filter((s) => s.status === 'completed').length}/{task.subtasks!.length}
              </span>
            )}
            {!editable && <Lock className="w-3 h-3 text-zinc-600 shrink-0" />}
          </div>

          {/* status / priority / due / calendar */}
          <div className="md:contents flex items-center gap-1 flex-wrap w-full md:w-auto pl-7 md:pl-0">
            <InlineSelect
              value={task.status}
              options={statusOptions}
              disabled={!editable}
              ariaLabel={t.common.status}
              onChange={(v) => updateTask(task.id, { status: v })}
            />
            <InlineSelect
              value={task.priority}
              options={priorityOptions}
              disabled={!editable}
              ariaLabel={t.common.priority}
              onChange={(v) => updateTask(task.id, { priority: v })}
            />
            <div className="flex items-center gap-1">
              <input
                type="date"
                disabled={!editable}
                value={dateKey || ''}
                onChange={(e) => updateTask(task.id, { due_date: e.target.value || null, ...(e.target.value ? {} : { due_time: null }) })}
                aria-label={t.common.dueDate}
                className={`inline-field px-1.5 py-1 text-[11px] font-mono bg-transparent border border-transparent hover:border-zinc-700 focus:border-zinc-500 rounded transition-colors disabled:hover:border-transparent ${
                  dateKey ? 'text-zinc-300' : 'text-zinc-600'
                } w-[7.5rem]`}
              />
              {task.due_time && <span className="text-[10px] font-mono text-zinc-500">{task.due_time}</span>}
            </div>
            <div className="min-w-0 flex items-center gap-1.5 px-1.5 text-[11px] font-mono text-zinc-400 truncate">
              {cal ? (
                <>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cal.color }} />
                  <span className="truncate">{cal.name}</span>
                </>
              ) : (
                <span className="text-zinc-600">—</span>
              )}
            </div>
          </div>

          {/* row actions */}
          <div className="flex items-center gap-0.5 md:absolute md:right-2 md:opacity-0 md:group-hover/row:opacity-100 focus-within:opacity-100 ml-auto md:ml-0 shrink-0">
            {!isSub && editable && (
              <button
                type="button"
                onClick={() => {
                  setSubtaskFor(task.id);
                  setSubtaskTitle('');
                  setExpanded((prev) => ({ ...prev, [task.id]: true }));
                }}
                className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded"
                title={t.tasks.newSubtask}
                aria-label={t.tasks.newSubtask}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => openModal(task)}
              className="p-1.5 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 rounded"
              title={t.common.edit}
              aria-label={t.common.edit}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {!isSub && isOpen && (
          <>
            {task.subtasks?.map((sub) => renderRow(sub, true))}
            {subtaskFor === task.id && (
              <div className="flex items-center gap-2 pl-10 md:pl-12 pr-2 py-1.5 border-b border-zinc-800/80 bg-zinc-900/30">
                <CornerDownRight className="w-3 h-3 text-zinc-600 shrink-0" />
                <input
                  autoFocus
                  value={subtaskTitle}
                  onChange={(e) => setSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addSubtask(task);
                    if (e.key === 'Escape') setSubtaskFor(null);
                  }}
                  onBlur={() => (subtaskTitle.trim() ? addSubtask(task) : setSubtaskFor(null))}
                  placeholder={t.cal.subtaskPlaceholder}
                  className="flex-1 px-2 py-1 text-xs bg-zinc-900 border border-zinc-700 rounded text-zinc-100 placeholder-zinc-500"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  const filterTabs: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'all', label: t.common.all, count: counts.all },
    { id: 'pending', label: t.tasks.statusPending, count: counts.pending },
    { id: 'in_progress', label: t.tasks.statusInProgress, count: counts.in_progress },
    { id: 'completed', label: t.tasks.statusCompleted, count: counts.completed },
  ];

  return (
    <div className="space-y-5 max-w-6xl animate-fade-in pb-24">
      {/* Title & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
        <div>
          <h2 className="text-xl font-medium text-zinc-100 tracking-tight">{t.tasks.title}</h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {counts.pending + counts.in_progress} {t.tasks.todoSection.toLowerCase()} · {counts.completed}{' '}
            {t.tasks.completedSection.toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openModal(null)}
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{t.tasks.newTask}</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-zinc-900/60 p-1 border border-zinc-800 rounded overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label} <span className="text-zinc-500">{tab.count}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-zinc-900/60 p-1 border border-zinc-800 rounded">
            {(['all', 'agenda', 'freelance'] as const).map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => setScopeFilter(scope)}
                className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                  scopeFilter === scope ? 'bg-zinc-800 text-zinc-100 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {scope === 'all' ? t.common.all : scope === 'agenda' ? t.agenda.title : t.nav.freelance}
              </button>
            ))}
          </div>
          <select
            value={calendarFilter}
            onChange={(e) => setCalendarFilter(e.target.value)}
            aria-label={t.cal.calendar}
            className="px-2.5 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-300 focus:border-zinc-500"
          >
            <option value="all">{t.cal.allCalendars}</option>
            {calendars.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="none">{t.cal.noCalendar}</option>
          </select>
        </div>
      </div>

      {/* Quick add */}
      <form onSubmit={quickAdd} className="relative">
        <Plus className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={t.cal.addTaskPlaceholder}
          className="w-full pl-9 pr-3 py-2.5 text-xs bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors font-mono"
        />
      </form>

      {/* Table */}
      <div className="border border-zinc-800 rounded-lg overflow-hidden cal-surface">
        <div
          className={`hidden md:grid md:grid-cols-[3.5rem_minmax(0,1fr)_8.5rem_7.5rem_11rem_9rem] md:items-center md:gap-2 px-2 py-2 border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-mono uppercase tracking-widest text-zinc-500`}
        >
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(visibleIds))}
            aria-label={t.cal.selectAll}
            className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
          />
          <span className="pl-0">{t.cal.colTask}</span>
          {headerCell('status', t.common.status)}
          {headerCell('priority', t.common.priority)}
          {headerCell('due', t.common.dueDate)}
          <span>{t.cal.calendar}</span>
        </div>

        {rows.length === 0 ? (
          <div className="py-12 text-center text-zinc-600 text-sm">
            {statusFilter === 'completed' ? t.tasks.noCompletedTasks : t.tasks.noTasks}
          </div>
        ) : (
          <div className="relative">{rows.map((task) => renderRow(task))}</div>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+5rem))] md:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl animate-modal-pop">
            <span className="text-xs font-mono text-zinc-200 mr-1">
              {t.cal.selectedCount.replace('{n}', String(selected.size))}
            </span>
            <InlineSelect<TaskStatus>
              value="pending"
              options={statusOptions}
              ariaLabel={t.cal.setStatus}
              className="border border-zinc-800"
              labelClass="text-zinc-300"
              onChange={(v) => bulkUpdateTasks(selectedEditable, { status: v })}
            />
            <InlineSelect<TaskPriority>
              value="medium"
              options={priorityOptions}
              ariaLabel={t.cal.setPriority}
              className="border border-zinc-800"
              labelClass="text-zinc-300"
              onChange={(v) => bulkUpdateTasks(selectedEditable, { priority: v })}
            />
            <button
              type="button"
              onClick={() => setConfirmBulkDelete(true)}
              disabled={selectedEditable.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-rose-400 hover:text-rose-300 hover:bg-zinc-900 rounded disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t.common.delete}
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="ml-auto p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              aria-label={t.cal.clearSelection}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmBulkDelete}
        title={t.common.delete}
        message={t.cal.deleteSelectedConfirm.replace('{n}', String(selectedEditable.length))}
        confirmLabel={t.common.delete}
        onCancel={() => setConfirmBulkDelete(false)}
        onConfirm={() => {
          bulkDeleteTasks(selectedEditable);
          setSelected(new Set());
          setConfirmBulkDelete(false);
        }}
      />

      <TaskModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setModalTask(null);
          setModalParent(null);
        }}
        taskToEdit={modalTask}
        defaultScope={scopeFilter === 'all' ? 'agenda' : scopeFilter}
        defaultParentId={modalParent}
      />
    </div>
  );
};
