import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, User, Mail, Phone, Briefcase, Clock, Package,
  Loader2, AlertCircle, ArrowRight 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationData {
  businessId: string;
  email: string;
  role: string;
  businessName: string;
}

interface OnboardingData {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  bio: string;
  professionalTitle?: string;
  yearsExperience?: number;
  avatarUrl?: string;
  coverImageUrl?: string;
  availability?: any;
  selectedServices?: string[];
}

interface StaffReviewCompleteProps {
  invitationData: InvitationData;
  onboardingData: OnboardingData;
  token: string;
  onBack: () => void;
}

export default function StaffReviewComplete({
  invitationData,
  onboardingData,
  token,
  onBack,
}: StaffReviewCompleteProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const isProvider = invitationData.role === 'provider';

  const handleComplete = async () => {
    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/staff/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          firstName: onboardingData.firstName,
          lastName: onboardingData.lastName,
          phone: onboardingData.phone,
          password: onboardingData.password,
          bio: onboardingData.bio,
          professionalTitle: onboardingData.professionalTitle,
          yearsExperience: onboardingData.yearsExperience,
          avatarUrl: onboardingData.avatarUrl,
          coverImageUrl: onboardingData.coverImageUrl,
          availability: onboardingData.availability,
          selectedServices: onboardingData.selectedServices,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}`
          : result.error || 'Failed to complete onboarding';
        console.error('Server error details:', result);
        throw new Error(errorMessage);
      }

      toast({
        title: 'Welcome to ROAM!',
        description: 'Your account has been created successfully.',
      });

      // Redirect to provider portal login
      setTimeout(() => {
        navigate('/provider-portal');
      }, 1000);
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete onboarding');
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete onboarding',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableDaysCount = () => {
    if (!onboardingData.availability) return 0;
    return Object.values(onboardingData.availability).filter((day: any) => day?.isOpen).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-blue-600">
              Review & Complete
            </CardTitle>
            <p className="text-foreground/70">
              Verify your information before finishing
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Summary Sections */}
        <div className="space-y-4">
          {/* Business & Role */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3">Position</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Business:</span>
                <span className="font-medium">{invitationData.businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Role:</span>
                <Badge className="capitalize">{invitationData.role}</Badge>
              </div>
            </div>
          </Card>

          {/* Account Information */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Account Information</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Name:</span>
                <span className="font-medium">{onboardingData.firstName} {onboardingData.lastName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Email:</span>
                <span className="font-medium">{invitationData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Phone:</span>
                <span className="font-medium">{onboardingData.phone}</span>
              </div>
            </div>
          </Card>

          {/* Profile */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold">Profile</h3>
            </div>
            <div className="space-y-2 text-sm">
              {isProvider && onboardingData.professionalTitle && (
                <div className="flex justify-between">
                  <span className="text-foreground/60">Title:</span>
                  <span className="font-medium">{onboardingData.professionalTitle}</span>
                </div>
              )}
              {isProvider && onboardingData.yearsExperience !== undefined && (
                <div className="flex justify-between">
                  <span className="text-foreground/60">Experience:</span>
                  <span className="font-medium">{onboardingData.yearsExperience} years</span>
                </div>
              )}
              <div className="flex justify-between items-start">
                <span className="text-foreground/60">Bio:</span>
                <span className="font-medium text-right max-w-xs truncate">
                  {onboardingData.bio || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/60">Profile Photo:</span>
                <span className="font-medium">
                  {onboardingData.avatarUrl ? '✓ Uploaded' : 'Not uploaded'}
                </span>
              </div>
              {isProvider && (
                <div className="flex justify-between">
                  <span className="text-foreground/60">Cover Image:</span>
                  <span className="font-medium">
                    {onboardingData.coverImageUrl ? '✓ Uploaded' : 'Not uploaded'}
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Availability (Dispatcher) */}
          {!isProvider && onboardingData.availability && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold">Availability</h3>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Available Days:</span>
                  <span className="font-medium">{getAvailableDaysCount()} days/week</span>
                </div>
              </div>
            </Card>
          )}

          {/* Services (Provider) */}
          {isProvider && onboardingData.selectedServices && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold">Services</h3>
              </div>
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60">Selected Services:</span>
                  <Badge>{onboardingData.selectedServices.length} services</Badge>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Completion Notice */}
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Ready to join the team!</strong> By clicking "Complete Setup", 
            your account will be created and you'll be able to log in to the provider portal.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={submitting}
          >
            Back
          </Button>
          
          <Button
            onClick={handleComplete}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Complete Setup
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

