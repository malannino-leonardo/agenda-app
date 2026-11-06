import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  destructive = true,
  onConfirm,
  onCancel,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-modal-backdrop"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden animate-modal-pop"
      >
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 shrink-0 ${destructive ? 'text-rose-400' : 'text-amber-400'}`}
            />
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-zinc-100 uppercase font-mono">
                {title}
              </h3>
              <div className="mt-2 text-xs text-zinc-400 font-mono leading-relaxed">{message}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-850">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 text-xs font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            autoFocus
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-wider font-semibold rounded transition-colors ${
              destructive
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-zinc-100 hover:bg-zinc-300 text-zinc-950'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
