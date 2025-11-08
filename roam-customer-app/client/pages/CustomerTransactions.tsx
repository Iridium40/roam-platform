import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  Download, 
  Calendar, 
  DollarSign, 
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  ArrowLeft
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
  bookings?: {
    booking_date: string;
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

  useEffect(() => {
    if (customer) {
      loadTransactions();
    }
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
        return;
      }

      // Get financial transactions for these bookings
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          bookings (
            booking_date,
            services (name),
            business_profiles (business_name)
          )
        `)
        .in('booking_id', bookingIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transaction history',
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
        return 'Payment';
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
      return txType === 'payment' || txType === 'service_payment';
    }
    return txType === filter;
  });

  const totalSpent = transactions
    .filter(t => {
      const txType = t.transaction_type?.toLowerCase();
      return (txType === 'payment' || txType === 'service_payment') && t.status?.toLowerCase() === 'completed';
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
          <Link to="/">
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">
              View and manage your payment transactions
            </p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
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
                            <Button variant="ghost" size="sm" className="mt-2">
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
    </div>
  );
}
