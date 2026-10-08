import React, { useState } from 'react';
import {
  Plus,
  Briefcase,
  Edit2,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { Project, Task } from '../../types';
import { TaskList } from '../tasks/TaskList';
import { TaskModal } from '../tasks/TaskModal';
import { ProjectModal } from './ProjectModal';

export const FreelanceModule: React.FC = () => {
  const {
    clients,
    projects,
    deleteProject,
    getOrganizedTasks,
  } = useApp();
  const { t } = useTranslation();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalParentId, setTaskModalParentId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || (projects.length > 0 ? projects[0] : null);
  const projectClient = activeProject?.client_id
    ? clients.find((c) => c.id === activeProject.client_id)
    : null;

  // Get tasks for the selected project
  const { pendingTasks, completedTasks } = getOrganizedTasks(
    'freelance',
    activeProject?.id || null
  );

  const handleOpenAddSubtask = (parentId: string) => {
    setTaskModalParentId(parentId);
    setIsTaskModalOpen(true);
  };

  const handleOpenNewTask = () => {
    setTaskModalParentId(null);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Workspace</span>
          </div>
          <h1 className="text-xl font-medium text-zinc-100 tracking-tight mt-1">
            {t.freelance.title}
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Manage your active contracts, deliverables, and client project tasks
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>{t.freelance.newProject}</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-850 rounded-lg bg-zinc-900/20">
          <Briefcase className="w-8 h-8 text-zinc-600 mx-auto mb-3 stroke-[1.5]" />
          <p className="text-xs font-mono text-zinc-400">{t.freelance.noProjects}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Projects Directory List (Left Column) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-1">
              Active Projects ({projects.length})
            </div>

            <div className="space-y-2">
              {projects.map((project) => {
                const isSelected = activeProject?.id === project.id;
                const client = clients.find((c) => c.id === project.client_id);

                return (
                  <div
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-zinc-900/90 border-zinc-600 shadow-sm'
                        : 'bg-zinc-900/30 border-zinc-850 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              project.status === 'completed'
                                ? 'bg-emerald-500'
                                : project.status === 'in_progress'
                                ? 'bg-blue-400'
                                : 'bg-zinc-600'
                            }`}
                          />
                          <h3 className="text-sm font-medium text-zinc-100 tracking-tight line-clamp-1">
                            {project.title}
                          </h3>
                        </div>

                        {client && (
                          <p className="text-xs text-zinc-400 font-mono mt-1 pl-3.5">
                            {client.name} {client.company ? `• ${client.company}` : ''}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingProject(project);
                            setIsProjectModalOpen(true);
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                          title={t.common.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(t.common.confirmDelete)) {
                              deleteProject(project.id);
                            }
                          }}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded transition-colors"
                          title={t.common.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span className="capitalize">{project.status.replace('_', ' ')}</span>
                      {project.deadline && (
                        <span className="flex items-center gap-1 text-zinc-400">
                          <Calendar className="w-3 h-3 text-zinc-500" />
                          {project.deadline}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Project Workspace & Task Breakdown (Right Column) */}
          {activeProject && (
            <div className="lg:col-span-7 space-y-6">
              <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-medium text-zinc-100 tracking-tight">
                      {activeProject.title}
                    </h2>
                    {projectClient && (
                      <p className="text-xs text-zinc-400 font-mono mt-0.5">
                        Client: {projectClient.name} {projectClient.company ? `(${projectClient.company})` : ''}
                      </p>
                    )}
                  </div>

                  <div className="text-right font-mono text-xs text-zinc-400">
                    <div>Budget: € {activeProject.budget || 0}</div>
                    <div className="text-[11px] text-zinc-500">
                      Invoiced: € {activeProject.invoiced_amount || 0}
                    </div>
                  </div>
                </div>

                {activeProject.description && (
                  <p className="text-xs text-zinc-300 leading-relaxed pt-2 border-t border-zinc-850">
                    {activeProject.description}
                  </p>
                )}

                <div className="pt-3 border-t border-zinc-850 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                    <span className="text-zinc-500">Status:</span>
                    <span className="capitalize text-zinc-200">
                      {activeProject.status.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenNewTask}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
                  >
                    <Plus className="w-3 h-3 stroke-[2.5]" />
                    <span>{t.tasks.newTask}</span>
                  </button>
                </div>
              </div>

              {/* Tasks for this project */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">
                    {t.freelance.projectTasks}
                  </h3>
                  <span className="text-xs font-mono text-zinc-500">
                    {pendingTasks.length} pending
                  </span>
                </div>

                <TaskList
                  pendingTasks={pendingTasks}
                  completedTasks={completedTasks}
                  onAddSubtask={handleOpenAddSubtask}
                  onEditTask={(task) => {
                    setEditingTask(task);
                    setIsTaskModalOpen(true);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        initialProject={editingProject}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        taskToEdit={editingTask}
        defaultScope="freelance"
        defaultProjectId={activeProject?.id || null}
        defaultParentId={taskModalParentId}
      />
    </div>
  );
};
