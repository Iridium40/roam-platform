import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import type { FeaturedBusiness } from '@/types/index';

// Lazy load heavy components
const CustomerAuthModal = lazy(() => import("@/components/CustomerAuthModal").then(module => ({ default: module.CustomerAuthModal })));
const GoogleOneTap = lazy(() => import("@/components/GoogleOneTap"));
const ShareModal = lazy(() => import("@/components/ShareModal"));

// Fallback loader for heavy components
const ComponentLoader = () => (
  <div className="flex items-center justify-center p-4">
    <Loader2 className="w-6 h-6 animate-spin text-roam-blue" />
  </div>
);

interface CustomerActionsProps {
  // Modal state
  shareModalOpen: boolean;
  authModalOpen: boolean;
  authModalTab: "signin" | "signup";
  
  // Selected provider for sharing
  selectedProvider: FeaturedBusiness | null;
  
  // Modal handlers
  onShareModalClose: () => void;
  onAuthModalClose: () => void;
  
  // Auth state
  isCustomer: boolean;
}

export const CustomerActions: React.FC<CustomerActionsProps> = ({
  shareModalOpen,
  authModalOpen,
  authModalTab,
  selectedProvider,
  onShareModalClose,
  onAuthModalClose,
  isCustomer,
}) => {
  return (
    <>
      {/* Google One Tap (only show if not authenticated) */}
      {!isCustomer && import.meta.env.VITE_GOOGLE_CLIENT_ID && (
        <Suspense fallback={null}>
          <GoogleOneTap
            clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
            onSuccess={() => {
              // Google One Tap sign-in successful
            }}
            onError={(error) => {
              // Handle Google One Tap error silently
            }}
          />
        </Suspense>
      )}

      {/* Share Modal */}
      {selectedProvider && shareModalOpen && (
        <Suspense fallback={<ComponentLoader />}>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={onShareModalClose}
            providerName={selectedProvider.name}
            providerTitle={selectedProvider.type || selectedProvider.description}
            pageUrl={`${window.location.origin}/business/${selectedProvider.id}`}
          />
        </Suspense>
      )}

      {/* Customer Authentication Modal */}
      {authModalOpen && (
        <Suspense fallback={<ComponentLoader />}>
          <CustomerAuthModal
            isOpen={authModalOpen}
            onClose={onAuthModalClose}
            defaultTab={authModalTab}
          />
        </Suspense>
      )}
    </>
  );
};