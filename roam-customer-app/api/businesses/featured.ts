import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { data, error } = await supabase
      .from("business_profiles")
      .select(
        `
        id,
        business_name,
        business_type,
        logo_url,
        image_url,
        cover_image_url,
        verification_status,
        service_categories,
        is_active,
        is_featured,
        bank_connected,
        stripe_account_id,
        providers!inner (
          id,
          provider_role,
          is_active,
          active_for_bookings
        ),
        business_locations (
          location_name,
          city,
          state
        ),
        business_services (
          service_id,
          is_active,
          services (
            subcategory_id,
            service_subcategories (
              id,
              service_subcategory_type
            )
          )
        )
      `,
      )
      .eq("is_featured", true)
      .eq("is_active", true)
      .eq("verification_status", "approved")
      .eq("bank_connected", true)
      .not("stripe_account_id", "is", null)
      .eq("providers.is_active", true)
      .eq("providers.active_for_bookings", true)
      .in("providers.provider_role", ["owner", "provider"])
      .limit(12);

    if (error) {
      console.error("Error fetching featured businesses:", error);
      return res.status(500).json({ error: "Failed to fetch featured businesses", details: error.message });
    }

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error("Unexpected error fetching featured businesses:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

