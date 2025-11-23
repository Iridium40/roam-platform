import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CreditCard, Plus, Trash2, ArrowLeft, Check, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentMethod {
  id: string;
  type: string;
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  created: number;
  is_default: boolean;
  is_attached?: boolean;
  can_reuse?: boolean;
}

export default function PaymentMethods() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultPaymentMethodId, setDefaultPaymentMethodId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingPaymentMethod, setDeletingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);
  const [isAddCardDialogOpen, setIsAddCardDialogOpen] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [setAsDefaultOnAdd, setSetAsDefaultOnAdd] = useState(false);

  // Load payment methods
  useEffect(() => {
    if (customer?.user_id) {
      loadPaymentMethods();
    }
  }, [customer?.user_id]);

  const loadPaymentMethods = async () => {
    if (!customer?.user_id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/stripe/list-payment-methods?customer_id=${customer.user_id}`);
      
      if (response.ok) {
        const data = await response.json();
        setPaymentMethods(data.payment_methods || []);
        setDefaultPaymentMethodId(data.default_payment_method_id || null);
      } else {
        throw new Error('Failed to load payment methods');
      }
    } catch (error: any) {
      console.error('Error loading payment methods:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load payment methods",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (paymentMethodId: string) => {
    if (!customer?.user_id) return;

    try {
      setIsSettingDefault(paymentMethodId);
      const response = await fetch('/api/stripe/set-default-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
          customer_id: customer.user_id,
        }),
      });

      if (response.ok) {
        await loadPaymentMethods();
        toast({
          title: "Default Updated",
          description: "Default payment method has been updated.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set default payment method');
      }
    } catch (error: any) {
      console.error('Error setting default payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set default payment method",
        variant: "destructive",
      });
    } finally {
      setIsSettingDefault(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingPaymentMethod || !customer?.user_id) return;

    try {
      setIsDeleting(true);
      const response = await fetch('/api/stripe/delete-payment-method', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: deletingPaymentMethod.id,
          customer_id: customer.user_id,
        }),
      });

      if (response.ok) {
        await loadPaymentMethods();
        toast({
          title: "Payment Method Deleted",
          description: "The payment method has been removed.",
        });
        setIsDeleteDialogOpen(false);
        setDeletingPaymentMethod(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete payment method');
      }
    } catch (error: any) {
      console.error('Error deleting payment method:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment method",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getCardBrandName = (brand: string) => {
    const brands: Record<string, string> = {
      visa: 'Visa',
      mastercard: 'Mastercard',
      amex: 'American Express',
      discover: 'Discover',
      diners: 'Diners Club',
      jcb: 'JCB',
      unionpay: 'UnionPay',
    };
    return brands[brand.toLowerCase()] || brand;
  };

  const getCardIcon = (brand: string) => {
    // Return brand name for now - could add icons later
    return brand.charAt(0).toUpperCase();
  };

  const formatExpiry = (month: number, year: number) => {
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  const isExpired = (month: number, year: number) => {
    const now = new Date();
    const expiryDate = new Date(year, month - 1);
    return expiryDate < now;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
          <p className="text-lg font-semibold">Loading payment methods...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Payment Methods</h1>
              <p className="text-muted-foreground">
                Manage your saved payment methods for faster checkout
              </p>
            </div>
            <Button onClick={() => setIsAddCardDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Card
            </Button>
          </div>
        </div>

        {/* Payment Methods List */}
        {paymentMethods.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No saved payment methods</h3>
              <p className="text-muted-foreground mb-6">
                Add a payment method for faster checkout
              </p>
              <Button onClick={() => setIsAddCardDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add New Card
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((pm) => {
              const isDefault = pm.id === defaultPaymentMethodId;
              const expired = pm.card ? isExpired(pm.card.exp_month, pm.card.exp_year) : false;
              const cannotReuse = pm.can_reuse === false;

              return (
                <Card key={pm.id} className={expired ? 'opacity-60' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Card Icon */}
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {pm.card ? getCardIcon(pm.card.brand) : <CreditCard className="w-6 h-6" />}
                        </div>

                        {/* Card Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">
                              {pm.card ? getCardBrandName(pm.card.brand) : pm.type}
                            </h3>
                            {isDefault && (
                              <Badge variant="default" className="bg-blue-600">
                                <Check className="w-3 h-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            {expired && (
                              <Badge variant="destructive">Expired</Badge>
                            )}
                            {cannotReuse && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Cannot Reuse
                              </Badge>
                            )}
                          </div>
                          {pm.card && (
                            <div className="space-y-1">
                              <p className="text-muted-foreground">
                                •••• •••• •••• {pm.card.last4}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Expires {formatExpiry(pm.card.exp_month, pm.card.exp_year)}
                                {expired && ' (Expired)'}
                              </p>
                            </div>
                          )}
                          {!pm.card && (
                            <p className="text-muted-foreground text-sm">
                              {pm.type} payment method
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {!isDefault && !expired && pm.can_reuse !== false && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(pm.id)}
                            disabled={isSettingDefault === pm.id}
                          >
                            {isSettingDefault === pm.id ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Setting...
                              </>
                            ) : (
                              'Set as Default'
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingPaymentMethod(pm);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Info Card */}
        {paymentMethods.length > 0 && (
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">About Saved Payment Methods</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-800">
                    <li>Your payment information is securely stored by Stripe</li>
                    <li>We never store your full card details on our servers</li>
                    <li>You can set a default payment method for faster checkout</li>
                    <li>Expired cards will be marked but can still be viewed</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add New Card Dialog */}
      <Dialog open={isAddCardDialogOpen} onOpenChange={setIsAddCardDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Payment Method</DialogTitle>
            <DialogDescription>
              Add a new card to your account for faster checkout
            </DialogDescription>
          </DialogHeader>
          {stripePromise && (
            <AddCardFormWrapper
              stripePromise={stripePromise}
              customerId={customer?.user_id || ''}
              onSuccess={async () => {
                setIsAddCardDialogOpen(false);
                await loadPaymentMethods();
                toast({
                  title: "Card Added",
                  description: "Your payment method has been added successfully.",
                });
              }}
              onError={(error: string) => {
                toast({
                  title: "Error",
                  description: error,
                  variant: "destructive",
                });
              }}
              setAsDefault={setAsDefaultOnAdd}
              onSetAsDefaultChange={setSetAsDefaultOnAdd}
              onCancel={() => setIsAddCardDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment Method</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {deletingPaymentMethod && (
              <p className="text-muted-foreground">
                Are you sure you want to remove{' '}
                {deletingPaymentMethod.card
                  ? `${getCardBrandName(deletingPaymentMethod.card.brand)} •••• ${deletingPaymentMethod.card.last4}`
                  : 'this payment method'}
                ? This action cannot be undone.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingPaymentMethod(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Add Card Form Wrapper Component (handles Elements with clientSecret)
interface AddCardFormWrapperProps {
  stripePromise: Promise<any>;
  customerId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  setAsDefault: boolean;
  onSetAsDefaultChange: (value: boolean) => void;
  onCancel: () => void;
}

function AddCardFormWrapper({ stripePromise, customerId, onSuccess, onError, setAsDefault, onSetAsDefaultChange, onCancel }: AddCardFormWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingSecret, setLoadingSecret] = useState(true);

  // Load setup intent client secret
  useEffect(() => {
    const loadSetupIntent = async () => {
      try {
        const response = await fetch('/api/stripe/create-setup-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customer_id: customerId }),
        });

        if (response.ok) {
          const data = await response.json();
          setClientSecret(data.clientSecret);
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to initialize payment form');
        }
      } catch (error: any) {
        console.error('Error loading setup intent:', error);
        onError(error.message || 'Failed to initialize payment form');
      } finally {
        setLoadingSecret(false);
      }
    };

    if (customerId) {
      loadSetupIntent();
    }
  }, [customerId, onError]);

  if (loadingSecret || !clientSecret) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-roam-blue" />
        <p className="text-sm text-muted-foreground">Loading payment form...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <AddCardForm
        customerId={customerId}
        onSuccess={onSuccess}
        onError={onError}
        setAsDefault={setAsDefault}
        onSetAsDefaultChange={onSetAsDefaultChange}
        onCancel={onCancel}
        clientSecret={clientSecret}
      />
    </Elements>
  );
}

// Add Card Form Component
interface AddCardFormProps {
  customerId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  setAsDefault: boolean;
  onSetAsDefaultChange: (value: boolean) => void;
  onCancel: () => void;
  clientSecret: string;
}

function AddCardForm({ customerId, onSuccess, onError, setAsDefault, onSetAsDefaultChange, onCancel, clientSecret }: AddCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements || !clientSecret) {
      onError('Stripe has not loaded yet');
      return;
    }

    setIsLoading(true);

    try {
      // Confirm setup intent to collect payment method
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        clientSecret,
        redirect: 'if_required',
      });

      if (confirmError) {
        throw new Error(confirmError.message || 'Failed to confirm setup');
      }

      if (!setupIntent || !setupIntent.payment_method) {
        throw new Error('Payment method was not collected');
      }

      const paymentMethodId = typeof setupIntent.payment_method === 'string' 
        ? setupIntent.payment_method 
        : setupIntent.payment_method.id;

      // Attach payment method to customer (it should already be attached via setup intent, but ensure it's saved)
      const attachResponse = await fetch('/api/stripe/attach-payment-method-from-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method_id: paymentMethodId,
          customer_id: customerId,
          set_as_default: setAsDefault,
        }),
      });

      if (!attachResponse.ok) {
        const errorData = await attachResponse.json();
        throw new Error(errorData.error || 'Failed to save payment method');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error adding card:', error);
      onError(error.message || 'Failed to add payment method');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <PaymentElement 
          options={{
            layout: "tabs",
            paymentMethodOrder: ['card'],
          }}
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="set-as-default"
          checked={setAsDefault}
          onChange={(e) => onSetAsDefaultChange(e.target.checked)}
          className="w-4 h-4 text-roam-blue border-gray-300 rounded focus:ring-roam-blue"
        />
        <label htmlFor="set-as-default" className="text-sm text-gray-600 cursor-pointer">
          Set as default payment method
        </label>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

