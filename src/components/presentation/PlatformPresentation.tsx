import React from 'react';
import {
  Calendar,
  ListTodo,
  Briefcase,
  ArrowRight,
  Eye,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/LanguageContext';
import { useApp } from '../../context/AppContext';

export const PlatformPresentation: React.FC = () => {
  const { user, openSignIn, openSignUp } = useAuth();
  const { t } = useTranslation();
  const { setActiveModule, openGuestAccess } = useApp();

  const features = [
    {
      icon: Calendar,
      title: t.presentation.agendaTitle,
      description: t.presentation.agendaDesc,
    },
    {
      icon: ListTodo,
      title: t.presentation.tasksTitle,
      description: t.presentation.tasksDesc,
    },
    {
      icon: Briefcase,
      title: t.presentation.freelanceTitle,
      description: t.presentation.freelanceDesc,
    },
    {
      icon: Eye,
      title: t.presentation.blobatarTitle,
      description: t.presentation.blobatarDesc,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-8 sm:py-16 px-4 animate-fade-in">
      {/* Hero Section (No badges) */}
      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <h1 className="text-3xl sm:text-5xl font-medium tracking-tight text-zinc-100 leading-tight">
          {t.presentation.heroTitle}
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed font-mono max-w-2xl mx-auto">
          {t.presentation.heroSubtitle}
        </p>

        {/* Hero Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {user ? (
            <button
              type="button"
              onClick={() => setActiveModule('agenda')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-lg"
            >
              <span>Open Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={openSignUp}
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors shadow-lg"
              >
                <span>{t.presentation.getStarted}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={openSignIn}
                className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors"
              >
                <span>{t.presentation.signIn}</span>
              </button>
              <button
                type="button"
                onClick={openGuestAccess}
                className="inline-flex items-center gap-2 px-5 py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors"
              >
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>View Shared Calendar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Features Showcase Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-medium text-zinc-100 tracking-tight">
            {t.presentation.featuresTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 bg-zinc-900/80 border border-zinc-800 rounded-lg space-y-3 hover:border-zinc-700/80 hover:bg-zinc-900 transition-all duration-200 shadow-sm"
              >
                <div className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center text-zinc-300">
                  <Icon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-medium text-zinc-100 tracking-tight font-mono">
                  {item.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ready Banner */}
      <div className="p-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center space-y-4">
        <h3 className="text-lg font-medium text-zinc-100">
          {t.presentation.readyPrompt}
        </h3>
        <div className="flex justify-center gap-3">
          {user ? (
            <button
              type="button"
              onClick={() => setActiveModule('agenda')}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors"
            >
              Open Workspace
            </button>
          ) : (
            <button
              type="button"
              onClick={openSignUp}
              className="px-5 py-2.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium text-xs font-mono uppercase tracking-wider rounded transition-colors"
            >
              {t.presentation.getStarted}
            </button>
          )}
        </div>
      </div>

      {/* Footer Legal Links & Discreet Credit */}
      <footer className="pt-8 border-t border-zinc-850 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-zinc-500">
        <div>
          <span>Agenda &copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveModule('privacy')}
            className="hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            {t.legal.privacyTitle}
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setActiveModule('terms')}
            className="hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            {t.legal.termsTitle}
          </button>
          <span>•</span>
          <a
            href="https://blobatar.dev"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-400 text-[10px] text-zinc-600 transition-colors"
          >
            avatar engine: blobatar.dev
          </a>
        </div>
      </footer>
    </div>
  );
};
