// Optimized Admin Reviews Queries using React Query
// This file contains the React Query hooks for AdminReviews page

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// Types
export interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating: number | null;
  communication_rating: number | null;
  punctuality_rating: number | null;
  review_text: string | null;
  is_approved: boolean;
  is_featured: boolean;
  moderated_by: string | null;
  moderated_at: string | null;
  moderation_notes: string | null;
  created_at: string;
  bookings?: {
    id: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
    } | null;
    providers?: {
      id: string;
      first_name: string;
      last_name: string;
      business_profiles?: {
        id: string;
        business_name: string;
      } | null;
    } | null;
    services?: {
      id: string;
      name: string;
    } | null;
  } | null;
  admin_users?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  total: number;
  page: number;
  limit: number;
}

// Query Keys
export const reviewKeys = {
  all: ['admin-reviews'] as const,
  lists: () => [...reviewKeys.all, 'list'] as const,
  list: (page: number, limit: number, filter?: string) =>
    [...reviewKeys.lists(), { page, limit, filter }] as const,
  detail: (id: string) => [...reviewKeys.all, 'detail', id] as const,
};

// Fetch Reviews with Pagination
export function useReviews(page: number = 1, limit: number = 25, filter?: string) {
  return useQuery({
    queryKey: reviewKeys.list(page, limit, filter),
    queryFn: async (): Promise<ReviewsResponse> => {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('reviews')
        .select(
          `
          *,
          bookings (
            id,
            customer_profiles (
              id,
              first_name,
              last_name
            ),
            providers (
              id,
              first_name,
              last_name,
              business_profiles (
                id,
                business_name
              )
            ),
            services (
              id,
              name
            )
          ),
          admin_users (
            id,
            first_name,
            last_name
          )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(from, to);

      // Apply filter if provided
      if (filter) {
        if (filter === 'approved') {
          query = query.eq('is_approved', true);
        } else if (filter === 'pending') {
          query = query.eq('is_approved', false);
        } else if (filter === 'featured') {
          query = query.eq('is_featured', true);
        } else if (filter === 'low-rating') {
          query = query.lte('overall_rating', 2);
        }
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching reviews:', error);
        throw new Error(`Failed to fetch reviews: ${error.message}`);
      }

      return {
        reviews: data || [],
        total: count || 0,
        page,
        limit,
      };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime in v4)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Approve Review Mutation
export function useApproveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      adminUserId,
      moderationNotes,
    }: {
      reviewId: string;
      adminUserId: string;
      moderationNotes?: string;
    }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          is_approved: true,
          moderated_by: adminUserId,
          moderated_at: new Date().toISOString(),
          moderation_notes: moderationNotes || null,
        } as Record<string, unknown>)
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: () => {
      // Invalidate all review queries to refetch
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

// Reject Review Mutation
export function useRejectReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      adminUserId,
      moderationNotes,
    }: {
      reviewId: string;
      adminUserId: string;
      moderationNotes: string;
    }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          is_approved: false,
          moderated_by: adminUserId,
          moderated_at: new Date().toISOString(),
          moderation_notes: moderationNotes,
        } as Record<string, unknown>)
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

// Feature Review Mutation
export function useFeatureReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      isFeatured,
    }: {
      reviewId: string;
      isFeatured: boolean;
    }) => {
      const { data, error } = await supabase
        .from('reviews')
        .update({ is_featured: isFeatured } as Record<string, unknown>)
        .eq('id', reviewId)
        .select()
        .single();

      if (error) throw error;
      return data as Review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

// Delete Review Mutation
export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.from('reviews').delete().eq('id', reviewId);

      if (error) throw error;
      return reviewId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewKeys.lists() });
    },
  });
}

// Helper hook for review stats (memoized)
export function useReviewStats(reviews: Review[] | undefined) {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      approvedReviews: 0,
      pendingReviews: 0,
      featuredReviews: 0,
      averageRating: 0,
      lowRatingReviews: 0,
      highRatingReviews: 0,
    };
  }

  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter((r) => r.is_approved).length;
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const featuredReviews = reviews.filter((r) => r.is_featured).length;
  const averageRating =
    reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews;
  const lowRatingReviews = reviews.filter((r) => r.overall_rating <= 2).length;
  const highRatingReviews = reviews.filter((r) => r.overall_rating >= 4).length;

  return {
    totalReviews,
    approvedReviews,
    pendingReviews,
    featuredReviews,
    averageRating,
    lowRatingReviews,
    highRatingReviews,
  };
}
