import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ICONS = {
  success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  info: <Info className="w-4 h-4 text-indigo-400 shrink-0" />,
};

export const Toaster: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed z-[130] left-1/2 -translate-x-1/2 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+5rem))] md:bottom-6 w-[calc(100%-1.5rem)] max-w-sm space-y-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.kind === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl text-xs font-mono text-zinc-200 animate-modal-pop"
        >
          {ICONS[toast.kind]}
          <span className="flex-1 leading-relaxed break-words">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-zinc-500 hover:text-zinc-200 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
