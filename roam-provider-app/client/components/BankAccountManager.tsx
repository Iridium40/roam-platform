import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Building2,
  Shield,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface BankAccount {
  id: string;
  user_id: string;
  business_id: string | null;
  account_name: string;
  account_type: string;
  account_number: string;
  routing_number: string;
  bank_name: string;
  is_verified: boolean;
  is_default: boolean;
  stripe_account_id: string | null;
  verification_status: string;
  created_at: string | null;
  updated_at: string | null;
}

interface PlaidBankConnection {
  id: string;
  user_id: string | null;
  business_id: string | null;
  plaid_access_token: string | null;
  plaid_item_id: string | null;
  plaid_account_id: string | null;
  institution_id: string | null;
  institution_name: string | null;
  account_name: string | null;
  account_mask: string | null;
  account_type: string | null;
  account_subtype: string | null;
  verification_status: string | null;
  routing_numbers: string[] | null;
  account_number_mask: string | null;
  connected_at: string | null;
  is_active: boolean | null;
}

interface BankAccountManagerProps {
  userId: string;
  businessId: string;
}

export default function BankAccountManager({ userId, businessId }: BankAccountManagerProps) {
  const { toast } = useToast();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [plaidConnections, setPlaidConnections] = useState<PlaidBankConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPlaidDialog, setShowPlaidDialog] = useState(false);
  const [showManualDialog, setShowManualDialog] = useState(false);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [showAccountNumber, setShowAccountNumber] = useState<{ [key: string]: boolean }>({});

  // Manual form state
  const [manualForm, setManualForm] = useState({
    account_name: '',
    account_type: 'checking',
    account_number: '',
    routing_number: '',
    bank_name: '',
  });

  // Load bank accounts and Plaid connections
  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      
      // Load manual bank accounts
      const { data: bankAccountsData, error: bankAccountsError } = await supabase
        .from('manual_bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (bankAccountsError) {
        // If table doesn't exist, just set empty array
        if (bankAccountsError.code === '42P01') {
          console.log('manual_bank_accounts table does not exist yet');
          setBankAccounts([]);
        } else {
          throw bankAccountsError;
        }
      } else {
        setBankAccounts(bankAccountsData || []);
      }

      // Load Plaid bank connections
      const { data: plaidConnectionsData, error: plaidConnectionsError } = await supabase
        .from('plaid_bank_connections')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('connected_at', { ascending: false });

      if (plaidConnectionsError) {
        // If table doesn't exist, just set empty array
        if (plaidConnectionsError.code === '42P01') {
          console.log('plaid_bank_connections table does not exist yet');
          setPlaidConnections([]);
        } else {
          throw plaidConnectionsError;
        }
      } else {
        setPlaidConnections(plaidConnectionsData || []);
      }
      
    } catch (error) {
      console.error('Error loading bank accounts:', error);
      toast({
        title: "Error",
        description: "Failed to load bank accounts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
  }, [userId, businessId]);

  // Initialize Plaid Link
  const initializePlaid = async () => {
    try {
      setPlaidLoading(true);
      
      // Create link token for Plaid
      const { data: linkTokenData, error: linkTokenError } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { user_id: userId, business_id: businessId }
      });

      if (linkTokenError) throw linkTokenError;

      // Initialize Plaid Link
      const { Plaid } = await import('react-plaid-link');
      
      // This would typically be handled by a Plaid Link component
      // For now, we'll simulate the flow
      toast({
        title: "Plaid Integration",
        description: "Plaid integration will be implemented with the actual Plaid SDK",
      });
      
    } catch (error) {
      console.error('Error initializing Plaid:', error);
      toast({
        title: "Error",
        description: "Failed to initialize Plaid",
        variant: "destructive",
      });
    } finally {
      setPlaidLoading(false);
      setShowPlaidDialog(false);
    }
  };

  // Add manual bank account
  const addManualBankAccount = async () => {
    try {
      setManualLoading(true);
      
      // Validate form
      if (!manualForm.account_name || !manualForm.account_number || !manualForm.routing_number || !manualForm.bank_name) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      // Create Stripe account link for verification
      const { data: accountLinkData, error: accountLinkError } = await supabase.functions.invoke('create-stripe-account-link', {
        body: {
          user_id: userId,
          business_id: businessId,
          account_type: 'express',
          refresh_url: `${window.location.origin}/provider/dashboard?tab=financials`,
          return_url: `${window.location.origin}/provider/dashboard?tab=financials`,
        }
      });

      if (accountLinkError) throw accountLinkError;

      // Save bank account to database
      const { data: bankAccountData, error: bankAccountError } = await supabase
        .from('manual_bank_accounts')
        .insert({
          user_id: userId,
          business_id: businessId,
          account_name: manualForm.account_name,
          account_type: manualForm.account_type,
          account_number: manualForm.account_number,
          routing_number: manualForm.routing_number,
          bank_name: manualForm.bank_name,
          is_verified: false,
          is_default: bankAccounts.length === 0, // First account is default
        })
        .select()
        .single();

      if (bankAccountError) {
        // If table doesn't exist, show a message
        if (bankAccountError.code === '42P01') {
          toast({
            title: "Database Setup Required",
            description: "Bank account tables need to be created. Please contact support.",
            variant: "destructive",
          });
          return;
        }
        throw bankAccountError;
      }

      // Redirect to Stripe for verification
      if (accountLinkData?.url) {
        window.open(accountLinkData.url, '_blank');
      }

      toast({
        title: "Bank Account Added",
        description: "Please complete verification with Stripe to enable payouts",
      });

      setShowManualDialog(false);
      setManualForm({
        account_name: '',
        account_type: 'checking',
        account_number: '',
        routing_number: '',
        bank_name: '',
      });
      
      loadBankAccounts();
      
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      });
    } finally {
      setManualLoading(false);
    }
  };

  // Set default account
  const setDefaultAccount = async (accountId: string) => {
    try {
      // Update all accounts to not default
      await supabase
        .from('manual_bank_accounts')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Set selected account as default
      await supabase
        .from('manual_bank_accounts')
        .update({ is_default: true })
        .eq('id', accountId);

      toast({
        title: "Default Account Updated",
        description: "Your default payout account has been updated",
      });

      loadBankAccounts();
    } catch (error) {
      console.error('Error setting default account:', error);
      toast({
        title: "Error",
        description: "Failed to update default account",
        variant: "destructive",
      });
    }
  };

  // Remove bank account
  const removeBankAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('manual_bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Account Removed",
        description: "Bank account has been removed",
      });

      loadBankAccounts();
    } catch (error) {
      console.error('Error removing bank account:', error);
      toast({
        title: "Error",
        description: "Failed to remove bank account",
        variant: "destructive",
      });
    }
  };

  // Copy account number
  const copyAccountNumber = (accountNumber: string) => {
    navigator.clipboard.writeText(accountNumber);
    toast({
      title: "Copied",
      description: "Account number copied to clipboard",
    });
  };

  const toggleAccountNumberVisibility = (accountId: string) => {
    setShowAccountNumber(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Bank Account Management</h2>
          <p className="text-sm text-gray-600">Connect your bank account to receive payouts</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Building2 className="w-4 h-4 mr-2" />
              Add Bank Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Bank Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Choose how you'd like to connect your bank account:
              </div>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowPlaidDialog(true);
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Connect with Plaid (Recommended)
                <Badge className="ml-auto" variant="secondary">Secure</Badge>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setShowAddDialog(false);
                  setShowManualDialog(true);
                }}
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Enter Manually
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bank Accounts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      ) : bankAccounts.length === 0 ? (
        <Card className="p-8 text-center">
                      <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Bank Accounts</h3>
            <p className="text-gray-600 mb-4">
              Add a bank account to start receiving payouts from your completed bookings.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Building2 className="w-4 h-4 mr-2" />
              Add Your First Bank Account
            </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {bankAccounts.map((account) => (
            <Card key={account.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Building2 className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">{account.account_name}</h3>
                      <p className="text-sm text-gray-600">{account.bank_name}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Account Type:</span>
                      <span className="ml-2 font-medium capitalize">{account.account_type}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Account Number:</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono">
                          {showAccountNumber[account.id] 
                            ? account.account_number 
                            : `••••${account.account_number.slice(-4)}`
                          }
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAccountNumberVisibility(account.id)}
                        >
                          {showAccountNumber[account.id] ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyAccountNumber(account.account_number)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3">
                    {account.is_verified ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Pending Verification
                      </Badge>
                    )}
                    
                    {account.is_default && (
                      <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                        Default
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  {!account.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultAccount(account.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBankAccount(account.id)}
                    disabled={account.is_default && bankAccounts.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plaid Dialog */}
      <Dialog open={showPlaidDialog} onOpenChange={setShowPlaidDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect with Plaid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              Plaid provides a secure way to connect your bank account. Your credentials are never stored and are encrypted during transmission.
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">Bank-Level Security</p>
                  <p className="text-blue-700">Your bank credentials are encrypted and never stored on our servers.</p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={initializePlaid}
              disabled={plaidLoading}
              className="w-full"
            >
              {plaidLoading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              {plaidLoading ? 'Connecting...' : 'Connect Bank Account'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Entry Dialog */}
      <Dialog open={showManualDialog} onOpenChange={setShowManualDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bank Account Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account_name">Account Name</Label>
              <Input
                id="account_name"
                placeholder="e.g., Main Checking Account"
                value={manualForm.account_name}
                onChange={(e) => setManualForm(prev => ({ ...prev, account_name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_type">Account Type</Label>
              <Select
                value={manualForm.account_type}
                onValueChange={(value) => setManualForm(prev => ({ ...prev, account_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bank_name">Bank Name</Label>
              <Input
                id="bank_name"
                placeholder="e.g., Chase Bank"
                value={manualForm.bank_name}
                onChange={(e) => setManualForm(prev => ({ ...prev, bank_name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="routing_number">Routing Number</Label>
              <Input
                id="routing_number"
                placeholder="9-digit routing number"
                value={manualForm.routing_number}
                onChange={(e) => setManualForm(prev => ({ ...prev, routing_number: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number</Label>
              <Input
                id="account_number"
                placeholder="Account number"
                value={manualForm.account_number}
                onChange={(e) => setManualForm(prev => ({ ...prev, account_number: e.target.value }))}
              />
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">Verification Required</p>
                  <p className="text-yellow-700">You'll be redirected to Stripe to verify your account details.</p>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowManualDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={addManualBankAccount}
                disabled={manualLoading}
                className="flex-1"
              >
                {manualLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                {manualLoading ? 'Adding...' : 'Add Account'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
