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
    const { businessIds } = req.query;

    if (!businessIds) {
      return res.status(400).json({ error: 'businessIds is required' });
    }

    // Parse businessIds (comma-separated string)
    const ids = typeof businessIds === 'string' 
      ? businessIds.split(',').map(id => id.trim())
      : Array.isArray(businessIds) 
        ? businessIds 
        : [businessIds];

    // Fetch ratings for all businesses in one query
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('business_id, overall_rating')
      .in('business_id', ids)
      .eq('is_approved', true);

    if (reviewsError) {
      console.error('Error fetching bulk ratings:', reviewsError);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }

    // Calculate average rating for each business
    const ratings: Record<string, { rating: number; count: number }> = {};

    if (reviews && reviews.length > 0) {
      reviews.forEach((review) => {
        const businessId = review.business_id;
        if (!ratings[businessId]) {
          ratings[businessId] = { rating: 0, count: 0 };
        }
        ratings[businessId].rating += review.overall_rating || 0;
        ratings[businessId].count += 1;
      });

      // Calculate averages
      Object.keys(ratings).forEach((businessId) => {
        ratings[businessId].rating = ratings[businessId].rating / ratings[businessId].count;
      });
    }

    return res.status(200).json({ ratings });

  } catch (error: any) {
    console.error('Error in bulk ratings handler:', error);
    return res.status(500).json({
      error: 'Failed to fetch bulk ratings',
      details: error.message
    });
  }
}
