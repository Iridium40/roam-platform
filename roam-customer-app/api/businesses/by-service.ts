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

    console.log(`📊 Found ${data?.length || 0} business_services records for service ${serviceId}`);

    // Filter to only include businesses that are fully set up for bookings
    const eligibleBusinesses = (data || []).filter(item => {
      const business = item.business_profiles as any;
      
      // Debug logging for each business
      const businessName = business?.business_name || 'Unknown';
      const checks = {
        hasBusinessProfile: !!business,
        isActive: business?.is_active,
        verificationStatus: business?.verification_status,
        bankConnected: business?.bank_connected,
        hasStripeAccount: !!business?.stripe_account_id,
        providerCount: business?.providers?.length || 0,
        locationCount: business?.business_locations?.length || 0,
      };
      
      if (!business) {
        console.log(`❌ ${businessName}: No business profile`);
        return false;
      }
      if (!business.is_active) {
        console.log(`❌ ${businessName}: Not active`, checks);
        return false;
      }
      if (business.verification_status !== "approved") {
        console.log(`❌ ${businessName}: Not approved (status: ${business.verification_status})`, checks);
        return false;
      }
      if (!business.bank_connected) {
        console.log(`❌ ${businessName}: Bank not connected`, checks);
        return false;
      }
      if (!business.stripe_account_id) {
        console.log(`❌ ${businessName}: No Stripe account`, checks);
        return false;
      }
      
      // Must have at least one bookable provider
      const bookableProviders = (business.providers || []).filter(
        (p: any) => p.is_active && p.active_for_bookings && ["owner", "provider"].includes(p.provider_role)
      );
      if (bookableProviders.length === 0) {
        console.log(`❌ ${businessName}: No bookable providers (total providers: ${business.providers?.length || 0})`, checks);
        return false;
      }
      
      // Must have at least one location
      if (!business.business_locations || business.business_locations.length === 0) {
        console.log(`❌ ${businessName}: No locations`, checks);
        return false;
      }
      
      console.log(`✅ ${businessName}: Eligible for booking`, checks);
      return true;
    });

    console.log(`✅ Returning ${eligibleBusinesses.length} eligible businesses out of ${data?.length || 0} total`);

    return res.status(200).json({ data: eligibleBusinesses });
  } catch (err) {
    console.error("Unexpected error fetching businesses by service:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
