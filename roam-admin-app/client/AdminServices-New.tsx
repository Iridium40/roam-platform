import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ServiceFilters } from "./components/services/ServiceFilters";
import { ServiceActions } from "./components/services/ServiceActions";
import { ServiceList } from "./components/services/ServiceList";
import { ServiceDetails } from "./components/services/ServiceDetails";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { BarChart3, Package, Tags, Layers, Plus } from "lucide-react";

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

interface ProviderServiceAssignment {
  id: string;
  provider_id: string;
  service_id: string;
  custom_price: number | null;
  custom_duration_minutes: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminServices() {
  const [activeTab, setActiveTab] = useState<"services" | "categories" | "subcategories" | "addons" | "assignments">("services");
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [assignments, setAssignments] = useState<ProviderServiceAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");

  // Stats calculations
  const stats = {
    totalServices: services.length,
    activeServices: services.filter(s => s.is_active).length,
    totalCategories: categories.length,
    totalSubcategories: subcategories.length,
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      switch (activeTab) {
        case "services":
          await loadServices();
          break;
        case "categories":
          await loadCategories();
          break;
        case "subcategories":
          await loadSubcategories();
          break;
        case "addons":
          await loadAddons();
          break;
        case "assignments":
          await loadAssignments();
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        service_subcategories (
          service_subcategory_type,
          service_categories (
            service_category_type
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading services:", error);
    } else {
      setServices(data || []);
    }
  };

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error loading categories:", error);
    } else {
      setCategories(data || []);
    }
  };

  const loadSubcategories = async () => {
    const { data, error } = await supabase
      .from("service_subcategories")
      .select(`
        *,
        service_categories (
          service_category_type
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading subcategories:", error);
    } else {
      setSubcategories(data || []);
    }
  };

  const loadAddons = async () => {
    const { data, error } = await supabase
      .from("service_addons")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading addons:", error);
    } else {
      setAddons(data || []);
    }
  };

  const loadAssignments = async () => {
    const { data, error } = await supabase
      .from("provider_service_assignments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading assignments:", error);
    } else {
      setAssignments(data || []);
    }
  };

  const getFilteredData = () => {
    let data: any[] = [];
    
    switch (activeTab) {
      case "services":
        data = services;
        break;
      case "categories":
        data = categories;
        break;
      case "subcategories":
        data = subcategories;
        break;
      case "addons":
        data = addons;
        break;
      case "assignments":
        data = assignments;
        break;
    }

    // Apply status filter
    if (statusFilter !== "all") {
      data = data.filter(item => {
        if (statusFilter === "active") return item.is_active === true;
        if (statusFilter === "inactive") return item.is_active === false;
        return true;
      });
    }

    // Apply category filter for services
    if (activeTab === "services" && categoryFilter !== "all") {
      data = data.filter(service => 
        service.service_subcategories?.service_categories?.service_category_type === categoryFilter
      );
    }

    // Apply subcategory filter for services
    if (activeTab === "services" && subcategoryFilter !== "all") {
      data = data.filter(service => 
        service.service_subcategories?.service_subcategory_type === subcategoryFilter
      );
    }

    return data;
  };

  const handleViewItem = (item: any) => {
    setSelectedItemId(item.id);
    setIsDetailsOpen(true);
  };

  const handleEditItem = (item: any) => {
    // TODO: Implement edit functionality
    console.log("Edit item:", item);
  };

  const handleDeleteItem = (item: any) => {
    // TODO: Implement delete functionality
    console.log("Delete item:", item);
  };

  const handleToggleStatus = async (item: any) => {
    const tableName = getTableName(activeTab);
    if (!tableName) return;

    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: !item.is_active })
        .eq("id", item.id);

      if (error) {
        console.error("Error updating status:", error);
      } else {
        await loadData();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleToggleFeatured = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_featured: !service.is_featured })
        .eq("id", service.id);

      if (error) {
        console.error("Error updating featured status:", error);
      } else {
        await loadServices();
      }
    } catch (error) {
      console.error("Error updating featured status:", error);
    }
  };

  const handleTogglePopular = async (service: Service) => {
    try {
      const { error } = await supabase
        .from("services")
        .update({ is_popular: !service.is_popular })
        .eq("id", service.id);

      if (error) {
        console.error("Error updating popular status:", error);
      } else {
        await loadServices();
      }
    } catch (error) {
      console.error("Error updating popular status:", error);
    }
  };

  const getTableName = (tab: string): string | null => {
    switch (tab) {
      case "services":
        return "services";
      case "categories":
        return "service_categories";
      case "subcategories":
        return "service_subcategories";
      case "addons":
        return "service_addons";
      case "assignments":
        return "provider_service_assignments";
      default:
        return null;
    }
  };

  const getSelectedItem = () => {
    if (!selectedItemId) return null;
    
    const data = getFilteredData();
    return data.find(item => item.id === selectedItemId);
  };

  const getItemType = (): "service" | "category" | "subcategory" | "addon" => {
    switch (activeTab) {
      case "services":
        return "service";
      case "categories":
        return "category";
      case "subcategories":
        return "subcategory";
      case "addons":
        return "addon";
      default:
        return "service";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Management</h1>
        <p className="text-muted-foreground">
          Manage services, categories, subcategories, and provider assignments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ROAMStatCard
          title="Total Services"
          value={stats.totalServices.toString()}
          icon={<Package className="w-6 h-6" />}
        />
        <ROAMStatCard
          title="Active Services"
          value={stats.activeServices.toString()}
          icon={<BarChart3 className="w-6 h-6" />}
        />
        <ROAMStatCard
          title="Categories"
          value={stats.totalCategories.toString()}
          icon={<Tags className="w-6 h-6" />}
        />
        <ROAMStatCard
          title="Subcategories"
          value={stats.totalSubcategories.toString()}
          icon={<Layers className="w-6 h-6" />}
        />
      </div>

      {/* Filters */}
      <ServiceFilters
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        subcategoryFilter={subcategoryFilter}
        setSubcategoryFilter={setSubcategoryFilter}
        categories={categories}
        subcategories={subcategories}
        onRefresh={loadData}
        isLoading={isLoading}
      />

      {/* Actions */}
      <ServiceActions
        activeTab={activeTab}
        onAddService={() => console.log("Add service")}
        onAddCategory={() => console.log("Add category")}
        onAddSubcategory={() => console.log("Add subcategory")}
        onAddAddon={() => console.log("Add addon")}
        onCreateAssignment={() => console.log("Create assignment")}
      />

      {/* Data List */}
      {activeTab === "assignments" ? (
        <div className="bg-card rounded-lg border border-border p-6">
          <p className="text-muted-foreground">
            Provider service assignments will be displayed here.
          </p>
        </div>
      ) : (
        <ServiceList
          data={getFilteredData()}
          type={activeTab}
          onView={handleViewItem}
          onEdit={handleEditItem}
          onDelete={handleDeleteItem}
          onToggleStatus={handleToggleStatus}
          onToggleFeatured={handleToggleFeatured}
          onTogglePopular={handleTogglePopular}
        />
      )}

      {/* Details Modal */}
      <ServiceDetails
        item={getSelectedItem()}
        type={getItemType()}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedItemId(null);
        }}
        onEdit={handleEditItem}
      />
    </div>
  );
}