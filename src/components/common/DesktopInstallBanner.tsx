import React, { useState, useEffect } from 'react';
import { Monitor, Download, X, HelpCircle } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const DesktopInstallBanner: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);

  useEffect(() => {
    // Check if already running in standalone app mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);

    if (isStandalone) {
      setIsVisible(false);
      return;
    }

    // Check if dismissed before
    const isDismissed = localStorage.getItem('agenda_pwa_banner_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Also display after a short moment if desktop browser supports manual installation
    const timer = setTimeout(() => {
      if (!isDismissed && !isStandalone) {
        setIsVisible(true);
      }
    }, 2500);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsVisible(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstructionsModal(true);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('agenda_pwa_banner_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <>
      <aside aria-label="Desktop application installation" className="w-full bg-zinc-900 border-b border-zinc-800 px-4 py-2.5 flex items-center justify-between gap-4 text-xs animate-fade-in z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-300 shrink-0">
            <Monitor className="w-3.5 h-3.5" />
          </div>
          <p className="text-zinc-300 truncate font-mono">
            <span className="text-zinc-100 font-medium">Desktop Application:</span> Run Agenda in a dedicated, distraction-free standalone window.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded text-[11px] font-mono uppercase tracking-wider transition-colors"
          >
            <Download className="w-3 h-3 stroke-[2.5]" />
            <span>{t.common.installApp}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
            title={t.common.close}
            aria-label={t.common.close}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>

      {/* Manual Install Instructions Modal if browser does not fire prompt directly */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-100 font-medium text-sm font-mono">
                <HelpCircle className="w-4 h-4 text-zinc-400" />
                <span>Desktop App Installation</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="p-1 text-zinc-500 hover:text-zinc-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 font-mono leading-relaxed">
              <p>
                To install Agenda as a standalone application on your operating system:
              </p>
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1.5">
                <div className="text-zinc-100 font-medium">Chrome & Edge:</div>
                <div className="text-zinc-400">
                  Click the <span className="text-zinc-200 font-semibold">Install</span> icon in the right side of the address bar, or open Browser Menu &rarr; <span className="text-zinc-200">Cast, save and share</span> &rarr; <span className="text-zinc-200">Install Agenda</span>.
                </div>
              </div>
              <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1.5">
                <div className="text-zinc-100 font-medium">Safari on macOS:</div>
                <div className="text-zinc-400">
                  Click <span className="text-zinc-200 font-semibold">File</span> in the top menu bar &rarr; <span className="text-zinc-200">Add to Dock</span>.
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInstructionsModal(false)}
                className="px-4 py-1.5 text-xs font-mono uppercase bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
              >
                {t.common.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
