import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Building2,
  User,
  UserCheck,
  Package,
  Calendar,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  Edit,
  Shield,
} from "lucide-react";

// Types
interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  service_rating?: number;
  communication_rating?: number;
  punctuality_rating?: number;
  review_text?: string;
  is_approved: boolean;
  is_featured: boolean;
  moderated_by?: string;
  moderated_at?: string;
  moderation_notes?: string;
  created_at: string;
  bookings?: {
    id: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
    };
    providers?: {
      id: string;
      first_name: string;
      last_name: string;
      business_profiles?: {
        id: string;
        business_name: string;
      };
    };
    services?: {
      id: string;
      name: string;
    };
  };
  admin_users?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface ReviewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onApproveReview: (review: Review) => void;
  onDisapproveReview: (review: Review) => void;
  onFeatureReview: (review: Review) => void;
  onUnfeatureReview: (review: Review) => void;
  onEditModerationNotes: (review: Review) => void;
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
  getCustomerName: (review: Review) => string;
  getProviderName: (review: Review) => string;
  getBusinessName: (review: Review) => string;
  getServiceName: (review: Review) => string;
  getModeratorName: (review: Review) => string | null;
}

export function ReviewDetailsModal({
  isOpen,
  onClose,
  review,
  onApproveReview,
  onDisapproveReview,
  onFeatureReview,
  onUnfeatureReview,
  onEditModerationNotes,
  formatDate,
  formatDateTime,
  getCustomerName,
  getProviderName,
  getBusinessName,
  getServiceName,
  getModeratorName,
}: ReviewDetailsModalProps) {
  
  if (!review) return null;

  const renderStars = (rating: number, size: "sm" | "md" = "md") => {
    const stars = [];
    const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(
          <Star
            key={i}
            className={`${iconSize} fill-roam-yellow text-roam-yellow`}
          />,
        );
      } else {
        stars.push(<Star key={i} className={`${iconSize} text-gray-300`} />);
      }
    }

    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-roam-yellow" />
            Review Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Service Information</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Service</div>
                    <div className="font-medium">{getServiceName(review)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Business</div>
                    <div className="font-medium">{getBusinessName(review)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Provider</div>
                    <div className="font-medium">{getProviderName(review)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Review Date</div>
                    <div className="font-medium">{formatDate(review.created_at)}</div>
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>

            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Customer Information</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Customer</div>
                    <div className="font-medium">{getCustomerName(review)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Overall Rating</div>
                    <div className="flex items-center gap-2 mt-1">
                      {renderStars(review.overall_rating)}
                      <span className="font-semibold">{review.overall_rating}/5</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      <ROAMBadge variant={review.is_approved ? "success" : "warning"}>
                        {review.is_approved ? "Approved" : "Pending"}
                      </ROAMBadge>
                      {review.is_featured && (
                        <ROAMBadge variant="secondary">
                          <Crown className="w-3 h-3 mr-1" />
                          Featured
                        </ROAMBadge>
                      )}
                    </div>
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </div>

          {/* Rating Breakdown */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="text-base">Rating Breakdown</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Star className="w-5 h-5 fill-roam-yellow text-roam-yellow" />
                    <span className="text-xl font-bold">{review.overall_rating}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Rating</div>
                </div>

                {review.service_rating && (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="w-5 h-5 fill-roam-blue text-roam-blue" />
                      <span className="text-xl font-bold">{review.service_rating}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Service Quality</div>
                  </div>
                )}

                {review.communication_rating && (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <MessageSquare className="w-5 h-5 text-roam-success" />
                      <span className="text-xl font-bold">{review.communication_rating}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Communication</div>
                  </div>
                )}

                {review.punctuality_rating && (
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Clock className="w-5 h-5 text-roam-warning" />
                      <span className="text-xl font-bold">{review.punctuality_rating}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">Punctuality</div>
                  </div>
                )}
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Review Text */}
          {review.review_text && (
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Customer Review</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="p-4 bg-muted/30 border-l-4 border-roam-blue rounded-lg">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-roam-blue mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm leading-relaxed italic">
                        "{review.review_text}"
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{getCustomerName(review)}</span>
                        <span>•</span>
                        <span>{formatDate(review.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          )}

          {/* Moderation Actions */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="text-base">Moderation Actions</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="flex flex-wrap gap-3">
                {!review.is_approved ? (
                  <Button
                    onClick={() => onApproveReview(review)}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Review
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => onDisapproveReview(review)}
                    className="flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Disapprove Review
                  </Button>
                )}

                {!review.is_featured ? (
                  <Button
                    variant="outline"
                    onClick={() => onFeatureReview(review)}
                    disabled={!review.is_approved || review.overall_rating < 4}
                    className="flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Feature Review
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => onUnfeatureReview(review)}
                    className="flex items-center gap-2"
                  >
                    <Crown className="w-4 h-4" />
                    Unfeature Review
                  </Button>
                )}

                <Button
                  variant="outline"
                  onClick={() => onEditModerationNotes(review)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Notes
                </Button>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          {/* Moderation Information */}
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Moderation Information
              </ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Edit className="w-4 h-4 text-muted-foreground" />
                    <div className="font-medium">Moderation Notes</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEditModerationNotes(review)}
                  >
                    Edit Notes
                  </Button>
                </div>
                {review.moderation_notes ? (
                  <div className="p-2 bg-muted/50 rounded text-sm">
                    {review.moderation_notes}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">
                    No moderation notes added yet
                  </div>
                )}
                {getModeratorName(review) && (
                  <div className="text-xs text-muted-foreground mt-2">
                    Last moderated by {getModeratorName(review)}
                    {review.moderated_at && (
                      <>
                        {" "}
                        on {formatDateTime(review.moderated_at)}
                      </>
                    )}
                  </div>
                )}
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>
      </DialogContent>
    </Dialog>
  );
}