import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft } from "lucide-react";
import BusinessProfileSetup from "./BusinessProfileSetupSimplified";
import PersonalProfileSetup from "./PersonalProfileSetup";
import BusinessHoursSetup from "./BusinessHoursSetup";

interface QuickSetupProps {
  businessId: string;
  userId: string;
  onComplete: () => void;
  onBack?: () => void;
}

type QuickSetupSubStep = "business_profile" | "personal_profile" | "business_hours";

export default function QuickSetup({
  businessId,
  userId,
  onComplete,
  onBack,
}: QuickSetupProps) {
  const [currentSubStep, setCurrentSubStep] = useState<QuickSetupSubStep>("business_profile");
  const [completedSteps, setCompletedSteps] = useState<Set<QuickSetupSubStep>>(new Set());

  const subSteps = [
    { id: "business_profile" as QuickSetupSubStep, title: "Business Profile" },
    { id: "personal_profile" as QuickSetupSubStep, title: "Personal Profile" },
    { id: "business_hours" as QuickSetupSubStep, title: "Business Hours" },
  ];

  const currentStepIndex = subSteps.findIndex(step => step.id === currentSubStep);
  const progress = ((currentStepIndex + 1) / subSteps.length) * 100;

  const handleSubStepComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentSubStep]));

    if (currentSubStep === "business_profile") {
      setCurrentSubStep("personal_profile");
    } else if (currentSubStep === "personal_profile") {
      setCurrentSubStep("business_hours");
    } else {
      // All sub-steps complete
      onComplete();
    }
  };

  const handleSubStepBack = () => {
    if (currentSubStep === "personal_profile") {
      setCurrentSubStep("business_profile");
    } else if (currentSubStep === "business_hours") {
      setCurrentSubStep("personal_profile");
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Quick Setup</CardTitle>
          <p className="text-muted-foreground">
            Complete your profile and business hours to get started quickly
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Step {currentStepIndex + 1} of {subSteps.length}: {subSteps[currentStepIndex].title}
              </span>
              <span className="text-muted-foreground">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            
            {/* Sub-step indicators */}
            <div className="flex gap-2 justify-center pt-2">
              {subSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center ${
                    index < currentStepIndex
                      ? "text-green-600"
                      : index === currentStepIndex
                      ? "text-blue-600 font-semibold"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      index < currentStepIndex
                        ? "bg-green-100 border-green-600"
                        : index === currentStepIndex
                        ? "bg-blue-100 border-blue-600"
                        : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < subSteps.length - 1 && (
                    <div className="w-12 h-0.5 bg-gray-300 mx-1" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Sub-Step Content */}
      <div>
        {currentSubStep === "business_profile" && (
          <BusinessProfileSetup
            businessId={businessId}
            userId={userId}
            onComplete={handleSubStepComplete}
            onBack={handleSubStepBack}
          />
        )}

        {currentSubStep === "personal_profile" && (
          <PersonalProfileSetup
            businessId={businessId}
            userId={userId}
            onComplete={handleSubStepComplete}
            onBack={handleSubStepBack}
          />
        )}

        {currentSubStep === "business_hours" && (
          <BusinessHoursSetup
            businessId={businessId}
            userId={userId}
            onComplete={handleSubStepComplete}
            onBack={handleSubStepBack}
          />
        )}
      </div>
    </div>
  );
}

