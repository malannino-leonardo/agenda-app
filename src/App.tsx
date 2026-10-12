import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import { useTranslation } from './context/LanguageContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DesktopInstallBanner } from './components/common/DesktopInstallBanner';
import { AuthModal } from './components/auth/AuthModal';
import { GuestAccessModal } from './components/agenda/GuestAccessModal';
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
  Loader2,
} from 'lucide-react';
import { NavigationModule } from './types';

export const App: React.FC = () => {
  const { activeModule, setActiveModule, guestEmail } = useApp();
  const { user, isLoading } = useAuth();
  const { t } = useTranslation();
  const [isGlobalTaskModalOpen, setIsGlobalTaskModalOpen] = useState(false);

  // If loading has completed and user is not authenticated on a protected route, redirect to home
  React.useEffect(() => {
    if (!isLoading && !user) {
      const protectedModules: NavigationModule[] = ['tasks', 'projects', 'clients'];
      if (protectedModules.includes(activeModule)) {
        setActiveModule('home');
      } else if (activeModule === 'agenda' && !guestEmail) {
        setActiveModule('home');
      }
    }
  }, [isLoading, user, guestEmail, activeModule, setActiveModule]);

  const mobileNavItems: { id: NavigationModule; label: string; icon: React.ElementType }[] = [
    { id: 'agenda', label: t.nav.agenda, icon: Calendar },
    { id: 'tasks', label: t.nav.allTasks, icon: ListTodo },
    { id: 'projects', label: t.nav.projects || 'Projects', icon: FolderKanban },
    { id: 'clients', label: t.nav.clients, icon: Users },
    { id: 'account', label: t.nav.account, icon: UserIcon },
  ];

  const renderContent = () => {
    // Universal legal and 404 routes accessible to everyone
    if (activeModule === 'privacy') return <PrivacyPolicyPage />;
    if (activeModule === 'terms') return <TermsOfServicePage />;
    if (activeModule === '404') return <NotFoundPage />;
    if (activeModule === 'account') return <AccountPage />;

    // When auth is still loading and user is not yet known:
    // Prevent the landing page (index) from flashing on reload of non-index pages!
    if (isLoading && !user) {
      if (activeModule === 'home') return <PlatformPresentation />;
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] gap-3 text-zinc-500 font-mono text-xs animate-fade-in">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
          <span>Loading...</span>
        </div>
      );
    }

    // Index presentation route: accessible to everyone, including authenticated users
    if (activeModule === 'home') {
      return <PlatformPresentation />;
    }

    // If user is not authenticated, check if guest has access to agenda
    if (!user) {
      if (guestEmail && activeModule === 'agenda') {
        return <DailyAgendaModule />;
      }
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
      default:
        return <NotFoundPage />;
    }
  };

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/25 selection:text-indigo-100 overflow-hidden">
      {/* Desktop App Installation Banner */}
      <DesktopInstallBanner />

      {/* Top Header */}
      <Header onOpenNewTask={() => setIsGlobalTaskModalOpen(true)} />

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar: Only visible when user is logged in AND not on 404 or home page */}
        {user && activeModule !== '404' && activeModule !== 'home' && <Sidebar />}

        {/* Dynamic Workspace Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 max-w-7xl mx-auto w-full pb-24 md:pb-8">
          {renderContent()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop, with safe-area support and min 44px touch targets) */}
      {user && activeModule !== '404' && activeModule !== 'home' && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-850 px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))] flex items-center justify-around shadow-2xl">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeModule === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] min-w-[48px] px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                  isActive
                    ? 'text-indigo-400 font-semibold bg-zinc-900/60'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[56px] text-[10px]">{item.label}</span>
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

      {/* Guest Calendar Access Modal */}
      <GuestAccessModal />

      {/* Auth Modal (Sign In / Sign Up with Interactive Blobatar) */}
      <AuthModal />
    </div>
  );
};
