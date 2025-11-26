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
        business_id,
        provider_id,
        overall_rating,
        service_rating,
        communication_rating,
        punctuality_rating,
        review_text,
        is_approved,
        is_featured,
        moderated_by,
        moderated_at,
        moderation_notes,
        created_at,
        bookings!inner (
          id,
          customer_id,
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
    if (status === 'approved') {
      query = query.eq('is_approved', true);
    } else if (status === 'unapproved') {
      query = query.eq('is_approved', false);
    } else if (status === 'featured') {
      query = query.eq('is_featured', true);
    }

    if (rating) {
      query = query.eq('overall_rating', parseInt(rating as string));
    }

    if (search) {
      query = query.or(`review_text.ilike.%${search}%,moderation_notes.ilike.%${search}%`);
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

    // Fetch customer names for the reviews
    const customerIds = [...new Set((reviews || []).map((r: any) => r.bookings?.customer_id).filter(Boolean))];
    let customerMap: Record<string, string> = {};
    
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customer_profiles')
        .select('id, user_id, first_name, last_name')
        .in('user_id', customerIds);
      
      if (customers) {
        customerMap = Object.fromEntries(
          customers.map((c: any) => [c.user_id, `${c.first_name || ''} ${c.last_name || ''}`.trim()])
        );
      }
    }

    // Transform the data for better frontend consumption
    const transformedReviews = reviews?.map((review: any) => ({
      ...review,
      customer_name: customerMap[review.bookings?.customer_id] || 'Unknown Customer',
      service_name: review.bookings?.services?.name || 'Unknown Service',
      business_name: review.bookings?.business_profiles?.business_name || 'Unknown Business',
      // Calculate average of all ratings
      average_rating: review.overall_rating ? (
        (review.overall_rating + 
         (review.service_rating || review.overall_rating) + 
         (review.communication_rating || review.overall_rating) + 
         (review.punctuality_rating || review.overall_rating)) / 4
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
      punctuality_rating,
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
    const ratings = [overall_rating, service_rating, communication_rating, punctuality_rating];
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
        punctuality_rating,
        review_text,
        is_featured,
        is_approved: false,
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
      punctuality_rating,
      review_text,
      is_approved,
      is_featured,
      moderated_by,
      moderation_notes
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (overall_rating !== undefined) updateData.overall_rating = overall_rating;
    if (service_rating !== undefined) updateData.service_rating = service_rating;
    if (communication_rating !== undefined) updateData.communication_rating = communication_rating;
    if (punctuality_rating !== undefined) updateData.punctuality_rating = punctuality_rating;
    if (review_text !== undefined) updateData.review_text = review_text;
    if (is_approved !== undefined) {
      updateData.is_approved = is_approved;
      // If approving/moderating, set moderated_at
      if (is_approved !== null) {
        updateData.moderated_at = new Date().toISOString();
      }
    }
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (moderated_by !== undefined) updateData.moderated_by = moderated_by;
    if (moderation_notes !== undefined) updateData.moderation_notes = moderation_notes;

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

// Moderate review (approve/reject/feature/unfeature)
export async function handleReviewModeration(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action, moderation_notes, moderated_by } = req.body;

    if (!['approve', 'reject', 'feature', 'unfeature'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be: approve, reject, feature, or unfeature' 
      });
    }

    const updateData: any = {
      moderated_at: new Date().toISOString()
    };

    if (action === 'approve') {
      updateData.is_approved = true;
    } else if (action === 'reject') {
      updateData.is_approved = false;
    } else if (action === 'feature') {
      updateData.is_featured = true;
    } else if (action === 'unfeature') {
      updateData.is_featured = false;
    }

    if (moderation_notes) {
      updateData.moderation_notes = moderation_notes;
    }

    if (moderated_by) {
      updateData.moderated_by = moderated_by;
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

// Get unapproved reviews (pending moderation)
export async function handleFlaggedReviews(req: Request, res: Response) {
  try {
    const { data: reviews, error: fetchError } = await supabase
      .from('reviews')
      .select(`
        id,
        booking_id,
        business_id,
        provider_id,
        overall_rating,
        review_text,
        moderation_notes,
        created_at,
        bookings!inner (
          id,
          customer_id,
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
      .eq('is_approved', false)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching unapproved reviews:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Fetch customer names
    const customerIds = [...new Set((reviews || []).map((r: any) => r.bookings?.customer_id).filter(Boolean))];
    let customerMap: Record<string, string> = {};
    
    if (customerIds.length > 0) {
      const { data: customers } = await supabase
        .from('customer_profiles')
        .select('id, user_id, first_name, last_name')
        .in('user_id', customerIds);
      
      if (customers) {
        customerMap = Object.fromEntries(
          customers.map((c: any) => [c.user_id, `${c.first_name || ''} ${c.last_name || ''}`.trim()])
        );
      }
    }

    const transformedReviews = reviews?.map((review: any) => ({
      ...review,
      customer_name: customerMap[review.bookings?.customer_id] || 'Unknown Customer',
      service_name: review.bookings?.services?.name || 'Unknown Service',
      business_name: review.bookings?.business_profiles?.business_name || 'Unknown Business'
    })) || [];

    return res.status(200).json({ data: transformedReviews });

  } catch (error) {
    console.error('Error in handleFlaggedReviews:', error);
    return res.status(500).json({ error: 'Failed to fetch unapproved reviews' });
  }
}