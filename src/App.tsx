import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useTranslation } from './context/LanguageContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DesktopInstallBanner } from './components/common/DesktopInstallBanner';
import { AuthModal } from './components/auth/AuthModal';
import { DailyAgendaModule } from './components/agenda/DailyAgendaModule';
import { AllTasksView } from './components/tasks/AllTasksView';
import { ProjectsModule } from './components/projects/ProjectsModule';
import { ClientsModule } from './components/clients/ClientsModule';
import { AccountPage } from './components/account/AccountPage';
import { PrivacyPolicyPage } from './components/legal/PrivacyPolicyPage';
import { TermsOfServicePage } from './components/legal/TermsOfServicePage';
import { NotFoundPage } from './components/common/NotFoundPage';
import { PlatformPresentation } from './components/presentation/PlatformPresentation';
import { TaskModal } from './components/tasks/TaskModal';
import {
  Calendar,
  ListTodo,
  FolderKanban,
  Users,
  User as UserIcon,
} from 'lucide-react';
import { NavigationModule } from './types';

export const App: React.FC = () => {
  const { activeModule, setActiveModule } = useApp();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);

  const mobileNavItems: { id: NavigationModule; label: string; icon: React.ElementType }[] = [
    { id: 'agenda', label: t.nav.agenda, icon: Calendar },
    { id: 'tasks', label: t.nav.allTasks, icon: ListTodo },
    { id: 'projects', label: t.nav.projects || 'Projects', icon: FolderKanban },
    { id: 'clients', label: t.nav.clients, icon: Users },
    { id: 'account', label: t.nav.account, icon: UserIcon },
  ];

  const renderContent = () => {
    // Universal home presentation, legal, and 404 routes accessible to everyone
    if (activeModule === 'home') return <PlatformPresentation />;
    if (activeModule === 'privacy') return <PrivacyPolicyPage />;
    if (activeModule === 'terms') return <TermsOfServicePage />;
    if (activeModule === '404') return <NotFoundPage />;

    // If user is not authenticated, show platform presentation landing page
    if (!user) {
      return <PlatformPresentation />;
    }

    // Authenticated workspace modules
    switch (activeModule) {
      case 'agenda':
        return <DailyAgendaModule />;
      case 'tasks':
        return <AllTasksView />;
      case 'projects':
        return <ProjectsModule />;
      case 'clients':
        return <ClientsModule />;
      case 'account':
        return <AccountPage />;
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/25 selection:text-indigo-100">
      {/* Desktop App Installation Banner */}
      <DesktopInstallBanner />

      {/* Top Header */}
      <Header onOpenNewTask={() => setIsGlobalTaskModalOpen(true)} />

      {/* Main Layout Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Only visible when user is logged in AND not on 404 or home page */}
        {user && activeModule !== '404' && activeModule !== 'home' && <Sidebar />}

        {/* Dynamic Workspace Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full pb-20 md:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop, and only shown when authenticated and not on 404 or home) */}
      {user && activeModule !== '404' && activeModule !== 'home' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-850 px-2 py-2 flex items-center justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded text-[10px] font-mono transition-colors ${
                  isActive
                    ? 'text-indigo-300 font-semibold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[60px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Global Task Creation Modal */}
      {user && (
        <TaskModal
          isOpen={isGlobalTaskModalOpen}
          onClose={() => setIsGlobalTaskModalOpen(false)}
          defaultScope={activeModule === 'projects' ? 'projects' : 'agenda'}
        />
      )}

      {/* Auth Modal (Sign In / Sign Up with Interactive Blobatar) */}
      <AuthModal />
    </div>
  );
};
