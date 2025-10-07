import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Building, User, Mail, MapPin, ArrowRight } from 'lucide-react';

interface InvitationData {
  businessId: string;
  email: string;
  role: string;
  locationId: string;
  businessName: string;
  locationName: string;
}

interface StaffWelcomeStepProps {
  invitationData: InvitationData;
  onContinue: () => void;
}

export default function StaffWelcomeStep({ invitationData, onContinue }: StaffWelcomeStepProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-green-600">
              Welcome to ROAM!
            </CardTitle>
            <p className="text-foreground/70">
              You've been invited to join the team
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-4">Invitation Details</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-foreground/60">Business</p>
                <p className="font-medium">{invitationData.businessName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-foreground/60">Role</p>
                <p className="font-medium capitalize">{invitationData.role}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-foreground/60">Email</p>
                <p className="font-medium">{invitationData.email}</p>
              </div>
            </div>

            {invitationData.locationName && (
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-foreground/60">Location</p>
                  <p className="font-medium">{invitationData.locationName}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">What to Expect</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Set up your account credentials</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Complete your professional profile</span>
            </li>
            {invitationData.role === 'dispatcher' ? (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Configure your availability schedule</span>
              </li>
            ) : (
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>Select your services and specialties</span>
              </li>
            )}
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>Start working with your team!</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={onContinue}
          className="w-full bg-roam-blue hover:bg-roam-blue/90"
          size="lg"
        >
          Get Started
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
}

