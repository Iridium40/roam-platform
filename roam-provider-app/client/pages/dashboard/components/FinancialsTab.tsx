import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart,
  CreditCard,
  Wallet,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  User,
  ExternalLink,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import BankAccountManager from "@/components/BankAccountManager";
import { Switch } from "@/components/ui/switch";

interface FinancialsTabProps {
  providerData: any;
  business: any;
}

export default function FinancialsTab({
  providerData,
  business,
}: FinancialsTabProps) {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [activeTab, setActiveTab] = useState("overview");

  // Stripe-specific state
  const [stripeBalance, setStripeBalance] = useState<any>(null);
  const [stripePayouts, setStripePayouts] = useState<any[]>([]);
  const [stripeTransactions, setStripeTransactions] = useState<any[]>([]);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [payoutSchedule, setPayoutSchedule] = useState<any>(null);

  // Supabase financial data state
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [businessPaymentTransactions, setBusinessPaymentTransactions] = useState<any[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);

  // Payout request state
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState<"standard" | "instant">("standard");
  const [requestingPayout, setRequestingPayout] = useState(false);

  const businessId = business?.id || providerData?.business_id;

  // Load financial data
  const loadFinancialData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);

      // Load bookings for financial calculations
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(*),
          customer_profiles:customer_id(*)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load Supabase financial transactions
  const loadSupabaseFinancialData = async () => {
    if (!businessId) return;

    try {
      setSupabaseLoading(true);

      // Load financial_transactions through bookings (since financial_transactions has booking_id, not business_id)
      const { data: financialData, error: financialError } = await supabase
        .from('financial_transactions')
        .select(`
          *,
          bookings!inner(business_id)
        `)
        .eq('bookings.business_id', businessId)
        .order('processed_at', { ascending: false })
        .limit(50);

      if (financialError) {
        console.error('Error loading financial transactions:', financialError);
      } else {
        setFinancialTransactions(financialData || []);
      }

      // Load payment_transactions through bookings (since payment_transactions has booking_id, not business_id)
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_transactions')
        .select(`
          *,
          bookings!inner(business_id)
        `)
        .eq('bookings.business_id', businessId)
        .order('processed_at', { ascending: false })
        .limit(50);

      if (paymentError) {
        console.error('Error loading payment transactions:', paymentError);
      } else {
        setPaymentTransactions(paymentData || []);
      }

      // Load business_payment_transactions (this table has business_id directly)
      const { data: businessPaymentData, error: businessPaymentError } = await supabase
        .from('business_payment_transactions')
        .select('*')
        .eq('business_id', businessId)
        .order('payment_date', { ascending: false })
        .limit(50);

      if (businessPaymentError) {
        console.error('Error loading business payment transactions:', businessPaymentError);
      } else {
        setBusinessPaymentTransactions(businessPaymentData || []);
      }

    } catch (error) {
      console.error('Error loading Supabase financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction data",
        variant: "destructive",
      });
    } finally {
      setSupabaseLoading(false);
    }
  };

  // Load Stripe balance
  const loadStripeBalance = async () => {
    try {
      const res = await fetch(`/api/stripe/balance?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setStripeBalance(data);
      } else {
        const error = await res.json();
        if (!error.needsOnboarding) {
          console.error('Failed to load Stripe balance:', error);
        }
      }
    } catch (error) {
      console.error('Error loading Stripe balance:', error);
    }
  };

  // Load Stripe payouts
  const loadStripePayouts = async () => {
    try {
      const res = await fetch(`/api/stripe/payouts?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setStripePayouts(data.payouts || []);
      }
    } catch (error) {
      console.error('Error loading Stripe payouts:', error);
    }
  };

  // Load Stripe transactions
  const loadStripeTransactions = async () => {
    try {
      const res = await fetch(`/api/stripe/transactions?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setStripeTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Error loading Stripe transactions:', error);
    }
  };

  // Load payout schedule
  const loadPayoutSchedule = async () => {
    try {
      const res = await fetch(`/api/stripe/payout-schedule?business_id=${businessId}`);
      if (res.ok) {
        const data = await res.json();
        setPayoutSchedule(data.schedule);
      }
    } catch (error) {
      console.error('Error loading payout schedule:', error);
    }
  };

  // Request payout
  const requestPayout = async () => {
    try {
      setRequestingPayout(true);
      const amount = parseFloat(payoutAmount);

      if (isNaN(amount) || amount <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount",
          variant: "destructive",
        });
        return;
      }

      if (amount > stripeBalance?.available) {
        toast({
          title: "Insufficient Balance",
          description: `You only have $${stripeBalance?.available?.toFixed(2)} available`,
          variant: "destructive",
        });
        return;
      }

      const res = await fetch('/api/stripe/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          amount,
          method: payoutMethod,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to request payout');
      }

      const data = await res.json();
      
      toast({
        title: "Payout Requested",
        description: payoutMethod === 'instant' 
          ? `$${amount.toFixed(2)} will arrive in ~30 minutes (fee: $${data.payout.fee.toFixed(2)})`
          : `$${amount.toFixed(2)} will arrive in 2 business days`,
      });

      setPayoutDialogOpen(false);
      setPayoutAmount("");
      
      // Reload data
      await loadStripeBalance();
      await loadStripePayouts();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request payout",
        variant: "destructive",
      });
    } finally {
      setRequestingPayout(false);
    }
  };

  // Open Stripe Express Dashboard
  const openStripeDashboard = async () => {
    try {
      setStripeLoading(true);
      const res = await fetch('/api/stripe/dashboard-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_id: businessId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create dashboard link');
      }

      const data = await res.json();
      window.open(data.url, '_blank');

      toast({
        title: "Dashboard Opened",
        description: "Opening Stripe Express Dashboard in a new tab",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open dashboard",
        variant: "destructive",
      });
    } finally {
      setStripeLoading(false);
    }
  };

  // Refresh all financial data
  const refreshStripeData = async () => {
    setStripeLoading(true);
    await Promise.all([
      loadStripeBalance(),
      loadStripePayouts(),
      loadStripeTransactions(),
      loadPayoutSchedule(),
      loadSupabaseFinancialData(), // Also refresh Supabase data
    ]);
    setStripeLoading(false);
  };

  // Export data function
  const onExportData = (type: string, dateRange: string) => {
    toast({
      title: "Export Feature",
      description: `${type} export for ${dateRange} coming soon`,
    });
  };

  useEffect(() => {
    loadFinancialData();
    loadStripeBalance();
    loadStripePayouts();
    loadStripeTransactions();
    loadPayoutSchedule();
    loadSupabaseFinancialData(); // Load Supabase financial data
  }, [providerData, business]);

  // Calculate financial metrics
  const financialMetrics = useMemo(() => {
    const now = new Date();
    const periodStart = new Date();
    periodStart.setDate(now.getDate() - parseInt(selectedPeriod));

    const periodBookings = bookings.filter(booking => 
      new Date(booking.created_at) >= periodStart
    );

    const completedBookings = periodBookings.filter(b => b.booking_status === 'completed');
    const cancelledBookings = periodBookings.filter(b => b.booking_status === 'cancelled');

    const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const totalBookings = periodBookings.length;
    const completedCount = completedBookings.length;
    const cancelledCount = cancelledBookings.length;
    const averageOrderValue = completedCount > 0 ? totalRevenue / completedCount : 0;
    const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;

    // Calculate previous period for comparison
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - parseInt(selectedPeriod));
    
    const prevPeriodBookings = bookings.filter(booking => 
      new Date(booking.created_at) >= prevPeriodStart && 
      new Date(booking.created_at) < periodStart
    );
    
    const prevCompletedBookings = prevPeriodBookings.filter(b => b.booking_status === 'completed');
    const prevTotalRevenue = prevCompletedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    
    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 : 0;
    const bookingsChange = prevPeriodBookings.length > 0 ? ((totalBookings - prevPeriodBookings.length) / prevPeriodBookings.length) * 100 : 0;

    return {
      totalRevenue,
      totalBookings,
      completedCount,
      cancelledCount,
      averageOrderValue,
      completionRate,
      revenueChange,
      bookingsChange,
      periodBookings,
      completedBookings,
    };
  }, [bookings, selectedPeriod]);

  const getRevenueByService = () => {
    const serviceRevenue: { [key: string]: number } = {};
    
    financialMetrics.completedBookings.forEach(booking => {
      const serviceName = booking.services?.name || 'Unknown Service';
      serviceRevenue[serviceName] = (serviceRevenue[serviceName] || 0) + (booking.total_amount || 0);
    });

    return Object.entries(serviceRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const getRevenueByMonth = () => {
    const monthlyRevenue: { [key: string]: number } = {};
    
    financialMetrics.completedBookings.forEach(booking => {
      const date = new Date(booking.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (booking.total_amount || 0);
    });

    return Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  };

  // Show loading state
  if (loading && !stripeBalance) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-600">Loading financial data...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const instantPayoutFee = payoutAmount ? (parseFloat(payoutAmount) * 0.015).toFixed(2) : "0.00";
  const instantPayoutNet = payoutAmount ? (parseFloat(payoutAmount) - parseFloat(instantPayoutFee)).toFixed(2) : "0.00";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-600">Manage your earnings, payouts, and tax information</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            onClick={refreshStripeData}
            disabled={stripeLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${stripeLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={openStripeDashboard}
            disabled={stripeLoading || !stripeBalance}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Stripe Dashboard
          </Button>
        </div>
      </div>

      {/* Alert if Stripe not connected */}
      {!stripeBalance?.payoutsEnabled && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Stripe Account Setup</AlertTitle>
          <AlertDescription>
            Your Stripe Connect account will be automatically created during the business onboarding process. 
            Once your business is approved, you'll have full access to payment processing and financial management.
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe Balance Cards - Primary Focus */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-2 border-green-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                Available Balance
                <Badge variant="outline" className="bg-white">Ready</Badge>
              </div>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ${stripeBalance?.available?.toFixed(2) || "0.00"}
              </p>
              <p className="text-sm text-gray-500 mt-2">Can be withdrawn now</p>
            </div>
            <div className="w-14 h-14 bg-green-600 rounded-lg flex items-center justify-center">
              <Wallet className="w-7 h-7 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 flex items-center gap-2">
                Pending Balance
                <Badge variant="outline">Processing</Badge>
              </div>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ${stripeBalance?.pending?.toFixed(2) || "0.00"}
              </p>
              <p className="text-sm text-gray-500 mt-2">2-7 days to available</p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-7 h-7 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Earnings (YTD)</p>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                ${financialMetrics.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-2">{financialMetrics.completedCount} bookings</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-600" />
                Request Instant Payout
              </h3>
              <p className="text-sm text-gray-500 mt-1">Get funds in ~30 minutes (1.5% fee)</p>
            </div>
          </div>
          <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full" 
                disabled={!stripeBalance?.payoutsEnabled || (stripeBalance?.available || 0) <= 0}
              >
                <Zap className="w-4 h-4 mr-2" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Choose your payout method and amount. Available balance: ${stripeBalance?.available?.toFixed(2) || "0.00"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Payout Method</label>
                  <Select value={payoutMethod} onValueChange={(v: any) => setPayoutMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <div>
                            <div>Standard (Free)</div>
                            <div className="text-xs text-gray-500">2 business days</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="instant">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-600" />
                          <div>
                            <div>Instant (1.5% fee)</div>
                            <div className="text-xs text-gray-500">~30 minutes</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Amount</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={stripeBalance?.available || 0}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0.00"
                  />
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto mt-1"
                    onClick={() => setPayoutAmount(stripeBalance?.available?.toString() || "0")}
                  >
                    Use full balance
                  </Button>
                </div>
                {payoutMethod === 'instant' && payoutAmount && (
                  <Alert>
                    <AlertDescription>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Payout amount:</span>
                          <span className="font-medium">${parseFloat(payoutAmount).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Instant fee (1.5%):</span>
                          <span>-${instantPayoutFee}</span>
                        </div>
                        <div className="flex justify-between text-sm font-semibold border-t pt-1">
                          <span>You'll receive:</span>
                          <span>${instantPayoutNet}</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPayoutDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={requestPayout} disabled={requestingPayout || !payoutAmount}>
                  {requestingPayout ? "Processing..." : "Request Payout"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </Card>

        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Payout Schedule
            </h3>
            <p className="text-sm text-gray-500 mt-1">Automatic payout frequency</p>
            </div>
          <div className="space-y-2">
            {payoutSchedule && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium capitalize">{payoutSchedule.interval} Payouts</div>
                  {payoutSchedule.weekly_anchor && (
                    <div className="text-gray-500">Every {payoutSchedule.weekly_anchor}</div>
                  )}
                  {payoutSchedule.monthly_anchor && (
                    <div className="text-gray-500">On day {payoutSchedule.monthly_anchor}</div>
                  )}
            </div>
                <Badge variant="outline">Active</Badge>
              </div>
            )}
            <Button 
              variant="outline" 
              className="w-full mt-2"
              onClick={openStripeDashboard}
            >
              Manage Schedule
            </Button>
          </div>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">

          {/* Business Performance Metrics */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Business Performance</h3>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{financialMetrics.totalBookings}</p>
              <div className="flex items-center mt-2">
                {financialMetrics.bookingsChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm ${financialMetrics.bookingsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(financialMetrics.bookingsChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-3xl font-bold text-gray-900">
                ${financialMetrics.averageOrderValue.toFixed(2)}
              </p>
                  <p className="text-sm text-gray-500 mt-2">Per completed booking</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900">
                {financialMetrics.completionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {financialMetrics.cancelledCount} cancelled
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Revenue Growth</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {financialMetrics.revenueChange >= 0 ? '+' : ''}
                    {financialMetrics.revenueChange.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-2">vs previous period</p>
                </div>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${financialMetrics.revenueChange >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`w-6 h-6 ${financialMetrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </Card>
      </div>

      {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Top Services by Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                  {getRevenueByService().length > 0 ? (
                    getRevenueByService().map((service, index) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{service.name}</p>
                      <p className="text-xs text-gray-500">
                        {((service.revenue / financialMetrics.totalRevenue) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">${service.revenue.toFixed(2)}</p>
                </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No completed bookings yet</p>
                  )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Monthly Revenue Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                  {getRevenueByMonth().length > 0 ? (
                    getRevenueByMonth().map((month) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(month.month + '-01').toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-900">${month.revenue.toFixed(2)}</p>
                </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No revenue data yet</p>
                  )}
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6 mt-6">
          {/* Stripe Payouts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="w-5 h-5" />
                <span>Stripe Payouts</span>
              </CardTitle>
              <CardDescription>Direct payouts from Stripe to your bank account</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stripePayouts.length > 0 ? (
                  stripePayouts.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payout.status === 'paid' ? 'bg-green-100' :
                          payout.status === 'pending' ? 'bg-yellow-100' :
                          payout.status === 'in_transit' ? 'bg-blue-100' :
                          'bg-red-100'
                        }`}>
                          {payout.status === 'paid' ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : payout.status === 'pending' || payout.status === 'in_transit' ? (
                            <Clock className="w-5 h-5 text-yellow-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-2">
                            ${payout.amount.toFixed(2)}
                            {payout.method === 'instant' && (
                              <Badge variant="outline" className="text-xs">
                                <Zap className="w-3 h-3 mr-1" />
                                Instant
                              </Badge>
                            )}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(payout.created * 1000).toLocaleDateString()} • 
                            Arrives {new Date(payout.arrival_date * 1000).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        payout.status === 'paid' ? 'default' :
                        payout.status === 'pending' || payout.status === 'in_transit' ? 'secondary' :
                        'destructive'
                      }>
                        {payout.status === 'paid' ? 'Paid' :
                         payout.status === 'pending' ? 'Pending' :
                         payout.status === 'in_transit' ? 'In Transit' :
                         payout.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No Stripe payouts yet</p>
                    <p className="text-xs text-gray-400 mt-1">Request your first payout above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Business Payment Transactions (Provider Payouts) */}
          {businessPaymentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Provider Payouts</span>
                </CardTitle>
                <CardDescription>Your earnings transferred to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {businessPaymentTransactions.map((payout) => (
                    <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            ${payout.net_payment_amount.toFixed(2)} to you
                          </p>
                          <p className="text-xs text-gray-600">
                            {payout.booking_id && `Booking ID: ${payout.booking_id}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payout.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +${payout.net_payment_amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Platform fee: ${payout.platform_fee.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Tax Year: {payout.tax_year}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Transaction History</span>
              </CardTitle>
              <CardDescription>All charges, fees, and balance changes from your bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {financialTransactions.length > 0 ? (
                  financialTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.transaction_type === 'service_payment' ? 'bg-green-100' :
                          transaction.transaction_type === 'tip_payment' ? 'bg-blue-100' :
                          transaction.transaction_type === 'refund' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          {transaction.transaction_type === 'service_payment' ? (
                            <ArrowDownRight className="w-5 h-5 text-green-600" />
                          ) : transaction.transaction_type === 'tip_payment' ? (
                            <DollarSign className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Receipt className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {transaction.description || transaction.transaction_type?.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-600">
                            {transaction.booking_id && `Booking ID: ${transaction.booking_id}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.processed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount >= 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">{transaction.currency}</p>
                        <p className="text-xs text-gray-400">
                          {transaction.status === 'completed' ? '✓ Completed' : 
                           transaction.status === 'pending' ? '⏳ Pending' : 
                           transaction.status}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No transactions yet</p>
                    <p className="text-xs text-gray-400 mt-1">Complete your first booking to see transactions here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Splits Section */}
          {paymentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="w-5 h-5" />
                  <span>Payment Breakdown</span>
                </CardTitle>
                <CardDescription>How your earnings are split between platform fees and your payout</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentTransactions.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          payment.transaction_type === 'service_fee' ? 'bg-orange-100' :
                          payment.transaction_type === 'remaining_balance' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          {payment.transaction_type === 'service_fee' ? (
                            <TrendingDown className="w-5 h-5 text-orange-600" />
                          ) : (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.transaction_type === 'service_fee' ? 'Platform Fee (12%)' : 'Your Earnings (88%)'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {payment.booking_id && `Booking ID: ${payment.booking_id}`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(payment.processed_at || payment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${payment.transaction_type === 'service_fee' ? 'text-orange-600' : 'text-green-600'}`}>
                          {payment.transaction_type === 'service_fee' ? '-' : '+'}${Math.abs(payment.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.destination_account === 'roam_platform' ? 'To Platform' : 'To You'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {payment.status === 'completed' ? '✓ Completed' : 
                           payment.status === 'pending' ? '⏳ Pending' : 
                           payment.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">

          {/* Tax Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <Building2 className="w-5 h-5" />
                  <span>Tax Information</span>
                </span>
                <Badge variant="outline">Required for 1099s</Badge>
              </CardTitle>
              <CardDescription>
                Your tax information is used for IRS reporting and must be accurate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TaxInformationSection businessId={businessId} />
            </CardContent>
          </Card>

          {/* Bank Account Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Bank Account</span>
              </CardTitle>
              <CardDescription>
                Manage where you receive your payouts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BankAccountManager
                userId={providerData?.user_id}
                businessId={businessId}
              />
            </CardContent>
          </Card>

          {/* Tax Documents Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5" />
                <span>Tax Documents & 1099s</span>
              </CardTitle>
              <CardDescription>
                Access your tax forms and year-end statements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>1099-K Forms</AlertTitle>
                  <AlertDescription>
                    If you earn $600 or more in a calendar year, you'll automatically receive a 1099-K form 
                    by January 31st. Forms are emailed and available in your Stripe Dashboard.
                  </AlertDescription>
                </Alert>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Year-to-Date Earnings</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      ${financialMetrics.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {financialMetrics.totalRevenue >= 600 ? (
                        <span className="text-green-600 font-medium">✓ Qualifies for 1099-K</span>
                      ) : (
                        <span>Need ${(600 - financialMetrics.totalRevenue).toFixed(2)} more to qualify</span>
                      )}
                    </p>
                  </div>
                  <Button variant="outline" onClick={openStripeDashboard}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Helpful Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5" />
                <span>Help & Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">💡 How Payouts Work</p>
                  <p className="text-xs text-blue-700 mt-1">
                    • Standard payouts are free and arrive in 2 business days<br />
                    • Instant payouts arrive in ~30 minutes for a 1.5% fee<br />
                    • Automatic payouts follow your schedule (daily/weekly/monthly)
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-900">💳 Transaction Fees</p>
                  <p className="text-xs text-green-700 mt-1">
                    • Platform fee: 12% per booking<br />
                    • Stripe processing: 2.9% + $0.30 per transaction<br />
                    • No monthly fees or hidden charges
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-purple-900">📊 Tax Reporting</p>
                  <p className="text-xs text-purple-700 mt-1">
                    • 1099-K forms generated automatically for earnings $600+<br />
                    • Forms available by January 31st each year<br />
                    • Automatically filed with the IRS by Stripe
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaxInformationSection({ businessId }: { businessId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businessEntityType, setBusinessEntityType] = useState<'sole_proprietorship'|'partnership'|'llc'|'corporation'|'non_profit'>('sole_proprietorship');
  const [legalBusinessName, setLegalBusinessName] = useState('');
  const [taxIdType, setTaxIdType] = useState<'EIN'|'SSN'>('EIN');
  const [taxId, setTaxId] = useState('');
  const [address, setAddress] = useState({ line1: '', line2: '', city: '', state: '', postal_code: '', country: 'US' });
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [w9Status, setW9Status] = useState<'not_collected'|'requested'|'received'|'invalid'|'expired'>('not_collected');
  const [taxSetupCompleted, setTaxSetupCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/business/tax-info?business_id=${businessId}`);
        if (res.ok) {
          const json = await res.json();
          const t = json.tax_info;
          if (t) {
            setBusinessEntityType(t.business_entity_type || 'sole_proprietorship');
            setLegalBusinessName(t.legal_business_name || '');
            setTaxIdType(t.tax_id_type || 'EIN');
            setAddress({
              line1: t.tax_address_line1 || '',
              line2: t.tax_address_line2 || '',
              city: t.tax_city || '',
              state: t.tax_state || '',
              postal_code: t.tax_postal_code || '',
              country: t.tax_country || 'US',
            });
            setContact({ name: t.tax_contact_name || '', email: t.tax_contact_email || '', phone: t.tax_contact_phone || '' });
            setW9Status(t.w9_status || 'not_collected');
            setTaxSetupCompleted(!!t.tax_setup_completed);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (businessId) load();
  }, [businessId]);

  const save = async () => {
    try {
      setSaving(true);
      const payload = {
        business_id: businessId,
        legal_business_name: legalBusinessName,
        tax_id: taxId, // stored per provided schema
        tax_id_type: taxIdType,
        tax_address_line1: address.line1,
        tax_address_line2: address.line2,
        tax_city: address.city,
        tax_state: address.state,
        tax_postal_code: address.postal_code,
        tax_country: address.country,
        business_entity_type: businessEntityType,
        tax_contact_name: contact.name,
        tax_contact_email: contact.email,
        tax_contact_phone: contact.phone,
        w9_status: w9Status,
        tax_setup_completed: taxSetupCompleted,
      };
      const res = await fetch('/api/business/tax-info', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save tax info');
      }
      toast({ title: 'Saved', description: 'Tax information updated.' });
    } catch (e:any) {
      toast({ title: 'Error', description: e.message || 'Failed to save tax info', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Business Entity Type</label>
          <Select value={businessEntityType} onValueChange={(v:any)=>setBusinessEntityType(v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
              <SelectItem value="partnership">Partnership</SelectItem>
              <SelectItem value="llc">LLC</SelectItem>
              <SelectItem value="corporation">Corporation</SelectItem>
              <SelectItem value="non_profit">Non-profit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Legal Business Name</label>
          <Input value={legalBusinessName} onChange={(e)=>setLegalBusinessName(e.target.value)} placeholder="As shown on tax return" className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Tax ID Type</label>
          <Select value={taxIdType} onValueChange={(v:any)=>setTaxIdType(v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EIN">EIN</SelectItem>
              <SelectItem value="SSN">SSN</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm font-medium">{taxIdType}</label>
          <Input value={taxId} onChange={(e)=>setTaxId(e.target.value)} placeholder={taxIdType==='EIN'?'XX-XXXXXXX':'XXX-XX-XXXX'} className="mt-1" />
          <p className="text-xs text-gray-500 mt-1">Stored as provided per compliance policy.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Address Line 1</label>
          <Input value={address.line1} onChange={(e)=>setAddress(a=>({...a,line1:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Address Line 2</label>
          <Input value={address.line2} onChange={(e)=>setAddress(a=>({...a,line2:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">City</label>
          <Input value={address.city} onChange={(e)=>setAddress(a=>({...a,city:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">State</label>
          <Input value={address.state} onChange={(e)=>setAddress(a=>({...a,state:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Postal Code</label>
          <Input value={address.postal_code} onChange={(e)=>setAddress(a=>({...a,postal_code:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Country</label>
          <Input value={address.country} onChange={(e)=>setAddress(a=>({...a,country:e.target.value}))} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-sm font-medium">Contact Name</label>
          <Input value={contact.name} onChange={(e)=>setContact(c=>({...c,name:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Contact Email</label>
          <Input value={contact.email} onChange={(e)=>setContact(c=>({...c,email:e.target.value}))} className="mt-1" />
        </div>
        <div>
          <label className="text-sm font-medium">Contact Phone</label>
          <Input value={contact.phone} onChange={(e)=>setContact(c=>({...c,phone:e.target.value}))} className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">W-9 Status</label>
          <Select value={w9Status} onValueChange={(v:any)=>setW9Status(v)}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="not_collected">Not Collected</SelectItem>
              <SelectItem value="requested">Requested</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium">Tax Setup Completed</label>
          <Switch checked={taxSetupCompleted} onCheckedChange={setTaxSetupCompleted} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving || loading}>{saving ? 'Saving...' : 'Save Tax Info'}</Button>
      </div>
    </div>
  );
}
