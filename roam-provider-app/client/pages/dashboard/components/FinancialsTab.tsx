import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
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
  const [businessPaymentTransactions, setBusinessPaymentTransactions] = useState<any[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);

  // Financial summary data from API (using real payment transactions)
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [financialSummaryLoading, setFinancialSummaryLoading] = useState(false);

  // Tips data state (owner only)
  const [tipsData, setTipsData] = useState<any[]>([]);
  const [tipsLoading, setTipsLoading] = useState(false);

  // Filter state for transactions and tips
  const [transactionFilters, setTransactionFilters] = useState({
    startDate: '',
    endDate: '',
    providerId: 'all',
    serviceId: 'all',
  });
  const [tipFilters, setTipFilters] = useState({
    startDate: '',
    endDate: '',
    providerId: 'all',
  });
  const [payoutFilters, setPayoutFilters] = useState({
    startDate: '',
    endDate: '',
    providerId: 'all',
  });
  const [stripePayoutFilters, setStripePayoutFilters] = useState({
    startDate: '',
    endDate: '',
  });

  // Providers and services for filters
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(false);

  const businessId = business?.id || providerData?.business_id;
  const isOwner = providerData?.provider_role === 'owner';

  // Deep-link support: /financials?tab=settings to open Bank Settings directly
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["overview", "payouts", "transactions", "tips", "settings"].includes(tab)) {
      // Guard tips tab for non-owners
      if (tab === "tips" && !isOwner) return;
      setActiveTab(tab);
    }
  }, [isOwner, searchParams]);

  // Helper function to get filtered transactions
  const getFilteredTransactions = useMemo(() => {
    // Combine all transaction sources
    const allTransactions = [
      ...(financialSummary?.recent_transactions || []),
      ...financialTransactions,
      ...businessPaymentTransactions,
    ];

    // Remove duplicates by id
    const uniqueTransactions = allTransactions.reduce((acc: any[], transaction: any) => {
      if (!acc.find(t => t.id === transaction.id)) {
        acc.push(transaction);
      }
      return acc;
    }, []);

    // Debug: Log transaction structure when filtering by provider
    if (transactionFilters.providerId !== 'all' && uniqueTransactions.length > 0) {
      console.log('🔍 Filtering transactions by provider:', {
        providerId: transactionFilters.providerId,
        totalTransactions: uniqueTransactions.length,
        sampleTransaction: uniqueTransactions[0],
        hasProviderId: uniqueTransactions[0].provider_id,
        hasBookings: !!uniqueTransactions[0].bookings,
        bookingsProviderId: Array.isArray(uniqueTransactions[0].bookings) 
          ? uniqueTransactions[0].bookings[0]?.provider_id 
          : uniqueTransactions[0].bookings?.provider_id,
      });
    }

    // Apply filters
    return uniqueTransactions.filter((transaction: any) => {
      // Filter by date range - compare date strings to avoid timezone issues
      const rawDate = transaction.payment_date || transaction.processed_at || transaction.created_at;
      if (rawDate && (transactionFilters.startDate || transactionFilters.endDate)) {
        // Extract just the date portion (YYYY-MM-DD) for comparison
        const transactionDateStr = rawDate.split('T')[0];
        
        if (transactionFilters.startDate && transactionDateStr < transactionFilters.startDate) {
          return false;
        }
        if (transactionFilters.endDate && transactionDateStr > transactionFilters.endDate) {
          return false;
        }
      }

      // Filter by provider - handle different data structures
      if (transactionFilters.providerId !== 'all') {
        // Check if transaction has provider_id directly (business_earnings_detailed view)
        if (transaction.provider_id) {
          if (transaction.provider_id !== transactionFilters.providerId) return false;
        } else {
          // For financial_transactions and business_payment_transactions, check through bookings relationship
          const booking = Array.isArray(transaction.bookings) ? transaction.bookings[0] : transaction.bookings;
          if (booking?.provider_id !== transactionFilters.providerId) return false;
        }
      }

      // Filter by service
      if (transactionFilters.serviceId !== 'all') {
        // For business_payment_transactions or business_earnings_detailed, check service_name or service_id
        if (transaction.service_name) {
          const service = services.find(s => s.id === transactionFilters.serviceId);
          if (service && transaction.service_name !== service.name) return false;
        } else if (transaction.service_id) {
          if (transaction.service_id !== transactionFilters.serviceId) return false;
        } else {
          // For financial_transactions, check through bookings relationship
          const booking = Array.isArray(transaction.bookings) ? transaction.bookings[0] : transaction.bookings;
          if (booking?.service_id !== transactionFilters.serviceId) return false;
        }
      }

      return true;
    });
  }, [
    financialSummary?.recent_transactions,
    financialTransactions,
    businessPaymentTransactions,
    transactionFilters,
    services,
  ]);

  // CSV Export function for transactions
  const exportTransactionsToCSV = () => {
    const filtered = getFilteredTransactions;

    // Prepare CSV data
    const csvRows = [];
    csvRows.push([
      'Date',
      'Customer',
      'Service',
      'Booking Reference',
      'Amount',
      'Gross Amount',
      'Net Amount',
      'Platform Fee',
      'Status',
      'Transaction Type',
      'Description'
    ].join(','));

    filtered.forEach((transaction: any) => {
      const isBusinessPaymentTransaction = !!transaction.transaction_description;
      const booking = Array.isArray(transaction.bookings) ? transaction.bookings[0] : transaction.bookings;
      
      const customerName = isBusinessPaymentTransaction
        ? `${transaction.customer_first_name || ''} ${transaction.customer_last_name || ''}`.trim()
        : `${booking?.customer_profiles?.first_name || ''} ${booking?.customer_profiles?.last_name || ''}`.trim();
      
      const serviceName = isBusinessPaymentTransaction
        ? transaction.service_name
        : booking?.services?.name;
      
      const bookingReference = transaction.booking_reference || booking?.booking_reference || transaction.metadata?.booking_reference || '';
      const transactionDate = transaction.payment_date || transaction.processed_at || transaction.created_at;
      const amount = isBusinessPaymentTransaction
        ? parseFloat(transaction.net_payment_amount || 0)
        : transaction.amount || 0;
      const grossAmount = isBusinessPaymentTransaction ? parseFloat(transaction.gross_payment_amount || 0) : amount;
      const netAmount = isBusinessPaymentTransaction ? parseFloat(transaction.net_payment_amount || 0) : amount;
      const platformFee = isBusinessPaymentTransaction ? parseFloat(transaction.platform_fee || 0) : 0;
      const status = transaction.status || transaction.payment_status || '';
      const transactionType = transaction.transaction_type || transaction.type || '';
      const description = transaction.transaction_description || transaction.description || '';

      csvRows.push([
        transactionDate ? new Date(transactionDate).toLocaleDateString() : '',
        `"${customerName}"`,
        `"${serviceName || ''}"`,
        `"${bookingReference}"`,
        amount.toFixed(2),
        grossAmount.toFixed(2),
        netAmount.toFixed(2),
        platformFee.toFixed(2),
        `"${status}"`,
        `"${transactionType}"`,
        `"${description}"`
      ].join(','));
    });

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export function for provider payouts
  const exportPayoutsToCSV = () => {
    // Apply filters to businessPaymentTransactions
    let filtered = businessPaymentTransactions.filter((payout: any) => {
      if (payoutFilters.startDate) {
        const payoutDate = new Date(payout.payment_date || payout.created_at);
        if (payoutDate < new Date(payoutFilters.startDate)) return false;
      }
      if (payoutFilters.endDate) {
        const payoutDate = new Date(payout.payment_date || payout.created_at);
        const endDate = new Date(payoutFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (payoutDate > endDate) return false;
      }
      if (payoutFilters.providerId !== 'all') {
        // Check through bookings relationship
        const booking = Array.isArray(payout.bookings) ? payout.bookings[0] : payout.bookings;
        if (booking?.provider_id !== payoutFilters.providerId) return false;
      }
      return true;
    });

    // Prepare CSV data
    const csvRows = [];
    csvRows.push([
      'Date',
      'Provider',
      'Gross Amount',
      'Net Amount',
      'Platform Fee',
      'Booking Reference',
      'Transaction Type',
      'Tax Year',
      'Status'
    ].join(','));

    filtered.forEach((payout: any) => {
      const payoutDate = payout.payment_date || payout.created_at;
      const booking = Array.isArray(payout.bookings) ? payout.bookings[0] : payout.bookings;
      
      // Get provider name from nested structure
      let providerName = 'Unknown Provider';
      if (booking?.providers) {
        const provider = Array.isArray(booking.providers) ? booking.providers[0] : booking.providers;
        if (provider) {
          providerName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'Unknown Provider';
        }
      } else if (booking?.provider_id) {
        // Fallback: try to find provider in the providers list
        const provider = providers.find(p => p.id === booking.provider_id);
        if (provider) {
          providerName = `${provider.first_name || ''} ${provider.last_name || ''}`.trim();
        }
      }
      
      const grossAmount = parseFloat(payout.gross_payment_amount || 0);
      const netAmount = parseFloat(payout.net_payment_amount || 0);
      const platformFee = parseFloat(payout.platform_fee || 0);
      const bookingReference = payout.booking_reference || '';
      const transactionType = payout.transaction_type || '';
      const taxYear = payout.tax_year || '';
      const status = 'completed'; // Provider payouts are always completed

      csvRows.push([
        payoutDate ? new Date(payoutDate).toLocaleDateString() : '',
        `"${providerName}"`,
        grossAmount.toFixed(2),
        netAmount.toFixed(2),
        platformFee.toFixed(2),
        `"${bookingReference}"`,
        `"${transactionType}"`,
        taxYear,
        `"${status}"`
      ].join(','));
    });

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payouts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export function for Stripe payouts
  const exportStripePayoutsToCSV = () => {
    // Apply date filters to Stripe payouts
    let filtered = stripePayouts.filter((payout: any) => {
      if (stripePayoutFilters.startDate) {
        const payoutDate = new Date(payout.created * 1000);
        if (payoutDate < new Date(stripePayoutFilters.startDate)) return false;
      }
      if (stripePayoutFilters.endDate) {
        const payoutDate = new Date(payout.created * 1000);
        const endDate = new Date(stripePayoutFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (payoutDate > endDate) return false;
      }
      return true;
    });

    // Prepare CSV data
    const csvRows = [];
    csvRows.push([
      'Date',
      'Amount',
      'Currency',
      'Status',
      'Method',
      'Arrival Date',
      'Type',
      'Automatic'
    ].join(','));

    filtered.forEach((payout: any) => {
      const payoutDate = new Date(payout.created * 1000);
      const arrivalDate = new Date(payout.arrival_date * 1000);
      const amount = payout.amount || 0;
      const currency = payout.currency || 'USD';
      const status = payout.status || '';
      const method = payout.method || '';
      const type = payout.type || '';
      const automatic = payout.automatic ? 'Yes' : 'No';

      csvRows.push([
        payoutDate.toLocaleDateString(),
        amount.toFixed(2),
        currency,
        `"${status}"`,
        `"${method}"`,
        arrivalDate.toLocaleDateString(),
        `"${type}"`,
        automatic
      ].join(','));
    });

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `stripe_payouts_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export function for tips
  const exportTipsToCSV = () => {
    // Apply filters to tips (same logic as display)
    let filtered = tipsData.filter((tip: any) => {
      if (tipFilters.startDate) {
        const tipDate = new Date(tip.tip_given_at || tip.created_at);
        if (tipDate < new Date(tipFilters.startDate)) return false;
      }
      if (tipFilters.endDate) {
        const tipDate = new Date(tip.tip_given_at || tip.created_at);
        const endDate = new Date(tipFilters.endDate);
        endDate.setHours(23, 59, 59, 999);
        if (tipDate > endDate) return false;
      }
      if (tipFilters.providerId !== 'all') {
        if (tip.provider_id !== tipFilters.providerId) return false;
      }
      return true;
    });

    // Prepare CSV data
    const csvRows = [];
    csvRows.push([
      'Date',
      'Provider',
      'Tip Amount',
      'Provider Net Amount',
      'Platform Fee',
      'Booking Reference',
      'Customer',
      'Service'
    ].join(','));

    filtered.forEach((tip: any) => {
      const tipDate = tip.tip_given_at || tip.created_at;
      const providerName = tip.provider_first_name && tip.provider_last_name
        ? `${tip.provider_first_name} ${tip.provider_last_name}`
        : 'Unknown Provider';
      const tipAmount = parseFloat(tip.tip_amount || 0);
      const providerNet = parseFloat(tip.provider_net_amount || 0);
      const platformFee = parseFloat(tip.platform_fee_amount || 0);
      const bookingReference = tip.booking_reference || '';
      const customerName = tip.customer_first_name && tip.customer_last_name
        ? `${tip.customer_first_name} ${tip.customer_last_name}`
        : '';
      const serviceName = tip.service_name || '';

      csvRows.push([
        tipDate ? new Date(tipDate).toLocaleDateString() : '',
        `"${providerName}"`,
        tipAmount.toFixed(2),
        providerNet.toFixed(2),
        platformFee.toFixed(2),
        `"${bookingReference}"`,
        `"${customerName}"`,
        `"${serviceName}"`
      ].join(','));
    });

    // Create and download CSV
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tips_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
          bookings!inner(
            business_id,
            booking_reference,
            provider_id,
            customer_profiles (
              first_name,
              last_name
            ),
            services (
              name
            )
          )
        `)
        .eq('bookings.business_id', businessId)
        .order('processed_at', { ascending: false })
        .limit(50);

      if (financialError) {
        console.error('Error loading financial transactions:', financialError);
      } else {
        setFinancialTransactions(financialData || []);
      }

      // Load business_payment_transactions (this table has business_id directly)
      // Join with bookings to get provider_id, provider details, and booking_reference
      const { data: businessPaymentData, error: businessPaymentError } = await supabase
        .from('business_payment_transactions')
        .select(`
          *,
          bookings (
            provider_id,
            booking_reference,
            providers (
              id,
              first_name,
              last_name
            )
          )
        `)
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

  // Load providers and services for filters
  const loadFilterData = async () => {
    if (!businessId) return;

    try {
      setLoadingFilters(true);

      // Load providers (exclude dispatchers as they cannot deliver services)
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('id, first_name, last_name, provider_role')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .neq('provider_role', 'dispatcher') // Exclude dispatchers
        .order('first_name');

      if (providersError) {
        console.error('Error loading providers:', providersError);
      } else {
        // Double-check: filter out any dispatchers that might have slipped through
        const filteredProviders = (providersData || []).filter(
          (provider: any) => provider.provider_role !== 'dispatcher'
        );
        setProviders(filteredProviders);
      }

      // Load services through business_services junction table
      // Services don't have a direct business_id - they're linked via business_services
      const { data: businessServicesData, error: servicesError } = await supabase
        .from('business_services')
        .select(`
          service_id,
          services:service_id (
            id,
            name
          )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true);

      if (servicesError) {
        console.error('Error loading services:', servicesError);
      } else {
        // Extract services from the joined data and sort by name
        const services = (businessServicesData || [])
          .map((bs: any) => bs.services)
          .filter(Boolean)
          .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));
        setServices(services);
      }
    } catch (error) {
      console.error('Error loading filter data:', error);
    } finally {
      setLoadingFilters(false);
    }
  };

  // Open Stripe Dashboard
  const openStripeDashboard = async () => {
    // Safari (and some browsers) will block popups if window.open happens after an await.
    // Open a blank tab synchronously from the click event, then redirect it once we have the URL.
    const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
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
      
      if (!popup) {
        throw new Error("Popup was blocked. Please allow popups for this site and try again.");
      }

      // Redirect the already-opened tab to Stripe
      popup.location.href = data.url;
      // Extra safety: ensure opener is null to prevent reverse-tabnabbing
      try {
        popup.opener = null;
      } catch {
        // ignore
      }

      toast({
        title: "Opening Stripe Dashboard",
        description: "You'll be automatically logged into your Stripe account in a new tab",
      });

    } catch (error: any) {
      console.error('Error opening Stripe dashboard:', error);
      // If we opened a blank tab, close it on failure so we don't leave junk tabs around.
      try {
        popup?.close();
      } catch {
        // ignore
      }
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
    loadFilterData(); // Load providers and services for filters
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
        {/* Mobile: Dropdown selector */}
        <div className="md:hidden w-full">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a tab" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="payouts">Payouts</SelectItem>
              <SelectItem value="transactions">Transactions</SelectItem>
              {isOwner && <SelectItem value="tips">Tips</SelectItem>}
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Desktop: Tab list */}
        <TabsList className={`hidden md:grid w-full ${isOwner ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Overview</TabsTrigger>
          <TabsTrigger value="payouts" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Payouts</TabsTrigger>
          <TabsTrigger value="transactions" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Transactions</TabsTrigger>
          {isOwner && <TabsTrigger value="tips" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Tips</TabsTrigger>}
          <TabsTrigger value="settings" className="data-[state=active]:bg-[#f88221] data-[state=active]:text-white">Bank Settings</TabsTrigger>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="w-5 h-5" />
                    <span>Stripe Payouts</span>
                  </CardTitle>
                  <CardDescription>
                    Payouts are managed through Stripe Express. You can set your own payout schedule, and you can also choose an instant payout (funds delivered in minutes).
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportStripePayoutsToCSV}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Stripe Payouts Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Date Range */}
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-xs font-medium text-gray-700">Date Range</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          type="date"
                          value={stripePayoutFilters.startDate}
                          onChange={(e) => setStripePayoutFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="text-xs pr-10"
                          placeholder="From"
                        />
                        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <Input
                          type="date"
                          value={stripePayoutFilters.endDate}
                          onChange={(e) => setStripePayoutFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="text-xs pr-10"
                          placeholder="To"
                        />
                        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-gray-700 opacity-0">Clear</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStripePayoutFilters({
                        startDate: '',
                        endDate: '',
                      })}
                      className="text-xs w-full"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  // Apply filters to Stripe payouts
                  let filtered = stripePayouts.filter((payout: any) => {
                    if (stripePayoutFilters.startDate) {
                      const payoutDate = new Date(payout.created * 1000);
                      if (payoutDate < new Date(stripePayoutFilters.startDate)) return false;
                    }
                    if (stripePayoutFilters.endDate) {
                      const payoutDate = new Date(payout.created * 1000);
                      const endDate = new Date(stripePayoutFilters.endDate);
                      endDate.setHours(23, 59, 59, 999);
                      if (payoutDate > endDate) return false;
                    }
                    return true;
                  });

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No Stripe payouts match your filters</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filter criteria</p>
                      </div>
                    );
                  }

                  return filtered.map((payout) => (
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
                  ));
                })()}
              </div>
            </CardContent>
          </Card>

          {/* Business Payment Transactions (Booking Earnings) */}
          {businessPaymentTransactions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5" />
                      <span>Booking Earnings</span>
                    </CardTitle>
                    <CardDescription>Earnings from confirmed bookings (paid out weekly on Fridays)</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportPayoutsToCSV}
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Booking Earnings Filters */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Date Range */}
                    <div className="md:col-span-5 space-y-2">
                      <label className="text-xs font-medium text-gray-700">Date Range</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type="date"
                            value={payoutFilters.startDate}
                            onChange={(e) => setPayoutFilters(prev => ({ ...prev, startDate: e.target.value }))}
                            className="text-xs pr-10"
                            placeholder="From"
                          />
                          <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                        <div className="relative flex-1 min-w-0">
                          <Input
                            type="date"
                            value={payoutFilters.endDate}
                            onChange={(e) => setPayoutFilters(prev => ({ ...prev, endDate: e.target.value }))}
                            className="text-xs pr-10"
                            placeholder="To"
                          />
                          <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Provider Filter */}
                    <div className="md:col-span-4 space-y-2">
                      <label className="text-xs font-medium text-gray-700">Provider</label>
                      <Select
                        value={payoutFilters.providerId}
                        onValueChange={(value) => setPayoutFilters(prev => ({ ...prev, providerId: value }))}
                      >
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="All Providers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Providers</SelectItem>
                          {providers.map((provider) => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.first_name} {provider.last_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Clear Filters */}
                    <div className="md:col-span-3 space-y-2">
                      <label className="text-xs font-medium text-gray-700 opacity-0">Clear</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPayoutFilters({
                          startDate: '',
                          endDate: '',
                          providerId: 'all',
                        })}
                        className="text-xs w-full"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Apply filters to provider payouts
                    let filtered = businessPaymentTransactions.filter((payout: any) => {
                      if (payoutFilters.startDate) {
                        const payoutDate = new Date(payout.payment_date || payout.created_at);
                        if (payoutDate < new Date(payoutFilters.startDate)) return false;
                      }
                      if (payoutFilters.endDate) {
                        const payoutDate = new Date(payout.payment_date || payout.created_at);
                        const endDate = new Date(payoutFilters.endDate);
                        endDate.setHours(23, 59, 59, 999);
                        if (payoutDate > endDate) return false;
                      }
                      if (payoutFilters.providerId !== 'all') {
                        // Check through bookings relationship
                        const booking = Array.isArray(payout.bookings) ? payout.bookings[0] : payout.bookings;
                        if (booking?.provider_id !== payoutFilters.providerId) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No provider payouts match your filters</p>
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your filter criteria</p>
                        </div>
                      );
                    }

                    return filtered.map((payout) => {
                      // Get booking reference from joined bookings data
                      const bookingRef = payout.bookings?.booking_reference || payout.booking_reference;
                      
                      return (
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
                            {bookingRef ? `Ref: ${bookingRef}` : payout.booking_id && `Booking: ${payout.booking_id.slice(0, 8)}...`}
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
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Receipt className="w-5 h-5" />
                    <span>Transaction History</span>
                  </CardTitle>
                  <CardDescription>All charges, fees, and balance changes from your bookings</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportTransactionsToCSV}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export CSV</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  {/* Date Range */}
                  <div className="md:col-span-5 space-y-2">
                    <label className="text-xs font-medium text-gray-700">Date Range</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          type="date"
                          value={transactionFilters.startDate}
                          onChange={(e) => setTransactionFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="text-xs pr-10"
                          placeholder="From"
                        />
                        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                      <div className="relative flex-1 min-w-0">
                        <Input
                          type="date"
                          value={transactionFilters.endDate}
                          onChange={(e) => setTransactionFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="text-xs pr-10"
                          placeholder="To"
                        />
                        <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Provider Filter */}
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-xs font-medium text-gray-700">Provider</label>
                    <Select
                      value={transactionFilters.providerId}
                      onValueChange={(value) => setTransactionFilters(prev => ({ ...prev, providerId: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="All Providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Providers</SelectItem>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.first_name} {provider.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Filter */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-gray-700">Service Type</label>
                    <Select
                      value={transactionFilters.serviceId}
                      onValueChange={(value) => setTransactionFilters(prev => ({ ...prev, serviceId: value }))}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="All Services" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Services</SelectItem>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Clear Filters */}
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-gray-700 opacity-0">Clear</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTransactionFilters({
                        startDate: '',
                        endDate: '',
                        providerId: 'all',
                        serviceId: 'all',
                      })}
                      className="text-xs w-full"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {(() => {
                  const filtered = getFilteredTransactions;

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No transactions match your filters</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your filter criteria</p>
                      </div>
                    );
                  }

                  return filtered.map((transaction: any) => {
                    // Handle different data structures
                    const isBusinessPaymentTransaction = !!transaction.transaction_description;
                    const booking = Array.isArray(transaction.bookings) 
                      ? transaction.bookings[0] 
                      : transaction.bookings;
                    
                    const customerFirstName = isBusinessPaymentTransaction 
                      ? transaction.customer_first_name 
                      : booking?.customer_profiles?.first_name;
                    const customerLastName = isBusinessPaymentTransaction 
                      ? transaction.customer_last_name 
                      : booking?.customer_profiles?.last_name;
                    const serviceName = isBusinessPaymentTransaction 
                      ? transaction.service_name 
                      : booking?.services?.name;
                    const bookingReference = transaction.booking_reference || booking?.booking_reference || transaction.metadata?.booking_reference;
                    const transactionDate = transaction.payment_date || transaction.processed_at || transaction.created_at;
                    const amount = isBusinessPaymentTransaction 
                      ? parseFloat(transaction.net_payment_amount || 0)
                      : transaction.amount;
                    const currency = transaction.currency || 'USD';
                    const status = transaction.status || transaction.payment_status;
                    
                    return (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm">
                              {customerFirstName && customerLastName
                                ? `${customerFirstName} ${customerLastName}`
                                : transaction.transaction_description || transaction.description || transaction.transaction_type?.replace('_', ' ')
                              }
                            </p>
                            {serviceName && (
                              <Badge variant="outline" className="text-xs">
                                {serviceName}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                            {bookingReference && (
                              <span>Booking: {bookingReference}</span>
                            )}
                            {transactionDate && (
                              <span>
                                {new Date(transactionDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {isBusinessPaymentTransaction ? (
                            <>
                              <p className="font-semibold text-green-600">
                                +${amount.toFixed(2)}
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
                            </>
                          ) : (
                            <>
                              <p className={`font-semibold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {amount >= 0 ? '+' : ''}${Math.abs(amount).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500">{currency}</p>
                              {status && (
                                <Badge 
                                  variant={
                                    status === 'completed' ? 'default' :
                                    status === 'pending' ? 'secondary' :
                                    'destructive'
                                  }
                                  className="text-xs mt-1"
                                >
                                  {status}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Tips Tab - Owner Only */}
        {isOwner && (
          <TabsContent value="tips" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="w-5 h-5" />
                      <span>Provider Tips Report</span>
                    </CardTitle>
                    <CardDescription>
                      Tips received by providers who are eligible for bookings
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportTipsToCSV}
                    className="flex items-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export CSV</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {tipsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading tips data...</p>
                  </div>
                ) : tipsData.length > 0 ? (
                  <>
                    {/* Tips Filters */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        {/* Date Range */}
                        <div className="md:col-span-5 space-y-2">
                          <label className="text-xs font-medium text-gray-700">Date Range</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type="date"
                                value={tipFilters.startDate}
                                onChange={(e) => setTipFilters(prev => ({ ...prev, startDate: e.target.value }))}
                                className="text-xs pr-10"
                                placeholder="From"
                              />
                              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                            <div className="relative flex-1">
                              <Input
                                type="date"
                                value={tipFilters.endDate}
                                onChange={(e) => setTipFilters(prev => ({ ...prev, endDate: e.target.value }))}
                                className="text-xs pr-10"
                                placeholder="To"
                              />
                              <Calendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        {/* Provider Filter */}
                        <div className="md:col-span-4 space-y-2">
                          <label className="text-xs font-medium text-gray-700">Provider</label>
                          <Select
                            value={tipFilters.providerId}
                            onValueChange={(value) => setTipFilters(prev => ({ ...prev, providerId: value }))}
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue placeholder="All Providers" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Providers</SelectItem>
                              {providers.map((provider) => (
                                <SelectItem key={provider.id} value={provider.id}>
                                  {provider.first_name} {provider.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Clear Filters */}
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-xs font-medium text-gray-700 opacity-0">Clear</label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTipFilters({
                              startDate: '',
                              endDate: '',
                              providerId: 'all',
                            })}
                            className="text-xs w-full"
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Filtered Tips */}
                    {(() => {
                      // Apply filters to tips
                      let filtered = tipsData.filter((tip: any) => {
                        // Filter by date range
                        if (tipFilters.startDate) {
                          const tipDate = new Date(tip.tip_given_at || tip.created_at);
                          if (tipDate < new Date(tipFilters.startDate)) return false;
                        }
                        if (tipFilters.endDate) {
                          const tipDate = new Date(tip.tip_given_at || tip.created_at);
                          const endDate = new Date(tipFilters.endDate);
                          endDate.setHours(23, 59, 59, 999);
                          if (tipDate > endDate) return false;
                        }

                        // Filter by provider
                        if (tipFilters.providerId !== 'all') {
                          if (tip.provider_id !== tipFilters.providerId) return false;
                        }

                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">No tips match your filters</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your filter criteria</p>
                          </div>
                        );
                      }

                      // Group tips by provider
                      const tipsByProvider = filtered.reduce((acc: any, tip: any) => {
                        const providerId = tip.provider_id;
                        if (!acc[providerId]) {
                          acc[providerId] = {
                            providerId,
                            providerName: tip.provider_first_name && tip.provider_last_name
                              ? `${tip.provider_first_name} ${tip.provider_last_name}`
                              : 'Unknown Provider',
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
                  </>
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

        {/* Bank Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

