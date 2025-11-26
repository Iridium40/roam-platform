import { useState } from "react";
import { ROAMDataTable, type Column } from "@/components/ui/roam-data-table";
import { ServiceRowActions } from "./ServiceActions";
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

interface ServiceListProps {
  data: Service[] | ServiceCategory[] | ServiceSubcategory[] | ServiceAddon[];
  type: "services" | "categories" | "subcategories" | "addons";
  onView: (item: any) => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onToggleStatus?: (item: any) => void;
  onToggleFeatured?: (service: Service) => void;
  onTogglePopular?: (service: Service) => void;
}

export function ServiceList({
  data,
  type,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleFeatured,
  onTogglePopular,
}: ServiceListProps) {
  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };

  const getServiceColumns = (): Column[] => [
    {
      key: "name",
      header: "Service Name",
      sortable: true,
      render: (value, row: Service) => (
        <div className="flex items-center gap-3">
          {row.image_url && (
            <img
              src={row.image_url}
              alt={row.name}
              className="w-10 h-10 rounded-md object-cover"
            />
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (value, row: Service) => {
        const categoryType = row.service_subcategories?.service_categories?.service_category_type;
        return categoryType ? formatEnumDisplay(categoryType) : "N/A";
      },
    },
    {
      key: "subcategory",
      header: "Subcategory",
      render: (value, row: Service) => {
        const subcategoryType = row.service_subcategories?.service_subcategory_type;
        return subcategoryType ? formatEnumDisplay(subcategoryType) : "N/A";
      },
    },
    {
      key: "min_price",
      header: "Min Price",
      sortable: true,
      render: (value) => formatPrice(value),
    },
    {
      key: "duration_minutes",
      header: "Duration",
      render: (value) => formatDuration(value),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, row: Service) => (
        <ServiceRowActions
          item={row}
          type="service"
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
          onToggleFeatured={onToggleFeatured}
          onTogglePopular={onTogglePopular}
        />
      ),
    },
  ];

  const getCategoryColumns = (): Column[] => [
    {
      key: "name",
      header: "Category Name",
      sortable: true,
      render: (value, row: ServiceCategory) => (
        <div className="flex items-center gap-3">
          {row.image_url && (
            <img
              src={row.image_url}
              alt={row.name}
              className="w-10 h-10 rounded-md object-cover"
            />
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "service_category_type",
      header: "Type",
      render: (value) => formatEnumDisplay(value),
    },
    {
      key: "sort_order",
      header: "Sort Order",
      sortable: true,
      render: (value) => (value !== null ? value : "N/A"),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, row: ServiceCategory) => (
        <ServiceRowActions
          item={row}
          type="category"
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ),
    },
  ];

  const getSubcategoryColumns = (): Column[] => [
    {
      key: "name",
      header: "Subcategory Name",
      sortable: true,
      render: (value, row: ServiceSubcategory) => (
        <div className="flex items-center gap-3">
          {row.image_url && (
            <img
              src={row.image_url}
              alt={row.name}
              className="w-10 h-10 rounded-md object-cover"
            />
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "parent_category",
      header: "Parent Category",
      render: (value, row: ServiceSubcategory) => {
        const categoryType = row.service_categories?.service_category_type;
        return categoryType ? formatEnumDisplay(categoryType) : "N/A";
      },
    },
    {
      key: "service_subcategory_type",
      header: "Type",
      render: (value) => formatEnumDisplay(value),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, row: ServiceSubcategory) => (
        <ServiceRowActions
          item={row}
          type="subcategory"
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ),
    },
  ];

  const getAddonColumns = (): Column[] => [
    {
      key: "name",
      header: "Add-on Name",
      sortable: true,
      render: (value, row: ServiceAddon) => (
        <div className="flex items-center gap-3">
          {row.image_url && (
            <img
              src={row.image_url}
              alt={row.name}
              className="w-10 h-10 rounded-md object-cover"
            />
          )}
          <div>
            <div className="font-medium">{row.name}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground truncate max-w-xs">
                {row.description}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "updated_at",
      header: "Updated",
      sortable: true,
      render: (value) => new Date(value).toLocaleDateString(),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value, row: ServiceAddon) => (
        <ServiceRowActions
          item={row}
          type="addon"
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleStatus={onToggleStatus}
        />
      ),
    },
  ];

  const getColumns = () => {
    switch (type) {
      case "services":
        return getServiceColumns();
      case "categories":
        return getCategoryColumns();
      case "subcategories":
        return getSubcategoryColumns();
      case "addons":
        return getAddonColumns();
      default:
        return [];
    }
  };

  return (
    <ROAMDataTable
      data={data}
      columns={getColumns()}
      searchable={true}
      filterable={false}
      addable={false}
      onRowClick={onView}
    />
  );
}