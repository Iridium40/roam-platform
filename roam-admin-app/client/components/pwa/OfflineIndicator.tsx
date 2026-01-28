// components/pwa/OfflineIndicator.tsx
import { WifiOff } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You're offline. Some features may be unavailable.</span>
      </div>
    </div>
  );
}

export default OfflineIndicator;
