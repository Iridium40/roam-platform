// hooks/usePWA.ts
import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

export function usePWA() {
  const [status, setStatus] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    installPrompt: null,
  });

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      
      setStatus(prev => ({ ...prev, isInstalled: isStandalone }));
    };

    checkInstalled();

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setStatus(prev => ({
        ...prev,
        isInstallable: true,
        installPrompt: e as BeforeInstallPromptEvent,
      }));
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setStatus(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        installPrompt: null,
      }));
    };

    // Listen for online/offline status
    const handleOnline = () => setStatus(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setStatus(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async () => {
    if (!status.installPrompt) return false;

    try {
      await status.installPrompt.prompt();
      const { outcome } = await status.installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setStatus(prev => ({
          ...prev,
          isInstallable: false,
          installPrompt: null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install error:', error);
      return false;
    }
  };

  return {
    ...status,
    installApp,
  };
}

export default usePWA;
