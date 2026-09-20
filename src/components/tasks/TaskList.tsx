import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { Task } from '../../types';
import { TaskItem } from './TaskItem';
import { useTranslation } from '../../context/LanguageContext';

interface TaskListProps {
  pendingTasks: Task[];
  completedTasks: Task[];
  onAddSubtask?: (parentId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  pendingTasks,
  completedTasks,
  onAddSubtask,
}) => {
  const { t } = useTranslation();
  const [completedCollapsed, setCompletedCollapsed] = useState(false);

  return (
    <div className="space-y-8">
      {/* SECTION 1: STUFF TO DO (Pending & In Progress) */}
      <section>
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Circle className="w-3.5 h-3.5 text-zinc-400 stroke-[2.5]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-300">
              {t.tasks.todoSection}
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-500">
            {pendingTasks.length} {t.tasks.itemsCount}
          </span>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="py-8 text-center text-zinc-600 text-sm border border-dashed border-zinc-900 rounded-md">
            {t.tasks.noTasks}
          </div>
        ) : (
          <div className="space-y-1">
            {pendingTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onAddSubtask={onAddSubtask}
              />
            ))}
          </div>
        )}
      </section>

      {/* SECTION 2: STUFF ALREADY DONE (Completed) */}
      <section>
        <div
          onClick={() => setCompletedCollapsed(!completedCollapsed)}
          className="flex items-center justify-between pb-3 mb-2 border-b border-zinc-900 cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
              aria-label="Toggle completed tasks"
            >
              {completedCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
            <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-zinc-400 group-hover:text-zinc-200 transition-colors">
              {t.tasks.completedSection}
            </h2>
          </div>
          <span className="text-xs font-mono text-zinc-600">
            {completedTasks.length} {t.tasks.itemsCount}
          </span>
        </div>

        {!completedCollapsed && (
          <div>
            {completedTasks.length === 0 ? (
              <div className="py-6 text-center text-zinc-700 text-sm">
                {t.tasks.noCompletedTasks}
              </div>
            ) : (
              <div className="space-y-1 opacity-75 hover:opacity-100 transition-opacity">
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onAddSubtask={onAddSubtask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
