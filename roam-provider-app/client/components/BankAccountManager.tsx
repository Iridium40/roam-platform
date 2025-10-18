import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Building2,
  Shield,
  RefreshCw,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface BankAccountManagerProps {
  userId: string;
  businessId: string;
}

export default function BankAccountManager({ userId, businessId }: BankAccountManagerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingStripe, setCheckingStripe] = useState(false);
  const [creatingStripe, setCreatingStripe] = useState(false);
  const [stripeAccount, setStripeAccount] = useState<any>(null);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<string>('');

  // Check Stripe Connect account status
  const checkStripeConnectStatus = async () => {
    try {
      setCheckingStripe(true);
      const response = await fetch(`/api/stripe/check-connect-account-status?userId=${userId}&businessId=${businessId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStripeAccount(data.account);
        setStripeAccountStatus(data.status);
      } else {
        console.log('No Stripe Connect account found');
        setStripeAccount(null);
        setStripeAccountStatus('not_connected');
      }
    } catch (error) {
      console.error('Error checking Stripe Connect status:', error);
      setStripeAccount(null);
      setStripeAccountStatus('error');
    } finally {
      setCheckingStripe(false);
    }
  };

  // Create Stripe Connect account
  const createStripeConnectAccount = async () => {
    try {
      setCreatingStripe(true);
      
      // Get business tax info for Stripe Connect
      const { data: taxInfo, error: taxError } = await supabase
        .from('business_stripe_tax_info')
        .select('*')
        .eq('business_id', businessId)
        .single();

      const requestBody: any = {
        businessId,
        userId,
        type: 'express', // Use Express accounts for easier onboarding
      };

      // Add tax info if available
      if (taxInfo && !taxError) {
        requestBody.companyName = taxInfo.company_name;
        requestBody.taxId = taxInfo.tax_id;
      }

      // Create Connect account
      const response = await fetch('/api/stripe/create-connect-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.accountLink) {
          // Open Stripe onboarding in new tab
          window.open(data.accountLink.url, '_blank');
          
          toast({
            title: "Stripe Account Created",
            description: "Complete the onboarding process in the new tab to activate your account.",
          });
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create Stripe Connect account');
      }
    } catch (error) {
      console.error('Error creating Stripe Connect account:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create Stripe Connect account",
        variant: "destructive",
      });
    } finally {
      setCreatingStripe(false);
    }
  };

  // Open Stripe Dashboard
  const openStripeDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (response.ok) {
        const data = await response.json();
        window.open(data.url, '_blank');
      } else {
        throw new Error('Failed to create dashboard link');
      }
    } catch (error) {
      console.error('Error opening Stripe dashboard:', error);
      toast({
        title: "Error",
        description: "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    checkStripeConnectStatus();
  }, [userId, businessId]);

  return (
    <div className="space-y-6">
      {/* Stripe Connect Account Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Stripe Connect Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkingStripe ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Checking account status...</span>
            </div>
          ) : stripeAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Account Connected</h3>
                    <p className="text-sm text-gray-600">
                      Stripe ID: {stripeAccount.id}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={stripeAccount.charges_enabled ? "default" : "secondary"}
                  className={stripeAccount.charges_enabled ? "bg-green-100 text-green-800" : ""}
                >
                  {stripeAccount.charges_enabled ? "Active" : "Pending"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Charges:</span>
                  <span className={`ml-2 font-medium ${stripeAccount.charges_enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stripeAccount.charges_enabled ? 'Enabled' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Payouts:</span>
                  <span className={`ml-2 font-medium ${stripeAccount.payouts_enabled ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stripeAccount.payouts_enabled ? 'Enabled' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={openStripeDashboard}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Dashboard
                </Button>
                <Button
                  onClick={checkStripeConnectStatus}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="bg-white p-6 rounded-lg">
                <AlertCircle className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Stripe Connect Setup</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your Stripe Connect account will be automatically created during the business onboarding process. Once approved, you'll have full access to payment processing and payout management.
                </p>
                <ul className="text-left text-sm text-gray-600 space-y-2 mb-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Receive payments directly from customers</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Automated payout scheduling</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Real-time balance and transaction tracking</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Setup in Progress</p>
                    <p className="text-xs text-blue-700">Your Stripe account will be ready after business approval</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}