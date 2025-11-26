import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerificationStatus =
  | "pending"
  | "documents_submitted"
  | "under_review"
  | "approved"
  | "rejected";

type ProviderRole = "provider" | "owner" | "dispatcher";

interface ProviderFiltersProps {
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (status: "all" | "active" | "inactive") => void;
  verificationFilter: "all" | VerificationStatus;
  setVerificationFilter: (status: "all" | VerificationStatus) => void;
  roleFilter: "all" | ProviderRole;
  setRoleFilter: (role: "all" | ProviderRole) => void;
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ProviderFilters({
  statusFilter,
  setStatusFilter,
  verificationFilter,
  setVerificationFilter,
  roleFilter,
  setRoleFilter,
  onRefresh,
  isLoading = false,
}: ProviderFiltersProps) {
  return (
    <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
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
        <label className="text-sm font-medium">Verification Status:</label>
        <select
          value={verificationFilter}
          onChange={(e) =>
            setVerificationFilter(e.target.value as "all" | VerificationStatus)
          }
          className="px-3 py-1 border border-border rounded-md text-sm bg-background"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="documents_submitted">Documents Submitted</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium">Role:</label>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as "all" | ProviderRole)}
          className="px-3 py-1 border border-border rounded-md text-sm bg-background"
        >
          <option value="all">All</option>
          <option value="provider">Provider</option>
          <option value="owner">Owner</option>
          <option value="dispatcher">Dispatcher</option>
        </select>
      </div>

      <div className="ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </div>
  );
}