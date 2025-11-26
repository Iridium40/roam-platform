import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();

// Create Supabase client with service role key for admin access
const createServiceClient = () => {
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

router.get("/", async (req, res) => {
  try {
    const supabase = createServiceClient();

    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekStartTimestamp = weekStart.toISOString();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString();

    // Parallel queries for better performance
    const [
      todayBookings,
      yesterdayBookings,
      weeklyBookings,
      lastWeekBookings,
      allBookings,
      reviews,
      activePromotions,
      allPromotionUsage,
      weeklyPromotionUsage,
      newCustomers,
      activeBusinesses,
      pendingVerification,
      newContactSubmissions,
    ] = await Promise.all([
      // Today's bookings
      supabase
        .from("bookings")
        .select("booking_status, total_amount")
        .gte("booking_date", today)
        .lt(
          "booking_date",
          new Date(Date.now() + 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        ),

      // Yesterday's bookings
      supabase
        .from("bookings")
        .select("total_amount")
        .gte(
          "booking_date",
          new Date(Date.now() - 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        )
        .lt("booking_date", today),

      // Weekly bookings
      supabase
        .from("bookings")
        .select("total_amount")
        .gte("booking_date", weekStartStr)
        .not("total_amount", "is", null),

      // Last week's bookings
      supabase
        .from("bookings")
        .select("total_amount")
        .gte(
          "booking_date",
          new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0]
        )
        .lt("booking_date", weekStartStr),

      // All bookings
      supabase.from("bookings").select("booking_status, total_amount"),

      // Reviews
      supabase
        .from("reviews")
        .select("overall_rating")
        .not("overall_rating", "is", null),

      // Active promotions
      supabase.from("promotions").select("id").eq("is_active", true),

      // All promotion usage
      supabase
        .from("promotion_usage")
        .select("*", { count: "exact", head: true }),

      // Weekly promotion usage
      supabase
        .from("promotion_usage")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekStartTimestamp),

      // New customers this month
      supabase
        .from("customer_profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", monthStartStr),

      // Active businesses
      supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),

      // Pending verification
      supabase
        .from("business_profiles")
        .select("*", { count: "exact", head: true })
        .eq("verification_status", "pending"),

      // New contact submissions
      supabase
        .from("contact_submissions")
        .select("*", { count: "exact", head: true })
        .eq("status", "received"),
    ]);

    // Calculate today's stats
    const todayTotal = todayBookings.data?.length || 0;
    const todayCompleted =
      todayBookings.data?.filter((b) => b.booking_status === "completed")
        .length || 0;
    const todayPending =
      todayBookings.data?.filter((b) => b.booking_status === "pending")
        .length || 0;
    const todayRevenue =
      todayBookings.data?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    // Calculate yesterday's revenue
    const yesterdayRevenue =
      yesterdayBookings.data?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    const todayRevenueChange =
      yesterdayRevenue > 0
        ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
        : 0;

    // Calculate weekly revenue
    const weeklyRevenue =
      weeklyBookings.data?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    const lastWeekRevenue =
      lastWeekBookings.data?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;

    const weeklyRevenueChange =
      lastWeekRevenue > 0
        ? Math.round(
            ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
          )
        : 0;

    // Calculate total stats
    const totalBookings = allBookings.data?.length || 0;
    const totalRevenue =
      allBookings.data?.reduce(
        (sum, booking) => sum + (booking.total_amount || 0),
        0
      ) || 0;
    const completedBookings =
      allBookings.data?.filter((b) => b.booking_status === "completed")
        .length || 0;
    const completionRate =
      totalBookings > 0
        ? Math.round((completedBookings / totalBookings) * 100)
        : 0;

    // Calculate average rating
    const avgRating =
      reviews.data && reviews.data.length > 0
        ? reviews.data.reduce(
            (sum, review) => sum + (review.overall_rating || 0),
            0
          ) / reviews.data.length
        : 0;

    // Return all stats
    res.json({
      todayBookings: {
        total: todayTotal,
        completed: todayCompleted,
        pending: todayPending,
      },
      todayRevenue: {
        total: todayRevenue,
        change: todayRevenueChange,
      },
      weeklyRevenue: {
        total: weeklyRevenue,
        change: weeklyRevenueChange,
      },
      promotionUsage: {
        totalActive: activePromotions.data?.length || 0,
        usedThisWeek: weeklyPromotionUsage.count || 0,
        totalUsage: allPromotionUsage.count || 0,
      },
      totalStats: {
        totalBookings,
        totalRevenue,
        completionRate,
        avgRating: Math.round(avgRating * 10) / 10,
      },
      newCustomersThisMonth: newCustomers.count || 0,
      activeBusinesses: activeBusinesses.count || 0,
      pendingVerification: pendingVerification.count || 0,
      newContactSubmissions: newContactSubmissions.count || 0,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      error: "Failed to fetch dashboard stats",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;

