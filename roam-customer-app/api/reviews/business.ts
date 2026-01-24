import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId } = req.query;

    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    // Fetch approved reviews for the business
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select(`
        id,
        customer_id,
        provider_id,
        business_id,
        overall_rating,
        service_quality_rating,
        professionalism_rating,
        value_rating,
        review_text,
        created_at,
        customer_profiles (
          first_name,
          last_name,
          image_url
        ),
        providers (
          first_name,
          last_name
        )
      `)
      .eq('business_id', businessId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching business reviews:', reviewsError);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }

    // Calculate average ratings
    let averageRating = 0;
    let serviceQualityAvg = 0;
    let professionalismAvg = 0;
    let valueAvg = 0;

    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0);
      averageRating = totalRating / reviews.length;

      const serviceQualityTotal = reviews.reduce((sum, r) => sum + (r.service_quality_rating || 0), 0);
      serviceQualityAvg = serviceQualityTotal / reviews.length;

      const professionalismTotal = reviews.reduce((sum, r) => sum + (r.professionalism_rating || 0), 0);
      professionalismAvg = professionalismTotal / reviews.length;

      const valueTotal = reviews.reduce((sum, r) => sum + (r.value_rating || 0), 0);
      valueAvg = valueTotal / reviews.length;
    }

    return res.status(200).json({
      reviews: reviews || [],
      reviewCount: reviews?.length || 0,
      averageRating,
      serviceQualityAvg,
      professionalismAvg,
      valueAvg,
    });

  } catch (error: any) {
    console.error('Error in business reviews handler:', error);
    return res.status(500).json({
      error: 'Failed to fetch business reviews',
      details: error.message
    });
  }
}
