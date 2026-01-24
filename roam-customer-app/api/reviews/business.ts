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
        booking_id,
        customer_id,
        provider_id,
        business_id,
        overall_rating,
        service_rating,
        communication_rating,
        punctuality_rating,
        review_text,
        is_featured,
        created_at,
        customer_profiles (
          first_name,
          last_name,
          image_url
        ),
        providers (
          first_name,
          last_name
        ),
        bookings (
          service_id,
          services (
            name
          )
        )
      `)
      .eq('business_id', businessId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    
    console.log('Business reviews query result:', { businessId, reviewCount: reviews?.length, error: reviewsError });

    if (reviewsError) {
      console.error('Error fetching business reviews:', reviewsError);
      return res.status(500).json({ error: 'Failed to fetch reviews' });
    }

    // Calculate average ratings
    let averageRating = 0;
    let serviceRatingAvg = 0;
    let communicationRatingAvg = 0;
    let punctualityRatingAvg = 0;

    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0);
      averageRating = totalRating / reviews.length;

      const serviceTotal = reviews.reduce((sum, r) => sum + (r.service_rating || 0), 0);
      serviceRatingAvg = serviceTotal / reviews.length;

      const communicationTotal = reviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0);
      communicationRatingAvg = communicationTotal / reviews.length;

      const punctualityTotal = reviews.reduce((sum, r) => sum + (r.punctuality_rating || 0), 0);
      punctualityRatingAvg = punctualityTotal / reviews.length;
    }

    // Transform reviews to match frontend expectations
    const transformedReviews = (reviews || []).map((review: any) => ({
      id: review.id,
      booking_id: review.booking_id,
      overall_rating: review.overall_rating,
      service_rating: review.service_rating,
      communication_rating: review.communication_rating,
      punctuality_rating: review.punctuality_rating,
      review_text: review.review_text,
      is_featured: review.is_featured,
      created_at: review.created_at,
      customer_profiles: review.customer_profiles,
      providers: review.providers,
      services: review.bookings?.services || null,
    }));

    return res.status(200).json({
      reviews: transformedReviews,
      reviewCount: transformedReviews.length,
      averageRating,
      serviceRatingAvg,
      communicationRatingAvg,
      punctualityRatingAvg,
    });

  } catch (error: any) {
    console.error('Error in business reviews handler:', error);
    return res.status(500).json({
      error: 'Failed to fetch business reviews',
      details: error.message
    });
  }
}
