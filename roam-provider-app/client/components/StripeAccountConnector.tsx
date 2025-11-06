import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Link as LinkIcon,
  Plus,
  Info,
  CreditCard,
} from 'lucide-react';

interface TaxInfo {
  legal_business_name?: string;
  business_entity_type?: string;
  tax_contact_email?: string;
  tax_id?: string;
}

interface StripeAccountConnectorProps {
  businessId: string;
  userId: string;
  taxInfo?: TaxInfo;
  onAccountLinked: (accountData: any) => void;
  onAccountCreated: (accountData: any) => void;
  className?: string;
}

interface ExistingAccount {
  id: string;
  email?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  business_type?: string;
  country?: string;
}

export default function StripeAccountConnector({
  businessId,
  userId,
  taxInfo,
  onAccountLinked,
  onAccountCreated,
  className = '',
}: StripeAccountConnectorProps) {
  const [checking, setChecking] = useState(true);
  const [existingAccount, setExistingAccount] = useState<ExistingAccount | null>(null);
  const [accountFound, setAccountFound] = useState(false);
  const [accountLinked, setAccountLinked] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taxInfo?.tax_contact_email && businessId) {
      checkForExistingAccount();
    }
  }, [taxInfo?.tax_contact_email, businessId]);

  const checkForExistingAccount = async () => {
    try {
      setChecking(true);
      setError(null);

      const response = await fetch(
        `/api/stripe/check-existing-account?email=${encodeURIComponent(taxInfo?.tax_contact_email || '')}&businessId=${businessId}`
      );

      if (!response.ok) {
        throw new Error('Failed to check for existing accounts');
      }

      const data = await response.json();
      console.log('Account check result:', data);

      if (data.found) {
        setExistingAccount(data.account);
        setAccountFound(true);
        setAccountLinked(data.linked);
        
        if (data.linked) {
          // Account already linked, notify parent
          onAccountLinked(data.account);
        }
      } else {
        setAccountFound(false);
      }
    } catch (err) {
      console.error('Error checking for existing account:', err);
      setError(err instanceof Error ? err.message : 'Failed to check for existing accounts');
    } finally {
      setChecking(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!existingAccount) return;

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch('/api/stripe/link-existing-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: existingAccount.id,
          businessId,
          userId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to link account');
      }

      const data = await response.json();
      console.log('Account linked successfully:', data);

      setAccountLinked(true);

      // If account needs onboarding, redirect to Stripe
      if (data.onboarding_url) {
        window.location.href = data.onboarding_url;
      } else {
        // Account is ready, notify parent
        onAccountLinked(data.account);
      }
    } catch (err) {
      console.error('Error linking account:', err);
      setError(err instanceof Error ? err.message : 'Failed to link account');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      setProcessing(true);
      setError(null);

      if (!taxInfo) {
        throw new Error('Tax information is required to create a Stripe account');
      }

      const businessName = taxInfo.legal_business_name || 'Business';
      const email = taxInfo.tax_contact_email;
      const businessType = taxInfo.business_entity_type || 'llc';
      const isCompany = ['llc', 'corporation', 'partnership', 'non_profit'].includes(businessType);

      const requestPayload = {
        userId,
        businessId,
        businessType: isCompany ? 'company' : 'individual',
        businessName,
        email,
        country: 'US',
        // Add companyName for company accounts (required by Stripe)
        ...(isCompany && { companyName: businessName }),
      };

      console.log('Creating Stripe Connect account:', requestPayload);

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
      console.log('Stripe account created:', result);

      // Check if this is development mode (mock response)
      if (result.testMode) {
        console.log('Development mode: Stripe Connect account created successfully');
        onAccountCreated({
          id: result.account_id || 'mock-account',
          charges_enabled: true,
          payouts_enabled: true,
        });
        return;
      }

      // Production mode: Redirect to Stripe Connect onboarding
      if (result.onboarding_url) {
        window.location.href = result.onboarding_url;
      } else {
        throw new Error('No onboarding URL received from Stripe');
      }
    } catch (err) {
      console.error('Error creating Stripe account:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Stripe account');
    } finally {
      setProcessing(false);
    }
  };

  if (checking) {
    return (
      <Card className={className}>
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-roam-blue" />
            <p className="text-foreground/70">Checking for existing Stripe accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accountLinked && existingAccount) {
    return (
      <Card className={`${className} border-green-200 bg-green-50`}>
        <CardContent className="py-8">
          <div className="flex flex-col items-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-green-800">Stripe Account Connected!</h3>
              <p className="text-green-700 mt-2">
                Your Stripe account ({existingAccount.email}) is linked and ready.
              </p>
              {existingAccount.charges_enabled && existingAccount.payouts_enabled ? (
                <Badge className="mt-4 bg-green-100 text-green-800">Ready for Payments</Badge>
              ) : (
                <Badge className="mt-4 bg-yellow-100 text-yellow-800">Onboarding Required</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (accountFound && existingAccount) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-roam-blue">
            <CreditCard className="h-6 w-6" />
            Existing Stripe Account Found
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              We found an existing Stripe account associated with <strong>{existingAccount.email}</strong>. 
              You can link this account or create a new one.
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account ID:</span>
                  <span className="text-sm text-foreground/70 font-mono">{existingAccount.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-sm text-foreground/70">{existingAccount.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Business Type:</span>
                  <span className="text-sm text-foreground/70 capitalize">{existingAccount.business_type || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex gap-2">
                    {existingAccount.charges_enabled ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Charges Enabled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-50">
                        Not Ready
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleLinkExisting}
              disabled={processing}
              className="flex-1 bg-roam-blue hover:bg-roam-blue/90"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Link This Account
                </>
              )}
            </Button>
            <Button
              onClick={handleCreateNew}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Account
            </Button>
          </div>

          <p className="text-xs text-center text-foreground/60">
            Linking an existing account will associate it with this business.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No existing account found - create new
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-roam-blue">
          <CreditCard className="h-6 w-6" />
          Connect Your Stripe Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            No existing Stripe account found. We'll create a new account using your business tax information and 
            redirect you to Stripe's secure onboarding to complete setup.
          </AlertDescription>
        </Alert>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="font-medium text-sm">Your information will be pre-filled:</h4>
          <ul className="text-sm text-foreground/70 space-y-1">
            <li>✓ Business Name: {taxInfo?.legal_business_name || 'Not provided'}</li>
            <li>✓ Business Type: {taxInfo?.business_entity_type || 'Not provided'}</li>
            <li>✓ Email: {taxInfo?.tax_contact_email || 'Not provided'}</li>
            <li>✓ Tax ID: {taxInfo?.tax_id ? '***-**-' + taxInfo.tax_id.slice(-4) : 'Not provided'}</li>
          </ul>
        </div>

        <Button
          onClick={handleCreateNew}
          disabled={processing || !taxInfo}
          className="w-full bg-roam-blue hover:bg-roam-blue/90"
          size="lg"
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Account...
            </>
          ) : (
            <>
              Continue to Stripe Setup
              <ExternalLink className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-center text-foreground/60">
          You'll be redirected to Stripe's secure platform to complete account setup.
          All your information will be pre-filled.
        </p>
      </CardContent>
    </Card>
  );
}

