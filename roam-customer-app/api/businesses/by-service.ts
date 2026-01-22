import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const serviceId = (req.query.serviceId as string) || "";
    if (!serviceId) {
      return res.status(400).json({ error: "serviceId is required" });
    }

    const { data, error } = await supabase
      .from("business_services")
      .select(
        `
        business_id,
        business_price,
        business_duration_minutes,
        delivery_type,
        is_active,
        business_profiles (
          id,
          business_name,
          business_description,
          image_url,
          logo_url,
          business_type,
          business_hours,
          is_active,
          verification_status,
          bank_connected,
          stripe_account_id,
          providers (
            id,
            provider_role,
            is_active,
            active_for_bookings
          ),
          business_locations (
            city,
            state,
            postal_code,
            is_primary
          )
        )
      `,
      )
      .eq("service_id", serviceId)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching businesses by service:", error);
      return res.status(500).json({ error: "Failed to fetch businesses", details: error.message });
    }

    // Filter to only include businesses that are fully set up for bookings
    const eligibleBusinesses = (data || []).filter(item => {
      const business = item.business_profiles as any;
      if (!business) return false;
      if (!business.is_active) return false;
      if (business.verification_status !== "approved") return false;
      if (!business.bank_connected) return false;
      if (!business.stripe_account_id) return false;
      // Must have at least one bookable provider
      const bookableProviders = (business.providers || []).filter(
        (p: any) => p.is_active && p.active_for_bookings && ["owner", "provider"].includes(p.provider_role)
      );
      if (bookableProviders.length === 0) return false;
      // Must have at least one location
      if (!business.business_locations || business.business_locations.length === 0) return false;
      return true;
    });

    return res.status(200).json({ data: eligibleBusinesses });
  } catch (err) {
    console.error("Unexpected error fetching businesses by service:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
