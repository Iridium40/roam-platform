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
  Star,
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

  // Supabase financial data state
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [businessPaymentTransactions, setBusinessPaymentTransactions] = useState<any[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);

  // Financial summary data from API (using real payment transactions)
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [financialSummaryLoading, setFinancialSummaryLoading] = useState(false);

  // Tips data state (owner only)
  const [tipsData, setTipsData] = useState<any[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

  const businessId = business?.id || providerData?.business_id;
  const isOwner = providerData?.provider_role === 'owner';

  // Load financial summary data from API (using real payment transactions)
  const loadFinancialSummary = async () => {
    if (!businessId) return;

    try {
      setFinancialSummaryLoading(true);

      const res = await fetch(`/api/business/financial-summary?business_id=${businessId}&period=${selectedPeriod}`);
      if (res.ok) {
        const data = await res.json();
        setFinancialSummary(data);
      } else {
        const error = await res.json();
        console.error('Failed to load financial summary:', error);
        toast({
          title: "Error",
          description: "Failed to load financial summary",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error loading financial summary:', error);
      toast({
        title: "Error",
        description: "Failed to load financial summary",
        variant: "destructive",
      });
    } finally {
      setFinancialSummaryLoading(false);
    }
  };

  // Load bookings data (still needed for some display purposes)
  const loadFinancialData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);

      // Load bookings for display purposes
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(*),
          customer_profiles:customer_id(*)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100); // Limit for performance

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

  // Load tips data (owner only) - using eligible_provider_tips view
  const loadTipsData = async () => {
    if (!businessId || !isOwner) return;

    try {
      setTipsLoading(true);

      const { data: tipsData, error: tipsError } = await supabase
        .from('eligible_provider_tips')
        .select('*')
        .eq('business_id', businessId)
        .order('tip_given_at', { ascending: false })
        .limit(100);

      if (tipsError) {
        console.error('Error loading tips data:', tipsError);
      } else {
        setTipsData(tipsData || []);
      }
    } catch (error) {
      console.error('Error loading tips data:', error);
    } finally {
      setTipsLoading(false);
    }
  };

  // Open Stripe Dashboard
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
        throw new Error(error.error || error.details || 'Failed to create dashboard link');
      }

      const data = await res.json();
      
      // Open the login link in a new tab
      // This link will automatically log them into their Stripe Express Dashboard
      // The link expires in 1 hour
      window.open(data.url, '_blank');

      toast({
        title: "Opening Stripe Dashboard",
        description: "You'll be automatically logged into your Stripe account in a new tab",
      });

    } catch (error: any) {
      console.error('Error opening Stripe dashboard:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard. Please try again or contact support.",
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
      loadSupabaseFinancialData(), // Also refresh Supabase data
      loadFinancialSummary(), // Refresh financial summary
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
    loadFinancialSummary(); // Load financial summary from API
    loadStripeBalance();
    loadStripePayouts();
    loadStripeTransactions();
    loadSupabaseFinancialData(); // Load Supabase financial data
    if (isOwner) {
      loadTipsData(); // Load tips data for owners only
    }
  }, [providerData, business, isOwner, selectedPeriod]); // Add selectedPeriod dependency

  // Calculate financial metrics using real payment transaction data
  const financialMetrics = useMemo(() => {
    // Use real data from financial summary API if available
    if (financialSummary?.period_summary) {
      const period = financialSummary.period_summary;
      return {
        totalRevenue: period.net_earnings || 0, // Net earnings (what business actually receives)
        totalGrossRevenue: period.gross_earnings || 0, // Gross earnings (before platform fees)
        totalBookings: period.booking_count || 0,
        completedCount: period.initial_bookings || 0,
        cancelledCount: 0, // Would need to calculate from bookings if needed
        averageOrderValue: period.average_order_value || 0,
        completionRate: financialSummary.calculated_metrics?.completion_rate || 0,
        revenueChange: period.revenue_change || 0,
        bookingsChange: period.bookings_change || 0,
        platformFees: period.platform_fees || 0,
        transactionCount: period.transaction_count || 0,
        periodBookings: bookings, // Keep for backward compatibility
        completedBookings: bookings.filter(b => b.booking_status === 'completed'),
      };
    }

    // Fallback to bookings-based calculation if API data not available
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
      totalGrossRevenue: totalRevenue,
      totalBookings,
      completedCount,
      cancelledCount,
      averageOrderValue,
      completionRate,
      revenueChange,
      bookingsChange,
      platformFees: 0,
      transactionCount: totalBookings,
      periodBookings,
      completedBookings,
    };
  }, [financialSummary, bookings, selectedPeriod]);

  const getRevenueByService = () => {
    // Use real data from API if available
    if (financialSummary?.earnings_by_service && financialSummary.earnings_by_service.length > 0) {
      return financialSummary.earnings_by_service
        .slice(0, 5)
        .map((service: any) => ({
          name: service.service_name || 'Unknown Service',
          revenue: parseFloat(service.total_net_earnings || 0),
          bookingCount: service.booking_count || 0,
        }));
    }

    // Fallback to bookings-based calculation
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
    // Use real data from API if available
    if (financialSummary?.monthly_earnings && financialSummary.monthly_earnings.length > 0) {
      return financialSummary.monthly_earnings
        .slice(0, 6)
        .map((month: any) => ({
          month: month.month_key || month.month_start,
          revenue: parseFloat(month.net_earnings || 0),
        }))
        .sort((a: any, b: any) => a.month.localeCompare(b.month));
    }

    // Fallback to bookings-based calculation
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-600">View your earnings and payouts. Update tax and banking information. For payout options like instant payouts, use the Stripe Dashboard.</p>
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
            variant="default" 
            onClick={openStripeDashboard}
            disabled={stripeLoading}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Stripe Dashboard
          </Button>
        </div>
      </div>

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
                ${financialSummary?.summary?.total_net_earnings 
                  ? parseFloat(financialSummary.summary.total_net_earnings).toFixed(2)
                  : financialMetrics.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {financialSummary?.summary?.total_bookings || financialMetrics.completedCount} bookings
              </p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isOwner ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          {isOwner && <TabsTrigger value="tips">Tips</TabsTrigger>}
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
              <CardDescription>
                Payouts are controlled by ROAM Platform and are automatically scheduled to be paid out once a week on Thursday to your connected bank account.
              </CardDescription>
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
                    <p className="text-xs text-gray-400 mt-1">Payouts are automatically processed weekly on Thursdays by ROAM Platform</p>
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
                {financialSummary?.recent_transactions && financialSummary.recent_transactions.length > 0 ? (
                  financialSummary.recent_transactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          transaction.transaction_type === 'initial_booking' ? 'bg-green-100' :
                          transaction.transaction_type === 'additional_service' ? 'bg-blue-100' :
                          'bg-gray-100'
                        }`}>
                          {transaction.transaction_type === 'initial_booking' || transaction.transaction_type === 'additional_service' ? (
                            <ArrowDownRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <Receipt className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {transaction.transaction_description || 
                             (transaction.transaction_type === 'initial_booking' ? 'Initial Booking Payment' :
                              transaction.transaction_type === 'additional_service' ? 'Additional Service' :
                              'Payment')}
                          </p>
                          {transaction.service_name && (
                            <p className="text-xs text-gray-600">{transaction.service_name}</p>
                          )}
                          {transaction.booking_reference && (
                            <p className="text-xs text-gray-600">Booking: {transaction.booking_reference}</p>
                          )}
                          {transaction.customer_first_name && transaction.customer_last_name && (
                            <p className="text-xs text-gray-500">
                              Customer: {transaction.customer_first_name} {transaction.customer_last_name}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.payment_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          +${parseFloat(transaction.net_payment_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Gross: ${parseFloat(transaction.gross_payment_amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Fee: ${parseFloat(transaction.platform_fee || 0).toFixed(2)}
                        </p>
                        {transaction.transaction_type && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {transaction.transaction_type === 'initial_booking' ? 'Initial' : 'Additional'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : financialTransactions.length > 0 ? (
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

        {/* Tips Tab - Owner Only */}
        {isOwner && (
          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5" />
                  <span>Provider Tips Report</span>
                </CardTitle>
                <CardDescription>
                  Tips received by providers who are eligible for bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tipsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading tips data...</p>
                  </div>
                ) : tipsData.length > 0 ? (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Tips</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              ${tipsData.reduce((sum, tip) => sum + parseFloat(tip.tip_amount || 0), 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{tipsData.length} tips</p>
                          </div>
                          <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                            <Star className="w-6 h-6 text-yellow-600" />
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Provider Net</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              ${tipsData.reduce((sum, tip) => sum + parseFloat(tip.provider_net_amount || 0), 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">After platform fees</p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-green-600" />
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Platform Fees</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">
                              ${tipsData.reduce((sum, tip) => sum + parseFloat(tip.platform_fee_amount || 0), 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">From tips</p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                          </div>
                        </div>
                      </Card>
                    </div>

                    {/* Tips by Provider */}
                    {(() => {
                      const tipsByProvider = tipsData.reduce((acc: any, tip: any) => {
                        const providerId = tip.provider_id;
                        const providerName = `${tip.provider_first_name || ''} ${tip.provider_last_name || ''}`.trim() || 'Unknown Provider';
                        
                        if (!acc[providerId]) {
                          acc[providerId] = {
                            providerId,
                            providerName,
                            tips: [],
                            totalAmount: 0,
                            totalNet: 0,
                            totalFees: 0,
                          };
                        }
                        
                        acc[providerId].tips.push(tip);
                        acc[providerId].totalAmount += parseFloat(tip.tip_amount || 0);
                        acc[providerId].totalNet += parseFloat(tip.provider_net_amount || 0);
                        acc[providerId].totalFees += parseFloat(tip.platform_fee_amount || 0);
                        
                        return acc;
                      }, {});

                      const providerStats = Object.values(tipsByProvider).sort((a: any, b: any) => b.totalAmount - a.totalAmount);

                      return (
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold">Tips by Provider</h3>
                          {providerStats.map((provider: any) => (
                            <Card key={provider.providerId} className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-lg">{provider.providerName}</p>
                                  <p className="text-sm text-gray-500">{provider.tips.length} tip{provider.tips.length !== 1 ? 's' : ''}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xl font-bold text-gray-900">
                                    ${provider.totalAmount.toFixed(2)}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Net: ${provider.totalNet.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {provider.tips.map((tip: any) => (
                                  <div key={tip.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-2">
                                        <p className="font-medium text-sm">
                                          {tip.customer_first_name && tip.customer_last_name
                                            ? `${tip.customer_first_name} ${tip.customer_last_name}`
                                            : 'Anonymous Customer'}
                                        </p>
                                        {tip.service_name && (
                                          <Badge variant="outline" className="text-xs">
                                            {tip.service_name}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                        {tip.booking_reference && (
                                          <span>Booking: {tip.booking_reference}</span>
                                        )}
                                        {tip.tip_given_at && (
                                          <span>
                                            {new Date(tip.tip_given_at).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                      {tip.customer_message && (
                                        <p className="text-xs text-gray-600 mt-1 italic">
                                          "{tip.customer_message}"
                                        </p>
                                      )}
                                    </div>
                                    <div className="text-right ml-4">
                                      <p className="font-semibold text-green-600">
                                        ${parseFloat(tip.tip_amount || 0).toFixed(2)}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Net: ${parseFloat(tip.provider_net_amount || 0).toFixed(2)}
                                      </p>
                                      {tip.payment_status && (
                                        <Badge 
                                          variant={
                                            tip.payment_status === 'completed' ? 'default' :
                                            tip.payment_status === 'pending' ? 'secondary' :
                                            'destructive'
                                          }
                                          className="text-xs mt-1"
                                        >
                                          {tip.payment_status}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No tips received yet</p>
                    <p className="text-xs text-gray-400 mt-1">Tips from eligible providers will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

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

          {/* Stripe Connect Account Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Manage your Connected Stripe Account</span>
              </CardTitle>
              <CardDescription>
                Update your banking information here. For payout options like instant payouts and other account settings, click "Open Stripe Dashboard" above.
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
