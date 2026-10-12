import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Building2,
  Briefcase,
  Clock,
} from 'lucide-react';
import { Project, ProjectStatus, Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { ProjectModal } from './ProjectModal';
import { TaskModal } from '../tasks/TaskModal';

export const ProjectsModule: React.FC = () => {
  const {
    projects,
    clients,
    tasks,
    deleteProject,
    addTask,
    toggleTaskCompletion,
  } = useApp();
  const { t } = useTranslation();

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTasksProjectId, setExpandedTasksProjectId] = useState<string | null>(null);
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<string, string>>({});

  // Client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, (typeof clients)[0]>();
    for (const c of clients) {
      map.set(c.id, c);
    }
    return map;
  }, [clients]);

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesStatus =
        statusFilter === 'all' ? true : p.status === statusFilter;

      const client = p.client_id ? clientMap.get(p.client_id) : null;
      const clientName = client ? client.name.toLowerCase() : '';
      const clientCompany = client?.company ? client.company.toLowerCase() : '';
      const q = searchFilter.toLowerCase().trim();

      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        clientName.includes(q) ||
        clientCompany.includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [projects, statusFilter, searchFilter, clientMap]);

  // Project Metrics
  const activeCount = projects.filter((p) => p.status === 'in_progress').length;
  const completedCount = projects.filter((p) => p.status === 'completed').length;
  const totalBudget = projects.reduce((acc, p) => acc + (Number(p.budget) || 0), 0);
  const totalInvoiced = projects.reduce((acc, p) => acc + (Number(p.invoiced_amount) || 0), 0);

  const handleOpenNew = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to delete project "${title}"?`)) {
      deleteProject(id);
    }
  };

  const toggleAccordion = (projectId: string) => {
    setExpandedTasksProjectId((prev) => (prev === projectId ? null : projectId));
  };

  const handleInlineAddTask = (projectId: string) => {
    const text = inlineTaskTitles[projectId]?.trim();
    if (!text) return;

    addTask({
      title: text,
      scope: 'projects',
      project_id: projectId,
      status: 'pending',
      priority: 'medium',
      order_index: 0,
    });

    setInlineTaskTitles((prev) => ({ ...prev, [projectId]: '' }));
  };

  const getStatusIndicator = (status: ProjectStatus) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Completed</span>
          </div>
        );
      case 'in_progress':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>In Progress</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span>Pending</span>
          </div>
        );
      case 'archived':
        return (
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Archived</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Top Header & New Project Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-850 pb-5">
        <div>
          <h1 className="text-xl font-medium text-zinc-100 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            <span>{t.projects?.title || 'Projects'}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            {t.projects?.subtitle || 'Manage client deliverables, internal roadmaps, and project tasks'}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t.projects?.newProject || 'New Project'}</span>
        </button>
      </div>

      {/* KPI / Metrics Overview Cards with Tasteful Colors */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-amber-500/40 rounded-xl space-y-1 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{t.projects?.activeProjects || 'Active Projects'}</span>
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          </div>
          <p className="text-2xl font-semibold font-mono text-zinc-100">{activeCount}</p>
        </div>

        <div className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 rounded-xl space-y-1 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{t.projects?.completedProjects || 'Completed'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-2xl font-semibold font-mono text-zinc-100">{completedCount}</p>
        </div>

        <div className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-indigo-500/40 rounded-xl space-y-1 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{t.projects?.totalBudget || 'Total Budget'}</span>
            <span className="w-2 h-2 rounded-full bg-indigo-400" />
          </div>
          <p className="text-2xl font-semibold font-mono text-zinc-100">
            €{totalBudget.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-zinc-900/70 border border-zinc-800 hover:border-emerald-500/40 rounded-xl space-y-1 transition-all">
          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>{t.projects?.totalEarned || 'Invoiced'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
          <p className="text-2xl font-semibold font-mono text-emerald-400">
            €{totalInvoiced.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs font-mono overflow-x-auto">
          {['all', 'in_progress', 'pending', 'completed', 'archived'].map((statusKey) => (
            <button
              key={statusKey}
              type="button"
              onClick={() => setStatusFilter(statusKey)}
              className={`px-3 py-1 rounded transition-colors whitespace-nowrap capitalize ${
                statusFilter === statusKey
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {statusKey === 'all' ? 'All' : statusKey.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search projects or clients..."
            className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-indigo-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Projects List / Cards */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 border border-zinc-850 rounded-xl space-y-4">
          <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-300">
              {t.projects?.noProjects || 'No projects registered yet.'}
            </p>
            <p className="text-xs text-zinc-500 font-mono">
              Create your first project to organize tasks, track budgets, and manage clients.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.projects?.newProject || 'New Project'}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredProjects.map((project) => {
            const client = project.client_id ? clientMap.get(project.client_id) : null;
            const projectTasks = tasks.filter((t) => t.project_id === project.id);
            const completedProjectTasks = projectTasks.filter(
              (t) => t.status === 'completed'
            ).length;
            const progressPercent =
              projectTasks.length > 0
                ? Math.round((completedProjectTasks / projectTasks.length) * 100)
                : 0;
            const isExpanded = expandedTasksProjectId === project.id;

            const isOverdue =
              project.deadline &&
              new Date(project.deadline) < new Date() &&
              project.status !== 'completed';

            return (
              <div
                key={project.id}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-indigo-500/40 rounded-xl p-5 sm:p-6 space-y-4 card-hover shadow-sm group"
              >
                {/* Project Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-base font-medium text-zinc-100 group-hover:text-white transition-colors tracking-tight truncate">
                        {project.title}
                      </h2>
                      {getStatusIndicator(project.status)}
                    </div>

                    {/* Client & Deadline Meta (Strictly no badges) */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
                      {client ? (
                        <div className="flex items-center gap-1.5 text-zinc-300">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{client.name}</span>
                          {client.company && (
                            <span className="text-zinc-500 font-normal">({client.company})</span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-zinc-500">
                          <Briefcase className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                          <span>Internal Project</span>
                        </div>
                      )}

                      {project.deadline && (
                        <div className="flex items-center gap-1">
                          <Clock className={`w-3 h-3 ${isOverdue ? 'text-rose-400' : 'text-zinc-500'}`} />
                          <span className={isOverdue ? 'text-rose-400' : 'text-zinc-400'}>
                            {new Date(project.deadline).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleEdit(project)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
                      title="Edit Project"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(project.id, project.title)}
                      className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                      title="Delete Project"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Financials Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-xs font-mono">
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Budget</span>
                    <span className="text-zinc-200 font-medium">
                      €{(Number(project.budget) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Quoted</span>
                    <span className="text-zinc-200 font-medium">
                      €{(Number(project.quoted_price) || 0).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 text-[10px] block">Invoiced</span>
                    <span className="text-emerald-400 font-semibold">
                      €{(Number(project.invoiced_amount) || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar & Tasks Section */}
                <div className="pt-2 border-t border-zinc-800/60 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">Tasks Progress</span>
                      <span className="text-zinc-500">({progressPercent}%)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAccordion(project.id)}
                      className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
                    >
                      <span>
                        {projectTasks.length === 0
                          ? 'No tasks'
                          : `${completedProjectTasks}/${projectTasks.length} tasks`}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/80">
                    <div
                      style={{ width: `${progressPercent}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    />
                  </div>

                  {/* Tasks Drawer Accordion */}
                  {isExpanded && (
                    <div className="mt-3 space-y-2.5 animate-fade-in">
                      {/* Tasks List */}
                      {projectTasks.length > 0 ? (
                        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                          {projectTasks.map((t) => {
                            const isDone = t.status === 'completed';
                            return (
                              <div
                                key={t.id}
                                className={`flex items-center justify-between p-2 rounded text-xs font-mono transition-all group/task ${
                                  isDone
                                    ? 'bg-zinc-950/40 border border-zinc-800/60 opacity-60'
                                    : 'bg-zinc-950/70 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/60'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => toggleTaskCompletion(t.id)}
                                    className="text-zinc-500 hover:text-emerald-400 transition-colors shrink-0"
                                  >
                                    {isDone ? (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                      <Circle className="w-4 h-4" />
                                    )}
                                  </button>
                                  <span
                                    className={`truncate ${
                                      isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                                    }`}
                                  >
                                    {t.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-[10px] shrink-0">
                                  {t.priority === 'high' && (
                                    <span className="text-rose-400 font-semibold">HIGH</span>
                                  )}
                                  {t.priority === 'medium' && (
                                    <span className="text-amber-400">MED</span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setEditingTask(t)}
                                    className="p-1 text-zinc-500 hover:text-zinc-200 opacity-60 group-hover/task:opacity-100 rounded transition-opacity"
                                    title="Edit task"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-500 font-mono py-1">
                          No tasks assigned to this project yet.
                        </p>
                      )}

                      {/* Inline Quick-Add Task */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={inlineTaskTitles[project.id] || ''}
                          onChange={(e) =>
                            setInlineTaskTitles((prev) => ({
                              ...prev,
                              [project.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleInlineAddTask(project.id);
                            }
                          }}
                          placeholder={t.projects?.addTaskToProject || 'Add task to project and press Enter...'}
                          className="flex-1 px-3 py-1.5 text-xs font-mono bg-zinc-950 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-600 focus:border-indigo-500/80 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => handleInlineAddTask(project.id)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono rounded transition-colors shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Create / Edit Modal */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        projectToEdit={editingProject}
      />

      {/* Task Edit Modal */}
      <TaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        taskToEdit={editingTask}
        defaultScope="projects"
      />
    </div>
  );
};
