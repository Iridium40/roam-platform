import React from 'react';
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import {
  Star,
  Clock,
  Crown,
  TrendingUp,
} from "lucide-react";

interface Review {
  id: string;
  overall_rating: number;
  is_approved: boolean;
  is_featured: boolean;
}

interface ReviewStatsProps {
  reviews: Review[];
}

export function ReviewStats({ reviews }: ReviewStatsProps) {
  // Calculate stats from reviews data
  const totalReviews = reviews.length;
  const approvedReviews = reviews.filter((r) => r.is_approved).length;
  const pendingReviews = reviews.filter((r) => !r.is_approved).length;
  const featuredReviews = reviews.filter((r) => r.is_featured).length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
    : 0;

  return (
    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <ROAMStatCard
        title="Total Reviews"
        value={totalReviews}
        icon={<Star className="w-5 h-5" />}
        subtitle={`${approvedReviews} approved`}
        changeType="positive"
        changeIcon={<TrendingUp className="w-3 h-3" />}
      />

      <ROAMStatCard
        title="Avg Rating"
        value={averageRating.toFixed(1)}
        icon={<Star className="w-5 h-5" />}
        subtitle="Platform average"
        changeType="neutral"
      />

      <ROAMStatCard
        title="Pending Review"
        value={pendingReviews}
        icon={<Clock className="w-5 h-5" />}
        subtitle="Need moderation"
        changeType={pendingReviews > 0 ? "neutral" : "positive"}
      />

      <ROAMStatCard
        title="Featured Reviews"
        value={featuredReviews}
        icon={<Crown className="w-5 h-5" />}
        subtitle="Marketing highlights"
        changeType="positive"
      />
    </div>
  );
}