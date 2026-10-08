import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Task, TaskScope, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

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
  const { addTask, updateTask, projects, tasks, calendars, activeCalendarId } = useApp();
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

  useEffect(() => {
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
    } else {
      setTitle('');
      setDescription('');
      setScope(defaultScope);
      setProjectId(defaultProjectId);
      setCalendarId(
        defaultCalendarId ||
          (activeCalendarId !== 'all' ? activeCalendarId : calendars[0]?.id || null)
      );
      setParentId(defaultParentId);
      setPriority('medium');
      setStatus('pending');
      setDueDate(defaultDueDate ? defaultDueDate.split('T')[0] : '');
      setDueTime(defaultDueTime || '');
    }
  }, [
    taskToEdit,
    defaultScope,
    defaultProjectId,
    defaultCalendarId,
    defaultParentId,
    defaultDueDate,
    defaultDueTime,
    activeCalendarId,
    calendars,
    isOpen,
  ]);

  if (!isOpen) return null;

  // Potential parent tasks (exclude self and tasks that are already subtasks)
  const rootTasks = tasks.filter(
    (item) => !item.parent_id && (!taskToEdit || item.id !== taskToEdit.id)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (taskToEdit) {
      updateTask(taskToEdit.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        scope,
        project_id: scope === 'freelance' || scope === 'projects' ? projectId : null,
        calendar_id: calendarId || null,
        parent_id: parentId || null,
        priority,
        status,
        due_date: dueDate || null,
        due_time: dueTime || null,
      });
    } else {
      addTask({
        title: title.trim(),
        description: description.trim() || undefined,
        scope,
        project_id: scope === 'freelance' || scope === 'projects' ? projectId : null,
        calendar_id: calendarId || null,
        parent_id: parentId || null,
        priority,
        status,
        due_date: dueDate || null,
        due_time: dueTime || null,
        order_index: 0,
        completed_at: status === 'completed' ? new Date().toISOString() : null,
      });
    }

    onClose();
  };

  const modalTitle = taskToEdit
    ? `${t.common.edit} ${t.tasks.title}`
    : parentId
    ? t.tasks.newSubtask
    : t.tasks.newTask;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono truncate">
            {modalTitle}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - scrollable on mobile */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.tasks.taskTitlePlaceholder}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.tasks.taskDescPlaceholder}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors resize-none"
            />
          </div>

          {/* Scope & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                {t.tasks.scopeLabel}
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as TaskScope)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
              >
                <option value="agenda">{t.agenda.title}</option>
                <option value="freelance">{t.freelance.title}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                {t.freelance.projects}
              </label>
              <select
                disabled={scope !== 'freelance' && scope !== 'projects'}
                value={projectId || ''}
                onChange={(e) => setProjectId(e.target.value || null)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors disabled:opacity-40"
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

          {/* Calendar Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              Calendar
            </label>
            <select
              value={calendarId || ''}
              onChange={(e) => setCalendarId(e.target.value || null)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
            >
              <option value="">Default Calendar</option>
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Optional Date & Time */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg space-y-3">
            <div className="text-[11px] font-mono uppercase text-zinc-400 tracking-wider flex items-center justify-between">
              <span>Date & Time (Both Optional)</span>
              {(dueDate || dueTime) && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate('');
                    setDueTime('');
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 underline lowercase"
                >
                  Clear both
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                  <CalendarIcon className="w-3 h-3 text-zinc-500" />
                  <span>Due Date</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors font-mono"
                  />
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300"
                      title="Clear date"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>Time</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors font-mono"
                  />
                  {dueTime && (
                    <button
                      type="button"
                      onClick={() => setDueTime('')}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300"
                      title="Clear time"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                {t.common.priority}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
              >
                <option value="low">{t.tasks.priorityLow}</option>
                <option value="medium">{t.tasks.priorityMedium}</option>
                <option value="high">{t.tasks.priorityHigh}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
                {t.common.status}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
              >
                <option value="pending">{t.tasks.statusPending}</option>
                <option value="in_progress">{t.tasks.statusInProgress}</option>
                <option value="completed">{t.tasks.statusCompleted}</option>
              </select>
            </div>
          </div>

          {/* Parent Task Selector (Only if not a parent of other tasks and not editing root) */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1">
              {t.tasks.parentTask}
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
            >
              <option value="">{t.tasks.none}</option>
              {rootTasks.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors shadow-sm"
            >
              {taskToEdit ? t.common.save : parentId ? t.tasks.newSubtask : t.tasks.newTask}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
