import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const bookingId = (req.query.bookingId as string) || "";
    const customerId = (req.query.customerId as string) || "";

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }

    if (!customerId) {
      return res.status(400).json({ error: "customerId is required" });
    }

    console.log("[bookings/get-booking] Fetching booking:", { bookingId, customerId });

    // Fetch booking with all related data
    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        providers (
          id,
          user_id,
          first_name,
          last_name,
          image_url,
          average_rating,
          email,
          phone
        ),
        services (
          id,
          name,
          description,
          duration_minutes,
          min_price,
          image_url,
          pricing_type
        ),
        business_profiles (
          id,
          business_name,
          business_type,
          business_description,
          image_url,
          logo_url
        ),
        customer_locations (
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
        business_locations (
          id,
          location_name,
          address_line1,
          address_line2,
          city,
          state,
          postal_code
        ),
        reviews (
          id,
          overall_rating,
          service_rating,
          communication_rating,
          punctuality_rating,
          review_text,
          created_at
        ),
        tips (
          id,
          tip_amount,
          tip_percentage,
          customer_message,
          payment_status,
          created_at
        )
      `)
      .eq("id", bookingId)
      .eq("customer_id", customerId)
      .single();

    if (bookingError) {
      console.error("[bookings/get-booking] Error:", bookingError);
      return res.status(404).json({ 
        error: "Booking not found or you don't have access to it",
        details: bookingError.message 
      });
    }

    if (!bookingData) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Fetch financial transactions
    const { data: transactions, error: txError } = await supabase
      .from("financial_transactions")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (txError) {
      console.error("[bookings/get-booking] Error fetching transactions:", txError);
    }

    // Fetch booking changes
    const { data: bookingChanges, error: changesError } = await supabase
      .from("booking_changes")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false });

    if (changesError) {
      console.error("[bookings/get-booking] Error fetching changes:", changesError);
    }

    // Fetch booking addons
    const { data: addonsData, error: addonsError } = await supabase
      .from("booking_addons")
      .select(`
        *,
        service_addons (
          id,
          name,
          description,
          image_url
        )
      `)
      .eq("booking_id", bookingId)
      .order("added_at", { ascending: true });

    if (addonsError) {
      console.error("[bookings/get-booking] Error fetching addons:", addonsError);
    }

    // Fetch business addon prices if available
    let bookingAddons = addonsData || [];
    if (addonsData && addonsData.length > 0 && bookingData.business_id) {
      const addonIds = addonsData.map((a: any) => a.addon_id);
      const { data: businessAddonPrices } = await supabase
        .from("business_addons")
        .select("addon_id, custom_price")
        .eq("business_id", bookingData.business_id)
        .in("addon_id", addonIds);

      // Merge business prices with addons
      bookingAddons = addonsData.map((addon: any) => ({
        ...addon,
        business_addons: businessAddonPrices?.filter((ba: any) => ba.addon_id === addon.addon_id) || [],
      }));
    }

    console.log("[bookings/get-booking] Successfully fetched booking details");

    return res.status(200).json({
      booking: bookingData,
      transactions: transactions || [],
      bookingChanges: bookingChanges || [],
      bookingAddons: bookingAddons,
    });

  } catch (err) {
    console.error("[bookings/get-booking] Unexpected error:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
