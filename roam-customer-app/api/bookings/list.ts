import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/bookings/list
 * 
 * Fetches customer bookings with related data.
 * Uses service role key for reliable database access.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    console.log("[bookings/list] Auth check:", { userId: user?.id, authError: authError?.message });

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get customer profile
    const { data: customerProfile, error: customerError } = await supabase
      .from("customer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    console.log("[bookings/list] Customer lookup:", { 
      userId: user.id, 
      customerId: customerProfile?.id, 
      error: customerError?.message 
    });

    if (customerError || !customerProfile) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    // Parse query parameters
    const { date_start, date_end } = req.query;

    // Fetch bookings with related data (same pattern as provider app fallback)
    let query = supabase
      .from("bookings")
      .select(`
        *,
        providers (id, user_id, first_name, last_name, image_url, average_rating, email),
        services (id, name, description, duration_minutes, min_price, image_url, pricing_type),
        business_profiles (id, business_name, logo_url),
        customer_locations (id, location_name, street_address, unit_number, city, state, zip_code),
        business_locations (id, location_name, address_line1, address_line2, city, state, postal_code),
        reviews (id, overall_rating, service_rating, communication_rating, punctuality_rating, review_text, created_at),
        tips (id, tip_amount, tip_percentage, customer_message, payment_status, created_at)
      `)
      .eq("customer_id", customerProfile.id)
      .order("booking_date", { ascending: false })
      .order("start_time", { ascending: false })
      .limit(100);

    // Apply date filters if provided
    if (date_start) {
      query = query.gte("booking_date", date_start as string);
    }
    if (date_end) {
      query = query.lte("booking_date", date_end as string);
    }

    const { data: bookings, error: bookingsError } = await query;

    console.log("[bookings/list] Query result:", { 
      customerId: customerProfile.id,
      dateStart: date_start,
      dateEnd: date_end,
      bookingsCount: bookings?.length || 0,
      error: bookingsError?.message 
    });

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return res.status(500).json({ 
        error: "Failed to fetch bookings", 
        details: bookingsError.message 
      });
    }

    return res.status(200).json({ data: bookings || [] });

  } catch (err) {
    console.error("Bookings API error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
