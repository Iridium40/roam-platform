import React, { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  Shield,
  User,
  Building,
  Clock,
  Users,
  Banknote,
  DollarSign,
} from "lucide-react";

// Import components
import QuickSetup from "@/components/Phase2Components/QuickSetup";
import BankingPayoutSetup from "@/components/Phase2Components/BankingPayoutSetup";
import ServicePricingSetup from "@/components/Phase2Components/ServicePricingSetup";
import StripeIdentityVerification from "@/components/StripeIdentityVerification";
// Plaid integration removed - using Stripe Connect for bank connections
import StripeConnectSetup from "@/components/StripeConnectSetup";

type Phase2Step =
  | "quick_setup"
  | "service_pricing"
  | "banking_payout"
  | "identity_verification"
  | "bank_connection"
  | "stripe_setup"
  | "complete";

interface Phase2State {
  phase2Step: Phase2Step;
  businessData?: any;
  businessId?: string;
  userId?: string;
  serviceCategories?: any[];
  serviceSubcategories?: any[];
}

// Streamlined Phase 2: 3 steps to go live
const phase2Steps = [
  { id: "quick_setup", title: "Quick Setup", icon: Building },
  { id: "service_pricing", title: "Service Pricing", icon: DollarSign },
  { id: "banking_payout", title: "Banking & Payouts", icon: Banknote },
];

// Get Phase 2 steps
const getPhase2Steps = (businessType?: string) => {
  return phase2Steps;
};

export default function ProviderOnboardingPhase2() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const [onboardingState, setOnboardingState] = useState<Phase2State>({
    phase2Step: "quick_setup",
    businessData: undefined,
    businessId: undefined,
    userId: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Phase 2 state
  useEffect(() => {
    initializePhase2();
  }, [location]);

  const initializePhase2 = () => {
    // Check for validated Phase 2 session
    const phase2Session = sessionStorage.getItem('phase2_session');

    if (phase2Session) {
      try {
        const session = JSON.parse(phase2Session);

        // Validate session age (max 2 hours)
        if (Date.now() - session.validated_at < 2 * 60 * 60 * 1000) {
          setOnboardingState(prev => ({
            ...prev,
            businessId: session.business_id,
            userId: session.user_id,
            phase2Step: (params.step as Phase2Step) || "quick_setup",
            businessData: { businessName: session.business_name }
          }));
          return;
        }
      } catch (error) {
        console.error('Error parsing phase2 session:', error);
      }
    }

    // Check if this is a development/test environment
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1';
    
    if (isDevelopment) {
      // Allow access to any Phase 2 step in development
      console.log('Development mode: Allowing access to Phase 2 step:', params.step);
      setOnboardingState(prev => ({
        ...prev,
        businessId: '123e4567-e89b-12d3-a456-426614174000',
        userId: '987fcdeb-51a2-43d1-9f12-345678901234',
        phase2Step: (params.step as Phase2Step) || 'quick_setup',
        businessData: { 
          businessName: 'Development Business',
          business_type: 'independent' // Set to independent to test staff management skip
        }
      }));
      return;
    }

    // Invalid or expired session - redirect to login
    console.log('No valid Phase 2 session, redirecting to login');
    navigate('/provider-login');
  };

  const handleStepClick = (stepId: string) => {
    navigate(`/provider-onboarding/phase2/${stepId}`);
  };

  const handlePhase2StepComplete = (nextStep: Phase2Step) => {
    
    navigate(`/provider-onboarding/phase2/${nextStep}`);
  };

  const handlePhase2Complete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "complete",
    }));

    // Clear Phase 2 session and redirect to provider login
    sessionStorage.removeItem('phase2_session');
    setTimeout(() => {
      navigate("/provider-login");
    }, 2000);
  };

  const handleIdentityVerificationComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "bank_connection",
    }));
  };

  const handleBankConnectionComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "stripe_setup",
    }));
  };

  const handleStripeSetupComplete = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase2Step: "complete",
    }));
  };

  // Handle redirect when setup is complete
  useEffect(() => {
    if (onboardingState.phase2Step === "complete") {
      // Redirect to provider login page after 2 seconds
      const redirectTimer = setTimeout(() => {
        navigate("/provider-login");
      }, 2000);

      return () => clearTimeout(redirectTimer);
    }
  }, [onboardingState.phase2Step, navigate]);

  const getCurrentStepIndex = () => {
    const currentSteps = getPhase2Steps(onboardingState.businessData?.business_type);
    return currentSteps.findIndex(
      (step) => step.id === onboardingState.phase2Step,
    );
  };

  const getTotalSteps = () => {
    return getPhase2Steps(onboardingState.businessData?.business_type).length;
  };

  const getProgressPercentage = () => {
    const currentStep = getCurrentStepIndex();
    const totalSteps = getTotalSteps();
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  };

  const renderContent = () => {
    const { phase2Step } = onboardingState;

    switch (phase2Step) {
      case "quick_setup":
        return (
          <QuickSetup
            businessId={onboardingState.businessId || ""}
            userId={onboardingState.userId || ""}
            onComplete={() => handlePhase2StepComplete("service_pricing")}
          />
        );

      case "service_pricing":
        return (
          <ServicePricingSetup
            businessId={onboardingState.businessId || ""}
            userId={onboardingState.userId || ""}
            onComplete={() => handlePhase2StepComplete("banking_payout")}
            onBack={() => handlePhase2StepComplete("quick_setup")}
            initialData={onboardingState.businessData?.service_pricing}
          />
        );

      case "banking_payout":
        return (
          <BankingPayoutSetup
            businessId={onboardingState.businessId || ""}
            userId={onboardingState.userId || ""}
            onComplete={() => handlePhase2StepComplete("complete")}
            onBack={() => handlePhase2StepComplete("service_pricing")}
            initialData={onboardingState.businessData?.banking_payout}
          />
        );

      case "identity_verification":
        return (
          <StripeIdentityVerification
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
            onVerificationComplete={handleIdentityVerificationComplete}
            onVerificationPending={() => {}}
            className="max-w-2xl mx-auto"
          />
        );

      case "bank_connection":
        // Plaid integration removed - using Stripe Connect for bank connections
        return (
          <StripeConnectSetup
            userId={onboardingState.userId!}
            businessId={onboardingState.businessId!}
            onSetupComplete={handleBankConnectionComplete}
            className="max-w-2xl mx-auto"
          />
        );

      case "stripe_setup":
        return (
          <StripeConnectSetup
            userId={onboardingState.userId!}
            businessId={onboardingState.businessId!}
            businessType={
              onboardingState.businessData?.businessType ||
              "sole_proprietorship"
            }
            businessName={onboardingState.businessData?.businessName || ""}
            userEmail={onboardingState.businessData?.userEmail || ""}
            onSetupComplete={handleStripeSetupComplete}
            className="max-w-2xl mx-auto"
          />
        );

      case "complete":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Setup Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert className="border-green-200 bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>You're ready to accept bookings!</strong> Your
                  provider account is now fully set up and you can start
                  receiving customer bookings through the ROAM platform.
                </AlertDescription>
              </Alert>

              <p className="text-foreground/70">
                Redirecting you to the provider portal login...
              </p>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    const currentSteps = getPhase2Steps(onboardingState.businessData?.business_type);
    const currentStepIndex = getCurrentStepIndex();

    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Phase 2: Setup</h2>
            <p className="text-sm text-foreground/60">
              Step {currentStepIndex + 1} of {currentSteps.length}
            </p>
          </div>
          <Badge variant="outline">{getProgressPercentage()}% Complete</Badge>
        </div>

        <Progress value={getProgressPercentage()} className="mb-4" />

        <div className="hidden md:flex items-center justify-between">
          {currentSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted
                      ? "bg-roam-blue border-roam-blue text-white"
                      : isActive
                        ? "border-roam-blue text-roam-blue"
                        : "border-gray-300 text-gray-400"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                {index < currentSteps.length - 1 && (
                  <div
                    className={`hidden md:block w-20 h-1 mx-2 ${
                      isCompleted ? "bg-roam-blue" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/provider-login")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
              <div className="flex items-center space-x-2">
                <img
                  src="/default-placeholder.png"
                  alt="ROAM Logo"
                  className="h-8 w-auto"
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-roam-blue text-roam-blue"
            >
              Business Onboarding - Phase 2
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderProgressBar()}
        
        {/* Informational Note */}
        {onboardingState.phase2Step !== 'quick_setup' && onboardingState.phase2Step !== 'complete' && (
          <Alert className="max-w-4xl mx-auto mb-6 border-blue-200 bg-blue-50">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Note:</strong> You can update any information you provide during onboarding at any time through your Business Settings and User Settings once setup is complete.
            </AlertDescription>
          </Alert>
        )}
        
        {renderContent()}
      </div>
    </div>
  );
}
