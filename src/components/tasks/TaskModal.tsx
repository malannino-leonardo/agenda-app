import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Clock, Trash2, Lock, Bell, Hourglass } from 'lucide-react';
import { Task, TaskScope, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { personName } from '../../lib/calendarUtils';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultScope?: TaskScope;
  defaultProjectId?: string | null;
  defaultCalendarId?: string | null;
  defaultParentId?: string | null;
  defaultDueDate?: string | null;
  defaultDueTime?: string | null;
}

const DURATIONS = [15, 30, 45, 60, 90, 120, 180, 240];
const REMINDERS = [0, 5, 10, 15, 30, 60, 120, 1440];

const formatDuration = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  defaultScope = 'agenda',
  defaultProjectId = null,
  defaultCalendarId = null,
  defaultParentId = null,
  defaultDueDate = null,
  defaultDueTime = null,
}) => {
  const {
    addTask,
    updateTask,
    deleteTask,
    canEditTask,
    projects,
    tasks,
    calendars,
    ownedCalendars,
    sharedCalendars,
    writableCalendars,
    defaultCalendar,
    visibleCalendarIds,
    profiles,
  } = useApp();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TaskScope>(defaultScope);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId);
  const [calendarId, setCalendarId] = useState<string | null>(defaultCalendarId);
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [duration, setDuration] = useState<string>('');
  const [remindBefore, setRemindBefore] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const readOnly = Boolean(taskToEdit && !canEditTask(taskToEdit));

  // A single visible, writable calendar is the natural place for a new task
  const fallbackCalendarId = useMemo(() => {
    const visibleWritable = writableCalendars.filter((c) => visibleCalendarIds.includes(c.id));
    if (visibleWritable.length === 1) return visibleWritable[0].id;
    return defaultCalendar?.id || writableCalendars[0]?.id || null;
  }, [writableCalendars, visibleCalendarIds, defaultCalendar]);

  useEffect(() => {
    if (!isOpen) return;
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setScope(taskToEdit.scope);
      setProjectId(taskToEdit.project_id || null);
      setCalendarId(taskToEdit.calendar_id || null);
      setParentId(taskToEdit.parent_id || null);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setDueDate(taskToEdit.due_date ? taskToEdit.due_date.split('T')[0] : '');
      setDueTime(taskToEdit.due_time || '');
      setDuration(taskToEdit.duration_minutes ? String(taskToEdit.duration_minutes) : '');
      setRemindBefore(taskToEdit.remind_before != null ? String(taskToEdit.remind_before) : '');
    } else {
      const parent = defaultParentId ? tasks.find((x) => x.id === defaultParentId) : null;
      setTitle('');
      setDescription('');
      setScope(parent?.scope || defaultScope);
      setProjectId(parent?.project_id || defaultProjectId);
      setCalendarId(parent ? parent.calendar_id || null : defaultCalendarId || fallbackCalendarId);
      setParentId(defaultParentId);
      setPriority('medium');
      setStatus('pending');
      setDueDate(defaultDueDate ? defaultDueDate.split('T')[0] : '');
      setDueTime(defaultDueTime || '');
      setDuration('');
      setRemindBefore('');
    }
    // Reset only when the dialog opens or switches target; not on every context change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskToEdit?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !confirmDelete && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose, confirmDelete]);

  if (!isOpen) return null;

  const rootTasks = tasks.filter(
    (item) => !item.parent_id && (!taskToEdit || item.id !== taskToEdit.id)
  );

  const parentTask = parentId ? tasks.find((x) => x.id === parentId) : null;
  const calendarLocked = Boolean(parentTask);
  const effectiveCalendarId = parentTask ? parentTask.calendar_id || null : calendarId;
  const creator = taskToEdit?.user_id ? profiles[taskToEdit.user_id] : null;
  const currentCalendar = calendars.find((c) => c.id === effectiveCalendarId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || readOnly) return;

    const hasTime = Boolean(dueDate && dueTime);
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      project_id: scope === 'freelance' || scope === 'projects' ? projectId : null,
      calendar_id: effectiveCalendarId,
      parent_id: parentId || null,
      priority,
      status,
      due_date: dueDate || null,
      due_time: dueDate ? dueTime || null : null,
      duration_minutes: hasTime && duration ? Number(duration) : null,
      remind_before: hasTime && remindBefore !== '' ? Number(remindBefore) : null,
    };

    if (taskToEdit) {
      updateTask(taskToEdit.id, payload);
    } else {
      addTask({
        ...payload,
        order_index: 0,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      });
    }
    onClose();
  };

  const modalTitle = taskToEdit
    ? readOnly
      ? t.cal.viewTask
      : t.cal.editTask
    : parentId
    ? t.tasks.newSubtask
    : t.tasks.newTask;

  const inputBase =
    'w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const selectBase =
    'w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
  const label = 'block text-xs font-mono uppercase text-zinc-400 mb-1';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-modal-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {currentCalendar && (
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: currentCalendar.color }} />
            )}
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono truncate">
              {modalTitle}
            </h3>
            {readOnly && <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {readOnly && (
            <div className="p-2.5 rounded border border-zinc-800 bg-zinc-900/40 text-[11px] font-mono text-zinc-400 leading-relaxed">
              {t.cal.readOnlyTask}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={label}>
              {t.cal.titleLabel} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus={!readOnly}
              disabled={readOnly}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.tasks.taskTitlePlaceholder}
              className={inputBase}
            />
          </div>

          {/* Date / time block */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg space-y-3">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider flex items-center justify-between">
              <span>{t.cal.dateTimeOptional}</span>
              {(dueDate || dueTime) && !readOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate('');
                    setDueTime('');
                    setDuration('');
                    setRemindBefore('');
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline lowercase"
                >
                  {t.cal.clearBoth}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-zinc-500" />
                  <span>{t.common.dueDate}</span>
                </label>
                <input
                  type="date"
                  disabled={readOnly}
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (!e.target.value) setDueTime('');
                  }}
                  className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{t.cal.time}</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    disabled={readOnly || !dueDate}
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors font-mono disabled:opacity-50"
                  />
                  {dueTime && !readOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setDueTime('');
                        setDuration('');
                        setRemindBefore('');
                      }}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300"
                      title={t.cal.allDay}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {dueDate && !dueTime && (
              <p className="text-[10px] font-mono text-zinc-500">{t.cal.allDayHint}</p>
            )}

            {dueDate && dueTime && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                    <Hourglass className="w-3 h-3 text-zinc-500" />
                    <span>{t.cal.duration}</span>
                  </label>
                  <select
                    disabled={readOnly}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className={selectBase}
                  >
                    <option value="">{t.cal.defaultDuration}</option>
                    {DURATIONS.map((d) => (
                      <option key={d} value={d}>
                        {formatDuration(d)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                    <Bell className="w-3 h-3 text-zinc-500" />
                    <span>{t.cal.remindMe}</span>
                  </label>
                  <select
                    disabled={readOnly}
                    value={remindBefore}
                    onChange={(e) => setRemindBefore(e.target.value)}
                    className={selectBase}
                  >
                    <option value="">{t.cal.noReminder}</option>
                    {REMINDERS.map((r) => (
                      <option key={r} value={r}>
                        {r === 0
                          ? t.cal.atStart
                          : r === 1440
                          ? t.cal.dayBefore
                          : r >= 60
                          ? t.cal.hoursBefore.replace('{n}', String(r / 60))
                          : t.cal.minutesBefore.replace('{n}', String(r))}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div>
            <label className={label}>{t.cal.calendar}</label>
            <select
              disabled={readOnly || calendarLocked}
              value={effectiveCalendarId || ''}
              onChange={(e) => setCalendarId(e.target.value || null)}
              className={selectBase}
            >
              <option value="">{t.cal.noCalendar}</option>
              {ownedCalendars.length > 0 && (
                <optgroup label={t.cal.myCalendars}>
                  {ownedCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id}>
                      {cal.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {sharedCalendars.length > 0 && (
                <optgroup label={t.cal.sharedWithMe}>
                  {sharedCalendars.map((cal) => (
                    <option key={cal.id} value={cal.id} disabled={cal.role !== 'edit'}>
                      {cal.name}
                      {cal.role !== 'edit' ? ` (${t.cal.canView.toLowerCase()})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {calendarLocked && (
              <p className="mt-1 text-[10px] font-mono text-zinc-500">{t.cal.subtaskCalendarHint}</p>
            )}
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>{t.common.priority}</label>
              <select
                disabled={readOnly}
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className={selectBase}
              >
                <option value="low">{t.tasks.priorityLow}</option>
                <option value="medium">{t.tasks.priorityMedium}</option>
                <option value="high">{t.tasks.priorityHigh}</option>
              </select>
            </div>
            <div>
              <label className={label}>{t.common.status}</label>
              <select
                disabled={readOnly}
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className={selectBase}
              >
                <option value="pending">{t.tasks.statusPending}</option>
                <option value="in_progress">{t.tasks.statusInProgress}</option>
                <option value="completed">{t.tasks.statusCompleted}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={label}>{t.cal.descriptionLabel}</label>
            <textarea
              rows={3}
              disabled={readOnly}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.tasks.taskDescPlaceholder}
              className={`${inputBase} resize-none`}
            />
          </div>

          {/* Scope & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={label}>{t.tasks.scopeLabel}</label>
              <select
                disabled={readOnly}
                value={scope === 'projects' ? 'freelance' : scope}
                onChange={(e) => setScope(e.target.value as TaskScope)}
                className={selectBase}
              >
                <option value="agenda">{t.agenda.title}</option>
                <option value="freelance">{t.freelance.title}</option>
              </select>
            </div>
            <div>
              <label className={label}>{t.freelance.projects}</label>
              <select
                disabled={readOnly || (scope !== 'freelance' && scope !== 'projects')}
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                className={selectBase}
              >
                <option value="">{t.tasks.none}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Parent task */}
          <div>
            <label className={label}>{t.tasks.parentTask}</label>
            <select
              disabled={readOnly}
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className={selectBase}
            >
              <option value="">{t.tasks.none}</option>
              {rootTasks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {taskToEdit && creator && (
            <p className="text-[10px] font-mono text-zinc-500">
              {t.cal.createdBy.replace('{name}', personName(creator))}
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-850">
            <div>
              {taskToEdit && !readOnly && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-zinc-900 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t.common.delete}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {readOnly ? t.common.close : t.common.cancel}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors shadow-sm"
                >
                  {taskToEdit ? t.common.save : parentId ? t.tasks.newSubtask : t.tasks.newTask}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title={t.common.delete}
        message={t.cal.deleteTaskConfirm.replace('{title}', taskToEdit?.title || '')}
        confirmLabel={t.common.delete}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (taskToEdit) deleteTask(taskToEdit.id);
          setConfirmDelete(false);
          onClose();
        }}
      />
    </div>,
    document.body
  );
};
