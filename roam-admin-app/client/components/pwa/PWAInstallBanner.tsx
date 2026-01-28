// components/pwa/PWAInstallBanner.tsx
import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      const dismissedTime = parseInt(wasDismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Delay showing the banner for better UX
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await installApp();
    if (success) {
      setDismissed(true);
    }
  };

  // Don't show if already installed, not installable, or dismissed
  if (isInstalled || !isInstallable || dismissed || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#3b5998] to-[#2d4373] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Smartphone className="h-5 w-5" />
            <span className="font-semibold">Install ROAM Admin</span>
          </div>
          <button
            onClick={handleDismiss}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-gray-600 text-sm mb-4">
            Install the ROAM Admin app for quick access, offline support, and a native app experience.
          </p>

          <div className="flex gap-3">
            <Button
              onClick={handleInstall}
              className="flex-1 bg-[#3b5998] hover:bg-[#2d4373]"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="text-gray-600"
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PWAInstallBanner;
