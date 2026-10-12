import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Trash2, Users, Shield, Info } from 'lucide-react';
import { Calendar } from '../../types';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../context/LanguageContext';

interface ShareCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar: Calendar | null;
}

export const ShareCalendarModal: React.FC<ShareCalendarModalProps> = ({
  isOpen,
  onClose,
  calendar,
}) => {
  const { shareCalendar, removeCalendarShare } = useApp();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !calendar) return null;

  const handleShare = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    shareCalendar(calendar.id, email.trim(), permission);
    setEmail('');
  };

  const shares = calendar.shares || [];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: calendar.color }}
            />
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono truncate">
              Share &quot;{calendar.name}&quot;
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs font-mono">
          {/* Security & Access Information */}
          <div className="p-3 bg-zinc-900/40 border border-zinc-850 rounded-lg flex items-start gap-2.5 text-zinc-400">
            <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              Invited collaborators can view this calendar with their email address even without an account. Edit permissions require creating an account.
            </div>
          </div>

          {/* Invite Collaborator Form */}
          <form onSubmit={handleShare} className="space-y-3">
            <div className="text-zinc-400 uppercase tracking-wider text-[11px]">
              Invite by Email
            </div>

            {errorMsg && (
              <div className="text-rose-400 text-[11px]">{errorMsg}</div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="collaborator@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 transition-colors text-xs"
                />
              </div>

              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded text-zinc-200 focus:border-zinc-500 transition-colors text-xs"
              >
                <option value="view">Can view</option>
                <option value="edit">Can edit</option>
              </select>

              <button
                type="submit"
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-semibold uppercase tracking-wider rounded transition-colors text-xs shrink-0"
              >
                Invite
              </button>
            </div>
          </form>

          {/* Current Collaborators List */}
          <div className="space-y-2 pt-2 border-t border-zinc-850">
            <div className="flex items-center justify-between text-zinc-400 text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>People with access</span>
              </span>
              <span>{shares.length + 1}</span>
            </div>

            {/* Owner Row */}
            <div className="p-2.5 bg-zinc-900/30 border border-zinc-850 rounded flex items-center justify-between">
              <div>
                <span className="text-zinc-200 block">You (Owner)</span>
                <span className="text-[10px] text-zinc-500">Full administrative access</span>
              </div>
              <span className="text-[10px] text-zinc-400 uppercase font-mono">Owner</span>
            </div>

            {/* Invited Collaborators */}
            {shares.length === 0 ? (
              <div className="py-4 text-center text-zinc-600 text-xs">
                No one else has access yet. Invite collaborators above to share this calendar.
              </div>
            ) : (
              shares.map((share) => (
                <div
                  key={share.id}
                  className="p-2.5 bg-zinc-900/30 border border-zinc-850 rounded flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-zinc-200 block truncate">{share.email}</span>
                    <span className="text-[10px] text-zinc-500 capitalize flex items-center gap-1">
                      <Shield className="w-3 h-3 text-zinc-500" />
                      <span>{share.permission === 'edit' ? 'Can edit' : 'Can view'}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCalendarShare(calendar.id, share.id)}
                    className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors shrink-0"
                    title="Remove access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-5 py-3 border-t border-zinc-850 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-mono uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
