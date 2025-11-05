import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Banknote,
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  ExternalLink,
  Lock,
  FileText
} from 'lucide-react';
import StripeTaxInfoCapture from '@/components/StripeTaxInfoCapture';
import StripeAccountConnector from '@/components/StripeAccountConnector';

interface BankingPayoutData {
  stripeConnected: boolean;
  stripeAccountId?: string;
  stripeAccountStatus?: string;
  taxInfoCompleted?: boolean;
}

interface BankingPayoutSetupProps {
  businessId: string;
  userId: string;
  businessName?: string;
  businessType?: string;
  userEmail?: string;
  onComplete: (data: BankingPayoutData) => void;
  onBack?: () => void;
  initialData?: BankingPayoutData;
  className?: string;
}



export default function BankingPayoutSetup({
  businessId,
  userId,
  businessName: propBusinessName,
  businessType: propBusinessType,
  userEmail: propUserEmail,
  onComplete,
  onBack,
  initialData,
  className = ""
}: BankingPayoutSetupProps) {
  const [bankingData, setBankingData] = useState<BankingPayoutData>(
    initialData || {
      stripeConnected: false,
      taxInfoCompleted: false,
    }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  // Start with tax-info step if not completed, otherwise start with stripe-connect
  const [currentStep, setCurrentStep] = useState<'tax-info' | 'stripe-connect'>(
    initialData?.taxInfoCompleted ? 'stripe-connect' : 'tax-info'
  );
  
  // State to store business info and tax data from tax form or props
  const [businessName, setBusinessName] = useState<string>(propBusinessName || '');
  const [businessType, setBusinessType] = useState<string>(propBusinessType || '');
  const [userEmail, setUserEmail] = useState<string>(propUserEmail || '');
  const [taxInfo, setTaxInfo] = useState<any>(null);

  // Check if tax info exists in database on mount
  useEffect(() => {
    const checkTaxInfo = async () => {
      try {
        const res = await fetch(`/api/business/tax-info?business_id=${businessId}`);
        if (res.ok) {
          const { tax_info } = await res.json();
          if (tax_info && tax_info.tax_id && tax_info.legal_business_name) {
            // Update business info from tax data
            setBusinessName(tax_info.legal_business_name || '');
            setBusinessType(tax_info.business_entity_type || 'llc');
            setUserEmail(tax_info.tax_contact_email || '');
            setTaxInfo(tax_info); // Store full tax info for StripeAccountConnector
            
            setBankingData(prev => {
              // Only update if not already set
              if (!prev.taxInfoCompleted) {
                return {
                  ...prev,
                  taxInfoCompleted: true
                };
              }
              return prev;
            });
            // Switch to stripe-connect if tax info is complete
            setCurrentStep(prev => prev === 'tax-info' ? 'stripe-connect' : prev);
          }
        }
      } catch (error) {
        console.error('Error checking tax info:', error);
      }
    };
    checkTaxInfo();
  }, [businessId]);

  const updateBankingData = (field: keyof BankingPayoutData, value: any) => {
    setBankingData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const connectStripeAccount = async () => {
    try {
      setConnectingStripe(true);
      setError(null);

      // Get tax info which contains the contact email and business details for Stripe
      const taxInfoResponse = await fetch(`/api/business/tax-info?business_id=${businessId}`);
      if (!taxInfoResponse.ok) {
        throw new Error('Failed to fetch tax information. Please complete the tax information form first.');
      }
      const { tax_info } = await taxInfoResponse.json();
      
      if (!tax_info || !tax_info.tax_contact_email) {
        throw new Error('Business contact email is required. Please complete the tax information form first.');
      }

      // Use tax info as source of truth for Stripe Connect
      const businessName = tax_info.legal_business_name || 'Business';
      const email = tax_info.tax_contact_email;
      const businessType = tax_info.business_entity_type || 'llc';

      const requestPayload = {
        userId,
        businessId,
        businessType: businessType === 'llc' || businessType === 'corporation' || businessType === 'partnership' || businessType === 'non_profit' ? 'company' : 'individual',
        businessName,
        email,
        country: 'US',
      };

      console.log('=== STRIPE CONNECT REQUEST ===');
      console.log('Sending to Stripe Connect:', requestPayload);

      // Tax info should already be saved in database from the tax info step
      // The API endpoint will fetch it automatically
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe Connect account');
      }

      const result = await response.json();
      
      // Check if this is development mode (mock response)
      if (result.testMode) {
        console.log('Development mode: Stripe Connect account created successfully');
        setBankingData(prev => ({
          ...prev,
          stripeConnected: true,
          stripeAccountId: result.account_id || 'mock-account'
        }));
        return;
      }
      
      // Production mode: Redirect to Stripe Connect onboarding
      if (result.onboarding_url) {
        window.location.href = result.onboarding_url;
      } else {
        throw new Error('No onboarding URL received from Stripe');
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect Stripe account');
    } finally {
      setConnectingStripe(false);
    }
  };

  const completionPercentage = () => {
    let completed = 0;
    const total = 2; // tax info and stripe connection

    if (bankingData.taxInfoCompleted) completed++;
    if (bankingData.stripeConnected) completed++;

    return Math.round((completed / total) * 100);
  };

  const canSubmit = () => {
    return bankingData.taxInfoCompleted && bankingData.stripeConnected;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // Save banking & payout data to database
      const response = await fetch('/api/onboarding/save-phase2-progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          business_id: businessId,
          step: 'banking_payout',
          data: bankingData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save banking & payout data');
      }

      // Call the onComplete callback
      onComplete(bankingData);
    } catch (error) {
      console.error('Error saving banking & payout data:', error);
      setError(error instanceof Error ? error.message : 'Failed to save banking & payout data');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-blue-600 rounded-full flex items-center justify-center">
              <Banknote className="w-6 h-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl text-roam-blue">
                Banking & Payouts
              </CardTitle>
              <p className="text-foreground/70">
                Configure how you'll receive payments from customers
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Setup Progress</span>
              <span>{completionPercentage()}% Complete</span>
            </div>
            <Progress value={completionPercentage()} className="w-full" />
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Tax & Business Information (Always shown first) */}
          {!bankingData.taxInfoCompleted && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Step 1 of 2:</strong> Please complete your business and tax information below. After saving, you'll be able to connect your Stripe account.
                </AlertDescription>
              </Alert>
              <StripeTaxInfoCapture
                businessId={businessId}
                userId={userId}
                onComplete={(taxData) => {
                  // Tax info has been saved successfully
                  // Update business info from tax data
                  if (taxData?.legal_business_name) {
                    setBusinessName(taxData.legal_business_name);
                  }
                  if (taxData?.business_entity_type) {
                    setBusinessType(taxData.business_entity_type);
                  }
                  if (taxData?.tax_contact_email) {
                    setUserEmail(taxData.tax_contact_email);
                  }
                  setTaxInfo(taxData); // Store full tax info for StripeAccountConnector
                  
                  setBankingData(prev => ({
                    ...prev,
                    taxInfoCompleted: true
                  }));
                  // Keep on same page to show Stripe Connect button
                }}
                onBack={onBack}
              />
            </div>
          )}

          {/* Step 2: Stripe Connect (Only shown after tax info is saved) */}
          {bankingData.taxInfoCompleted && (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Tax Information Saved!</strong> Now you can connect your Stripe account to start receiving payments.
                </AlertDescription>
              </Alert>
              
              {/* Payment Processing Information */}
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Stripe Connect</h4>
                    <p className="text-sm text-blue-800">Secure payment processing & payouts</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Instant payouts every Friday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Secure payment processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span>Automatic tax handling</span>
                  </div>
                </div>
              </Card>
              
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Stripe Connect Setup</Label>
                <Badge className={bankingData.stripeConnected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                  {bankingData.stripeConnected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
              
              {!bankingData.stripeConnected ? (
                <StripeAccountConnector
                  businessId={businessId}
                  userId={userId}
                  taxInfo={taxInfo}
                  onAccountLinked={(accountData) => {
                    console.log('Stripe account linked:', accountData);
                    setBankingData(prev => ({
                      ...prev,
                      stripeConnected: true,
                      stripeAccountId: accountData.id,
                      stripeAccountStatus: accountData.charges_enabled ? 'active' : 'pending'
                    }));
                  }}
                  onAccountCreated={(accountData) => {
                    console.log('Stripe account created:', accountData);
                    setBankingData(prev => ({
                      ...prev,
                      stripeConnected: true,
                      stripeAccountId: accountData.id,
                      stripeAccountStatus: accountData.charges_enabled ? 'active' : 'pending'
                    }));
                  }}
                />
              ) : (
                <Card className="p-4 border-green-200 bg-green-50">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <div>
                      <h4 className="font-semibold text-green-800">Stripe Account Connected</h4>
                      <p className="text-green-700">Your account is ready to receive payments</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}



          {/* Automatic Payouts Information */}
          <div className="space-y-4">
            <Label className="text-lg font-semibold">Automatic Payouts</Label>
            <Card className="p-4 border-green-200 bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-900">Automated Payouts Enabled</h4>
                  <p className="text-sm text-green-800">
                    All providers receive automatic payouts every Friday. No action required.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Security Information */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security:</strong> All payment information is encrypted and processed securely through Stripe. 
              We never store your full bank account or credit card details.
            </AlertDescription>
          </Alert>

          {/* Information Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> You can change your payout settings anytime from your dashboard. 
              The first payout may take 7-14 days to process for new accounts.
            </AlertDescription>
          </Alert>

          {/* Development Mode Skip Button */}
          {process.env.NODE_ENV === 'development' && (
            <div className="pt-4 border-t border-dashed border-orange-300">
              <Alert className="border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Development Mode:</strong> Click the button below to skip to the next step for testing purposes.
                </AlertDescription>
              </Alert>
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => onComplete({ stripeConnected: true })}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  🚀 Skip to Service Pricing (Dev Mode)
                </Button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-6">
            {onBack && (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={loading || !canSubmit()}
              className="bg-roam-blue hover:bg-roam-blue/90 ml-auto"
            >
              {!canSubmit() && (
                <span className="text-xs mr-2">
                  {!bankingData.stripeConnected 
                    ? "Connect Stripe Account" 
                    : "Connect Bank Account"}
                </span>
              )}
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue to Service Pricing
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
