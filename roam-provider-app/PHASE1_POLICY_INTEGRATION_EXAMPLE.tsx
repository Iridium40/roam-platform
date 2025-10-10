// Example integration of Provider Policy Agreement into Phase 1 Onboarding
// File: roam-provider-app/client/pages/onboarding/ProviderOnboardingPhase1.tsx
// This shows the minimal changes needed to add the policy step

import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  User,
  Building,
  FileText,
} from "lucide-react";

// Import existing components
import { ProviderSignupForm } from "@/components/ProviderSignupForm";
import { BusinessInfoForm } from "@/components/BusinessInfoForm";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { ApplicationReviewPage } from "@/components/ApplicationReviewPage";

// ✅ ADD THIS: Import the new Policy Agreement component
import { ProviderPolicyAgreement } from "@/components/onboarding/ProviderPolicyAgreement";

// Import utilities
import { postJson } from "@/lib/api-utils";
import { useAuth } from "@/contexts/auth/AuthProvider";

// ✅ UPDATE THIS: Add "policy" to the step type
type Phase1Step = "policy" | "signup" | "business_info" | "documents" | "review" | "submitted";

interface Phase1State {
  phase1Step: Phase1Step;
  userData?: any;
  businessData?: any;
  documents?: any[];
  businessId?: string;
  userId?: string;
  policyAccepted?: boolean; // ✅ ADD THIS
}

// ✅ UPDATE THIS: Add policy to the steps array
const phase1Steps = [
  { id: "policy", title: "Provider Agreement", icon: FileText },
  { id: "signup", title: "Account Creation", icon: User },
  { id: "business_info", title: "Business Information", icon: Building },
  { id: "documents", title: "Document Upload", icon: FileText },
  { id: "review", title: "Review & Submit", icon: CheckCircle },
];

export default function ProviderOnboardingPhase1() {
  const location = useLocation();
  const navigate = useNavigate();
  const { provider, isAuthenticated } = useAuth();

  const [onboardingState, setOnboardingState] = useState<Phase1State>({
    phase1Step: "policy", // ✅ CHANGE THIS: Start with policy instead of signup
    userData: undefined,
    businessData: undefined,
    documents: undefined,
    businessId: undefined,
    userId: undefined,
    policyAccepted: false, // ✅ ADD THIS
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ ADD THIS: Handler for policy acceptance
  const handlePolicyAccept = () => {
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "signup",
      policyAccepted: true,
    }));
  };

  // ✅ ADD THIS: Handler for policy decline
  const handlePolicyDecline = () => {
    // Show a message and redirect
    setError("You must accept the Provider Agreement to continue onboarding.");
    setTimeout(() => {
      navigate("/");
    }, 2000);
  };

  // Existing handlers for signup, business info, etc.
  const handleSignupComplete = async (userData: any) => {
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "business_info",
      userData,
      userId: userData.user_id,
    }));
  };

  const handleBusinessInfoComplete = async (businessData: any) => {
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "documents",
      businessData,
      businessId: businessData.business_id,
    }));
  };

  const handleDocumentsComplete = async (documents: any[]) => {
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "review",
      documents,
    }));
  };

  const handleApplicationSubmit = async () => {
    // ... existing submit logic ...
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "submitted",
    }));
  };

  // Helper to get current step index for progress bar
  const getCurrentStepIndex = () => {
    return phase1Steps.findIndex(
      (step) => step.id === onboardingState.phase1Step
    );
  };

  const progress = ((getCurrentStepIndex() + 1) / phase1Steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Progress Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Business Onboarding - Phase 1
            </h2>
            <Badge variant="outline">
              Step {getCurrentStepIndex() + 1} of {phase1Steps.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between mt-2">
            {phase1Steps.map((step, index) => {
              const StepIcon = step.icon;
              const isComplete = index < getCurrentStepIndex();
              const isCurrent = index === getCurrentStepIndex();
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-1 text-xs sm:text-sm ${
                    isComplete
                      ? "text-green-600"
                      : isCurrent
                      ? "text-blue-600"
                      : "text-gray-400"
                  }`}
                >
                  <StepIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* ✅ ADD THIS: Policy Agreement Step */}
        {onboardingState.phase1Step === "policy" && (
          <ProviderPolicyAgreement
            userId={onboardingState.userId || ""} // Will be empty initially
            onAccept={handlePolicyAccept}
            onDecline={handlePolicyDecline}
          />
        )}

        {/* Existing Steps */}
        {onboardingState.phase1Step === "signup" && (
          <Card>
            <CardHeader>
              <CardTitle>Create Your Account</CardTitle>
            </CardHeader>
            <CardContent>
              <ProviderSignupForm onComplete={handleSignupComplete} />
            </CardContent>
          </Card>
        )}

        {onboardingState.phase1Step === "business_info" && (
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessInfoForm
                userId={onboardingState.userId}
                onComplete={handleBusinessInfoComplete}
              />
            </CardContent>
          </Card>
        )}

        {onboardingState.phase1Step === "documents" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <DocumentUploadForm
                businessId={onboardingState.businessId}
                onComplete={handleDocumentsComplete}
              />
            </CardContent>
          </Card>
        )}

        {onboardingState.phase1Step === "review" && (
          <ApplicationReviewPage
            userData={onboardingState.userData}
            businessData={onboardingState.businessData}
            documents={onboardingState.documents}
            onSubmit={handleApplicationSubmit}
          />
        )}

        {onboardingState.phase1Step === "submitted" && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Application Submitted!</h3>
              <p className="text-gray-600 mb-6">
                We'll review your application and contact you within 2-3 business days.
              </p>
              <Button onClick={() => navigate("/provider-portal")}>
                Return to Portal
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/* 
  ✅ SUMMARY OF CHANGES:
  
  1. Added "policy" to Phase1Step type
  2. Added "policy" step to phase1Steps array
  3. Changed initial phase1Step from "signup" to "policy"
  4. Added policyAccepted to Phase1State interface
  5. Added handlePolicyAccept and handlePolicyDecline functions
  6. Added ProviderPolicyAgreement component to render section
  7. Imported ProviderPolicyAgreement component

  That's it! The policy agreement is now the first step in onboarding.
*/
