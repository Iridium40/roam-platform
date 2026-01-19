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
    const type = req.query.type as string; // 'featured' or 'popular'

    // Build the query
    let query = supabase
      .from("services")
      .select(`
        id,
        name,
        description,
        min_price,
        duration_minutes,
        image_url,
        is_featured,
        is_popular,
        subcategory_id
      `)
      .eq("is_active", true);

    // Filter by type
    if (type === 'popular') {
      query = query.eq("is_popular", true).limit(6);
    } else {
      query = query.eq("is_featured", true);
    }

    const { data: servicesData, error: servicesError } = await query;

    if (servicesError) {
      return res.status(500).json({ error: "Failed to fetch services", details: servicesError.message });
    }

    // Fetch subcategories for category info
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from("service_subcategories")
      .select(`
        id,
        service_subcategory_type,
        service_categories (
          id,
          service_category_type
        )
      `);

    if (subcategoriesError) {
      return res.status(500).json({ error: "Failed to fetch subcategories", details: subcategoriesError.message });
    }

    // Create lookup map
    const subcategoryMap = new Map(
      (subcategoriesData || []).map((sub: any) => [sub.id, sub])
    );

    // Transform services
    const transformedServices = (servicesData || []).map((service: any) => {
      const subcategory = service.subcategory_id ? subcategoryMap.get(service.subcategory_id) : null;
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        min_price: service.min_price,
        duration_minutes: service.duration_minutes,
        image_url: service.image_url,
        is_featured: service.is_featured,
        is_popular: service.is_popular,
        category: subcategory?.service_categories?.service_category_type || 'General',
      };
    });

    return res.status(200).json({ data: transformedServices });
  } catch (err) {
    return res.status(500).json({
      error: "Internal server error",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
}
