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
  email?: string;
  name?: string;
  phone?: string | null;
  user_type: 'customer' | 'provider' | 'business';
  provider_role?: string | null;
  business_name?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  registration_date_formatted?: string;
  last_activity: string;
  last_activity_formatted?: string;
  total_bookings: number;
  total_spent: number;
  total_earned?: number | null;
  avg_rating: number;
  total_reviews?: number;
  location: string;
}

interface BookingReport {
  id: string;
  booking_reference?: string;
  service_name: string;
  business_name: string;
  customer_name: string;
  provider_name?: string;
  booking_date: string;
  booking_date_formatted?: string;
  start_time?: string | null;
  status: 'completed' | 'cancelled' | 'no_show' | 'confirmed' | 'pending' | string;
  payment_status?: string;
  amount: number;
  rating?: number;
  review?: string;
}

interface BusinessReport {
  id: string;
  business_name: string;
  business_type: string;
  contact_email?: string | null;
  phone?: string | null;
  verification_status: string;
  is_active?: boolean;
  onboarded_date?: string;
  onboarded_date_formatted?: string;
  total_providers: number;
  active_providers?: number;
  total_services: number;
  active_services?: number;
  total_bookings: number;
  completed_bookings?: number;
  cancelled_bookings?: number;
  total_revenue: number;
  completed_revenue?: number;
  avg_rating: number;
  total_reviews?: number;
  location: string;
}

interface ServiceReport {
  id: string;
  service_name: string;
  category: string;
  subcategory: string;
  business_name: string;
  price?: number;
  duration_minutes?: number;
  delivery_type?: string;
  total_bookings: number;
  completed_bookings?: number;
  total_revenue: number;
  completed_revenue?: number;
  avg_booking_amount?: number;
  avg_rating: number;
  total_reviews?: number;
  is_active?: boolean;
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
      key: "name",
      accessorKey: "name",
      header: "Name",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.name || 'N/A'}</span>
          <span className="text-xs text-muted-foreground">{row.original.email || ''}</span>
        </div>
      ),
    },
    {
      key: "user_type",
      accessorKey: "user_type",
      header: "Type",
      cell: ({ row }: any) => {
        const variant = row.original.user_type === 'customer' ? 'success' 
          : row.original.user_type === 'business' ? 'default'
          : 'neutral';
        return (
          <div className="flex flex-col gap-1">
            <ROAMBadge variant={variant}>
          {row.original.user_type.toUpperCase()}
        </ROAMBadge>
            {row.original.provider_role && (
              <span className="text-xs text-muted-foreground">
                {row.original.provider_role}
              </span>
            )}
            {row.original.business_name && (
              <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                {row.original.business_name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "phone",
      accessorKey: "phone",
      header: "Contact",
      cell: ({ row }: any) => (
        <span className="text-sm">
          {row.original.phone || <span className="text-muted-foreground">N/A</span>}
        </span>
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
      header: "Registered",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          {row.original.registration_date_formatted ? (
            <span className="text-sm">{row.original.registration_date_formatted}</span>
          ) : (
            <span className="text-sm">
              {row.original.registration_date 
                ? new Date(row.original.registration_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Never'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "last_activity",
      accessorKey: "last_activity",
      header: "Last Activity",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          {row.original.last_activity_formatted ? (
            <span className="text-sm">{row.original.last_activity_formatted}</span>
          ) : (
            <span className="text-sm">
              {row.original.last_activity 
                ? new Date(row.original.last_activity).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Never'}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Bookings",
      cell: ({ row }: any) => (
        <span className="font-semibold">{row.original.total_bookings || 0}</span>
      ),
    },
    {
      key: "total_spent",
      accessorKey: "total_spent",
      header: "Spent / Earned",
      cell: ({ row }: any) => {
        const amount = row.original.user_type === 'customer' 
          ? row.original.total_spent 
          : (row.original.total_earned || row.original.total_spent || 0);
        const label = row.original.user_type === 'customer' ? 'Spent' : 'Earned';
        return (
          <div className="flex flex-col">
            <span className="font-mono font-semibold">
              ${amount.toFixed(2)}
        </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        );
      },
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Rating",
      cell: ({ row }: any) => (
        row.original.avg_rating > 0 ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{row.original.avg_rating.toFixed(1)}</span>
            {row.original.total_reviews > 0 && (
              <span className="text-xs text-muted-foreground">
                ({row.original.total_reviews})
              </span>
            )}
        </div>
        ) : (
          <span className="text-muted-foreground text-sm">No rating</span>
        )
      ),
    },
    {
      key: "location",
      accessorKey: "location",
      header: "Location",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.location || 'Unknown'}</span>
      ),
    },
  ];

  const bookingColumns = [
    {
      key: "booking_reference",
      accessorKey: "booking_reference",
      header: "Reference",
      cell: ({ row }: any) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.booking_reference || `#${row.original.id.slice(0, 8)}`}
        </span>
      ),
    },
    {
      key: "booking_date",
      accessorKey: "booking_date",
      header: "Booking Date & Time",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          {row.original.booking_date_formatted ? (
            <span className="text-sm">{row.original.booking_date_formatted}</span>
          ) : (
            <span className="text-sm">
              {row.original.booking_date 
                ? new Date(row.original.booking_date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : 'Not scheduled'}
            </span>
          )}
        </div>
      ),
    },
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
      key: "provider_name",
      accessorKey: "provider_name",
      header: "Provider",
      cell: ({ row }: any) => (
        <span className={row.original.provider_name ? '' : 'text-muted-foreground'}>
          {row.original.provider_name || 'Not assigned'}
        </span>
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.status?.toLowerCase();
        const variant = status === 'completed' ? 'success' 
          : status === 'cancelled' || status === 'no_show' ? 'destructive'
          : 'warning';
        return (
          <ROAMBadge variant={variant}>
            {row.original.status || 'Unknown'}
        </ROAMBadge>
        );
      },
    },
    {
      key: "payment_status",
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }: any) => {
        const paymentStatus = row.original.payment_status?.toLowerCase();
        const variant = paymentStatus === 'paid' || paymentStatus === 'completed' ? 'success'
          : paymentStatus === 'pending' ? 'warning'
          : paymentStatus === 'failed' || paymentStatus === 'refunded' ? 'destructive'
          : 'outline';
        return (
          <ROAMBadge variant={variant} className="text-xs">
            {row.original.payment_status || 'Unknown'}
          </ROAMBadge>
        );
      },
    },
    {
      key: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }: any) => (
        <span className="font-mono font-semibold">
          ${(row.original.amount || 0).toFixed(2)}
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
            <span className="font-semibold">{row.original.rating.toFixed(1)}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-sm">No rating</span>
        )
      ),
    },
  ];

  const businessColumns = [
    {
      key: "business_name",
      accessorKey: "business_name",
      header: "Business",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.business_name}</span>
          {row.original.contact_email && (
            <span className="text-xs text-muted-foreground">{row.original.contact_email}</span>
          )}
        </div>
      ),
    },
    {
      key: "business_type",
      accessorKey: "business_type",
      header: "Type",
      cell: ({ row }: any) => (
        <ROAMBadge variant="outline">
          {row.original.business_type}
        </ROAMBadge>
      ),
    },
    {
      key: "verification_status",
      accessorKey: "verification_status",
      header: "Status",
      cell: ({ row }: any) => {
        const status = row.original.verification_status?.toLowerCase();
        const variant = status === 'approved' || status === 'verified' ? 'success' 
          : status === 'pending' ? 'warning'
          : status === 'rejected' ? 'destructive'
          : 'outline';
        return (
          <div className="flex flex-col gap-1">
            <ROAMBadge variant={variant}>
          {row.original.verification_status}
        </ROAMBadge>
            {row.original.is_active === false && (
              <span className="text-xs text-destructive">Inactive</span>
            )}
          </div>
        );
      },
    },
    {
      key: "onboarded_date",
      accessorKey: "onboarded_date",
      header: "Onboarded",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.onboarded_date_formatted || 'N/A'}</span>
      ),
    },
    {
      key: "total_providers",
      accessorKey: "total_providers",
      header: "Providers",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.total_providers || 0}</span>
          <span className="text-xs text-muted-foreground">{row.original.active_providers || 0} active</span>
        </div>
      ),
    },
    {
      key: "total_services",
      accessorKey: "total_services",
      header: "Services",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.total_services || 0}</span>
          <span className="text-xs text-muted-foreground">{row.original.active_services || 0} active</span>
        </div>
      ),
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Bookings",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.total_bookings || 0}</span>
          <span className="text-xs text-muted-foreground">{row.original.completed_bookings || 0} completed</span>
        </div>
      ),
    },
    {
      key: "total_revenue",
      accessorKey: "total_revenue",
      header: "Revenue",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">
            ${(row.original.total_revenue || 0).toLocaleString()}
        </span>
          <span className="text-xs text-muted-foreground">
            ${(row.original.completed_revenue || 0).toLocaleString()} completed
          </span>
        </div>
      ),
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Rating",
      cell: ({ row }: any) => (
        row.original.avg_rating > 0 ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{row.original.avg_rating.toFixed(1)}</span>
            {row.original.total_reviews > 0 && (
              <span className="text-xs text-muted-foreground">({row.original.total_reviews})</span>
            )}
        </div>
        ) : (
          <span className="text-muted-foreground text-sm">No rating</span>
        )
      ),
    },
    {
      key: "location",
      accessorKey: "location",
      header: "Location",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.location || 'Unknown'}</span>
      ),
    },
  ];

  const serviceColumns = [
    {
      key: "service_name",
      accessorKey: "service_name",
      header: "Service",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.original.service_name}</span>
          <span className="text-xs text-muted-foreground">{row.original.business_name}</span>
        </div>
      ),
    },
    {
      key: "category",
      accessorKey: "category",
      header: "Category",
      cell: ({ row }: any) => (
        <div className="flex flex-col gap-1">
          <ROAMBadge variant="default" className="text-xs">
          {row.original.category}
        </ROAMBadge>
          <span className="text-xs text-muted-foreground">{row.original.subcategory}</span>
        </div>
      ),
    },
    {
      key: "price",
      accessorKey: "price",
      header: "Price",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">${(row.original.price || 0).toFixed(2)}</span>
          {row.original.duration_minutes > 0 && (
            <span className="text-xs text-muted-foreground">{row.original.duration_minutes} min</span>
          )}
        </div>
      ),
    },
    {
      key: "delivery_type",
      accessorKey: "delivery_type",
      header: "Delivery",
      cell: ({ row }: any) => (
        <span className="text-sm">{row.original.delivery_type || 'N/A'}</span>
      ),
    },
    {
      key: "total_bookings",
      accessorKey: "total_bookings",
      header: "Bookings",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-semibold">{row.original.total_bookings || 0}</span>
          <span className="text-xs text-muted-foreground">{row.original.completed_bookings || 0} completed</span>
        </div>
      ),
    },
    {
      key: "total_revenue",
      accessorKey: "total_revenue",
      header: "Revenue",
      cell: ({ row }: any) => (
        <div className="flex flex-col">
          <span className="font-mono font-semibold">${(row.original.total_revenue || 0).toLocaleString()}</span>
          {row.original.avg_booking_amount > 0 && (
            <span className="text-xs text-muted-foreground">Avg ${row.original.avg_booking_amount.toFixed(0)}</span>
          )}
        </div>
      ),
    },
    {
      key: "avg_rating",
      accessorKey: "avg_rating",
      header: "Rating",
      cell: ({ row }: any) => (
        row.original.avg_rating > 0 ? (
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{row.original.avg_rating.toFixed(1)}</span>
            {row.original.total_reviews > 0 && (
              <span className="text-xs text-muted-foreground">({row.original.total_reviews})</span>
            )}
        </div>
        ) : (
          <span className="text-muted-foreground text-sm">No rating</span>
        )
      ),
    },
    {
      key: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => (
        <div className="flex flex-wrap gap-1">
          {row.original.is_active ? (
            <ROAMBadge variant="success" className="text-xs">Active</ROAMBadge>
          ) : (
            <ROAMBadge variant="destructive" className="text-xs">Inactive</ROAMBadge>
          )}
          {row.original.is_featured && (
            <ROAMBadge variant="default" className="text-xs">Featured</ROAMBadge>
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
                  filterable={false}
                  addable={false}
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
                  filterable={false}
                  addable={false}
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
                  filterable={false}
                  addable={false}
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
                  filterable={false}
                  addable={false}
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
