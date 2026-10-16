import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export const UI_SCALE_STORAGE_KEY = 'agenda_ui_scale';
export const DEFAULT_UI_SCALE = 100;
export const MIN_UI_SCALE = 85;
export const MAX_UI_SCALE = 140;
export const UI_SCALE_STEP = 5;

export interface UiScalePreset {
  value: number;
  labelKey: 'scaleCompact' | 'scaleDefault' | 'scaleComfortable' | 'scaleLarge' | 'scaleExtraLarge';
}

export const UI_SCALE_PRESETS: UiScalePreset[] = [
  { value: 90, labelKey: 'scaleCompact' },
  { value: 100, labelKey: 'scaleDefault' },
  { value: 110, labelKey: 'scaleComfortable' },
  { value: 120, labelKey: 'scaleLarge' },
  { value: 130, labelKey: 'scaleExtraLarge' },
];

interface UiScaleContextType {
  scale: number;
  setScale: (scale: number) => void;
  resetScale: () => void;
  increaseScale: () => void;
  decreaseScale: () => void;
}

const UiScaleContext = createContext<UiScaleContextType | undefined>(undefined);

const applyScaleToDOM = (scaleValue: number) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // Always remove CSS zoom as it causes bitmap blur and disables subpixel font hinting
  root.style.removeProperty('zoom');

  if (scaleValue === 100) {
    root.style.removeProperty('font-size');
  } else {
    // Scale root font-size: cleanly rescales all rem units with crisp vector glyph rendering
    root.style.fontSize = `${scaleValue}%`;
  }

  // Notify any canvas/geometry-aware components safely on next frame
  if (typeof window !== 'undefined') {
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  }
};

export const UiScaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scale, setScaleState] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(UI_SCALE_STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_UI_SCALE && parsed <= MAX_UI_SCALE) {
          return parsed;
        }
      }
    } catch {
      // Ignore storage read error
    }
    return DEFAULT_UI_SCALE;
  });

  useEffect(() => {
    try {
      localStorage.setItem(UI_SCALE_STORAGE_KEY, String(scale));
    } catch {
      // Ignore storage write error
    }

    applyScaleToDOM(scale);
  }, [scale]);

  const setScale = useCallback((newScale: number) => {
    const clamped = Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, Math.round(newScale)));
    setScaleState(clamped);
  }, []);

  const resetScale = useCallback(() => {
    setScaleState(DEFAULT_UI_SCALE);
  }, []);

  const increaseScale = useCallback(() => {
    setScaleState((prev) => Math.min(MAX_UI_SCALE, prev + UI_SCALE_STEP));
  }, []);

  const decreaseScale = useCallback(() => {
    setScaleState((prev) => Math.max(MIN_UI_SCALE, prev - UI_SCALE_STEP));
  }, []);

  return (
    <UiScaleContext.Provider
      value={{
        scale,
        setScale,
        resetScale,
        increaseScale,
        decreaseScale,
      }}
    >
      {children}
    </UiScaleContext.Provider>
  );
};

export const useUiScale = () => {
  const context = useContext(UiScaleContext);
  if (!context) {
    throw new Error('useUiScale must be used within a UiScaleProvider');
  }
  return context;
};
