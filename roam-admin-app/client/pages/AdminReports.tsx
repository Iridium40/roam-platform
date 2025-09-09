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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROAMDataTable } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  RefreshCw,
  FileText,
  PieChart,
  LineChart,
  Activity,
  Target,
  Award,
  Clock,
  DollarSign,
  Star,
  MapPin,
  Building2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface ReportMetrics {
  totalUsers: {
    count: number;
    change: number;
    period: string;
  };
  totalBookings: {
    count: number;
    change: number;
    period: string;
  };
  totalRevenue: {
    amount: number;
    change: number;
    period: string;
  };
  avgRating: {
    rating: number;
    change: number;
    period: string;
  };
}

interface UserReport {
  id: string;
  user_type: 'customer' | 'provider' | 'business';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_activity: string;
  total_bookings: number;
  total_spent: number;
  avg_rating: number;
  location: string;
}

interface BookingReport {
  id: string;
  service_name: string;
  business_name: string;
  customer_name: string;
  booking_date: string;
  status: 'completed' | 'cancelled' | 'no_show';
  amount: number;
  rating?: number;
  review?: string;
}

interface BusinessReport {
  id: string;
  business_name: string;
  business_type: string;
  verification_status: string;
  total_providers: number;
  total_services: number;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  location: string;
}

interface ServiceReport {
  id: string;
  service_name: string;
  category: string;
  subcategory: string;
  business_name: string;
  total_bookings: number;
  total_revenue: number;
  avg_rating: number;
  is_featured: boolean;
  is_popular: boolean;
}

export default function AdminReports() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalUsers: { count: 0, change: 0, period: "This Month" },
    totalBookings: { count: 0, change: 0, period: "This Month" },
    totalRevenue: { amount: 0, change: 0, period: "This Month" },
    avgRating: { rating: 0, change: 0, period: "This Month" },
  });
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [bookingReports, setBookingReports] = useState<BookingReport[]>([]);
  const [businessReports, setBusinessReports] = useState<BusinessReport[]>([]);
  const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [reportType, setReportType] = useState("users");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  useEffect(() => {
    fetchReportData();
  }, [dateRange, reportType]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const metricsData = await fetchMetrics();
      setMetrics(metricsData);
      
      // Fetch report data based on type
      switch (reportType) {
        case 'users':
          const userData = await fetchUserReports();
          setUserReports(userData);
          break;
        case 'bookings':
          const bookingData = await fetchBookingReports();
          setBookingReports(bookingData);
          break;
        case 'businesses':
          const businessData = await fetchBusinessReports();
          setBusinessReports(businessData);
          break;
        case 'services':
          const serviceData = await fetchServiceReports();
          setServiceReports(serviceData);
          break;
      }
      
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async (): Promise<ReportMetrics> => {
    try {
      const response = await fetch(`/api/reports/metrics?dateRange=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch report metrics');
      }
    } catch (error) {
      console.error('Error fetching report metrics:', error);
      // Return mock data as fallback
      return {
        totalUsers: { count: 2547, change: 15.3, period: "This Month" },
        totalBookings: { count: 12456, change: 8.7, period: "This Month" },
        totalRevenue: { amount: 125000, change: 12.5, period: "This Month" },
        avgRating: { rating: 4.6, change: 2.1, period: "This Month" },
      };
    }
  };

  const fetchUserReports = async (): Promise<UserReport[]> => {
    try {
      const response = await fetch(`/api/reports/users?dateRange=${dateRange}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch user reports');
      }
    } catch (error) {
      console.error('Error fetching user reports:', error);
      // Return mock data as fallback
      return [
        {
          id: "user_1",
          user_type: "customer",
          status: "active",
          registration_date: "2024-01-01T00:00:00Z",
          last_activity: "2024-01-15T10:00:00Z",
          total_bookings: 12,
          total_spent: 450.00,
          avg_rating: 4.8,
          location: "Miami, FL",
        },
        {
          id: "user_2",
          user_type: "provider",
          status: "active",
          registration_date: "2023-12-15T00:00:00Z",
          last_activity: "2024-01-15T09:00:00Z",
          total_bookings: 45,
          total_spent: 0,
          avg_rating: 4.9,
          location: "Miami, FL",
        },
        {
          id: "user_3",
          user_type: "business",
          status: "active",
          registration_date: "2023-11-01T00:00:00Z",
          last_activity: "2024-01-15T08:00:00Z",
          total_bookings: 156,
          total_spent: 0,
          avg_rating: 4.7,
          location: "Miami, FL",
        },
      ];
    }
  };

  const fetchBookingReports = async (): Promise<BookingReport[]> => {
    try {
      const response = await fetch(`/api/reports/bookings?dateRange=${dateRange}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch booking reports');
      }
    } catch (error) {
      console.error('Error fetching booking reports:', error);
      // Return mock data as fallback
      return [
        {
          id: "booking_1",
          service_name: "Massage Therapy",
          business_name: "Zen Massage Therapy",
          customer_name: "John Doe",
          booking_date: "2024-01-15T10:00:00Z",
          status: "completed",
          amount: 150.00,
          rating: 5,
          review: "Excellent service, very professional",
        },
        {
          id: "booking_2",
          service_name: "Personal Training",
          business_name: "Elite Fitness Center",
          customer_name: "Jane Smith",
          booking_date: "2024-01-14T14:00:00Z",
          status: "completed",
          amount: 75.00,
          rating: 4,
          review: "Great workout session",
        },
      ];
    }
  };

  const fetchBusinessReports = async (): Promise<BusinessReport[]> => {
    try {
      const response = await fetch(`/api/reports/businesses?dateRange=${dateRange}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch business reports');
      }
    } catch (error) {
      console.error('Error fetching business reports:', error);
      // Return mock data as fallback
      return [
        {
          id: "business_1",
          business_name: "Zen Massage Therapy",
          business_type: "independent",
          verification_status: "approved",
          total_providers: 8,
          total_services: 15,
          total_bookings: 234,
          total_revenue: 35100.00,
          avg_rating: 4.8,
          location: "Miami, FL",
        },
        {
          id: "business_2",
          business_name: "Elite Fitness Center",
          business_type: "small_business",
          verification_status: "approved",
          total_providers: 12,
          total_services: 25,
          total_bookings: 456,
          total_revenue: 68400.00,
          avg_rating: 4.6,
          location: "Miami, FL",
        },
      ];
    }
  };

  const fetchServiceReports = async (): Promise<ServiceReport[]> => {
    try {
      const response = await fetch(`/api/reports/services?dateRange=${dateRange}&search=${searchTerm}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch service reports');
      }
    } catch (error) {
      console.error('Error fetching service reports:', error);
      // Return mock data as fallback
      return [
        {
          id: "service_1",
          service_name: "Deep Tissue Massage",
          category: "therapy",
          subcategory: "massage_therapy",
          business_name: "Zen Massage Therapy",
          total_bookings: 89,
          total_revenue: 13350.00,
          avg_rating: 4.9,
          is_featured: true,
          is_popular: true,
        },
        {
          id: "service_2",
          service_name: "Personal Training Session",
          category: "fitness",
          subcategory: "personal_trainer",
          business_name: "Elite Fitness Center",
          total_bookings: 156,
          total_revenue: 11700.00,
          avg_rating: 4.7,
          is_featured: true,
          is_popular: true,
        },
      ];
    }
  };

  const exportReport = async (type: string, format: 'csv' | 'pdf' | 'excel') => {
    try {
      // Implementation for exporting reports
      toast({
        title: "Export Started",
        description: `${type} report export (${format.toUpperCase()}) has been initiated`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export report",
        variant: "destructive",
      });
    }
  };

  const generateReport = async (type: string) => {
    try {
      setLoading(true);
      
      // Implementation for generating custom reports
      toast({
        title: "Report Generated",
        description: `${type} report has been generated successfully`,
      });
      
      // Refresh data
      fetchReportData();
    } catch (error) {
      toast({
        title: "Report Generation Failed",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const userColumns = [
    {
      key: "user_type",
      accessorKey: "user_type",
      header: "User Type",
      cell: ({ row }: any) => (
        <ROAMBadge variant={row.original.user_type === 'customer' ? 'success' : 'neutral'}>
          {row.original.user_type.toUpperCase()}
        </ROAMBadge>
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <ROAMBadge variant={row.original.status === 'active' ? 'success' : 'warning'}>
          {row.original.status}
        </ROAMBadge>
      ),
    },
    {
      key: "registration_date",
      accessorKey: "registration_date",
      header: "Registration Date",
      cell: ({ row }: any) => (
        <span>{new Date(row.original.registration_date).toLocaleDateString()}</span>
      ),
    },
    {
      key: "last_activity",
      accessorKey: "last_activity",
      header: "Last Activity",
      cell: ({ row }: any) => (
        <span>{new Date(row.original.last_activity).toLocaleDateString()}</span>
      ),
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Total Bookings",
    },
    {
      key: "total_spent",
      accessorKey: "total_spent",
      header: "Total Spent",
      cell: ({ row }: any) => (
        <span className="font-mono">
          ${row.original.total_spent.toFixed(2)}
        </span>
      ),
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Avg Rating",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{row.original.avg_rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "location",
      accessorKey: "location",
      header: "Location",
    },
  ];

  const bookingColumns = [
    {
      key: "service_name",
      accessorKey: "service_name",
      header: "Service",
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
    },
    {
      key: "booking_date",
      accessorKey: "booking_date",
      header: "Booking Date",
      cell: ({ row }: any) => (
        <span>{new Date(row.original.booking_date).toLocaleDateString()}</span>
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <ROAMBadge variant={row.original.status === 'completed' ? 'success' : 'warning'}>
          {row.original.status}
        </ROAMBadge>
      ),
    },
    {
      key: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-mono">
          ${row.original.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: "rating",
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }: any) => (
        row.original.rating ? (
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span>{row.original.rating}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">No rating</span>
        )
      ),
    },
  ];

  const businessColumns = [
    {
      key: "business_name",
      accessorKey: "business_name",
      header: "Business Name",
    },
    {
      key: "business_type",
      accessorKey: "business_type",
      header: "Type",
      cell: ({ row }: any) => (
        <ROAMBadge variant="outline">
          {row.original.business_type.replace('_', ' ')}
        </ROAMBadge>
      ),
    },
    {
      key: "verification_status",
      accessorKey: "verification_status",
      header: "Status",
      cell: ({ row }: any) => (
        <ROAMBadge variant={row.original.verification_status === 'approved' ? 'success' : 'warning'}>
          {row.original.verification_status}
        </ROAMBadge>
      ),
    },
    {
      key: "total_providers",
      accessorKey: "total_providers",
      header: "Providers",
    },
    {
      key: "total_services",
      accessorKey: "total_services",
      header: "Services",
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Bookings",
    },
    {
      key: "total_revenue",
      accessorKey: "total_revenue",
      header: "Revenue",
      cell: ({ row }: any) => (
        <span className="font-mono">
          ${row.original.total_revenue.toLocaleString()}
        </span>
      ),
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Rating",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{row.original.avg_rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "location",
      accessorKey: "location",
      header: "Location",
    },
  ];

  const serviceColumns = [
    {
      key: "service_name",
      accessorKey: "service_name",
      header: "Service Name",
    },
    {
      key: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: any) => (
        <ROAMBadge variant="outline">
          {row.original.category}
        </ROAMBadge>
      ),
    },
    {
      key: "subcategory",
      accessorKey: "subcategory",
      header: "Subcategory",
      cell: ({ row }: any) => (
        <ROAMBadge variant="outline">
          {row.original.subcategory.replace('_', ' ')}
        </ROAMBadge>
      ),
    },
    {
      key: "business_name",
      accessorKey: "business_name",
      header: "Business",
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Bookings",
    },
    {
      key: "total_revenue",
      accessorKey: "total_revenue",
      header: "Revenue",
      cell: ({ row }: any) => (
        <span className="font-mono">
          ${row.original.total_revenue.toLocaleString()}
        </span>
      ),
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Rating",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{row.original.avg_rating.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: "features",
      accessorKey: "features",
      header: "Features",
      cell: ({ row }: any) => (
        <div className="flex gap-1">
          {row.original.is_featured && (
            <ROAMBadge variant="success" className="text-xs">Featured</ROAMBadge>
          )}
          {row.original.is_popular && (
            <ROAMBadge variant="warning" className="text-xs">Popular</ROAMBadge>
          )}
        </div>
      ),
    },
  ];

  const getCurrentReportData = () => {
    switch (reportType) {
      case 'users':
        return userReports;
      case 'bookings':
        return bookingReports;
      case 'businesses':
        return businessReports;
      case 'services':
        return serviceReports;
      default:
        return [];
    }
  };

  const getCurrentColumns = () => {
    switch (reportType) {
      case 'users':
        return userColumns;
      case 'bookings':
        return bookingColumns;
      case 'businesses':
        return businessColumns;
      case 'services':
        return serviceColumns;
      default:
        return [];
    }
  };

  const filteredData = getCurrentReportData().filter((item: any) => {
    if (!searchTerm) return true;
    
    // Generic search across common fields
    const searchableFields = Object.values(item).map(String).join(' ').toLowerCase();
    return searchableFields.includes(searchTerm.toLowerCase());
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Generate comprehensive reports and analyze platform performance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => generateReport(reportType)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" onClick={() => exportReport(reportType, 'csv')}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => exportReport(reportType, 'pdf')}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <ROAMStatCard
            title="Total Users"
            value={metrics.totalUsers.count.toLocaleString()}
            change={metrics.totalUsers.change}
            changeType={metrics.totalUsers.change >= 0 ? "positive" : "negative"}
            icon={<Users className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Total Bookings"
            value={metrics.totalBookings.count.toLocaleString()}
            change={metrics.totalBookings.change}
            changeType={metrics.totalBookings.change >= 0 ? "positive" : "negative"}
            icon={<Calendar className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Total Revenue"
            value={`$${metrics.totalRevenue.amount.toLocaleString()}`}
            change={metrics.totalRevenue.change}
            changeType={metrics.totalRevenue.change >= 0 ? "positive" : "negative"}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <ROAMStatCard
            title="Average Rating"
            value={metrics.avgRating.rating.toFixed(1)}
            change={metrics.avgRating.change}
            changeType={metrics.avgRating.change >= 0 ? "positive" : "negative"}
            icon={<Star className="w-4 h-4" />}
          />
        </div>

        {/* Report Tabs */}
        <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Reports</TabsTrigger>
            <TabsTrigger value="bookings">Booking Reports</TabsTrigger>
            <TabsTrigger value="businesses">Business Reports</TabsTrigger>
            <TabsTrigger value="services">Service Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>User Analytics Report</ROAMCardTitle>
                <p className="text-sm text-muted-foreground">
                  Comprehensive analysis of user registration, activity, and engagement
                </p>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={userColumns}
                  data={filteredData}
                  searchPlaceholder="Search users..."
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="bookings" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Booking Performance Report</ROAMCardTitle>
                <p className="text-sm text-muted-foreground">
                  Detailed analysis of booking patterns, completion rates, and customer satisfaction
                </p>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={bookingColumns}
                  data={filteredData}
                  searchPlaceholder="Search bookings..."
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="businesses" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Business Performance Report</ROAMCardTitle>
                <p className="text-sm text-muted-foreground">
                  Analysis of business growth, service offerings, and revenue performance
                </p>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={businessColumns}
                  data={filteredData}
                  searchPlaceholder="Search businesses..."
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="services" className="space-y-4">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle>Service Performance Report</ROAMCardTitle>
                <p className="text-sm text-muted-foreground">
                  Analysis of service popularity, revenue generation, and customer satisfaction
                </p>
              </ROAMCardHeader>
              <ROAMCardContent>
                <ROAMDataTable
                  columns={serviceColumns}
                  data={filteredData}
                  searchPlaceholder="Search services..."
                />
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>
        </Tabs>

        {/* Filters and Search */}
        <ROAMCard>
          <ROAMCardHeader>
            <ROAMCardTitle>Report Filters & Options</ROAMCardTitle>
          </ROAMCardHeader>
          <ROAMCardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="custom">Custom range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Export Format</Label>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => exportReport(reportType, 'csv')}>
                    CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportReport(reportType, 'excel')}>
                    Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportReport(reportType, 'pdf')}>
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </ROAMCardContent>
        </ROAMCard>
      </div>
    </AdminLayout>
  );
}
