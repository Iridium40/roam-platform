import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

// Service role client for bypassing RLS (for performance)
const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Regular client for auth verification
const supabaseAuth = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.VITE_PUBLIC_SUPABASE_ANON_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");

    // Verify the user's token
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Get customer_id from query params or look it up
    let customerId = req.query.customer_id as string;

    if (!customerId) {
      // Look up customer profile by user_id
      const { data: customerProfile, error: customerError } = await supabaseAdmin
        .from("customer_profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (customerError || !customerProfile) {
        return res.status(404).json({ error: "Customer profile not found" });
      }

      customerId = customerProfile.id;
    }

    // Parse date range from query params
    const dateStart = req.query.date_start as string;
    const dateEnd = req.query.date_end as string;

    // Build the query using service role (bypasses RLS for performance)
    let query = supabaseAdmin
      .from("bookings")
      .select(`
        *,
        providers!left (
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          image_url,
          business_id,
          average_rating
        ),
        services!left (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          image_url
        ),
        customer_profiles!left (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        business_locations!left (
          id,
          business_id,
          location_name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code,
          country,
          is_primary,
          offers_mobile_services
        ),
        business_profiles!left (
          id,
          business_name,
          business_type,
          business_description,
          image_url,
          logo_url
        ),
        customer_locations!left (
          id,
          customer_id,
          location_name,
          street_address,
          unit_number,
          city,
          state,
          zip_code,
          is_primary,
          access_instructions
        ),
        reviews!left (
          id,
          overall_rating,
          service_rating,
          communication_rating,
          punctuality_rating,
          review_text,
          created_at
        ),
        tips!left (
          id,
          tip_amount,
          tip_percentage,
          customer_message,
          payment_status,
          created_at
        )
      `)
      .eq("customer_id", customerId)
      .order("booking_date", { ascending: false });

    // Apply date filters if provided
    if (dateStart) {
      query = query.gte("booking_date", dateStart);
    }
    if (dateEnd) {
      query = query.lte("booking_date", dateEnd);
    }

    // Limit results
    query = query.limit(100);

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: "Failed to fetch bookings", details: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
