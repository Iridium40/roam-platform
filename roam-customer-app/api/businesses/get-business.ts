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
    const businessId = (req.query.businessId as string) || "";
    if (!businessId) {
      return res.status(400).json({ error: "businessId is required" });
    }

    console.log('📍 Fetching business profile:', businessId);

    // Fetch business details
    const { data: businessData, error: businessError } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        business_description,
        image_url,
        logo_url,
        cover_image_url,
        cover_image_position,
        verification_status,
        business_hours,
        is_active,
        bank_connected,
        stripe_account_id,
        providers!inner (
          id,
          provider_role,
          is_active,
          active_for_bookings
        )
      `)
      .eq('id', businessId)
      .eq('is_active', true)
      .eq('verification_status', 'approved')
      .eq('bank_connected', true)
      .not('stripe_account_id', 'is', null)
      .eq('providers.is_active', true)
      .eq('providers.active_for_bookings', true)
      .in('providers.provider_role', ['owner', 'provider'])
      .single();

    if (businessError) {
      console.error('Error fetching business:', businessError);
      return res.status(404).json({ error: "Business not found", details: businessError.message });
    }

    if (!businessData) {
      return res.status(404).json({ error: "Business not available" });
    }

    // Fetch services for this business
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
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
    }

    // Fetch staff/providers for this business
    const { data: staffData, error: staffError } = await supabase
      .from('providers')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        bio,
        image_url,
        cover_image_url,
        provider_role
      `)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .eq('active_for_bookings', true)
      .in('provider_role', ['owner', 'provider']);

    if (staffError) {
      console.error('Error fetching staff:', staffError);
    }

    console.log('✅ Business profile fetched successfully');

    return res.status(200).json({
      business: businessData,
      services: servicesData || [],
      staff: staffData || []
    });

  } catch (err) {
    console.error("Unexpected error fetching business profile:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
