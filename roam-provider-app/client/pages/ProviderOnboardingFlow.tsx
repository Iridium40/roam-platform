import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/auth/AuthProvider";
import ProviderOnboardingPhase1 from "./ProviderOnboardingPhase1";
import ProviderOnboardingPhase2 from "./ProviderOnboardingPhase2";

export default function ProviderOnboardingFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Determine which phase to show based on URL and user state
    determinePhase();
  }, [location.pathname, isAuthenticated, user]);

  const determinePhase = () => {
    // Check if this is a Phase 2 route
    if (location.pathname.includes('/phase2/')) {
      // Phase 2 route - let the Phase2 component handle it
      return;
    }

    // Check if this is a Phase 1 route
    if (location.pathname.includes('/phase1/')) {
      // Phase 1 route - let the Phase1 component handle it
      return;
    }

    // Default route - determine which phase to show
    if (isAuthenticated && user && user.id) {
      // User is logged in, check their onboarding status
      checkOnboardingStatus();
    } else {
      // No user logged in, show Phase 1
      navigate('/provider-onboarding/phase1');
    }
  };

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      // Check user's onboarding progress
      const response = await fetch(`/api/onboarding/status/${user.id}`);

      if (response.ok) {
        const status = await response.json();

        if (status.phase === "complete") {
          navigate("/provider-dashboard");
        } else if (status.phase === "phase2") {
          // Redirect to Phase 2
          navigate("/provider-onboarding/phase2/welcome");
        } else {
          // Still in Phase 1
          navigate("/provider-onboarding/phase1");
        }
      } else {
        // If API call fails, start from Phase 1
        console.warn("Failed to check onboarding status, starting from Phase 1");
        navigate("/provider-onboarding/phase1");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // If there's an error, start from Phase 1
      navigate("/provider-onboarding/phase1");
    }
  };

  // Render the appropriate phase component based on the current route
  if (location.pathname.includes('/phase2/')) {
    return <ProviderOnboardingPhase2 />;
  }

  if (location.pathname.includes('/phase1/')) {
    return <ProviderOnboardingPhase1 />;
  }

  // Default: show Phase 1
  return <ProviderOnboardingPhase1 />;
}
