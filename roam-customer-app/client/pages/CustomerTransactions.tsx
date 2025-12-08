import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ArrowLeft,
  Download,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  booking_id: string;
  amount: number;
  currency: string;
  payment_method: string | null;
  description: string | null;
  transaction_type: string | null;
  status: string | null;
  created_at: string;
  processed_at: string | null;
  stripe_transaction_id?: string | null;
  bookings?: {
    booking_date: string;
    booking_reference: string | null;
    services: {
      name: string;
    };
    business_profiles: {
      business_name: string;
    };
  };
}

export default function CustomerTransactions() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<'all' | 'payment' | 'refund' | 'tip'>('all');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  useEffect(() => {
    if (customer) {
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  const loadTransactions = async () => {
    if (!customer) return;

    try {
      setLoading(true);

      // Get all bookings for this customer
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', customer.id);

      if (bookingsError) throw bookingsError;

      const bookingIds = bookingsData?.map(b => b.id) || [];

      if (bookingIds.length === 0) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      // Get financial transactions for these bookings with proper joins
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          bookings!inner (
            booking_date,
            booking_reference,
            service_id,
            business_id,
            services!left (
              name
            ),
            business_profiles!left (
              business_name
            )
          )
        `)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }

      // Transform the data to match the expected interface
      // Handle case where bookings might be an array (from !inner join) or single object
      const transformedTransactions = (data || []).map((tx: any) => {
        // bookings might be an array if multiple bookings match, or a single object
        const booking = Array.isArray(tx.bookings) ? tx.bookings[0] : tx.bookings;
        
        return {
          ...tx,
          bookings: booking ? {
            booking_date: booking.booking_date,
            booking_reference: booking.booking_reference,
            services: booking.services ? {
              name: Array.isArray(booking.services) ? booking.services[0]?.name : booking.services.name
            } : null,
            business_profiles: booking.business_profiles ? {
              business_name: Array.isArray(booking.business_profiles) 
                ? booking.business_profiles[0]?.business_name 
                : booking.business_profiles.business_name
            } : null
          } : null
        };
      });

      console.log('Loaded transactions:', transformedTransactions.length);
      setTransactions(transformedTransactions);
    } catch (error: any) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load transaction history',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTransactionIcon = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'payment':
      case 'service_payment':
      case 'booking_payment':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'refund':
        return <ArrowDownRight className="w-4 h-4 text-green-500" />;
      case 'tip':
        return <DollarSign className="w-4 h-4 text-blue-500" />;
      default:
        return <Receipt className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatTransactionType = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'service_payment':
      case 'booking_payment':
      case 'payment':
        return 'Payment';
      case 'refund':
        return 'Refund';
      case 'tip':
        return 'Tip';
      default:
        return type || 'Transaction';
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    if (filter === 'all') return true;
    const txType = transaction.transaction_type?.toLowerCase();
    
    // Map transaction types to filter categories
    if (filter === 'payment') {
      return txType === 'payment' || txType === 'service_payment' || txType === 'booking_payment';
    }
    return txType === filter;
  });

  const totalSpent = transactions
    .filter(t => {
      const txType = t.transaction_type?.toLowerCase();
      return (txType === 'payment' || txType === 'service_payment' || txType === 'booking_payment') && t.status?.toLowerCase() === 'completed';
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalRefunds = transactions
    .filter(t => t.transaction_type?.toLowerCase() === 'refund' && t.status?.toLowerCase() === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-roam-blue mx-auto mb-4" />
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back to Home Button */}
        <div className="mb-6">
          <Link to="/booknow">
            <Button
              variant="ghost"
              className="flex items-center gap-2 text-foreground/70 hover:text-foreground hover:bg-accent/50 px-3 py-2 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
          <p className="text-muted-foreground">
            View and manage your payment transactions
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="bg-roam-blue/10 p-3 rounded-full">
                  <DollarSign className="w-6 h-6 text-roam-blue" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Refunds</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRefunds)}</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <ArrowDownRight className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Transactions</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Receipt className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
                <TabsTrigger value="refund">Refunds</TabsTrigger>
                <TabsTrigger value="tip">Tips</TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-4">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Transactions</h3>
                    <p className="text-muted-foreground">
                      You don't have any transactions yet
                    </p>
                  </div>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <div className="bg-muted p-3 rounded-full">
                              {getTransactionIcon(transaction.transaction_type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold">
                                  {transaction.bookings?.services?.name || 'Service'}
                                </h3>
                                <Badge className={getStatusColor(transaction.status)}>
                                  {transaction.status || 'Unknown'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {transaction.bookings?.business_profiles?.business_name || 'Business'}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(new Date(transaction.created_at), 'MMM dd, yyyy')}
                                </span>
                                {transaction.payment_method && (
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="w-3 h-3" />
                                    {transaction.payment_method}
                                  </span>
                                )}
                                <span>
                                  {formatTransactionType(transaction.transaction_type)}
                                </span>
                                {(transaction.transaction_type?.toLowerCase() === 'payment' || 
                                  transaction.transaction_type?.toLowerCase() === 'service_payment' ||
                                  transaction.transaction_type?.toLowerCase() === 'booking_payment') &&
                                  transaction.bookings?.booking_reference && (
                                  <span className="font-mono text-roam-blue">
                                    Ref: {transaction.bookings.booking_reference}
                                  </span>
                                )}
                              </div>
                              {transaction.description && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  {transaction.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${
                              transaction.transaction_type?.toLowerCase() === 'refund' 
                                ? 'text-green-600' 
                                : 'text-gray-900'
                            }`}>
                              {transaction.transaction_type?.toLowerCase() === 'refund' ? '+' : '-'}
                              {formatCurrency(Number(transaction.amount), transaction.currency)}
                            </p>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="mt-2"
                              onClick={() => {
                                setSelectedTransaction(transaction);
                                setReceiptOpen(true);
                              }}
                            >
                              View Receipt
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Transaction Receipt
            </DialogTitle>
          </DialogHeader>
          
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Receipt Header */}
              <div className="border-b pb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">ROAM</h2>
                    <p className="text-sm text-muted-foreground">Transaction Receipt</p>
                  </div>
                  <Badge className={getStatusColor(selectedTransaction.status)}>
                    {selectedTransaction.status || 'Unknown'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Transaction Date</p>
                    <p className="font-medium">
                      {format(new Date(selectedTransaction.created_at), 'MMM dd, yyyy h:mm a')}
                    </p>
                  </div>
                  {selectedTransaction.processed_at && (
                    <div>
                      <p className="text-muted-foreground">Processed Date</p>
                      <p className="font-medium">
                        {format(new Date(selectedTransaction.processed_at), 'MMM dd, yyyy h:mm a')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Transaction Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction ID:</span>
                      <span className="font-mono text-xs">{selectedTransaction.id.slice(0, 8)}...</span>
                    </div>
                    {selectedTransaction.bookings?.booking_reference && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Booking Reference:</span>
                        <span className="font-mono">{selectedTransaction.bookings.booking_reference}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Transaction Type:</span>
                      <span>{formatTransactionType(selectedTransaction.transaction_type)}</span>
                    </div>
                    {selectedTransaction.payment_method && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Method:</span>
                        <span>{selectedTransaction.payment_method}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Service Details */}
                {selectedTransaction.bookings && (
                  <div>
                    <h3 className="font-semibold mb-3">Service Details</h3>
                    <div className="space-y-2 text-sm">
                      {selectedTransaction.bookings.services?.name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Service:</span>
                          <span>{selectedTransaction.bookings.services.name}</span>
                        </div>
                      )}
                      {selectedTransaction.bookings.business_profiles?.business_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Business:</span>
                          <span>{selectedTransaction.bookings.business_profiles.business_name}</span>
                        </div>
                      )}
                      {selectedTransaction.bookings.booking_date && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Booking Date:</span>
                          <span>{format(new Date(selectedTransaction.bookings.booking_date), 'MMM dd, yyyy')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedTransaction.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Description</h3>
                    <p className="text-sm text-muted-foreground">{selectedTransaction.description}</p>
                  </div>
                )}

                {/* Amount */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">
                      {selectedTransaction.transaction_type?.toLowerCase() === 'refund' ? 'Refund Amount' : 'Total Amount'}
                    </span>
                    <span className={`text-2xl font-bold ${
                      selectedTransaction.transaction_type?.toLowerCase() === 'refund' 
                        ? 'text-green-600' 
                        : 'text-gray-900'
                    }`}>
                      {selectedTransaction.transaction_type?.toLowerCase() === 'refund' ? '+' : '-'}
                      {formatCurrency(Number(selectedTransaction.amount), selectedTransaction.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Print receipt
                    window.print();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
