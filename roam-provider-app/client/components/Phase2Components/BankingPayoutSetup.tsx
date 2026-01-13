import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Banknote,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Loader2,
  Info,
  ExternalLink,
  Lock,
} from 'lucide-react';

interface BankingPayoutData {
  stripeConnected: boolean;
  stripeAccountId?: string;
  stripeAccountStatus?: string;
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
    }
  );
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);

  // Check URL params for return from Stripe and check existing account status on mount
  useEffect(() => {
    const checkStripeStatus = async () => {
      try {
        setCheckingStatus(true);
        
        // Check URL params for return from Stripe
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const refresh = urlParams.get('refresh');
        
        // Clean up URL params
        if (success || refresh) {
          window.history.replaceState({}, '', window.location.pathname);
        }
        
        // Check if business already has a Stripe account
        const response = await fetch(`/api/stripe/check-account-status?businessId=${businessId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.hasAccount) {
            setBankingData({
              stripeConnected: data.chargesEnabled && data.payoutsEnabled,
              stripeAccountId: data.accountId,
              stripeAccountStatus: data.chargesEnabled ? 'active' : 'pending',
            });
            
            // If account exists but not fully set up, offer to continue onboarding
            if (data.accountId && (!data.chargesEnabled || !data.payoutsEnabled)) {
              // Account exists but needs more setup - they may have returned early
              console.log('Stripe account exists but needs additional setup');
            }
          }
        }
      } catch (error) {
        console.error('Error checking Stripe status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };
    
    checkStripeStatus();
  }, [businessId]);

  const connectStripeAccount = async () => {
    try {
      setConnectingStripe(true);
      setError(null);

      // Simple request - just send businessId and userId
      // Stripe will collect email and all other info during their onboarding
      const response = await fetch('/api/stripe/create-connect-account-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          businessId,
          businessName: propBusinessName || 'Business',
          businessType: propBusinessType === 'independent' ? 'individual' : 'company',
          email: propUserEmail, // Optional - Stripe will ask if not provided
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.details || 'Failed to create Stripe Connect account');
      }

      const result = await response.json();
      
      // Check if this is development mode (mock response)
      if (result.testMode) {
        console.log('Development mode: Stripe Connect account created successfully');
        setBankingData({
          stripeConnected: true,
          stripeAccountId: result.account_id || 'mock-account',
          stripeAccountStatus: 'active',
        });
        return;
      }
      
      // Redirect to Stripe Connect onboarding
      // Stripe will handle email collection, existing account lookup, and all setup
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

  const continueStripeOnboarding = async () => {
    try {
      setConnectingStripe(true);
      setError(null);

      // Get a new onboarding link for existing account
      const response = await fetch('/api/stripe/create-account-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          accountId: bankingData.stripeAccountId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create onboarding link');
      }

      const result = await response.json();
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No onboarding URL received');
      }
    } catch (error) {
      console.error('Error continuing Stripe onboarding:', error);
      setError(error instanceof Error ? error.message : 'Failed to continue Stripe setup');
    } finally {
      setConnectingStripe(false);
    }
  };

  const completionPercentage = () => {
    return bankingData.stripeConnected ? 100 : 0;
  };

  const canSubmit = () => {
    return bankingData.stripeConnected;
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



  // Show loading state while checking status
  if (checkingStatus) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-roam-blue" />
              <p className="text-foreground/70">Checking account status...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

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
                Connect your Stripe account to receive payments
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

          {/* Stripe Connect Section */}
          {!bankingData.stripeConnected ? (
            <div className="space-y-6">
              {/* Payment Processing Information */}
              <Card className="p-6 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg text-blue-900">Stripe Connect</h4>
                    <p className="text-blue-800">Secure payment processing & payouts</p>
                  </div>
                </div>
                <div className="space-y-3 text-blue-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Automatic weekly payouts every Thursday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Secure, PCI-compliant payment processing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>1099 tax form issuance via Stripe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <span>Use your existing Stripe account or create a new one</span>
                  </div>
                </div>
              </Card>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Click the button below to connect your Stripe account. If you already have a Stripe account, 
                  you can log in with your email. If not, Stripe will guide you through creating one.
                </AlertDescription>
              </Alert>

              {/* Connect Button */}
              <div className="flex flex-col items-center space-y-4">
                <Button
                  onClick={bankingData.stripeAccountId ? continueStripeOnboarding : connectStripeAccount}
                  disabled={connectingStripe}
                  size="lg"
                  className="w-full max-w-md bg-[#635bff] hover:bg-[#5851db] text-white py-6 text-lg"
                >
                  {connectingStripe ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Connecting to Stripe...
                    </>
                  ) : bankingData.stripeAccountId ? (
                    <>
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Continue Stripe Setup
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-5 h-5 mr-2" />
                      Connect with Stripe
                    </>
                  )}
                </Button>
                <p className="text-xs text-center text-foreground/60">
                  You'll be redirected to Stripe's secure platform to complete setup
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Connected State */}
              <Card className="p-6 border-green-200 bg-green-50">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xl text-green-800">Stripe Account Connected!</h4>
                    <p className="text-green-700">Your account is ready to receive payments</p>
                    {bankingData.stripeAccountId && (
                      <p className="text-sm text-green-600 mt-1">
                        Account ID: {bankingData.stripeAccountId.slice(0, 12)}...
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Payout Info */}
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900">Automatic Weekly Payouts</h4>
                    <p className="text-sm text-blue-800">
                      Payments are automatically deposited to your bank account every Thursday
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Security Information */}
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertDescription>
              <strong>Security:</strong> All payment information is encrypted and processed securely through Stripe. 
              We never store your bank account or credit card details.
            </AlertDescription>
          </Alert>

          {/* Development Mode Skip Button */}
          {process.env.NODE_ENV === 'development' && !bankingData.stripeConnected && (
            <div className="pt-4 border-t border-dashed border-orange-300">
              <Alert className="border-orange-200 bg-orange-50">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Development Mode:</strong> Skip Stripe setup for testing.
                </AlertDescription>
              </Alert>
              <div className="mt-3 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => onComplete({ stripeConnected: true, stripeAccountId: 'dev-mock-account' })}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  🚀 Skip to Next Step (Dev Mode)
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
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Continue
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
