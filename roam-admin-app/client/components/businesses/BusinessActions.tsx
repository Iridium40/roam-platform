import { Plus, Eye, Edit, Trash2, CheckCircle, XCircle, Star, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROAMBadge } from "@/components/ui/roam-badge";
import type { VerificationStatus, BusinessType } from "@roam/shared";

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_account_id: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: Record<string, any> | string | null;
  social_media: Record<string, any> | null;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: string[] | null;
  service_subcategories: string[] | null;
  is_featured: boolean | null;
}

interface BusinessActionsProps {
  onAddBusiness?: () => void;
  selectedItems?: string[];
  onBulkAction?: (action: string, itemIds: string[]) => void;
}

interface BusinessRowActionsProps {
  business: BusinessProfile;
  onView: (business: BusinessProfile) => void;
  onEdit?: (business: BusinessProfile) => void;
  onDelete?: (business: BusinessProfile) => void;
  onToggleStatus?: (business: BusinessProfile) => void;
  onToggleFeatured?: (business: BusinessProfile) => void;
  onApprove?: (business: BusinessProfile) => void;
  onReject?: (business: BusinessProfile) => void;
}

export function BusinessActions({
  onAddBusiness,
  selectedItems = [],
  onBulkAction,
}: BusinessActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {selectedItems.length > 0 && onBulkAction && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedItems.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("activate", selectedItems)}
            >
              Activate Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("deactivate", selectedItems)}
            >
              Deactivate Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("approve", selectedItems)}
            >
              Approve Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("feature", selectedItems)}
            >
              Mark Featured
            </Button>
          </>
        )}
      </div>
      
      {onAddBusiness && (
        <Button onClick={onAddBusiness} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Business
        </Button>
      )}
    </div>
  );
}

export function BusinessRowActions({
  business,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  onApprove,
  onReject,
}: BusinessRowActionsProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getVerificationStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "approved":
        return (
          <ROAMBadge variant="success" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </ROAMBadge>
        );
      case "rejected":
        return (
          <ROAMBadge variant="danger" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </ROAMBadge>
        );
      case "suspended":
        return (
          <ROAMBadge variant="warning" className="text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Suspended
          </ROAMBadge>
        );
      case "pending":
      default:
        return (
          <ROAMBadge variant="secondary" className="text-xs">
            Pending
          </ROAMBadge>
        );
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ROAMBadge
          variant={business.is_active ? "success" : "secondary"}
          className="text-xs"
        >
          {business.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
        
        {getVerificationStatusBadge(business.verification_status)}
        
        {business.is_featured && (
          <ROAMBadge variant="warning" className="text-xs">
            <Star className="w-3 h-3 mr-1" />
            Featured
          </ROAMBadge>
        )}

        {business.stripe_account_id && (
          <ROAMBadge variant="default" className="text-xs">
            Stripe Connected
          </ROAMBadge>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(business)}
          className="h-8 w-8 p-0"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(business)}
            className="h-8 w-8 p-0"
            title="Edit Business"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {business.verification_status === "pending" && onApprove && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onApprove(business)}
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
            title="Approve Business"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
        )}

        {business.verification_status === "pending" && onReject && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReject(business)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
            title="Reject Business"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        )}

        {onToggleFeatured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFeatured(business)}
            className="h-8 w-8 p-0"
            title={business.is_featured ? "Remove Featured" : "Mark Featured"}
          >
            <Star className={`h-4 w-4 ${business.is_featured ? 'fill-current text-yellow-500' : ''}`} />
          </Button>
        )}

        {onToggleStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(business)}
            className="h-8 w-8 p-0"
            title={business.is_active ? "Deactivate" : "Activate"}
          >
            <Settings className="h-4 w-4" />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(business)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Delete Business"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}