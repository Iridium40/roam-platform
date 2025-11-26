import { Plus, Eye, Edit, Trash2, Star, Crown, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROAMBadge } from "@/components/ui/roam-badge";

type ServiceCategoryType = string;
type ServiceSubcategoryType = string;

interface Service {
  id: string;
  subcategory_id: string;
  name: string;
  description: string | null;
  min_price: number;
  duration_minutes: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  is_featured: boolean;
  is_popular: boolean;
  service_subcategories?: {
    service_subcategory_type: ServiceSubcategoryType;
    service_categories?: {
      service_category_type: ServiceCategoryType;
    };
  };
}

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

interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceActionsProps {
  activeTab: "services" | "categories" | "subcategories" | "addons" | "assignments";
  onAddService?: () => void;
  onAddCategory?: () => void;
  onAddSubcategory?: () => void;
  onAddAddon?: () => void;
  onCreateAssignment?: () => void;
  selectedItems?: string[];
  onBulkAction?: (action: string, itemIds: string[]) => void;
}

interface ServiceRowActionsProps {
  item: Service | ServiceCategory | ServiceSubcategory | ServiceAddon;
  type: "service" | "category" | "subcategory" | "addon";
  onView: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onToggleStatus?: (item: any) => void;
  onToggleFeatured?: (service: Service) => void;
  onTogglePopular?: (service: Service) => void;
}

export function ServiceActions({
  activeTab,
  onAddService,
  onAddCategory,
  onAddSubcategory,
  onAddAddon,
  onCreateAssignment,
  selectedItems = [],
  onBulkAction,
}: ServiceActionsProps) {
  const getAddButtonText = () => {
    switch (activeTab) {
      case "services":
        return "Add Service";
      case "categories":
        return "Add Category";
      case "subcategories":
        return "Add Subcategory";
      case "addons":
        return "Add Add-on";
      case "assignments":
        return "Create Assignment";
      default:
        return "Add Item";
    }
  };

  const getAddHandler = () => {
    switch (activeTab) {
      case "services":
        return onAddService;
      case "categories":
        return onAddCategory;
      case "subcategories":
        return onAddSubcategory;
      case "addons":
        return onAddAddon;
      case "assignments":
        return onCreateAssignment;
      default:
        return undefined;
    }
  };

  const addHandler = getAddHandler();

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
            {activeTab === "services" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("feature", selectedItems)}
                >
                  Mark Featured
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onBulkAction("popular", selectedItems)}
                >
                  Mark Popular
                </Button>
              </>
            )}
          </>
        )}
      </div>
      
      {addHandler && (
        <Button onClick={addHandler} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {getAddButtonText()}
        </Button>
      )}
    </div>
  );
}

export function ServiceRowActions({
  item,
  type,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  onTogglePopular,
}: ServiceRowActionsProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const isService = type === "service";
  const service = isService ? (item as Service) : null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <ROAMBadge
          variant={item.is_active ? "success" : "secondary"}
          className="text-xs"
        >
          {item.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
        
        {isService && service && (
          <>
            {service.is_featured && (
              <ROAMBadge variant="warning" className="text-xs">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </ROAMBadge>
            )}
            {service.is_popular && (
              <ROAMBadge variant="danger" className="text-xs">
                <Flame className="w-3 h-3 mr-1" />
                Popular
              </ROAMBadge>
            )}
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(item)}
          className="h-8 w-8 p-0"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </Button>
        
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(item)}
            className="h-8 w-8 p-0"
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {isService && service && onToggleFeatured && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFeatured(service)}
            className="h-8 w-8 p-0"
            title={service.is_featured ? "Remove Featured" : "Mark Featured"}
          >
            <Star className={`h-4 w-4 ${service.is_featured ? 'fill-current text-yellow-500' : ''}`} />
          </Button>
        )}

        {isService && service && onTogglePopular && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTogglePopular(service)}
            className="h-8 w-8 p-0"
            title={service.is_popular ? "Remove Popular" : "Mark Popular"}
          >
            <Flame className={`h-4 w-4 ${service.is_popular ? 'fill-current text-red-500' : ''}`} />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}