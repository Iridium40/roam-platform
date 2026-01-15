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
    // First, let's see what featured businesses exist at all
    const { data: debugData, error: debugError } = await supabase
      .from("business_profiles")
      .select("id, business_name, is_featured, is_active, verification_status, bank_connected, stripe_account_id")
      .eq("is_featured", true)
      .limit(20);

    console.log("DEBUG - All featured businesses:", JSON.stringify(debugData, null, 2));
    console.log("DEBUG - Error:", debugError);

    // Now fetch with full eligibility - but use LEFT join on providers to see what we get
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
        providers (
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
      .limit(12);

    console.log("DEBUG - Businesses after basic filters:", JSON.stringify(data?.map(b => ({
      id: b.id,
      name: b.business_name,
      bank_connected: b.bank_connected,
      stripe_account_id: b.stripe_account_id,
      providers: b.providers,
    })), null, 2));

    if (error) {
      console.error("Error fetching featured businesses:", error);
      return res.status(500).json({ error: "Failed to fetch featured businesses", details: error.message });
    }

    // Filter in JS to see what's being excluded and why
    const eligibleBusinesses = (data || []).filter(business => {
      // Check bank_connected
      if (!business.bank_connected) {
        console.log(`DEBUG - ${business.business_name} excluded: bank_connected is false`);
        return false;
      }
      // Check stripe_account_id
      if (!business.stripe_account_id) {
        console.log(`DEBUG - ${business.business_name} excluded: stripe_account_id is null`);
        return false;
      }
      // Check providers
      const bookableProviders = (business.providers || []).filter(
        (p: any) => p.is_active && p.active_for_bookings && ["owner", "provider"].includes(p.provider_role)
      );
      if (bookableProviders.length === 0) {
        console.log(`DEBUG - ${business.business_name} excluded: no bookable providers`, business.providers);
        return false;
      }
      console.log(`DEBUG - ${business.business_name} is ELIGIBLE with ${bookableProviders.length} bookable providers`);
      return true;
    });

    console.log(`DEBUG - Final eligible count: ${eligibleBusinesses.length} out of ${data?.length || 0}`);

    return res.status(200).json({ data: eligibleBusinesses, debug: { total: data?.length, eligible: eligibleBusinesses.length } });
  } catch (err) {
    console.error("Unexpected error fetching featured businesses:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

