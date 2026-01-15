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
    const businessId = (req.query.businessId as string) || "";

    if (!serviceId || !businessId) {
      return res.status(400).json({ error: "serviceId and businessId are required" });
    }

    // Pull providers via provider_services for this service+business.
    const { data, error } = await supabase
      .from("provider_services")
      .select(
        `
        provider_id,
        providers:provider_id!inner (
          id,
          user_id,
          first_name,
          last_name,
          image_url,
          provider_role,
          business_id,
          is_active,
          active_for_bookings
        )
      `,
      )
      .eq("service_id", serviceId)
      .eq("is_active", true)
      .eq("providers.business_id", businessId)
      .eq("providers.is_active", true)
      .eq("providers.active_for_bookings", true)
      .in("providers.provider_role", ["owner", "provider"]);

    if (error) {
      console.error("Error fetching providers by service:", error);
      return res.status(500).json({ error: "Failed to fetch providers", details: error.message });
    }

    const providers = (data || []).map((row: any) => row.providers).filter(Boolean);

    // Attach ratings (best-effort)
    const providerIds = providers.map((p: any) => p.id);
    let ratingsByProviderId: Record<string, { avg: number; count: number }> = {};

    if (providerIds.length > 0) {
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("provider_id, overall_rating")
        .in("provider_id", providerIds)
        .eq("is_approved", true);

      const acc: Record<string, { sum: number; count: number }> = {};
      for (const r of reviewsData || []) {
        const pid = (r as any).provider_id;
        if (!pid) continue;
        if (!acc[pid]) acc[pid] = { sum: 0, count: 0 };
        acc[pid].sum += (r as any).overall_rating || 0;
        acc[pid].count += 1;
      }

      ratingsByProviderId = Object.fromEntries(
        Object.entries(acc).map(([pid, v]) => [pid, { avg: v.count ? v.sum / v.count : 0, count: v.count }]),
      );
    }

    const providersWithRatings = providers.map((p: any) => {
      const rating = ratingsByProviderId[p.id];
      return {
        ...p,
        rating: rating?.avg || 0,
        review_count: rating?.count || 0,
      };
    });

    return res.status(200).json({ data: providersWithRatings });
  } catch (err) {
    console.error("Unexpected error fetching providers by service:", err);
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

