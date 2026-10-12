import React from 'react';
import {
  ListTodo,
  Calendar,
  FolderKanban,
  Users,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { NavigationModule } from '../../types';

export const Sidebar: React.FC = () => {
  const { activeModule, setActiveModule, tasks, projects, clients, isDataLoading, refreshData } = useApp();
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
    indicatorColor: string;
  }[] = [
    {
      id: 'agenda',
      label: t.nav.agenda,
      icon: Calendar,
      count: pendingAgendaCount,
      color: 'text-emerald-400',
      hoverColor: 'group-hover:text-emerald-300',
      activeBg: 'bg-emerald-950/30 text-emerald-100',
      indicatorColor: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    },
    {
      id: 'tasks',
      label: t.nav.allTasks,
      icon: ListTodo,
      count: pendingTasksCount,
      color: 'text-amber-400',
      hoverColor: 'group-hover:text-amber-300',
      activeBg: 'bg-amber-950/30 text-amber-100',
      indicatorColor: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
    },
    {
      id: 'projects',
      label: t.nav.projects || 'Projects',
      icon: FolderKanban,
      count: projects.length,
      color: 'text-indigo-400',
      hoverColor: 'group-hover:text-indigo-300',
      activeBg: 'bg-indigo-950/30 text-indigo-100',
      indicatorColor: 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]',
    },
    {
      id: 'clients',
      label: t.nav.clients,
      icon: Users,
      count: clients.length,
      color: 'text-sky-400',
      hoverColor: 'group-hover:text-sky-300',
      activeBg: 'bg-sky-950/30 text-sky-100',
      indicatorColor: 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]',
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-zinc-850 bg-zinc-950 p-3 sm:p-3.5 hidden md:flex md:flex-col justify-between h-full overflow-hidden select-none">
      {/* Top Workspace Navigation */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between px-3 mb-2.5">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest font-semibold">
              {t.common.overview}
            </span>
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
          </div>

          <nav className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`group relative w-full flex items-center justify-between pl-3 pr-2.5 py-2 rounded text-xs transition-all duration-150 active:scale-[0.98] overflow-hidden ${
                    isActive
                      ? `${item.activeBg} font-medium shadow-sm`
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 hover:translate-x-0.5'
                  }`}
                >
                  {/* Sliding vertical active indicator bar */}
                  <span
                    className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r transition-all duration-200 ease-out ${
                      isActive
                        ? `${item.indicatorColor} opacity-100 scale-y-100`
                        : 'opacity-0 scale-y-0 group-hover:opacity-40 group-hover:scale-y-50'
                    }`}
                  />

                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-4 h-4 transition-transform duration-150 ease-out group-hover:scale-110 ${
                        isActive ? item.color : `text-zinc-500 ${item.hoverColor}`
                      }`}
                    />
                    <span className="font-mono">{item.label}</span>
                  </div>

                  {typeof item.count === 'number' && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.5 rounded transition-all duration-150 ${
                        isActive
                          ? 'bg-zinc-800/90 text-zinc-200 font-semibold shadow-inner'
                          : 'text-zinc-500 bg-zinc-900/50 group-hover:text-zinc-300 group-hover:bg-zinc-850'
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
      <div className="mt-auto pt-3 space-y-2 shrink-0 border-t border-zinc-900">
        <div className="px-2 space-y-2">
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
            <button
              type="button"
              onClick={() => refreshData()}
              disabled={isDataLoading}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors group cursor-pointer"
              title="Click to sync workspace"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isDataLoading ? 'bg-amber-400 animate-ping' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className="font-semibold tracking-wider text-[10px]">
                {isDataLoading ? 'SYNCING...' : 'SYNCED'}
              </span>
              <RefreshCw
                className={`w-2.5 h-2.5 transition-transform duration-300 ${
                  isDataLoading ? 'animate-spin text-amber-400' : 'group-hover:rotate-180 text-zinc-600 group-hover:text-zinc-400'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
