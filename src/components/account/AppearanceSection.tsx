import React from 'react';
import {
  Sun,
  Moon,
  ZoomIn,
  RotateCcw,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useUiScale, UI_SCALE_PRESETS } from '../../context/UiScaleContext';
import { useTranslation } from '../../context/LanguageContext';

export const AppearanceSection: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { scale, setScale, resetScale } = useUiScale();
  const { t } = useTranslation();

  return (
    <div className="p-6 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-6 shadow-sm hover:border-zinc-700/60 transition-colors">
      {/* Section Header */}
      <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-zinc-400" />
          <h3 className="text-sm font-medium text-zinc-200 uppercase font-mono tracking-wider">
            {t.appearance.title}
          </h3>
        </div>
      </div>

      {/* Theme Selection */}
      <div className="space-y-3">
        <div>
          <h4 className="text-xs font-mono uppercase text-zinc-300">
            {t.appearance.themeTitle}
          </h4>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            {t.appearance.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all text-xs font-mono ${
              theme === 'dark'
                ? 'bg-zinc-850 border-indigo-500/80 text-zinc-100 shadow-sm font-semibold'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
            <div className="text-left">
              <div className="font-semibold">{t.appearance.themeDark}</div>
              <div className="text-[10px] text-zinc-500">{t.appearance.themeDarkDesc}</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-3 rounded-lg border flex items-center gap-2.5 transition-all text-xs font-mono ${
              theme === 'light'
                ? 'bg-amber-500/10 border-amber-500/80 text-amber-500 font-semibold shadow-sm'
                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-left">
              <div className="font-semibold">{t.appearance.themeLight}</div>
              <div className="text-[10px] text-zinc-500">{t.appearance.themeLightDesc}</div>
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-zinc-800/80 pt-5 space-y-4">
        {/* UI Scale Header and Current Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ZoomIn className="w-3.5 h-3.5 text-zinc-400" />
              <h4 className="text-xs font-mono uppercase text-zinc-300">
                {t.appearance.uiScaleTitle}
              </h4>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5 max-w-md">
              {t.appearance.uiScaleSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-sm font-semibold text-zinc-100 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800">
              {scale}%
            </span>
            {scale !== 100 && (
              <button
                type="button"
                onClick={resetScale}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 rounded transition-colors"
                title={t.appearance.scaleReset}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t.appearance.scaleReset}</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Scale Presets */}
        <div>
          <div className="text-[10px] font-mono uppercase text-zinc-500 mb-1.5">
            Presets
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {UI_SCALE_PRESETS.map((preset) => {
              const isSelected = scale === preset.value;
              const presetLabel = t.appearance[preset.labelKey] || preset.labelKey;

              return (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setScale(preset.value)}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono transition-all text-left flex flex-col justify-between ${
                    isSelected
                      ? 'bg-zinc-850 border-indigo-500 text-zinc-100 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200">{preset.value}%</span>
                    {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                    {presetLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="p-3 bg-zinc-950/40 border border-dashed border-zinc-800 rounded-lg space-y-2">
          <div className="text-[10px] font-mono uppercase text-zinc-500">
            Preview at {scale}%
          </div>
          <div className="flex items-center justify-between p-2.5 bg-zinc-900/80 border border-zinc-800 rounded">
            <div className="space-y-0.5">
              <div className="text-xs font-medium text-zinc-200">
                Sample Task Item
              </div>
              <div className="text-[11px] font-mono text-zinc-400">
                Due Today at 14:30
              </div>
            </div>
            <div className="text-xs font-mono text-zinc-500">
              Active
            </div>
          </div>
          <p className="text-[10px] font-mono text-zinc-500">
            Scaling applies across all views, headers, calendars, and modals in your current session and persists across reloads.
          </p>
        </div>
      </div>
    </div>
  );
};
