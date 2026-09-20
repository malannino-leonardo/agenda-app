import React from 'react';
import {
  ListTodo,
  Calendar,
  FolderKanban,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { NavigationModule } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, tasks, projects, clients } = useApp();
  const { t } = useTranslation();

  const pendingTasksCount = tasks.filter((t) => t.status !== 'completed').length;
  const pendingAgendaCount = tasks.filter(
    (t) => t.due_date && t.status !== 'completed'
  ).length;

  const primaryNavItems: {
    id: NavigationModule;
    label: string;
    icon: React.ElementType;
    count?: number;
    color: string;
    hoverColor: string;
    activeBg: string;
  }[] = [
    {
      id: 'agenda',
      label: t.nav.agenda,
      icon: Calendar,
      count: pendingAgendaCount,
      color: 'text-emerald-400',
      hoverColor: 'group-hover:text-emerald-300',
      activeBg: 'bg-emerald-950/30 text-emerald-100 border-l-2 border-emerald-500',
    },
    {
      id: 'tasks',
      label: t.nav.allTasks,
      icon: ListTodo,
      count: pendingTasksCount,
      color: 'text-amber-400',
      hoverColor: 'group-hover:text-amber-300',
      activeBg: 'bg-amber-950/30 text-amber-100 border-l-2 border-amber-500',
    },
    {
      id: 'projects',
      label: t.nav.projects || 'Projects',
      icon: FolderKanban,
      count: projects.length,
      color: 'text-indigo-400',
      hoverColor: 'group-hover:text-indigo-300',
      activeBg: 'bg-indigo-950/30 text-indigo-100 border-l-2 border-indigo-500',
    },
    {
      id: 'clients',
      label: t.nav.clients,
      icon: Users,
      count: clients.length,
      color: 'text-sky-400',
      hoverColor: 'group-hover:text-sky-300',
      activeBg: 'bg-sky-950/30 text-sky-100 border-l-2 border-sky-500',
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-850 bg-zinc-950 p-4 hidden md:flex md:flex-col justify-between min-h-[calc(100vh-3.5rem)] select-none">
      {/* Top Workspace Navigation */}
      <div className="space-y-6">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest px-3 mb-3">
            {t.common.overview}
          </div>
          <nav className="space-y-1.5">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`group w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all duration-150 ${
                    isActive
                      ? `${item.activeBg} font-medium shadow-sm`
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? item.color : `text-zinc-500 ${item.hoverColor}`
                      }`}
                    />
                    <span className="font-mono">{item.label}</span>
                  </div>

                  {typeof item.count === 'number' && (
                    <span
                      className={`font-mono text-[11px] ${
                        isActive ? 'text-zinc-300 font-semibold' : 'text-zinc-600 group-hover:text-zinc-400'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Section: Legal Links & Status */}
      <div className="mt-auto pt-4 space-y-4">

        {/* Footer Links & Status */}
        <div className="px-2 space-y-2 border-t border-zinc-900 pt-3">
          <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-600">
            <button
              type="button"
              onClick={() => setActiveModule('privacy')}
              className={`hover:text-zinc-400 transition-colors ${
                activeModule === 'privacy' ? 'text-zinc-300 font-semibold' : ''
              }`}
            >
              Privacy
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => setActiveModule('terms')}
              className={`hover:text-zinc-400 transition-colors ${
                activeModule === 'terms' ? 'text-zinc-300 font-semibold' : ''
              }`}
            >
              Terms
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-600">
            <span>v1.2.0</span>
            <span className="text-emerald-500 font-semibold">SYNCED</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
