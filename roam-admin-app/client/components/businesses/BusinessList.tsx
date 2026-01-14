import { ROAMDataTable, type Column } from "@/components/ui/roam-data-table";
import { BusinessRowActions } from "./BusinessActions";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Building2, Globe, Mail, Phone, CreditCard, Star } from "lucide-react";
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

interface BusinessListProps {
  data: BusinessProfile[];
  onView: (business: BusinessProfile) => void;
  onEdit?: (business: BusinessProfile) => void;
  onDelete?: (business: BusinessProfile) => void;
  onToggleStatus?: (business: BusinessProfile) => void;
  onToggleFeatured?: (business: BusinessProfile) => void;
  onApprove?: (business: BusinessProfile) => void;
  onReject?: (business: BusinessProfile) => void;
}

export function BusinessList({
  data,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  onApprove,
  onReject,
}: BusinessListProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatBusinessType = (type: BusinessType): string => {
    const typeMap: Record<BusinessType, string> = {
      independent: "Independent",
      business: "Business",
    };
    return typeMap[type] || formatEnumDisplay(type);
  };

  const getVerificationStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "approved":
        return <ROAMBadge variant="success">Approved</ROAMBadge>;
      case "rejected":
        return <ROAMBadge variant="danger">Rejected</ROAMBadge>;
      case "suspended":
        return <ROAMBadge variant="warning">Suspended</ROAMBadge>;
      case "pending":
      default:
        return <ROAMBadge variant="secondary">Pending</ROAMBadge>;
    }
  };

  const columns: Column[] = [
    {
      key: "business_name",
      header: "Business Name",
      sortable: true,
      render: (value, row: BusinessProfile) => (
        <div className="flex items-center gap-3">
          {row.logo_url ? (
            <img
              src={row.logo_url}
              alt={row.business_name}
              className="w-10 h-10 rounded-md object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
              <Building2 className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
          <div>
            <div className="font-medium">{row.business_name}</div>
            <div className="text-sm text-muted-foreground">
              ID: {row.id.substring(0, 8)}...
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contact_info",
      header: "Contact",
      render: (value, row: BusinessProfile) => (
        <div className="space-y-1">
          {row.contact_email && (
            <div className="flex items-center gap-1 text-sm">
              <Mail className="w-3 h-3 text-muted-foreground" />
              <span className="truncate max-w-xs">{row.contact_email}</span>
            </div>
          )}
          {row.phone && (
            <div className="flex items-center gap-1 text-sm">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span>{row.phone}</span>
            </div>
          )}
          {row.website_url && (
            <div className="flex items-center gap-1 text-sm">
              <Globe className="w-3 h-3 text-muted-foreground" />
              <a
                href={row.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 truncate max-w-xs"
              >
                Website
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "business_type",
      header: "Type",
      sortable: true,
      render: (value: BusinessType) => formatBusinessType(value),
    },
    {
      key: "verification_status",
      header: "Verification",
      sortable: true,
      render: (value: VerificationStatus) => getVerificationStatusBadge(value),
    },
    {
      key: "features",
      header: "Features",
      render: (value, row: BusinessProfile) => (
        <div className="flex flex-wrap gap-1">
          {row.stripe_account_id && (
            <ROAMBadge variant="default" className="text-xs">
              <CreditCard className="w-3 h-3 mr-1" />
              Stripe
            </ROAMBadge>
          )}
          {row.is_featured && (
            <ROAMBadge variant="warning" className="text-xs">
              <Star className="w-3 h-3 mr-1" />
              Featured
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "service_categories",
      header: "Services",
      render: (value, row: BusinessProfile) => (
        <div className="space-y-1">
          {row.service_categories && row.service_categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {row.service_categories.slice(0, 2).map((category, index) => (
                <ROAMBadge key={index} variant="outline" className="text-xs">
                  {formatEnumDisplay(category)}
                </ROAMBadge>
              ))}
              {row.service_categories.length > 2 && (
                <ROAMBadge variant="outline" className="text-xs">
                  +{row.service_categories.length - 2} more
                </ROAMBadge>
              )}
            </div>
          )}
          {row.service_subcategories && row.service_subcategories.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {row.service_subcategories.length} subcategories
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => {
        const date = new Date(value);
        return (
          <div className="text-sm">
            <div>{date.toLocaleDateString()}</div>
            <div className="text-muted-foreground text-xs">
              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, row: BusinessProfile) => (
        <BusinessRowActions
          business={row}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
          onToggleFeatured={onToggleFeatured}
          onApprove={onApprove}
          onReject={onReject}
        />
      ),
    },
  ];

  return (
    <ROAMDataTable
      data={data}
      columns={columns}
      searchable={true}
      filterable={false}
      addable={false}
      onRowClick={onView}
    />
  );
}