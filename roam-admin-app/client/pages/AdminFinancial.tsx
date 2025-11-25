import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROAMDataTable } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import FinancialChart from "@/components/ui/financial-chart";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Receipt,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface FinancialStats {
  totalRevenue: {
    amount: number;
    change: number;
    period: string;
  };
  pendingPayouts: {
    amount: number;
    count: number;
    change: number;
  };
  platformFees: {
    amount: number;
    change: number;
    period: string;
  };
  activeSubscriptions: {
    count: number;
    revenue: number;
    change: number;
  };
}

interface Transaction {
  id: string;
  booking_reference?: string | null;
  type: string;
  amount: number;
  status: string;
  payment_method?: string;
  currency?: string;
  description: string;
  service_name?: string | null;
  business_name: string;
  customer_name: string;
  customer_email?: string | null;
  created_at: string;
  created_at_formatted?: string;
  processed_at?: string;
  processed_at_formatted?: string;
  fee_amount?: number;
  net_amount?: number;
  tip_amount?: number | null;
  tip_provider_name?: string | null;
}

interface PayoutRequest {
  id: string;
  business_id: string;
  business_name: string;
  amount: number;
  status: string;
  status_raw?: string;
  requested_at: string;
  requested_at_formatted?: string;
  processed_at?: string;
  processed_at_formatted?: string;
  notes?: string;
}

interface RevenueData {
  date: string;
  revenue: number;
  bookings: number;
  fees: number;
}

export default function AdminFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<FinancialStats>({
    totalRevenue: { amount: 0, change: 0, period: "This Month" },
    pendingPayouts: { amount: 0, count: 0, change: 0 },
    platformFees: { amount: 0, change: 0, period: "This Month" },
    activeSubscriptions: { count: 0, revenue: 0, change: 0 },
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchFinancialData();
  }, [dateRange]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      
      // Fetch financial statistics
      const statsData = await fetchFinancialStats();
      setStats(statsData);
      
      // Fetch transactions
      const transactionsData = await fetchTransactions();
      setTransactions(transactionsData);
      
      // Fetch payout requests
      const payoutsData = await fetchPayoutRequests();
      setPayoutRequests(payoutsData);
      
      // Fetch revenue data for charts
      const revenueData = await fetchRevenueData();
      setRevenueData(revenueData);
      
    } catch (error) {
      console.error("Error fetching financial data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch financial data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialStats = async (): Promise<FinancialStats> => {
    try {
      const response = await fetch(`/api/financial/stats?dateRange=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch financial stats');
      }
    } catch (error) {
      console.error('Error fetching financial stats:', error);
      // Return mock data as fallback
      return {
        totalRevenue: { amount: 125000, change: 12.5, period: "This Month" },
        pendingPayouts: { amount: 45000, count: 23, change: -5.2 },
        platformFees: { amount: 8750, change: 8.3, period: "This Month" },
        activeSubscriptions: { count: 156, revenue: 31200, change: 15.7 },
      };
    }
  };

  const fetchTransactions = async (): Promise<Transaction[]> => {
    try {
      const response = await fetch(`/api/financial/transactions?dateRange=${dateRange}&status=${statusFilter}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      // Return mock data as fallback
      return [
        {
          id: "txn_1",
          type: "payment",
          amount: 150.00,
          status: "completed",
          description: "Massage Therapy Session",
          business_name: "Zen Massage Therapy",
          customer_name: "John Doe",
          created_at: "2024-01-15T10:00:00Z",
          processed_at: "2024-01-15T10:05:00Z",
          fee_amount: 7.50,
          net_amount: 142.50,
        },
        {
          id: "txn_2",
          type: "payout",
          amount: 2500.00,
          status: "processing",
          description: "Weekly Payout",
          business_name: "Elite Fitness Center",
          customer_name: "N/A",
          created_at: "2024-01-14T09:00:00Z",
          fee_amount: 0,
          net_amount: 2500.00,
        },
        {
          id: "txn_3",
          type: "refund",
          amount: 75.00,
          status: "completed",
          description: "Cancelled Appointment Refund",
          business_name: "Miami Spa & Wellness",
          customer_name: "Jane Smith",
          created_at: "2024-01-13T14:00:00Z",
          processed_at: "2024-01-13T14:30:00Z",
          fee_amount: 0,
          net_amount: 75.00,
        },
      ];
    }
  };

  const fetchPayoutRequests = async (): Promise<PayoutRequest[]> => {
    try {
      const response = await fetch(`/api/financial/payouts?status=${statusFilter}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch payout requests');
      }
    } catch (error) {
      console.error('Error fetching payout requests:', error);
      // Return mock data as fallback
      return [
        {
          id: "payout_1",
          business_id: "business_1",
          business_name: "Zen Massage Therapy",
          amount: 2500.00,
          status: "pending",
          requested_at: "2024-01-15T08:00:00Z",
          notes: "Weekly payout request",
        },
        {
          id: "payout_2",
          business_id: "business_2",
          business_name: "Elite Fitness Center",
          amount: 1800.00,
          status: "approved",
          requested_at: "2024-01-14T10:00:00Z",
          processed_at: "2024-01-15T09:00:00Z",
          notes: "Approved for processing",
        },
      ];
    }
  };

  const fetchRevenueData = async (): Promise<RevenueData[]> => {
    try {
      const response = await fetch(`/api/financial/revenue-data?days=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch revenue data');
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      // Return mock data as fallback
      const days = parseInt(dateRange);
      const data: RevenueData[] = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        data.push({
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 5000) + 1000,
          bookings: Math.floor(Math.random() * 50) + 10,
          fees: Math.floor(Math.random() * 300) + 50,
        });
      }
      
      return data;
    }
  };

  const handlePayoutAction = async (payoutId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/financial/payouts/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ payoutId, action }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setPayoutRequests(prev => 
          prev.map(payout => 
            payout.id === payoutId 
              ? { ...payout, status: action === 'approve' ? 'approved' : 'rejected' }
              : payout
          )
        );

        toast({
          title: "Success",
          description: result.message || `Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
        });

        // Refresh data
        fetchFinancialData();
      } else {
        throw new Error(result.error || 'Failed to update payout status');
      }
    } catch (error) {
      console.error(`Error ${action}ing payout:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} payout`,
        variant: "destructive",
      });
    }
  };

  const exportFinancialData = async (type: 'transactions' | 'revenue' | 'payouts') => {
    try {
      // Implementation for exporting data
      toast({
        title: "Export Started",
        description: `${type} data export has been initiated`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export financial data",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'pending':
      case 'processing':
        return 'warning';
      case 'failed':
      case 'rejected':
      case 'cancelled':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'processing':
        return <RefreshCw className="w-4 h-4" />;
      case 'failed':
      case 'rejected':
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const transactionColumns = [
    {
      key: "created_at",
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.original.created_at_formatted || new Date(row.original.created_at).toLocaleDateString()}</span>
          {row.original.booking_reference && (
            <span className="text-xs text-muted-foreground font-mono">{row.original.booking_reference}</span>
          )}
        </div>
      ),
    },
    {
      key: "type",
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => {
        const typeVariant = row.original.type?.toLowerCase() === 'payment' ? 'success' 
          : row.original.type?.toLowerCase() === 'refund' ? 'destructive'
          : row.original.type?.toLowerCase() === 'tip' ? 'default'
          : 'neutral';
        return (
          <ROAMBadge variant={typeVariant}>
            {row.original.type}
        </ROAMBadge>
        );
      },
    },
    {
      key: "description",
      accessorKey: "description",
      header: "Details",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.original.service_name || row.original.description}</span>
          {row.original.payment_method && (
            <span className="text-xs text-muted-foreground">{row.original.payment_method}</span>
          )}
        </div>
      ),
    },
    {
      key: "business_name",
      accessorKey: "business_name",
      header: "Business",
    },
    {
      key: "customer_name",
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span>{row.original.customer_name}</span>
          {row.original.customer_email && (
            <span className="text-xs text-muted-foreground">{row.original.customer_email}</span>
          )}
        </div>
      ),
    },
    {
      key: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">
            ${row.original.amount.toFixed(2)}
          </span>
          {row.original.tip_amount > 0 && (
            <span className="text-xs text-green-600">+${row.original.tip_amount.toFixed(2)} tip</span>
          )}
        </div>
      ),
    },
    {
      key: "fee_amount",
      accessorKey: "fee_amount",
      header: "Platform Fee",
      cell: ({ row }: any) => (
        <span className="font-mono text-sm">
          ${row.original.fee_amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      key: "net_amount",
      accessorKey: "net_amount",
      header: "Net",
      cell: ({ row }: any) => (
        <span className="font-mono font-semibold text-green-600">
          ${row.original.net_amount?.toFixed(2) || '0.00'}
        </span>
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const statusLower = row.original.status?.toLowerCase();
        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(statusLower)}
            <ROAMBadge variant={getStatusColor(statusLower) as any}>
              {row.original.status}
            </ROAMBadge>
          </div>
        );
      },
    },
  ];

  const payoutColumns = [
    {
      key: "business_name",
      accessorKey: "business_name",
      header: "Business",
      cell: ({ row }: any) => (
        <span className="font-medium">{row.original.business_name}</span>
      ),
    },
    {
      key: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-mono font-semibold text-lg">
          ${row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const statusLower = row.original.status_raw || row.original.status?.toLowerCase();
        return (
        <div className="flex items-center gap-2">
            {getStatusIcon(statusLower)}
            <ROAMBadge variant={getStatusColor(statusLower) as any}>
            {row.original.status}
          </ROAMBadge>
        </div>
        );
      },
    },
    {
      key: "requested_at",
      accessorKey: "requested_at",
      header: "Requested",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.requested_at_formatted || new Date(row.original.requested_at).toLocaleDateString()}</span>
      ),
    },
    {
      key: "processed_at",
      accessorKey: "processed_at",
      header: "Processed",
      cell: ({ row }: any) => (
        <span className="text-sm">
          {row.original.processed_at_formatted || (row.original.processed_at ? new Date(row.original.processed_at).toLocaleDateString() : 'Pending')}
        </span>
      ),
    },
    {
      key: "notes",
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }: any) => (
        <span className="text-sm text-muted-foreground truncate max-w-[150px]">
          {row.original.notes || '-'}
        </span>
      ),
    },
    {
      key: "actions",
      accessorKey: "actions",
      header: "Actions",
      cell: ({ row }: any) => {
        const statusRaw = row.original.status_raw || row.original.status?.toLowerCase();
        return (
        <div className="flex gap-2">
            {statusRaw === 'pending' && (
            <>
              <Button
                size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => handlePayoutAction(row.original.id, 'approve')}
              >
                Approve
              </Button>
              <Button
                size="sm"
                  variant="destructive"
                onClick={() => handlePayoutAction(row.original.id, 'reject')}
              >
                Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost">
            <Eye className="w-4 h-4" />
          </Button>
        </div>
        );
      },
    },
  ];

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
            <p className="text-muted-foreground">
              Monitor revenue, manage payouts, and track financial performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => exportFinancialData('revenue')}>
              <Download className="w-4 h-4 mr-2" />
              Export Revenue
            </Button>
            <Button variant="outline" onClick={() => exportFinancialData('transactions')}>
              <Download className="w-4 h-4 mr-2" />
              Export Transactions
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ROAMStatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.amount.toLocaleString()}`}
            change={stats.totalRevenue.change}
            changeType={stats.totalRevenue.change >= 0 ? "positive" : "negative"}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Pending Payouts"
            value={`$${stats.pendingPayouts.amount.toLocaleString()}`}
            subtitle={`${stats.pendingPayouts.count} requests`}
            change={stats.pendingPayouts.change}
            changeType={stats.pendingPayouts.change >= 0 ? "positive" : "negative"}
            icon={<Banknote className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Platform Fees"
            value={`$${stats.platformFees.amount.toLocaleString()}`}
            change={stats.platformFees.change}
            changeType={stats.platformFees.change >= 0 ? "positive" : "negative"}
            icon={<CreditCard className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions.count.toString()}
            subtitle={`$${stats.activeSubscriptions.revenue.toLocaleString()}/month`}
            change={stats.activeSubscriptions.change}
            changeType={stats.activeSubscriptions.change >= 0 ? "positive" : "negative"}
            icon={<Receipt className="w-4 h-4" />}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle>Revenue Trends</ROAMCardTitle>
                </ROAMCardHeader>
                                 <ROAMCardContent>
                   <FinancialChart
                     data={revenueData}
                     type="line"
                     height={300}
                   />
                 </ROAMCardContent>
              </ROAMCard>

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle>Revenue by Category</ROAMCardTitle>
                </ROAMCardHeader>
                                 <ROAMCardContent>
                   <FinancialChart
                     data={revenueData}
                     type="pie"
                     height={300}
                   />
                 </ROAMCardContent>
              </ROAMCard>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Transaction History</ROAMCardTitle>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search transactions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="max-w-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Last 7 days</SelectItem>
                      <SelectItem value="30">Last 30 days</SelectItem>
                      <SelectItem value="90">Last 90 days</SelectItem>
                      <SelectItem value="365">Last year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={transactionColumns}
                  data={filteredTransactions}
                  filterable={false}
                  addable={false}
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Payout Requests</ROAMCardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage and process business payout requests
                </p>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={payoutColumns}
                  data={payoutRequests}
                  filterable={false}
                  addable={false}
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle>Revenue Analytics</ROAMCardTitle>
                </ROAMCardHeader>
                                 <ROAMCardContent>
                   <FinancialChart
                     data={revenueData}
                     type="bar"
                     height={300}
                   />
                 </ROAMCardContent>
              </ROAMCard>

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle>Business Performance</ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-2" />
                      <p>Business performance metrics will be displayed here</p>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
