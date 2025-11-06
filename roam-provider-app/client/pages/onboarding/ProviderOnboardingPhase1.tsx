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

// Import components
import { ProviderSignupForm } from "@/components/ProviderSignupForm";
import { BusinessInfoForm } from "@/components/BusinessInfoForm";
import { DocumentUploadForm } from "@/components/DocumentUploadForm";
import { ApplicationReviewPage } from "@/components/ApplicationReviewPage";
import StripeIdentityVerification from "@/components/StripeIdentityVerification";

// Import utilities
import { postJson } from "@/lib/api-utils";
import { useAuth } from "@/contexts/auth/AuthProvider";

type Phase1Step = "application" | "identity_verification" | "business_documents" | "submitted";

interface Phase1State {
  phase1Step: Phase1Step;
  userData?: any;
  businessData?: any;
  documents?: any[];
  businessId?: string;
  userId?: string;
  identityVerified?: boolean;
  identityVerificationSessionId?: string;
}

// Streamlined Phase 1: 3 steps to approval
const phase1Steps = [
  { id: "application", title: "Business Application", icon: Building },
  { id: "identity_verification", title: "Identity Verification", icon: User },
  { id: "business_documents", title: "Documents (Optional)", icon: FileText },
];

export default function ProviderOnboardingPhase1() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [onboardingState, setOnboardingState] = useState<Phase1State>({
    phase1Step: "application",
    userData: undefined,
    businessData: undefined,
    documents: undefined,
    businessId: undefined,
    userId: undefined,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track sub-step within application step (signup -> business_info)
  const [applicationSubStep, setApplicationSubStep] = useState<"signup" | "business_info">("signup");

  // Initialize onboarding state based on URL and auth
  useEffect(() => {
    initializeOnboardingState();
  }, [location, isAuthenticated]);

  const initializeOnboardingState = () => {
    if (isAuthenticated && user && user.id) {
      // User is logged in, check their onboarding status
      checkOnboardingStatus();
    } else {
      // Start from beginning
      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "application",
      }));
    }
  };

  const checkOnboardingStatus = async () => {
    if (!user) return;

    try {
      setLoading(true);
      // Check user's onboarding progress
      const response = await fetch(`/api/onboarding/status/${user.id}`);

      if (response.ok) {
        const status = await response.json();

        if (status.phase === "complete") {
          navigate("/provider-dashboard");
        } else if (status.phase === "phase2") {
          // Redirect to Phase 2
          navigate("/provider-onboarding/phase2/quick_setup");
        } else {
          setOnboardingState((prev) => ({
            ...prev,
            phase1Step: status.currentStep || "application",
            userData: status.userData || undefined,
            businessData: status.businessData || undefined,
            businessId: status.businessId || undefined,
            userId: user.id,
          }));
        }
      } else {
        // If API call fails, just start from the beginning
        console.warn("Failed to check onboarding status, starting from beginning");
        setOnboardingState((prev) => ({
          ...prev,
          phase1Step: "application",
          userId: user?.id,
        }));
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
      // If there's an error, just start from the beginning
      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "application",
        userId: user?.id,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSignupComplete = async (signupData: any) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Starting signup process for:", signupData.email);
      console.log("Signup data keys:", Object.keys(signupData));

      // Add role field for provider signup
      const signupDataWithRole = {
        ...signupData,
        role: 'provider'
      };

      console.log("Enhanced signup data keys:", Object.keys(signupDataWithRole));

      // Create user account using the safe API utility
      const response = await postJson("/api/auth/signup", signupDataWithRole);

      console.log("Signup API response:", {
        success: response.success,
        status: response.status,
        hasData: !!response.data,
        hasError: !!response.error
      });

      if (!response.success) {
        // Handle specific error cases
        if (response.status === 409) {
          console.log(
            "💡 Developer tip: To delete test users, call: DELETE /api/admin/delete-test-user with { email: 'test@example.com' }",
          );
          throw new Error(
            "An account with this email already exists. Please use a different email or try logging in.",
          );
        }

        // Log the full error response for debugging
        console.error("Signup failed with response:", response);
        throw new Error(response.error || "Failed to create account");
      }

      const result = response.data;
      console.log("Signup successful:", { userId: result?.user?.id, email: result?.user?.email });

      // Validate result structure
      if (!result) {
        console.error("No data in successful response");
        throw new Error("Invalid response: no data returned");
      }

      if (!result.user || !result.user.id) {
        console.error("Invalid user data in response:", result);
        throw new Error("Invalid response: missing user data");
      }

      console.log("Moving to business info sub-step");
      setOnboardingState((prev) => ({
        ...prev,
        userData: result.user,
        userId: result.user.id,
      }));
      // Move to business info sub-step within application
      setApplicationSubStep("business_info");
    } catch (error) {
      console.error("Signup error:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack available");

      let errorMessage = "Failed to create account";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else {
        console.error("Unknown error type:", typeof error, error);
        errorMessage = "An unexpected error occurred during signup";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBusinessInfoComplete = async (businessData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Validate userId exists
      if (!onboardingState.userId) {
        throw new Error(
          "User ID is missing. Please start the signup process again.",
        );
      }

      // Log the data being sent for debugging
      const requestData = {
        userId: onboardingState.userId,
        businessData,
      };
      console.log("Sending business info request:", requestData);
      console.log("Business data keys:", Object.keys(businessData));
      console.log("Required fields check:", {
        businessName: !!businessData.businessName,
        businessType: !!businessData.businessType,
        contactEmail: !!businessData.contactEmail,
        phone: !!businessData.phone,
        serviceCategories: !!businessData.serviceCategories && businessData.serviceCategories.length > 0,
      });

      const response = await fetch("/api/onboarding/business-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      // Clone the response immediately to avoid any body stream issues
      let responseText;
      let result;

      try {
        // Read response directly as text - no cloning needed
        responseText = await response.text();
        console.log("Business info response - Status:", response.status);
        console.log("Raw response length:", responseText.length);

        // Parse the response text as JSON
        if (responseText.trim()) {
          result = JSON.parse(responseText);
          console.log("Parsed response:", result);
        } else {
          throw new Error("Empty response from server");
        }
      } catch (error) {
        console.error("Response processing failed:", error);
        console.error("Response status:", response.status);

        // If it's a JSON parsing error, show the raw text
        if (error.name === "SyntaxError") {
          console.error("Raw response that failed to parse:", responseText);
          throw new Error("Server returned invalid JSON response");
        } else {
          // For other errors, provide helpful messages based on status
          if (response.status >= 500) {
            throw new Error("Server error occurred. Please try again later.");
          } else if (response.status === 404) {
            throw new Error("API endpoint not found. Please contact support.");
          } else if (response.status >= 400) {
            throw new Error(
              "Request failed. Please check your data and try again.",
            );
          } else {
            throw new Error("Failed to process server response");
          }
        }
      }

      if (!response.ok) {
        throw new Error(result.error || "Failed to save business information");
      }

      // Validate result structure
      if (!result.business || !result.business.id) {
        throw new Error("Invalid response: missing business data");
      }

      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "identity_verification",
        businessData,
        businessId: result.business.id,
      }));
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save business information",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleIdentityVerificationComplete = async (verificationData: any) => {
    console.log("Identity verification completed:", verificationData);
    setOnboardingState((prev) => ({
      ...prev,
      phase1Step: "business_documents",
      identityVerified: true,
      identityVerificationSessionId: verificationData.id,
    }));
  };

  const handleIdentityVerificationPending = () => {
    console.log("Identity verification pending - processing...");
    // User has submitted their information, we're waiting for results
    // Can show a loading state or allow them to continue
  };

  const handleIdentityVerificationFailed = (error: string) => {
    console.error("Identity verification failed:", error);
    setError(`Identity verification failed: ${error}. Please try again or contact support.`);
  };

  const handleDocumentsComplete = async (documents: any[]) => {
    // Store documents and auto-submit application
    setOnboardingState((prev) => ({
      ...prev,
      documents,
    }));
    // Auto-submit application after documents uploaded (or skipped)
    await handleApplicationSubmit();
  };

  const handleApplicationSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required data
      if (!onboardingState.userId) {
        throw new Error(
          "User ID is missing. Please start the signup process again.",
        );
      }
      if (!onboardingState.businessId) {
        throw new Error(
          "Business ID is missing. Please complete business information first.",
        );
      }

      console.log("Submitting application with:", {
        userId: onboardingState.userId,
        businessId: onboardingState.businessId,
      });

      const response = await fetch("/api/onboarding/submit-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: onboardingState.userId,
          businessId: onboardingState.businessId,
          finalConsents: {
            informationAccuracy: true,
            termsAccepted: true,
            backgroundCheckConsent: true,
          },
        }),
      });

      // Handle response based on status without reading body initially
      console.log("Submit application response - Status:", response.status);

      // Check if response is successful first
      if (response.ok) {
        // Only try to read the body if the response was successful
        try {
          const result = await response.json();
          console.log("Application submitted successfully:", result);
        } catch (jsonError) {
          console.log(
            "Success response but couldn't parse JSON, continuing anyway",
          );
        }
      } else {
        // For error responses, provide helpful messages based on status code
        if (response.status === 400) {
          // Don't try to read the body, just provide a helpful error based on the context
          throw new Error(
            "Please ensure all required information is complete before submitting your application.",
          );
        } else if (response.status === 404) {
          throw new Error(
            "Business profile not found. Please complete the business information step first.",
          );
        } else if (response.status >= 500) {
          throw new Error("Server error occurred. Please try again later.");
        } else {
          throw new Error(
            `Application submission failed (${response.status}). Please check your information and try again.`,
          );
        }
      }

      setOnboardingState((prev) => ({
        ...prev,
        phase1Step: "submitted",
      }));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to submit application",
      );
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    return phase1Steps.findIndex(
      (step) => step.id === onboardingState.phase1Step,
    );
  };

  const getProgressPercentage = () => {
    const currentStep = getCurrentStepIndex();
    const totalSteps = phase1Steps.length;
    return Math.round(((currentStep + 1) / totalSteps) * 100);
  };

  const renderContent = () => {
    const { phase1Step } = onboardingState;

    switch (phase1Step) {
      case "application":
        // Combined application step - shows signup then business info
        if (applicationSubStep === "signup") {
          return (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Business Application</h2>
                <p className="text-muted-foreground mt-2">Step 1 of 2: Create your account</p>
              </div>
              <ProviderSignupForm
                onSubmit={handleSignupComplete}
                loading={loading}
                error={error}
              />
            </div>
          );
        } else {
          // business_info sub-step
          if (!onboardingState.userId) {
            console.warn("UserId missing, redirecting to signup sub-step");
            setApplicationSubStep("signup");
            setError("Please complete the signup process first.");
            return null;
          }
          return (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Business Application</h2>
                <p className="text-muted-foreground mt-2">Step 2 of 2: Tell us about your business</p>
              </div>
              <BusinessInfoForm
                onSubmit={handleBusinessInfoComplete}
                loading={loading}
                error={error}
                initialData={onboardingState.businessData}
              />
            </div>
          );
        }

      case "identity_verification":
        // Ensure userId and businessId exist before allowing identity verification
        if (!onboardingState.userId || !onboardingState.businessId) {
          console.warn("UserId or BusinessId missing, redirecting to application");
          setOnboardingState((prev) => ({
            ...prev,
            phase1Step: "application",
          }));
          setApplicationSubStep("signup");
          setError("Please complete the previous steps first.");
          return null;
        }
        return (
          <StripeIdentityVerification
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
            onVerificationComplete={handleIdentityVerificationComplete}
            onVerificationPending={handleIdentityVerificationPending}
            onVerificationFailed={handleIdentityVerificationFailed}
            className="max-w-2xl mx-auto"
          />
        );

      case "business_documents":
        // Ensure userId exists before allowing document upload
        if (!onboardingState.userId) {
          console.warn("UserId missing, redirecting to application");
          setOnboardingState((prev) => ({
            ...prev,
            phase1Step: "application",
          }));
          setApplicationSubStep("signup");
          setError("Please complete the signup process first.");
          return null;
        }
        return (
          <DocumentUploadForm
            onSubmit={handleDocumentsComplete}
            loading={loading}
            error={error}
            businessType={onboardingState.businessData?.businessType}
            userId={onboardingState.userId}
            businessId={onboardingState.businessId}
          />
        );

      case "submitted":
        return (
          <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-800">
                Application Submitted!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>What's next:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>
                      Background check and document verification (2-3 business
                      days)
                    </li>
                    <li>
                      Admin review of your application (1-2 business days)
                    </li>
                    <li>
                      Email notification with secure link for Phase 2 setup
                    </li>
                  </ul>
                </AlertDescription>
              </Alert>

              <p className="text-foreground/70">
                You'll receive an email with next steps once your application is
                approved. Please check your email regularly and add our domain
                to your safe senders list.
              </p>

              <Button
                onClick={() => navigate("/provider-portal")}
                className="bg-roam-blue hover:bg-roam-blue/90"
              >
                Return to Provider Portal
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderProgressBar = () => {
    const currentStepIndex = getCurrentStepIndex();

    return (
      <div className="w-full max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Phase 1: Application</h2>
            <p className="text-sm text-foreground/60">
              Step {currentStepIndex + 1} of {phase1Steps.length}
            </p>
          </div>
          <Badge variant="outline">{getProgressPercentage()}% Complete</Badge>
        </div>

        <Progress value={getProgressPercentage()} className="mb-4" />

        <div className="hidden md:flex items-center justify-between">
          {phase1Steps.map((step, index) => {
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
                {index < phase1Steps.length - 1 && (
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
                onClick={() => navigate("/provider-portal")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Portal
              </Button>
              <div className="flex items-center space-x-2">
                <img
                  src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                  alt="ROAM Logo"
                  className="h-8 w-auto"
                />
              </div>
            </div>
            <Badge
              variant="outline"
              className="border-roam-blue text-roam-blue"
            >
              Business Onboarding - Phase 1
            </Badge>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderProgressBar()}
        {renderContent()}
      </div>
    </div>
  );
}
