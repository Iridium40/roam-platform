import React from 'react';
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import {
  ThumbsUp,
  ThumbsDown,
  Star,
  CheckCircle,
  Clock,
  Crown,
} from "lucide-react";

interface Review {
  id: string;
  overall_rating: number;
  is_approved: boolean;
  is_featured: boolean;
}

interface ReviewOverviewProps {
  reviews: Review[];
}

export function ReviewOverview({ reviews }: ReviewOverviewProps) {
  // Calculate stats from reviews data
  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter((r) => r.is_approved).length;
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const featuredReviews = reviews.filter((r) => r.is_featured).length;
  const highRatingReviews = reviews.filter((r) => r.overall_rating >= 4).length;
  const lowRatingReviews = reviews.filter((r) => r.overall_rating <= 2).length;
  const mediumRatingReviews = reviews.filter((r) => r.overall_rating === 3).length;

  return (
    <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Review Quality Distribution */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Review Quality Distribution</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-roam-success" />
                <span className="text-sm font-medium">
                  High Ratings (4-5★)
                </span>
              </div>
              <span className="text-lg font-bold">
                {highRatingReviews}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-roam-warning" />
                <span className="text-sm font-medium">
                  Medium Ratings (3★)
                </span>
              </div>
              <span className="text-lg font-bold">
                {mediumRatingReviews}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ThumbsDown className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">
                  Low Ratings (1-2★)
                </span>
              </div>
              <span className="text-lg font-bold">
                {lowRatingReviews}
              </span>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {totalReviews > 0 
                  ? Math.round((highRatingReviews / totalReviews) * 100)
                  : 0
                }% positive reviews
              </div>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>

      {/* Moderation Status */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Moderation Status</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-roam-success" />
                <span className="text-sm font-medium">Approved</span>
              </div>
              <span className="text-lg font-bold">
                {approvedReviews}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-roam-warning" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <span className="text-lg font-bold">
                {pendingReviews}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-roam-blue" />
                <span className="text-sm font-medium">Featured</span>
              </div>
              <span className="text-lg font-bold">
                {featuredReviews}
              </span>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">
                {totalReviews > 0 
                  ? Math.round((approvedReviews / totalReviews) * 100)
                  : 0
                }% approval rate
              </div>
            </div>
          </div>
        </ROAMCardContent>
      </ROAMCard>

      {/* Rating Distribution */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle>Rating Distribution</ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = reviews.filter((r) => r.overall_rating === rating).length;
              const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star className="w-3 h-3 fill-roam-yellow text-roam-yellow" />
                  </div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-roam-blue h-2 rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-8 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </ROAMCardContent>
      </ROAMCard>
    </div>
  );
}