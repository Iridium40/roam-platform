import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Building2,
  UserCheck,
  Clock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle,
  User,
  Star,
  RefreshCw,
  Download,
  Plus,
  Users,
  PhoneCall,
  BarChart3,
  Heart,
  Megaphone,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface TopService {
  id: string;
  name: string;
  booking_count: number;
  service_subcategory_type?: string;
}

interface DashboardStats {
  todayBookings: {
    total: number;
    completed: number;
    pending: number;
  };
  todayRevenue: {
    total: number;
    change: number;
  };
  weeklyRevenue: {
    total: number;
    change: number;
  };
  promotionUsage: {
    totalActive: number;
    usedThisWeek: number;
    totalUsage: number;
  };
  topServices: TopService[];
  totalStats: {
    totalBookings: number;
    totalRevenue: number;
    completionRate: number;
    avgRating: number;
  };
  newCustomersThisMonth: number;
  activeBusinesses: number;
  pendingVerification: number;
  newContactSubmissions: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  time: string;
  icon: React.ReactNode;
  iconBg: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todayBookings: { total: 0, completed: 0, pending: 0 },
    todayRevenue: { total: 0, change: 0 },
    weeklyRevenue: { total: 0, change: 0 },
    promotionUsage: { totalActive: 0, usedThisWeek: 0, totalUsage: 0 },
    topServices: [],
    totalStats: {
      totalBookings: 0,
      totalRevenue: 0,
      completionRate: 0,
      avgRating: 0,
    },
    newCustomersThisMonth: 0,
    activeBusinesses: 0,
    pendingVerification: 0,
    newContactSubmissions: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Fetch dashboard statistics using optimized RPC function
  const fetchDashboardStats = async () => {
    try {
      // Use the optimized RPC function that batches all queries into one database call
      const { data, error } = await supabase.rpc('get_admin_dashboard_stats');

      if (error) {
        console.error("Error calling get_admin_dashboard_stats RPC:", error);
        // Fall back to basic stats if RPC fails (e.g., function not deployed yet)
        await fetchDashboardStatsFallback();
        return;
      }

      if (data) {
        setStats({
          todayBookings: {
            total: data.todayBookings?.total || 0,
            completed: data.todayBookings?.completed || 0,
            pending: data.todayBookings?.pending || 0,
          },
          todayRevenue: { 
            total: data.todayRevenue?.total || 0, 
            change: data.todayRevenue?.change || 0 
          },
          weeklyRevenue: { 
            total: data.weeklyRevenue?.total || 0, 
            change: data.weeklyRevenue?.change || 0 
          },
          promotionUsage: {
            totalActive: data.promotionUsage?.totalActive || 0,
            usedThisWeek: data.promotionUsage?.usedThisWeek || 0,
            totalUsage: data.promotionUsage?.totalUsage || 0,
          },
          topServices: (data.topServices || []).map((service: { id: string; name: string; booking_count: number; service_subcategory_type?: string }) => ({
            id: service.id,
            name: service.name,
            booking_count: service.booking_count || 0,
            service_subcategory_type: service.service_subcategory_type,
          })),
          totalStats: {
            totalBookings: data.totalStats?.totalBookings || 0,
            totalRevenue: data.totalStats?.totalRevenue || 0,
            completionRate: data.totalStats?.completionRate || 0,
            avgRating: data.totalStats?.avgRating || 0,
          },
          newCustomersThisMonth: data.newCustomersThisMonth || 0,
          activeBusinesses: data.activeBusinesses || 0,
          pendingVerification: data.pendingVerification || 0,
          newContactSubmissions: data.newContactSubmissions || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      // Fall back to basic stats on any error
      await fetchDashboardStatsFallback();
    }
  };

  // Fallback function using individual queries (in case RPC not deployed)
  const fetchDashboardStatsFallback = async () => {
    try {
      // Fetch basic stats in parallel for better performance
      const [
        todayBookingsResult,
        activeBusinessesResult,
        pendingVerificationResult,
        newContactSubmissionsResult,
      ] = await Promise.all([
        supabase
          .from("bookings")
          .select("booking_status, total_amount")
          .gte("booking_date", new Date().toISOString().split("T")[0]),
        supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
          .eq("verification_status", "pending"),
        supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true })
          .eq("status", "received"),
      ]);

      const todayBookingsData = todayBookingsResult.data || [];
      const todayTotal = todayBookingsData.length;
      const todayCompleted = todayBookingsData.filter((b) => b.booking_status === "completed").length;
      const todayPending = todayBookingsData.filter((b) => b.booking_status === "pending").length;
      const todayRevenue = todayBookingsData.reduce((sum, b) => sum + (b.total_amount || 0), 0);

      setStats({
        todayBookings: { total: todayTotal, completed: todayCompleted, pending: todayPending },
        todayRevenue: { total: todayRevenue, change: 0 },
        weeklyRevenue: { total: 0, change: 0 },
        promotionUsage: { totalActive: 0, usedThisWeek: 0, totalUsage: 0 },
        topServices: [],
        totalStats: { totalBookings: 0, totalRevenue: 0, completionRate: 0, avgRating: 0 },
        newCustomersThisMonth: 0,
        activeBusinesses: activeBusinessesResult.count || 0,
        pendingVerification: pendingVerificationResult.count || 0,
        newContactSubmissions: newContactSubmissionsResult.count || 0,
      });
    } catch (error) {
      console.error("Error in fallback stats fetch:", error);
    }
  };

  // Fetch recent activities
  const fetchRecentActivities = async () => {
    try {
      const activities: RecentActivity[] = [];

      // Recent businesses
      const { data: businessesData } = await supabase
        .from("business_profiles")
        .select("business_name, created_at")
        .order("created_at", { ascending: false })
        .limit(2);

      businessesData?.forEach((business) => {
        activities.push({
          id: `business-${business.business_name}`,
          type: "business_verified",
          title: "New Business Registered",
          subtitle: `${business.business_name} has been added`,
          time: formatTimeAgo(business.created_at),
          icon: <CheckCircle className="w-4 h-4" />,
          iconBg: "bg-roam-success",
        });
      });

      // Recent bookings
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("booking_status, created_at")
        .order("created_at", { ascending: false })
        .limit(3);

      bookingsData?.forEach((booking) => {
        activities.push({
          id: `booking-${booking.created_at}`,
          type: "new_booking",
          title: "New Booking",
          subtitle: `Booking ${booking.booking_status}`,
          time: formatTimeAgo(booking.created_at),
          icon: <Calendar className="w-4 h-4" />,
          iconBg: "bg-roam-blue",
        });
      });

      setRecentActivities(activities.slice(0, 3));
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }
  };

  // Helper function to format time ago
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Refresh data
  const refreshData = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardStats(), fetchRecentActivities()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-[991px]:flex max-[640px]:hidden">
          <ROAMStatCard
            title="Today's Bookings"
            value={loading ? "..." : stats.todayBookings.total.toString()}
            icon={<Calendar className="w-5 h-5" />}
            changeText={
              loading
                ? "Loading..."
                : `${stats.todayBookings.completed} completed, ${stats.todayBookings.pending} pending`
            }
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Revenue Today"
            value={
              loading ? "..." : `$${stats.todayRevenue.total.toLocaleString()}`
            }
            icon={<DollarSign className="w-5 h-5" />}
            changeText={
              loading
                ? "Loading..."
                : `+${stats.todayRevenue.change}% vs yesterday`
            }
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Revenue This Week"
            value={
              loading ? "..." : `$${stats.weeklyRevenue.total.toLocaleString()}`
            }
            icon={<TrendingUp className="w-5 h-5" />}
            changeText={
              loading
                ? "Loading..."
                : `+${stats.weeklyRevenue.change}% vs last week`
            }
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Promotion Usage"
            value={
              loading ? "..." : stats.promotionUsage.totalUsage.toLocaleString()
            }
            icon={<Megaphone className="w-5 h-5" />}
            changeText={
              loading
                ? "Loading..."
                : `${stats.promotionUsage.totalActive} active, ${stats.promotionUsage.usedThisWeek} used this week`
            }
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="New Customers This Month"
            value={loading ? "..." : stats.newCustomersThisMonth.toString()}
            icon={<Users className="w-5 h-5" />}
            changeText="Recent signups"
            changeType="positive"
          />

          <ROAMStatCard
            title="Active Businesses"
            value={loading ? "..." : stats.activeBusinesses.toString()}
            icon={<CheckCircle className="w-5 h-5" />}
            changeText="Currently active"
            changeType="positive"
          />

          <ROAMStatCard
            title="Pending Verification"
            value={loading ? "..." : stats.pendingVerification.toString()}
            icon={<Clock className="w-5 h-5" />}
            changeText="Awaiting review"
            changeType="warning"
          />

          <ROAMStatCard
            title="New Contact Submissions"
            value={loading ? "..." : stats.newContactSubmissions.toString()}
            icon={<AlertTriangle className="w-5 h-5" />}
            changeText="New/Received"
            changeType="warning"
          />
        </div>

        {/* Performance Chart */}
        <ROAMCard>
          <ROAMCardHeader>
            <div className="flex items-center justify-between w-full">
              <ROAMCardTitle>Booking & Revenue Trends</ROAMCardTitle>
              <select className="px-3 py-2 border border-border rounded-md text-sm bg-background">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 3 months</option>
              </select>
            </div>
          </ROAMCardHeader>
          <ROAMCardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-roam-blue/10 rounded-lg">
                  <div className="text-2xl font-bold text-roam-blue">
                    {loading
                      ? "..."
                      : stats.totalStats.totalBookings.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Bookings
                  </div>
                  <div className="text-xs text-roam-success">
                    All time total
                  </div>
                </div>
                <div className="text-center p-4 bg-roam-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-roam-success">
                    {loading
                      ? "..."
                      : `$${stats.totalStats.totalRevenue.toLocaleString()}`}
                  </div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                  <div className="text-xs text-roam-success">
                    All time total
                  </div>
                </div>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    Top Services
                  </h3>
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-3">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-muted rounded-full animate-pulse"></div>
                            <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                          </div>
                          <div className="text-right">
                            <div className="h-4 w-8 bg-muted rounded animate-pulse mb-1"></div>
                            <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : stats.topServices.length > 0 ? (
                    stats.topServices.map((service, index) => {
                      const colors = [
                        "bg-roam-blue",
                        "bg-roam-yellow",
                        "bg-roam-light-blue",
                        "bg-roam-purple",
                      ];
                      return (
                        <div
                          key={service.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 ${colors[index]} rounded-full`}
                            ></div>
                            <span className="text-sm font-medium">
                              {service.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold">
                              {service.booking_count}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              bookings
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-sm text-muted-foreground">
                        No booking data available
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Services will appear here once bookings are made
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      Last 30 days
                    </span>
                    {stats.topServices.length > 0 && (
                      <span className="text-xs font-medium text-roam-success">
                        {stats.topServices.reduce(
                          (sum, service) => sum + service.booking_count,
                          0,
                        )}{" "}
                        total bookings
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-lg font-bold text-foreground">
                    {loading ? "..." : `${stats.totalStats.completionRate}%`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Completion Rate
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-roam-success">
                    {loading
                      ? "..."
                      : `$${stats.weeklyRevenue.total.toLocaleString()}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Weekly Revenue
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-roam-blue">
                    {loading
                      ? "..."
                      : stats.totalStats.avgRating > 0
                        ? stats.totalStats.avgRating
                        : "N/A"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Avg Rating
                  </div>
                </div>
              </div>
            </div>
          </ROAMCardContent>
        </ROAMCard>
      </div>
    </AdminLayout>
  );
}
