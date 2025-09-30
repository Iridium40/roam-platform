import { Plus, Eye, Edit, Trash2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROAMBadge } from "@/components/ui/roam-badge";

type VerificationStatus =
  | "pending"
  | "documents_submitted"
  | "under_review"
  | "approved"
  | "rejected";

type BackgroundCheckStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected";

type ProviderRole = "provider" | "owner" | "dispatcher";

interface Provider {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  bio: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  date_of_birth: string | null;
  experience_years: number | null;
  verification_status: VerificationStatus;
  background_check_status: BackgroundCheckStatus;
  provider_role: ProviderRole;
  business_managed: boolean;
  notification_email: string | null;
  notification_phone: string | null;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
  business_name: string;
}

interface ProviderActionsProps {
  provider: Provider;
  onView: (provider: Provider) => void;
  onEdit?: (provider: Provider) => void;
  onDelete?: (provider: Provider) => void;
  onToggleStatus?: (provider: Provider) => void;
}

export function ProviderActions({
  provider,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: ProviderActionsProps) {
  const getVerificationBadgeVariant = (
    status: VerificationStatus
  ): "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "neutral" => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "under_review":
        return "warning";
      case "documents_submitted":
        return "outline";
      case "pending":
      default:
        return "secondary";
    }
  };

  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ROAMBadge
          variant={provider.is_active ? "success" : "secondary"}
          className="text-xs"
        >
          {provider.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
        <ROAMBadge
          variant={getVerificationBadgeVariant(provider.verification_status)}
          className="text-xs"
        >
          {formatEnumDisplay(provider.verification_status)}
        </ROAMBadge>
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(provider)}
          className="h-8 w-8 p-0"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(provider)}
            className="h-8 w-8 p-0"
            title="Edit Provider"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        
        {onToggleStatus && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(provider)}
            className="h-8 w-8 p-0"
            title={provider.is_active ? "Deactivate" : "Activate"}
          >
            {provider.is_active ? (
              <UserX className="h-4 w-4 text-destructive" />
            ) : (
              <UserCheck className="h-4 w-4 text-success" />
            )}
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(provider)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Delete Provider"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface BulkActionsProps {
  selectedProviders: string[];
  onAddProvider: () => void;
  onBulkAction?: (action: string, providerIds: string[]) => void;
}

export function BulkActions({
  selectedProviders,
  onAddProvider,
  onBulkAction,
}: BulkActionsProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {selectedProviders.length > 0 && onBulkAction && (
          <>
            <span className="text-sm text-muted-foreground">
              {selectedProviders.length} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("activate", selectedProviders)}
            >
              Activate Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction("deactivate", selectedProviders)}
            >
              Deactivate Selected
            </Button>
          </>
        )}
      </div>
      
      <Button
        onClick={onAddProvider}
        className="flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add Provider
      </Button>
    </div>
  );
}