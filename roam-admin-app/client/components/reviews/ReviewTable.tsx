import React from 'react';
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  StarHalf,
  CheckCircle,
  XCircle,
  Crown,
  Eye,
  Edit,
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

interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface ReviewTableProps {
  reviews: Review[];
  adminUser: AdminUser | null;
  onViewReview: (review: Review) => void;
  onApproveReview: (review: Review) => void;
  onDisapproveReview: (review: Review) => void;
  onFeatureReview: (review: Review) => void;
  onUnfeatureReview: (review: Review) => void;
  onEditModerationNotes: (review: Review) => void;
  formatDate: (dateString: string) => string;
  getCustomerName: (review: Review) => string;
  getProviderName: (review: Review) => string;
  getBusinessName: (review: Review) => string;
  getServiceName: (review: Review) => string;
}

export function ReviewTable({
  reviews,
  adminUser,
  onViewReview,
  onApproveReview,
  onDisapproveReview,
  onFeatureReview,
  onUnfeatureReview,
  onEditModerationNotes,
  formatDate,
  getCustomerName,
  getProviderName,
  getBusinessName,
  getServiceName,
}: ReviewTableProps) {

  const renderStars = (rating: number, size: "sm" | "md" = "sm") => {
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
      } else if (i - 0.5 <= rating) {
        stars.push(
          <StarHalf
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

  const getApprovalBadgeVariant = (isApproved: boolean) => {
    return isApproved ? "success" : "warning";
  };

  const columns: Column[] = [
    {
      key: "created_at",
      header: "Date",
      render: (value: string) => formatDate(value),
      sortable: true,
    },
    {
      key: "customer_name",
      header: "Customer",
      render: (value: any, row: Review) => getCustomerName(row),
      sortable: false,
    },
    {
      key: "provider_name",
      header: "Provider",
      render: (value: any, row: Review) => getProviderName(row),
      sortable: false,
    },
    {
      key: "business_name",
      header: "Business",
      render: (value: any, row: Review) => getBusinessName(row),
      sortable: false,
    },
    {
      key: "service_name",
      header: "Service",
      render: (value: any, row: Review) => getServiceName(row),
      sortable: false,
    },
    {
      key: "overall_rating",
      header: "Rating",
      render: (value: number) => (
        <div className="flex items-center gap-2">
          {renderStars(value)}
          <span className="text-sm font-medium">{value.toFixed(1)}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "review_text",
      header: "Review",
      render: (value: string) => (
        <div className="max-w-xs">
          {value ? (
            <p className="text-sm text-muted-foreground truncate">
              {value.substring(0, 60)}
              {value.length > 60 && "..."}
            </p>
          ) : (
            <span className="text-xs text-muted-foreground italic">
              No written review
            </span>
          )}
        </div>
      ),
      sortable: false,
    },
    {
      key: "is_approved",
      header: "Status",
      render: (value: boolean, row: Review) => (
        <div className="flex items-center gap-2">
          <ROAMBadge variant={getApprovalBadgeVariant(value)}>
            {value ? "Approved" : "Pending"}
          </ROAMBadge>
          {row.is_featured && (
            <Crown className="w-4 h-4 text-roam-warning fill-current" />
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Review) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewReview(row)}
            title="View Review Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {!row.is_approved ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-roam-success hover:text-roam-success"
              onClick={() => onApproveReview(row)}
              disabled={!adminUser?.id}
              title={
                !adminUser?.id ? "Loading admin user..." : "Approve Review"
              }
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDisapproveReview(row)}
              disabled={!adminUser?.id}
              title={
                !adminUser?.id ? "Loading admin user..." : "Disapprove Review"
              }
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
          {!row.is_featured ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-roam-warning hover:text-roam-warning"
              onClick={() => onFeatureReview(row)}
              title="Feature Review"
              disabled={!row.is_approved || row.overall_rating < 4}
            >
              <Crown className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-muted-foreground"
              onClick={() => onUnfeatureReview(row)}
              title="Unfeature Review"
            >
              <Crown className="h-4 w-4 fill-current" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEditModerationNotes(row)}
            title="Add/Edit Moderation Notes"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
      sortable: false,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">All Reviews</h2>
        <span className="text-sm text-muted-foreground">
          {reviews.length} total reviews
        </span>
      </div>
      
      <ROAMDataTable
        data={reviews}
        columns={columns}
      />
    </div>
  );
}