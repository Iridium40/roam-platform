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
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const weekStartTimestamp = weekStart.toISOString(); // Full timestamp for updated_at comparisons

      // Today's bookings
      const { data: todayBookingsData } = await supabase
        .from("bookings")
        .select("booking_status, total_amount, tip_amount")
        .gte("booking_date", today)
        .lt(
          "booking_date",
          new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
        );

      const todayTotal = todayBookingsData?.length || 0;
      const todayCompleted =
        todayBookingsData?.filter((b) => b.booking_status === "completed")
          .length || 0;
      const todayPending =
        todayBookingsData?.filter((b) => b.booking_status === "pending")
          .length || 0;

      // Today's revenue
      const todayRevenue =
        todayBookingsData?.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        ) || 0;

      // Yesterday's revenue for comparison
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const { data: yesterdayBookingsData } = await supabase
        .from("bookings")
        .select("total_amount")
        .gte("booking_date", yesterday)
        .lt("booking_date", today);

      const yesterdayRevenue =
        yesterdayBookingsData?.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        ) || 0;

      // Calculate today's revenue change percentage
      const todayRevenueChange =
        yesterdayRevenue > 0
          ? Math.round(
              ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100,
            )
          : 0;

      // Weekly revenue
      const { data: weeklyRevenueData } = await supabase
        .from("bookings")
        .select("total_amount")
        .gte("booking_date", weekStartStr)
        .not("total_amount", "is", null);

      const weeklyRevenue =
        weeklyRevenueData?.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        ) || 0;

      // Previous week's revenue for comparison
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];

      const { data: lastWeekRevenueData } = await supabase
        .from("bookings")
        .select("total_amount")
        .gte("booking_date", twoWeeksAgoStr)
        .lt("booking_date", weekStartStr);

      const lastWeekRevenue =
        lastWeekRevenueData?.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        ) || 0;

      // Calculate weekly revenue change percentage
      const weeklyRevenueChange =
        lastWeekRevenue > 0
          ? Math.round(
              ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100,
            )
          : 0;

      // Total stats
      const { data: allBookingsData } = await supabase
        .from("bookings")
        .select("booking_status, total_amount");

      const totalBookings = allBookingsData?.length || 0;
      const totalRevenue =
        allBookingsData?.reduce(
          (sum, booking) => sum + (booking.total_amount || 0),
          0,
        ) || 0;
      const completedBookings =
        allBookingsData?.filter((b) => b.booking_status === "completed")
          .length || 0;
      const completionRate =
        totalBookings > 0
          ? Math.round((completedBookings / totalBookings) * 100)
          : 0;

      // Average rating (from reviews if available)
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("overall_rating")
        .gte("overall_rating", 1);

      const avgRating =
        reviewsData?.length > 0
          ? reviewsData.reduce((sum, review) => sum + review.overall_rating, 0) /
            reviewsData.length
          : 4.8;

      // Promotion usage stats
      const { data: activePromotionsData } = await supabase
        .from("promotions")
        .select("id")
        .eq("is_active", true);

      const { data: weeklyPromotionUsageData } = await supabase
        .from("promotion_usage")
        .select("discount_applied")
        .gte("created_at", weekStartTimestamp);

      const totalActivePromotions = activePromotionsData?.length || 0;
      const totalUsage = 0; // TODO: Calculate from promotion_usage table if needed
      const weeklyUsage =
        weeklyPromotionUsageData?.reduce(
          (sum, usage) => sum + (usage.discount_applied || 0),
          0,
        ) || 0;

      // Top services by booking count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

      const { data: topServicesData } = await supabase
        .from("services")
        .select(
          `
          id,
          name,
          service_subcategories!inner(service_subcategory_type)
        `,
        )
        .eq("is_active", true)
        .limit(5);

      // Get booking counts for each service
      const topServicesWithCounts = await Promise.all(
        (topServicesData || []).map(async (service) => {
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .eq("service_id", service.id)
            .gte("created_at", thirtyDaysAgoStr);

          return {
            id: service.id,
            name: service.name,
            booking_count: count || 0,
            service_subcategory_type:
              service.service_subcategories?.[0]?.service_subcategory_type,
          };
        }),
      );

      // Sort by booking count and take top 4
      const sortedTopServices = topServicesWithCounts
        .sort((a, b) => b.booking_count - a.booking_count)
        .slice(0, 4);

      setStats({
        todayBookings: {
          total: todayTotal,
          completed: todayCompleted,
          pending: todayPending,
        },
        todayRevenue: { total: todayRevenue, change: todayRevenueChange },
        weeklyRevenue: { total: weeklyRevenue, change: weeklyRevenueChange },
        promotionUsage: {
          totalActive: totalActivePromotions,
          usedThisWeek: weeklyUsage,
          totalUsage,
        },
        topServices: sortedTopServices,
        totalStats: {
          totalBookings,
          totalRevenue,
          completionRate,
          avgRating: Math.round(avgRating * 10) / 10,
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
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
                    {loading ? "..." : stats.totalStats.avgRating}
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
