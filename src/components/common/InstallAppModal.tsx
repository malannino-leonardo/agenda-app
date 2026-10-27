import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Share2,
  PlusSquare,
  Check,
  Smartphone,
  Laptop,
  CheckCircle2,
} from 'lucide-react';
import { UnsupportedPlatform } from '../../hooks/usePwaInstall';
import { useTranslation } from '../../context/LanguageContext';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  platform: UnsupportedPlatform;
  isStandalone: boolean;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  platform,
  isStandalone,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'ios' | 'mac-safari'>(
    platform === 'mac-safari' ? 'mac-safari' : 'ios'
  );

  React.useEffect(() => {
    setActiveTab(platform === 'mac-safari' ? 'mac-safari' : 'ios');
  }, [platform]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm animate-modal-backdrop pt-[max(1rem,env(safe-area-inset-top,1rem))] pb-[max(1rem,env(safe-area-inset-bottom,1rem))] pl-[max(1rem,env(safe-area-inset-left,1rem))] pr-[max(1rem,env(safe-area-inset-right,1rem))]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl p-5 sm:p-6 flex flex-col animate-modal-pop"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-200">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h2 id="install-modal-title" className="text-sm font-mono font-medium text-zinc-100 uppercase tracking-wider">
                {t.installGuide.title}
              </h2>
              <p className="text-[11px] font-mono text-zinc-400">
                {t.installGuide.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            aria-label={t.installGuide.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Already Running in Standalone Mode */}
        {isStandalone ? (
          <div className="py-6 px-4 bg-zinc-950 border border-zinc-800 rounded text-center space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="text-sm font-medium text-zinc-100 font-mono">
              {t.installGuide.alreadyInstalledTitle}
            </div>
            <p className="text-xs text-zinc-400 font-mono max-w-sm mx-auto leading-relaxed">
              {t.installGuide.alreadyInstalledDesc}
            </p>
          </div>
        ) : (
          <>
            {/* Platform Toggle Tabs: iOS / macOS Safari */}
            <div className="flex items-center gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded mb-4">
              <button
                type="button"
                onClick={() => setActiveTab('ios')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeTab === 'ios'
                    ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t.installGuide.iosTitle}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('mac-safari')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
                  activeTab === 'mac-safari'
                    ? 'bg-zinc-800 text-zinc-100 font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>{t.installGuide.macSafariTitle}</span>
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            <div className="space-y-3 text-xs font-mono leading-relaxed">
              {activeTab === 'ios' ? (
                <div className="space-y-3">
                  <p className="text-zinc-300">
                    {t.installGuide.iosDesc}
                  </p>
                  <ol className="space-y-2.5">
                    <li className="flex items-start gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded">
                      <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-200 shrink-0">
                        <Share2 className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-zinc-100 font-medium">{t.installGuide.iosStep1Title}</div>
                        <div className="text-zinc-400 text-[11px]">
                          {t.installGuide.iosStep1Desc}
                        </div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded">
                      <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-200 shrink-0">
                        <PlusSquare className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-zinc-100 font-medium">{t.installGuide.iosStep2Title}</div>
                        <div className="text-zinc-400 text-[11px]">
                          {t.installGuide.iosStep2Desc}
                        </div>
                      </div>
                    </li>

                    <li className="flex items-start gap-3 p-2.5 bg-zinc-950 border border-zinc-850 rounded">
                      <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-200 shrink-0">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-zinc-100 font-medium">{t.installGuide.iosStep3Title}</div>
                        <div className="text-zinc-400 text-[11px]">
                          {t.installGuide.iosStep3Desc}
                        </div>
                      </div>
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-zinc-300">
                    {t.installGuide.macSafariDesc}
                  </p>
                  <div className="flex items-start gap-3 p-3 bg-zinc-950 border border-zinc-850 rounded">
                    <div className="p-1.5 bg-zinc-800/80 border border-zinc-700/60 rounded text-zinc-200 shrink-0">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-zinc-100 font-medium">{t.installGuide.macSafariTitle}</div>
                      <div className="text-zinc-400 text-[11px]">
                        {t.installGuide.macSafariStep}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 mt-2 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-medium rounded transition-colors"
          >
            {t.installGuide.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
