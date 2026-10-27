import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type UnsupportedPlatform = 'ios' | 'mac-safari' | 'other';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [platform, setPlatform] = useState<UnsupportedPlatform>('ios');

  useEffect(() => {
    // Detect standalone mode
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isNavStandalone =
        'standalone' in window.navigator &&
        Boolean((window.navigator as unknown as { standalone: boolean }).standalone);
      return isDisplayStandalone || isNavStandalone;
    };

    setIsStandalone(checkStandalone());

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleDisplayModeChange);
    }

    // Detect device platform for devices without direct button installation
    const ua = navigator.userAgent || '';
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMacSafari =
      /Safari/i.test(ua) &&
      !/Chrome|CriOS|FxiOS|EdgiOS|Android/i.test(ua) &&
      /Macintosh|MacIntel/i.test(ua);

    if (isIOSDevice) {
      setPlatform('ios');
    } else if (isMacSafari) {
      setPlatform('mac-safari');
    } else {
      setPlatform('other');
    }

    // Listen for beforeinstallprompt (Windows, Android, Chromium)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    // If already running standalone, show confirmation
    if (isStandalone) {
      setIsModalOpen(true);
      return;
    }

    // Direct 1-click installation on Windows & Android browsers supporting native prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsStandalone(true);
        }
      } catch {
        // Ignored
      } finally {
        setDeferredPrompt(null);
      }
      return;
    }

    // Devices without direct button installation (such as iOS Safari and macOS Safari)
    // show the targeted guide
    setIsModalOpen(true);
  }, [deferredPrompt, isStandalone]);

  return {
    isStandalone,
    deferredPrompt,
    isModalOpen,
    setIsModalOpen,
    platform,
    handleInstallClick,
  };
}
