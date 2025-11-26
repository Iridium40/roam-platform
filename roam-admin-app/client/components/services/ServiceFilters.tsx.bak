import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ServiceCategoryType = string;
type ServiceSubcategoryType = string;

interface ServiceCategory {
  id: string;
  name: string;
  service_category_type: ServiceCategoryType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  sort_order: number | null;
}

interface ServiceSubcategory {
  id: string;
  category_id: string;
  name: string;
  service_subcategory_type: ServiceSubcategoryType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  service_categories?: {
    service_category_type: ServiceCategoryType;
  };
}

interface ServiceFiltersProps {
  activeTab: "services" | "categories" | "subcategories" | "addons" | "assignments";
  setActiveTab: (tab: "services" | "categories" | "subcategories" | "addons" | "assignments") => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (status: "all" | "active" | "inactive") => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  subcategoryFilter: string;
  setSubcategoryFilter: (subcategory: string) => void;
  categories: ServiceCategory[];
  subcategories: ServiceSubcategory[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export function ServiceFilters({
  activeTab,
  setActiveTab,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  subcategoryFilter,
  setSubcategoryFilter,
  categories,
  subcategories,
  onRefresh,
  isLoading = false,
}: ServiceFiltersProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "services" as const, label: "Services", count: null },
            { id: "categories" as const, label: "Categories", count: null },
            { id: "subcategories" as const, label: "Subcategories", count: null },
            { id: "addons" as const, label: "Add-ons", count: null },
            { id: "assignments" as const, label: "Assignments", count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? "border-roam-blue text-roam-blue"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }
              `}
            >
              {tab.label}
              {tab.count && (
                <span className="ml-2 py-0.5 px-2 rounded-full bg-muted text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Status:</label>
          <Select
            value={statusFilter}
            onValueChange={(value: "all" | "active" | "inactive") =>
              setStatusFilter(value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeTab === "services" && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Category:</label>
              <Select
                value={categoryFilter}
                onValueChange={setCategoryFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories
                    .filter((cat) => cat.is_active)
                    .map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {formatEnumDisplay(category.service_category_type)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Subcategory:</label>
              <Select
                value={subcategoryFilter}
                onValueChange={setSubcategoryFilter}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subcategories</SelectItem>
                  {subcategories
                    .filter((sub) => {
                      if (categoryFilter === "all") return sub.is_active;
                      return sub.category_id === categoryFilter && sub.is_active;
                    })
                    .map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        {formatEnumDisplay(subcategory.service_subcategory_type)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

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
    </div>
  );
}