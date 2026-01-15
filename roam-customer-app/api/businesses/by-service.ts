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

    console.log(`DEBUG by-service - Fetching businesses for service: ${serviceId}`);

    // First, get all business_services for this service (no filters)
    const { data: debugData, error: debugError } = await supabase
      .from("business_services")
      .select("business_id, is_active")
      .eq("service_id", serviceId);

    console.log(`DEBUG by-service - All business_services for this service:`, JSON.stringify(debugData, null, 2));

    // Now fetch with relaxed filters (no inner joins that might exclude)
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

    console.log(`DEBUG by-service - Raw data count: ${data?.length}`);

    if (error) {
      console.error("Error fetching businesses by service:", error);
      return res.status(500).json({ error: "Failed to fetch businesses", details: error.message });
    }

    // Filter in JS to see what's being excluded and why
    const eligibleBusinesses = (data || []).filter(item => {
      const business = item.business_profiles as any;
      if (!business) {
        console.log(`DEBUG by-service - item excluded: no business_profiles`);
        return false;
      }
      if (!business.is_active) {
        console.log(`DEBUG by-service - ${business.business_name} excluded: is_active is false`);
        return false;
      }
      if (business.verification_status !== "approved") {
        console.log(`DEBUG by-service - ${business.business_name} excluded: verification_status is ${business.verification_status}`);
        return false;
      }
      if (!business.bank_connected) {
        console.log(`DEBUG by-service - ${business.business_name} excluded: bank_connected is false`);
        return false;
      }
      if (!business.stripe_account_id) {
        console.log(`DEBUG by-service - ${business.business_name} excluded: stripe_account_id is null`);
        return false;
      }
      // Check providers
      const bookableProviders = (business.providers || []).filter(
        (p: any) => p.is_active && p.active_for_bookings && ["owner", "provider"].includes(p.provider_role)
      );
      if (bookableProviders.length === 0) {
        console.log(`DEBUG by-service - ${business.business_name} excluded: no bookable providers`, business.providers);
        return false;
      }
      // Check locations
      if (!business.business_locations || business.business_locations.length === 0) {
        console.log(`DEBUG by-service - ${business.business_name} excluded: no business_locations`);
        return false;
      }
      console.log(`DEBUG by-service - ${business.business_name} is ELIGIBLE`);
      return true;
    });

    console.log(`DEBUG by-service - Final eligible: ${eligibleBusinesses.length} out of ${data?.length}`);

    return res.status(200).json({ data: eligibleBusinesses, debug: { total: data?.length, eligible: eligibleBusinesses.length } });
  } catch (err) {
    console.error("Unexpected error fetching businesses by service:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

