import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { TaskScope, TaskPriority, TaskStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultScope?: TaskScope;
  defaultProjectId?: string | null;
  defaultParentId?: string | null;
  defaultDueDate?: string | null;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  defaultScope = 'agenda',
  defaultProjectId = null,
  defaultParentId = null,
  defaultDueDate = null,
}) => {
  const { addTask, projects, tasks } = useApp();
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<TaskScope>(defaultScope);
  const [projectId, setProjectId] = useState<string | null>(defaultProjectId);
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState(defaultDueDate || '');

  useEffect(() => {
    setScope(defaultScope);
    setProjectId(defaultProjectId);
    setParentId(defaultParentId);
    setDueDate(defaultDueDate || '');
  }, [defaultScope, defaultProjectId, defaultParentId, defaultDueDate]);

  if (!isOpen) return null;

  // Potential parent tasks (exclude tasks that are already subtasks)
  const rootTasks = tasks.filter((t) => !t.parent_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim() || undefined,
      scope,
      project_id: scope === 'freelance' ? projectId : null,
      parent_id: parentId || null,
      priority,
      status,
      due_date: dueDate || null,
      order_index: 0,
      completed_at: status === 'completed' ? new Date().toISOString() : null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h3 className="text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
            {parentId ? t.tasks.newSubtask : t.tasks.newTask}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              Title <span className="text-red-400">*</span>
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
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.tasks.taskDescPlaceholder}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors"
            />
          </div>

          {/* Scope Selector */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
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

            {/* Project Select (only if freelance scope) */}
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                {t.freelance.projects}
              </label>
              <select
                disabled={scope !== 'freelance'}
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

          {/* Priority, Status & Due Date */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
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
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
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

            <div>
              <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                {t.common.dueDate}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors font-mono"
              />
            </div>
          </div>

          {/* Parent Task Selector */}
          <div>
            <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
              {t.tasks.parentTask}
            </label>
            <select
              value={parentId || ''}
              onChange={(e) => setParentId(e.target.value || null)}
              className="w-full px-3 py-2 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors"
            >
              <option value="">{t.tasks.none}</option>
              {rootTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-850">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
            >
              {parentId ? t.tasks.newSubtask : t.tasks.newTask}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
