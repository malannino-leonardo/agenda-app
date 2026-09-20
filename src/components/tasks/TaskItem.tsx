import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Trash2,
  Calendar,
  Clock,
  Briefcase,
  FileText,
} from 'lucide-react';
import { Task } from '../../types';
import { QuickCompleteButton } from './QuickCompleteButton';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface TaskItemProps {
  task: Task;
  onAddSubtask?: (parentId: string) => void;
  isNested?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onAddSubtask,
  isNested = false,
}) => {
  const { toggleTaskCompletion, deleteTask, projects } = useApp();
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);

  const isCompleted = task.status === 'completed';
  const hasSubtasks = Boolean(task.subtasks && task.subtasks.length > 0);

  // Associated project metadata
  const linkedProject = task.project_id
    ? projects.find((p) => p.id === task.project_id)
    : null;

  const getPriorityLabel = () => {
    switch (task.priority) {
      case 'high':
        return t.tasks.priorityHigh;
      case 'medium':
        return t.tasks.priorityMedium;
      case 'low':
        return t.tasks.priorityLow;
      default:
        return '';
    }
  };

  const getPriorityStyle = () => {
    switch (task.priority) {
      case 'high':
        return { dot: 'bg-rose-400', text: 'text-rose-400/90', borderHover: 'hover:border-rose-500/30' };
      case 'medium':
        return { dot: 'bg-amber-400', text: 'text-amber-400/90', borderHover: 'hover:border-amber-500/30' };
      case 'low':
        return { dot: 'bg-emerald-400/80', text: 'text-emerald-400/80', borderHover: 'hover:border-emerald-500/30' };
      default:
        return { dot: 'bg-zinc-600', text: 'text-zinc-500', borderHover: 'hover:border-zinc-700' };
    }
  };

  const priorityStyle = getPriorityStyle();

  return (
    <div className={`group/item transition-colors duration-150 ${isNested ? 'pt-2' : 'py-1'}`}>
      <div
        className={`flex items-start gap-3 p-3 rounded-md transition-all duration-150 ${
          isCompleted
            ? 'bg-zinc-950/40 text-zinc-500 border border-zinc-900/60'
            : `bg-zinc-900/40 hover:bg-zinc-900/80 text-zinc-200 border border-zinc-800/80 ${priorityStyle.borderHover} hover:shadow-sm`
        }`}
      >
        {/* Quick icon-only complete button */}
        <div className="pt-0.5">
          <QuickCompleteButton
            isCompleted={isCompleted}
            onToggle={() => toggleTaskCompletion(task.id)}
            size={isNested ? 'sm' : 'md'}
          />
        </div>

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Title */}
            <span
              className={`text-sm font-medium tracking-tight ${
                isCompleted ? 'line-through text-zinc-500' : 'text-zinc-100'
              }`}
            >
              {task.title}
            </span>

            {/* Scope / Association Text (Strictly no badges) */}
            {linkedProject && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-indigo-400">
                <Briefcase className="w-3 h-3 text-indigo-400" />
                <span>{linkedProject.title}</span>
              </span>
            )}

            {task.scope === 'agenda' && !linkedProject && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500">
                <FileText className="w-3 h-3 text-zinc-600" />
                <span>{t.agenda.today}</span>
              </span>
            )}
          </div>

          {/* Optional Description */}
          {task.description && (
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed max-w-2xl font-mono">
              {task.description}
            </p>
          )}

          {/* Minimal metadata row (Strictly no badges) */}
          <div className="flex items-center gap-4 mt-2 text-[11px] font-mono text-zinc-500">
            {/* Priority dot + label */}
            <span className={`inline-flex items-center gap-1.5 ${priorityStyle.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
              <span>{getPriorityLabel()}</span>
            </span>

            {/* In-progress status text */}
            {task.status === 'in_progress' && (
              <span className="inline-flex items-center gap-1 text-amber-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>{t.tasks.statusInProgress}</span>
              </span>
            )}

            {/* Due date */}
            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <Calendar className="w-3 h-3 text-zinc-500" />
                <span>{task.due_date}</span>
              </span>
            )}

            {/* Subtask count indicator */}
            {hasSubtasks && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <span>
                  {task.subtasks?.filter((s) => s.status === 'completed').length}/
                  {task.subtasks?.length} {t.tasks.subtasks.toLowerCase()}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 opacity-60 group-hover/item:opacity-100 transition-opacity">
          {onAddSubtask && !isNested && (
            <button
              type="button"
              onClick={() => onAddSubtask(task.id)}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors focus:outline-none"
              title={t.tasks.newSubtask}
              aria-label={t.tasks.newSubtask}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => deleteTask(task.id)}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors focus:outline-none"
            title={t.common.delete}
            aria-label={t.common.delete}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Nested Subtasks Container */}
      {hasSubtasks && isExpanded && (
        <div className="mt-1 pl-4 ml-3 border-l border-zinc-800/80 space-y-1">
          {task.subtasks!.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              isNested={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};
