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
    const providerId = (req.query.providerId as string) || "";
    if (!providerId) {
      return res.status(400).json({ error: "providerId is required" });
    }

    console.log('📍 Fetching provider profile:', providerId);

    // Fetch provider details with business info
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        bio,
        image_url,
        cover_image_url,
        provider_role,
        is_active,
        active_for_bookings,
        business_profiles (
          id,
          business_name,
          logo_url,
          is_active,
          verification_status
        )
      `)
      .eq('id', providerId)
      .eq('is_active', true)
      .eq('active_for_bookings', true)
      .single();

    if (providerError) {
      console.error('Error fetching provider:', providerError);
      return res.status(404).json({ error: "Provider not found", details: providerError.message });
    }

    if (!providerData) {
      return res.status(404).json({ error: "Provider not available" });
    }

    // Fetch services this provider offers through their business
    // business_profiles can be an array from the join, extract first element
    const businessProfile = Array.isArray(providerData.business_profiles) 
      ? providerData.business_profiles[0] 
      : providerData.business_profiles;
    
    const { data: servicesData, error: servicesError } = await supabase
      .from('business_services')
      .select(`
        business_price,
        business_duration_minutes,
        delivery_type,
        services (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          image_url
        )
      `)
      .eq('business_id', businessProfile?.id)
      .eq('is_active', true);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
    }

    console.log('✅ Provider profile fetched successfully');

    return res.status(200).json({
      provider: providerData,
      services: servicesData || []
    });

  } catch (err) {
    console.error("Unexpected error fetching provider profile:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
