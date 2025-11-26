import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Import step components
import StaffWelcomeStep from './StaffSteps/StaffWelcomeStep';
import StaffAccountSetup from './StaffSteps/StaffAccountSetup';
import StaffProfileSetup from './StaffSteps/StaffProfileSetup';
import StaffAvailabilitySetup from './StaffSteps/StaffAvailabilitySetup';
import StaffServicesSetup from './StaffSteps/StaffServicesSetup';
import StaffReviewComplete from './StaffSteps/StaffReviewComplete';

type StaffRole = 'dispatcher' | 'provider';

type StepId = 'welcome' | 'account' | 'profile' | 'availability' | 'services' | 'review';

interface InvitationData {
  businessId: string;
  email: string;
  role: StaffRole;
  locationId: string;
  businessName: string;
  locationName: string;
}

interface StaffOnboardingData {
  // Account setup
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  
  // Profile
  bio: string;
  professionalTitle?: string;
  yearsExperience?: number;
  avatarUrl?: string;
  coverImageUrl?: string;
  
  // Availability (dispatcher)
  availability?: any;
  
  // Services (provider)
  selectedServices?: string[];
}

export default function StaffOnboardingFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>('welcome');
  const [onboardingData, setOnboardingData] = useState<StaffOnboardingData>({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    bio: '',
  });

  // Define steps based on role
  const getSteps = (role: StaffRole): { id: StepId; title: string; }[] => {
    const commonSteps = [
      { id: 'welcome' as StepId, title: 'Welcome' },
      { id: 'account' as StepId, title: 'Account Setup' },
      { id: 'profile' as StepId, title: 'Profile' },
    ];

    if (role === 'dispatcher') {
      return [
        ...commonSteps,
        { id: 'availability' as StepId, title: 'Availability' },
        { id: 'review' as StepId, title: 'Review & Complete' },
      ];
    } else {
      return [
        ...commonSteps,
        { id: 'services' as StepId, title: 'Services' },
        { id: 'review' as StepId, title: 'Review & Complete' },
      ];
    }
  };

  const steps = invitationData ? getSteps(invitationData.role) : [];
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  useEffect(() => {
    validateInvitation();
  }, []);

  const validateInvitation = async () => {
    const token = searchParams.get('token');
    
    if (!token) {
      setError('Invalid invitation link. Please contact your team administrator.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/staff/validate-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Invalid invitation');
      }

      setInvitationData(result.invitation);
    } catch (error) {
      console.error('Error validating invitation:', error);
      setError(error instanceof Error ? error.message : 'Failed to validate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = (stepData: Partial<StaffOnboardingData>) => {
    // Merge step data into onboarding data
    setOnboardingData(prev => ({ ...prev, ...stepData }));
    
    // Move to next step
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    }
  };

  const renderStep = () => {
    if (!invitationData) return null;

    const token = searchParams.get('token') || '';

    switch (currentStep) {
      case 'welcome':
        return (
          <StaffWelcomeStep
            invitationData={invitationData}
            onContinue={() => handleNext({})}
          />
        );
      
      case 'account':
        return (
          <StaffAccountSetup
            invitationData={invitationData}
            initialData={onboardingData}
            onComplete={(data) => handleNext(data)}
            onBack={handleBack}
          />
        );
      
      case 'profile':
        return (
          <StaffProfileSetup
            invitationData={invitationData}
            role={invitationData.role}
            initialData={onboardingData}
            onComplete={(data) => handleNext(data)}
            onBack={handleBack}
          />
        );
      
      case 'availability':
        return (
          <StaffAvailabilitySetup
            invitationData={invitationData}
            initialData={onboardingData}
            onComplete={(data) => handleNext(data)}
            onBack={handleBack}
          />
        );
      
      case 'services':
        return (
          <StaffServicesSetup
            invitationData={invitationData}
            initialData={onboardingData}
            onComplete={(data) => handleNext(data)}
            onBack={handleBack}
          />
        );
      
      case 'review':
        return (
          <StaffReviewComplete
            invitationData={invitationData}
            onboardingData={onboardingData}
            token={token}
            onBack={handleBack}
          />
        );
      
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Go to Homepage
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/default-placeholder.png"
            alt="ROAM"
            className="h-12 w-auto mx-auto mb-4"
          />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {invitationData?.role === 'dispatcher' ? 'Dispatcher' : 'Provider'} Onboarding
              </h1>
              <p className="text-sm text-gray-600">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
            </div>
            <Badge variant="outline">
              {Math.round(progress)}% Complete
            </Badge>
          </div>
          
          <Progress value={progress} className="mb-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 text-center ${
                  index <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <div className="text-xs font-medium">{step.title}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        {renderStep()}
      </div>
    </div>
  );
}

