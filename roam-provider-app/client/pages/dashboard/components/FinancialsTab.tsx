import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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
  const [selectedView, setSelectedView] = useState("overview");

  // Load financial data
  const loadFinancialData = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      const businessId = business?.id || providerData?.business_id;

      // Load bookings for financial calculations
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          services:service_id(*),
          customer:customer_id(*)
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

  // Export data function
  const onExportData = (type: string, dateRange: string) => {
    // Placeholder implementation
    toast({
      title: "Export Feature",
      description: `${type} export for ${dateRange} coming soon`,
    });
  };

  useEffect(() => {
    loadFinancialData();
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
  if (loading) {
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financials</h1>
          <p className="text-sm text-gray-600">Track your business performance and revenue</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
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
          <Button variant="outline" onClick={() => onExportData('revenue', selectedPeriod)}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900">
                ${financialMetrics.totalRevenue.toFixed(2)}
              </p>
              <div className="flex items-center mt-2">
                {financialMetrics.revenueChange >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm ${financialMetrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(financialMetrics.revenueChange).toFixed(1)}%
                </span>
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

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
                <span className="text-sm text-gray-500 ml-1">vs previous period</span>
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
              <p className="text-sm text-gray-500 mt-2">
                {financialMetrics.completedCount} completed orders
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
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
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="w-5 h-5" />
              <span>Top Services by Revenue</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getRevenueByService().map((service, index) => (
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
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Monthly Revenue Trend</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getRevenueByMonth().map((month) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Receipt className="w-5 h-5" />
            <span>Recent Transactions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {financialMetrics.completedBookings.slice(0, 10).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {booking.customer_profiles?.first_name && booking.customer_profiles?.last_name
                        ? `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`
                        : booking.guest_name || "Guest"}
                    </p>
                    <p className="text-xs text-gray-600">
                      {booking.services?.name || "Service"} • {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${booking.total_amount || 0}</p>
                  <Badge className="bg-green-100 text-green-800 border-green-300 text-xs">
                    Completed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
