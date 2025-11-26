import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type BusinessType =
  | "independent"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";

interface BusinessFiltersProps {
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (status: "all" | "active" | "inactive") => void;
  verificationFilter: "all" | "verified" | "unverified";
  setVerificationFilter: (verification: "all" | "verified" | "unverified") => void;
  businessTypeFilter: "all" | BusinessType;
  setBusinessTypeFilter: (type: "all" | BusinessType) => void;
  featuredFilter: "all" | "featured" | "not_featured";
  setFeaturedFilter: (featured: "all" | "featured" | "not_featured") => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function BusinessFilters({
  statusFilter,
  setStatusFilter,
  verificationFilter,
  setVerificationFilter,
  businessTypeFilter,
  setBusinessTypeFilter,
  featuredFilter,
  setFeaturedFilter,
  onRefresh,
  isLoading = false,
}: BusinessFiltersProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "all" | "active" | "inactive")
            }
            className="px-3 py-1 border border-border rounded-md text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Verification:</label>
          <select
            value={verificationFilter}
            onChange={(e) =>
              setVerificationFilter(
                e.target.value as "all" | "verified" | "unverified"
              )
            }
            className="px-3 py-1 border border-border rounded-md text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Type:</label>
          <select
            value={businessTypeFilter}
            onChange={(e) =>
              setBusinessTypeFilter(e.target.value as "all" | BusinessType)
            }
            className="px-3 py-1 border border-border rounded-md text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="independent">Independent</option>
            <option value="small_business">Small Business</option>
            <option value="franchise">Franchise</option>
            <option value="enterprise">Enterprise</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Featured:</label>
          <select
            value={featuredFilter}
            onChange={(e) =>
              setFeaturedFilter(
                e.target.value as "all" | "featured" | "not_featured"
              )
            }
            className="px-3 py-1 border border-border rounded-md text-sm bg-background"
          >
            <option value="all">All</option>
            <option value="featured">Featured</option>
            <option value="not_featured">Not Featured</option>
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Filter Summary */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Filters:</span>
        {statusFilter !== "all" && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
            Status: {formatEnumDisplay(statusFilter)}
          </span>
        )}
        {verificationFilter !== "all" && (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md">
            Verification: {formatEnumDisplay(verificationFilter)}
          </span>
        )}
        {businessTypeFilter !== "all" && (
          <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
            Type: {formatEnumDisplay(businessTypeFilter)}
          </span>
        )}
        {featuredFilter !== "all" && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md">
            Featured: {formatEnumDisplay(featuredFilter)}
          </span>
        )}
        {statusFilter === "all" &&
          verificationFilter === "all" &&
          businessTypeFilter === "all" &&
          featuredFilter === "all" && (
            <span className="text-muted-foreground">No filters applied</span>
          )}
      </div>
    </div>
  );
}