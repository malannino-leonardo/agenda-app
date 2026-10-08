import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, ArrowRight, AlertCircle, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

export const GuestAccessModal: React.FC = () => {
  const {
    isGuestAccessModalOpen,
    setIsGuestAccessModalOpen,
    validateGuestEmailAccess,
    setActiveModule,
  } = useApp();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isGuestAccessModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg('Please enter an email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    const result = validateGuestEmailAccess(trimmed);
    if (result.success) {
      setIsGuestAccessModalOpen(false);
      setActiveModule('agenda');
      setEmail('');
    } else {
      setErrorMsg('No shared calendars found for this email address. Please make sure the calendar owner has invited this email.');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
              Access Shared Calendar
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsGuestAccessModalOpen(false);
              setErrorMsg(null);
            }}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 font-mono text-xs">
          <p className="text-zinc-400 leading-relaxed">
            Enter the email address you were invited with. You can view the shared calendar immediately without an account.
          </p>

          {errorMsg && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800 text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span className="leading-tight">{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">
              Your Email Address
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-zinc-900/50 border border-zinc-850 rounded text-[11px] text-zinc-500 leading-normal">
            Note: Guest view is strictly read-only. To obtain edit permissions, an account is required.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
            <button
              type="button"
              onClick={() => {
                setIsGuestAccessModalOpen(false);
                setErrorMsg(null);
              }}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider bg-zinc-100 hover:bg-zinc-300 text-zinc-950 rounded transition-colors"
            >
              <span>View Calendar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
