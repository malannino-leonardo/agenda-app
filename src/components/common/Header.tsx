import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Plus,
  LogIn,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  Mail,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { InteractiveBlobatar } from './InteractiveBlobatar';

interface HeaderProps {
  onOpenNewTask: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenNewTask }) => {
  const {
    searchQuery,
    setSearchQuery,
    setActiveModule,
    navigateToHome,
    activeModule,
    tasks,
    guestEmail,
    setGuestEmail,
    openGuestAccess,
  } = useApp();
  const { language, setLanguage, t } = useTranslation();
  const { user, profile, openSignIn, signOut } = useAuth();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fullName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'User';
  const firstName = fullName.split(' ')[0];
  const userSeed = fullName;

  // Check if any active tasks are due today or overdue
  const todayKey = new Date().toISOString().split('T')[0];
  const hasDueTasks = tasks.some(
    (t) => t.status !== 'completed' && t.due_date && t.due_date.split('T')[0] <= todayKey
  );

  const sectionTitle =
    (activeModule === '404'
      ? t.sections?.notFound || '404'
      : t.sections?.[activeModule]) ||
    activeModule.toUpperCase();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <header className="sticky top-0 z-30 h-14 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-850 px-3 sm:px-6 md:px-8 flex items-center justify-between gap-2 sm:gap-4">
      {/* Brand title & dynamic section breadcrumb (breadcrumb hidden on mobile for clean fit) */}
      <div
        onClick={navigateToHome}
        className="flex items-center gap-2 sm:gap-3 cursor-pointer select-none group shrink-0"
      >
        <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-zinc-100 group-hover:text-white uppercase transition-colors">
          {t.common.appTitle}
        </span>
        <span className="text-zinc-700 text-xs hidden sm:inline">/</span>
        <span className="text-xs font-mono text-zinc-400 group-hover:text-zinc-200 tracking-wider uppercase font-medium transition-colors hidden sm:inline truncate max-w-[150px]">
          {sectionTitle}
        </span>
      </div>

      {/* Global Search (hidden on mobile, visible on tablet & desktop) */}
      {user ? (
        <div className="hidden sm:block flex-1 max-w-xs md:max-w-md mx-2 sm:mx-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.common.searchPlaceholder}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded text-zinc-200 placeholder-zinc-500 focus:border-indigo-500/60 transition-colors font-mono"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1" />
      )}

      {/* Action group */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">

        {/* Language Switcher */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded p-0.5 text-[11px] sm:text-xs font-mono">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-1.5 sm:px-2 py-0.5 rounded transition-colors ${
              language === 'en'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('it')}
            className={`px-1.5 sm:px-2 py-0.5 rounded transition-colors ${
              language === 'it'
                ? 'bg-zinc-800 text-zinc-100 font-semibold'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            IT
          </button>
        </div>

        {/* Global New Task CTA (only if authenticated) */}
        {user && (
          <button
            type="button"
            onClick={onOpenNewTask}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden md:inline">{t.tasks.newTask}</span>
          </button>
        )}

        {/* User Account / Blobatar Avatar Dropdown */}
        {user ? (
          <div ref={dropdownRef} className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-full hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all select-none group"
            >
              <InteractiveBlobatar
                name={userSeed}
                size={34}
                isActiveGaze={isDropdownOpen}
                hasNotification={hasDueTasks}
              />
              <span className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 max-w-[100px] truncate">
                {firstName}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl py-1 z-50 animate-fade-in divide-y divide-zinc-800/60">
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-zinc-100 truncate">{fullName}</p>
                  <p className="text-[10px] font-mono text-zinc-500 truncate">{user.email}</p>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('agenda');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.header.dashboard}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('account');
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.header.settings}</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setIsDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-mono text-red-400 hover:text-red-300 hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.header.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {guestEmail ? (
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <span className="text-zinc-400 hidden sm:inline">Guest:</span>
                <span className="text-zinc-200 font-semibold max-w-[110px] truncate" title={guestEmail}>
                  {guestEmail}
                </span>
                <button
                  type="button"
                  onClick={() => setGuestEmail(null)}
                  className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
                >
                  Exit
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openGuestAccess}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 rounded transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Shared Calendar</span>
              </button>
            )}

            <button
              type="button"
              onClick={openSignIn}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 bg-zinc-900 rounded transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.account.signIn}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
