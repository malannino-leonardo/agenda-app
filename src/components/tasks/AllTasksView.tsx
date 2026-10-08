import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { TaskScope, Task } from '../../types';
import { TaskList } from './TaskList';
import { TaskModal } from './TaskModal';

export const AllTasksView: React.FC = () => {
  const { getOrganizedTasks } = useApp();
  const { t } = useTranslation();

  const [scopeFilter, setScopeFilter] = useState<TaskScope | 'all'>('all');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalParentId, setTaskModalParentId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const effectiveScope = scopeFilter === 'all' ? undefined : scopeFilter;
  const { pendingTasks, completedTasks } = getOrganizedTasks(effectiveScope);

  const handleOpenAddSubtask = (parentId: string) => {
    setEditingTask(null);
    setTaskModalParentId(parentId);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTask = () => {
    setEditingTask(null);
    setTaskModalParentId(null);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalParentId(null);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      {/* Title & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-4">
        <div>
          <h2 className="text-xl font-medium text-zinc-100 tracking-tight">
            {t.tasks.title}
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-0.5">
            {pendingTasks.length} {t.tasks.todoSection.toLowerCase()} · {completedTasks.length} {t.tasks.completedSection.toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Scope Filters */}
          <div className="flex items-center gap-1.5 bg-zinc-900/60 p-1 border border-zinc-800 rounded">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                scopeFilter === 'all'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.common.all}
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('agenda')}
              className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                scopeFilter === 'agenda'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.agenda.title}
            </button>
            <button
              type="button"
              onClick={() => setScopeFilter('freelance')}
              className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                scopeFilter === 'freelance'
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.nav.freelance}
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenNewTask}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.tasks.newTask}</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      <TaskList
        pendingTasks={pendingTasks}
        completedTasks={completedTasks}
        onAddSubtask={handleOpenAddSubtask}
        onEditTask={handleEditTask}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
        defaultScope={scopeFilter === 'all' ? 'agenda' : scopeFilter}
        defaultParentId={taskModalParentId}
      />
    </div>
  );
};
