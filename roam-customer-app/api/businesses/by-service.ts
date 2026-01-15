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
          providers!inner (
            id,
            provider_role,
            is_active,
            active_for_bookings
          ),
          business_locations!inner (
            city,
            state,
            postal_code,
            is_primary
          )
        )
      `,
      )
      .eq("service_id", serviceId)
      .eq("is_active", true)
      .eq("business_profiles.is_active", true)
      .eq("business_profiles.verification_status", "approved")
      .eq("business_profiles.bank_connected", true)
      .not("business_profiles.stripe_account_id", "is", null)
      .eq("business_profiles.providers.is_active", true)
      .eq("business_profiles.providers.active_for_bookings", true)
      .in("business_profiles.providers.provider_role", ["owner", "provider"]);

    if (error) {
      console.error("Error fetching businesses by service:", error);
      return res.status(500).json({ error: "Failed to fetch businesses", details: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error("Unexpected error fetching businesses by service:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

