import { useState } from "react";
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { ProviderActions } from "./ProviderActions";
import { Star, Phone, Mail } from "lucide-react";

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

interface ProviderListProps {
  providers: Provider[];
  loading: boolean;
  selectedProviders: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onProviderView: (provider: Provider) => void;
  onProviderEdit?: (provider: Provider) => void;
  onProviderDelete?: (provider: Provider) => void;
  onProviderToggleStatus?: (provider: Provider) => void;
}

export function ProviderList({
  providers,
  loading,
  selectedProviders,
  onSelectionChange,
  onProviderView,
  onProviderEdit,
  onProviderDelete,
  onProviderToggleStatus,
}: ProviderListProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getRoleBadgeVariant = (
    role: ProviderRole
  ): "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "neutral" => {
    switch (role) {
      case "owner":
        return "success";
      case "dispatcher":
        return "warning";
      case "provider":
      default:
        return "outline";
    }
  };

  const columns: Column[] = [
    {
      key: "provider",
      header: "Provider",
      render: (value, provider: Provider) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-roam-blue/10 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-roam-blue">
              {provider.first_name.charAt(0)}
              {provider.last_name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-medium">
              {provider.first_name} {provider.last_name}
            </div>
            <div className="text-sm text-muted-foreground">{provider.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "business",
      header: "Business",
      render: (value, provider: Provider) => (
        <div>
          <div className="font-medium">{provider.business_name}</div>
          <ROAMBadge
            variant={getRoleBadgeVariant(provider.provider_role)}
            className="text-xs mt-1"
          >
            {formatEnumDisplay(provider.provider_role)}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      render: (value, provider: Provider) => (
        <div className="space-y-1">
          {provider.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <a
                href={`tel:${provider.phone}`}
                className="hover:text-roam-blue hover:underline transition-colors"
              >
                {provider.phone}
              </a>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-3 h-3 text-muted-foreground" />
            <a
              href={`mailto:${provider.email}`}
              className="hover:text-roam-blue hover:underline transition-colors"
            >
              {provider.email}
            </a>
          </div>
        </div>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      render: (value, provider: Provider) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 fill-roam-yellow text-roam-yellow" />
            <span className="text-sm font-medium">
              {provider.average_rating.toFixed(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({provider.total_reviews})
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            {provider.completed_bookings}/{provider.total_bookings} completed
          </div>
        </div>
      ),
    },
    {
      key: "experience",
      header: "Experience",
      render: (value, provider: Provider) => (
        <div className="text-sm">
          {provider.experience_years ? (
            <span>
              {provider.experience_years} year{provider.experience_years !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Not specified</span>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
      sortable: true,
      render: (value, provider: Provider) => (
        <div className="text-sm">
          {new Date(provider.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Status & Actions",
      render: (value, provider: Provider) => (
        <ProviderActions
          provider={provider}
          onView={onProviderView}
          onEdit={onProviderEdit}
          onDelete={onProviderDelete}
          onToggleStatus={onProviderToggleStatus}
        />
      ),
    },
  ];

  return (
    <div className="mt-4">
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="text-muted-foreground">Loading providers...</div>
        </div>
      ) : (
        <ROAMDataTable
          data={providers}
          columns={columns}
          searchable
          onRowClick={onProviderView}
        />
      )}
    </div>
  );
}