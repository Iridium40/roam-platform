import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleReviews(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getReviews(req, res);
      case 'POST':
        return await createReview(req, res);
      case 'PUT':
        return await updateReview(req, res);
      case 'DELETE':
        return await deleteReview(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in reviews API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getReviews(req: Request, res: Response) {
  try {
    const { 
      status, 
      rating,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        overall_rating,
        service_rating,
        communication_rating,
        cleanliness_rating,
        timeliness_rating,
        review_text,
        is_flagged,
        is_featured,
        admin_response,
        created_at,
        updated_at,
        customer_profiles!inner (
          id,
          first_name,
          last_name
        ),
        bookings!inner (
          id,
          services!inner (
            id,
            name
          ),
          business_profiles!inner (
            id,
            business_name
          )
        )
      `);

    // Apply filters
    if (status === 'flagged') {
      query = query.eq('is_flagged', true);
    } else if (status === 'featured') {
      query = query.eq('is_featured', true);
    }

    if (rating) {
      query = query.eq('overall_rating', parseInt(rating as string));
    }

    if (search) {
      query = query.or(`review_text.ilike.%${search}%,admin_response.ilike.%${search}%`);
    }

    // Apply sorting
    const sortField = sortBy as string;
    const order = sortOrder === 'desc' ? { ascending: false } : { ascending: true };
    query = query.order(sortField, order);

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: reviews, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching reviews:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Transform the data for better frontend consumption
    const transformedReviews = reviews?.map((review: any) => ({
      ...review,
      customer_name: `${review.customer_profiles?.first_name || ''} ${review.customer_profiles?.last_name || ''}`.trim(),
      service_name: review.bookings?.services?.name || 'Unknown Service',
      business_name: review.bookings?.business_profiles?.business_name || 'Unknown Business',
      // Calculate average of all ratings
      average_rating: review.overall_rating ? (
        (review.overall_rating + 
         (review.service_rating || review.overall_rating) + 
         (review.communication_rating || review.overall_rating) + 
         (review.cleanliness_rating || review.overall_rating) + 
         (review.timeliness_rating || review.overall_rating)) / 5
      ).toFixed(1) : null
    })) || [];

    return res.status(200).json({ 
      data: transformedReviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getReviews:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
}

async function createReview(req: Request, res: Response) {
  try {
    const {
      booking_id,
      overall_rating,
      service_rating,
      communication_rating,
      cleanliness_rating,
      timeliness_rating,
      review_text,
      is_featured = false
    } = req.body;

    // Validate required fields
    if (!booking_id || !overall_rating) {
      return res.status(400).json({ 
        error: 'booking_id and overall_rating are required' 
      });
    }

    // Validate rating values (1-5)
    const ratings = [overall_rating, service_rating, communication_rating, cleanliness_rating, timeliness_rating];
    for (const rating of ratings) {
      if (rating && (rating < 1 || rating > 5)) {
        return res.status(400).json({ 
          error: 'Rating values must be between 1 and 5' 
        });
      }
    }

    // Fetch booking to get business_id and provider_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('business_id, provider_id')
      .eq('id', booking_id)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return res.status(404).json({ 
        error: 'Booking not found',
        details: bookingError.message 
      });
    }

    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert([{
        booking_id,
        overall_rating,
        service_rating,
        communication_rating,
        cleanliness_rating,
        timeliness_rating,
        review_text,
        is_featured,
        is_flagged: false,
        business_id: booking.business_id || null,
        provider_id: booking.provider_id || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating review:', insertError);
      return res.status(500).json({ 
        error: insertError.message,
        details: insertError.details 
      });
    }

    return res.status(201).json({ data: review });

  } catch (error) {
    console.error('Error in createReview:', error);
    return res.status(500).json({ error: 'Failed to create review' });
  }
}

async function updateReview(req: Request, res: Response) {
  try {
    const reviewId = req.params?.id || req.body?.id;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }

    const {
      overall_rating,
      service_rating,
      communication_rating,
      cleanliness_rating,
      timeliness_rating,
      review_text,
      is_flagged,
      is_featured,
      admin_response
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (overall_rating !== undefined) updateData.overall_rating = overall_rating;
    if (service_rating !== undefined) updateData.service_rating = service_rating;
    if (communication_rating !== undefined) updateData.communication_rating = communication_rating;
    if (cleanliness_rating !== undefined) updateData.cleanliness_rating = cleanliness_rating;
    if (timeliness_rating !== undefined) updateData.timeliness_rating = timeliness_rating;
    if (review_text !== undefined) updateData.review_text = review_text;
    if (is_flagged !== undefined) updateData.is_flagged = is_flagged;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (admin_response !== undefined) updateData.admin_response = admin_response;

    updateData.updated_at = new Date().toISOString();

    const { data: review, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating review:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ data: review });

  } catch (error) {
    console.error('Error in updateReview:', error);
    return res.status(500).json({ error: 'Failed to update review' });
  }
}

async function deleteReview(req: Request, res: Response) {
  try {
    const reviewId = req.params?.id || req.body?.id;
    if (!reviewId) {
      return res.status(400).json({ error: 'Review ID is required' });
    }

    const { error: deleteError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (deleteError) {
      console.error('Error deleting review:', deleteError);
      return res.status(500).json({ 
        error: deleteError.message,
        details: deleteError.details 
      });
    }

    return res.status(200).json({ 
      message: 'Review deleted successfully',
      id: reviewId 
    });

  } catch (error) {
    console.error('Error in deleteReview:', error);
    return res.status(500).json({ error: 'Failed to delete review' });
  }
}

// Moderate review (flag/unflag)
export async function handleReviewModeration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, admin_response } = req.body;

    if (!['flag', 'unflag', 'feature', 'unfeature'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be: flag, unflag, feature, or unfeature' 
      });
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (action === 'flag') {
      updateData.is_flagged = true;
    } else if (action === 'unflag') {
      updateData.is_flagged = false;
    } else if (action === 'feature') {
      updateData.is_featured = true;
    } else if (action === 'unfeature') {
      updateData.is_featured = false;
    }

    if (admin_response) {
      updateData.admin_response = admin_response;
    }

    const { data: review, error: updateError } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error moderating review:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ 
      data: review,
      message: `Review ${action}ed successfully`
    });

  } catch (error) {
    console.error('Error in handleReviewModeration:', error);
    return res.status(500).json({ error: 'Failed to moderate review' });
  }
}

// Get flagged reviews
export async function handleFlaggedReviews(req: Request, res: Response) {
  try {
    const { data: reviews, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        overall_rating,
        review_text,
        admin_response,
        created_at,
        updated_at,
        customer_profiles!inner (
          id,
          first_name,
          last_name
        ),
        bookings!inner (
          id,
          services!inner (
            id,
            name
          ),
          business_profiles!inner (
            id,
            business_name
          )
        )
      `)
      .eq('is_flagged', true)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching flagged reviews:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    const transformedReviews = reviews?.map((review: any) => ({
      ...review,
      customer_name: `${review.customer_profiles?.first_name || ''} ${review.customer_profiles?.last_name || ''}`.trim(),
      service_name: review.bookings?.services?.name || 'Unknown Service',
      business_name: review.bookings?.business_profiles?.business_name || 'Unknown Business'
    })) || [];

    return res.status(200).json({ data: transformedReviews });

  } catch (error) {
    console.error('Error in handleFlaggedReviews:', error);
    return res.status(500).json({ error: 'Failed to fetch flagged reviews' });
  }
}