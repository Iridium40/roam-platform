import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/admin-layout";
import { ROAMDataTable, Column } from "@/components/ui/roam-data-table";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMStatCard } from "@/components/ui/roam-stat-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Settings,
  Layers,
  Grid3X3,
  Package,
  Building2,
  DollarSign,
  Clock,
  Star,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Plus,
  ChevronRight,
  Tag,
  Image,
  Crown,
  Flame,
  Puzzle,
  Calendar,
  RefreshCw,
  Link,
  Check,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ServiceCategoryType = string;

type ServiceSubcategoryType = string;

interface ServiceCategory {
  id: string;
  name: string; // Deprecated field - kept for backward compatibility
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
  name: string; // Deprecated field - kept for backward compatibility
  service_subcategory_type: ServiceSubcategoryType;
  description: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  service_categories?: {
    service_category_type: ServiceCategoryType;
  };
}

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

interface ServiceAddon {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ServiceAddonEligibility {
  id: string;
  service_id: string;
  addon_id: string;
  is_recommended: boolean;
  created_at: string;
  services?: {
    name: string;
  };
  service_addons?: {
    name: string;
  };
}

const sampleCategories: ServiceCategory[] = [
  {
    id: "cat_1",
    name: "Beauty & Wellness", // Deprecated - use service_category_type
    service_category_type: "beauty",
    description: "Professional beauty and wellness services",
    is_active: true,
    created_at: "2023-01-15T00:00:00Z",
    sort_order: 1,
  },
  {
    id: "cat_2",
    name: "Fitness & Health", // Deprecated - use service_category_type
    service_category_type: "fitness",
    description: "Personal training and health services",
    is_active: true,
    created_at: "2023-01-20T00:00:00Z",
    sort_order: 2,
  },
  {
    id: "cat_3",
    name: "Spa & Relaxation", // Deprecated - use service_category_type
    service_category_type: "therapy",
    description: "Luxury spa and relaxation treatments",
    is_active: true,
    created_at: "2023-02-01T00:00:00Z",
    sort_order: 3,
  },
];

const sampleSubcategories: ServiceSubcategory[] = [
  {
    id: "sub_1",
    category_id: "cat_1",
    category_name: "Beauty & Wellness", // Deprecated
    name: "Hair Services", // Deprecated - use service_subcategory_type
    service_subcategory_type: "hair_and_makeup",
    description: "Professional hair styling and treatments",
    is_active: true,
    created_at: "2023-01-16T00:00:00Z",
  },
  {
    id: "sub_2",
    category_id: "cat_1",
    category_name: "Beauty & Wellness", // Deprecated
    name: "Skincare", // Deprecated - use service_subcategory_type
    service_subcategory_type: "esthetician",
    description: "Facial treatments and skincare services",
    is_active: true,
    created_at: "2023-01-17T00:00:00Z",
  },
  {
    id: "sub_3",
    category_id: "cat_2",
    category_name: "Fitness & Health", // Deprecated
    name: "Personal Training", // Deprecated - use service_subcategory_type
    service_subcategory_type: "personal_trainer",
    description: "One-on-one fitness training sessions",
    is_active: true,
    created_at: "2023-01-21T00:00:00Z",
  },
  {
    id: "sub_4",
    category_id: "cat_3",
    category_name: "Spa & Relaxation", // Deprecated
    name: "Massage Therapy", // Deprecated - use service_subcategory_type
    service_subcategory_type: "massage_therapy",
    description: "Therapeutic and relaxation massage services",
    is_active: true,
    created_at: "2023-02-02T00:00:00Z",
  },
];

const sampleServices: Service[] = [
  {
    id: "srv_1",
    subcategory_id: "sub_1",
    subcategory_name: "Hair Services",
    category_name: "Beauty & Wellness",
    business_id: "biz_1",
    business_name: "Miami Spa & Wellness",
    name: "Premium Hair Cut & Style",
    description: "Professional haircut with styling consultation",
    min_price: 85.0,
    duration_minutes: 90,
    is_active: true,
    created_at: "2023-01-18T00:00:00Z",
    is_featured: true,
    is_popular: true,
  },
  {
    id: "srv_2",
    subcategory_id: "sub_2",
    subcategory_name: "Skincare",
    category_name: "Beauty & Wellness",
    business_id: "biz_1",
    business_name: "Miami Spa & Wellness",
    name: "Deep Cleansing Facial",
    description: "Intensive facial treatment for deep cleansing",
    min_price: 120.0,
    duration_minutes: 75,
    is_active: true,
    created_at: "2023-01-19T00:00:00Z",
    is_featured: false,
    is_popular: true,
  },
  {
    id: "srv_3",
    subcategory_id: "sub_3",
    subcategory_name: "Personal Training",
    category_name: "Fitness & Health",
    business_id: "biz_2",
    business_name: "Elite Fitness Center",
    name: "1-on-1 Personal Training Session",
    description: "Customized fitness training with certified trainer",
    min_price: 95.0,
    duration_minutes: 60,
    is_active: true,
    created_at: "2023-01-22T00:00:00Z",
    is_featured: true,
    is_popular: false,
  },
  {
    id: "srv_4",
    subcategory_id: "sub_4",
    subcategory_name: "Massage Therapy",
    category_name: "Spa & Relaxation",
    business_id: "biz_3",
    business_name: "Zen Massage Therapy",
    name: "Swedish Relaxation Massage",
    description: "Full body Swedish massage for deep relaxation",
    min_price: 110.0,
    duration_minutes: 60,
    is_active: true,
    created_at: "2023-02-03T00:00:00Z",
    is_featured: false,
    is_popular: true,
  },
  {
    id: "srv_5",
    subcategory_id: "sub_4",
    subcategory_name: "Massage Therapy",
    category_name: "Spa & Relaxation",
    business_id: "biz_3",
    business_name: "Zen Massage Therapy",
    name: "Hot Stone Therapy",
    description: "Therapeutic hot stone massage treatment",
    min_price: 145.0,
    duration_minutes: 90,
    is_active: true,
    created_at: "2023-02-04T00:00:00Z",
    is_featured: true,
    is_popular: false,
  },
];

const sampleAddons: ServiceAddon[] = [
  {
    id: "addon_1",
    name: "Deep Conditioning Treatment",
    description: "Intensive hair conditioning for dry or damaged hair",
    price: 25.0,
    duration_minutes: 15,
    is_active: true,
    created_at: "2023-01-18T00:00:00Z",
    updated_at: "2023-01-18T00:00:00Z",
  },
  {
    id: "addon_2",
    name: "Scalp Massage",
    description: "Relaxing scalp massage with essential oils",
    price: 15.0,
    duration_minutes: 10,
    is_active: true,
    created_at: "2023-01-19T00:00:00Z",
    updated_at: "2023-01-19T00:00:00Z",
  },
  {
    id: "addon_3",
    name: "Aromatherapy Enhancement",
    description: "Add aromatherapy oils to any massage service",
    price: 20.0,
    duration_minutes: 0,
    is_active: true,
    created_at: "2023-02-01T00:00:00Z",
    updated_at: "2023-02-01T00:00:00Z",
  },
  {
    id: "addon_4",
    name: "Hot Towel Treatment",
    description: "Warm towel treatment for enhanced relaxation",
    price: 12.0,
    duration_minutes: 5,
    is_active: true,
    created_at: "2023-02-02T00:00:00Z",
    updated_at: "2023-02-02T00:00:00Z",
  },
  {
    id: "addon_5",
    name: "Extended Time (30 min)",
    description: "Add an additional 30 minutes to any service",
    price: 45.0,
    duration_minutes: 30,
    is_active: true,
    created_at: "2023-02-03T00:00:00Z",
    updated_at: "2023-02-03T00:00:00Z",
  },
  {
    id: "addon_6",
    name: "Premium Product Upgrade",
    description: "Use premium products for enhanced results",
    price: 35.0,
    duration_minutes: 0,
    is_active: true,
    created_at: "2023-02-04T00:00:00Z",
    updated_at: "2023-02-04T00:00:00Z",
  },
];

const sampleAddonEligibility: ServiceAddonEligibility[] = [
  // Hair services eligible add-ons
  {
    id: "elig_1",
    service_id: "srv_1",
    addon_id: "addon_1",
    is_recommended: true,
    created_at: "2023-01-18T00:00:00Z",
  },
  {
    id: "elig_2",
    service_id: "srv_1",
    addon_id: "addon_2",
    is_recommended: false,
    created_at: "2023-01-18T00:00:00Z",
  },
  {
    id: "elig_3",
    service_id: "srv_1",
    addon_id: "addon_5",
    is_recommended: false,
    created_at: "2023-01-18T00:00:00Z",
  },
  {
    id: "elig_4",
    service_id: "srv_1",
    addon_id: "addon_6",
    is_recommended: true,
    created_at: "2023-01-18T00:00:00Z",
  },

  // Facial services eligible add-ons
  {
    id: "elig_5",
    service_id: "srv_2",
    addon_id: "addon_5",
    is_recommended: false,
    created_at: "2023-01-19T00:00:00Z",
  },
  {
    id: "elig_6",
    service_id: "srv_2",
    addon_id: "addon_6",
    is_recommended: true,
    created_at: "2023-01-19T00:00:00Z",
  },

  // Personal training eligible add-ons
  {
    id: "elig_7",
    service_id: "srv_3",
    addon_id: "addon_5",
    is_recommended: true,
    created_at: "2023-01-22T00:00:00Z",
  },

  // Massage services eligible add-ons
  {
    id: "elig_8",
    service_id: "srv_4",
    addon_id: "addon_3",
    is_recommended: true,
    created_at: "2023-02-03T00:00:00Z",
  },
  {
    id: "elig_9",
    service_id: "srv_4",
    addon_id: "addon_4",
    is_recommended: false,
    created_at: "2023-02-03T00:00:00Z",
  },
  {
    id: "elig_10",
    service_id: "srv_4",
    addon_id: "addon_5",
    is_recommended: false,
    created_at: "2023-02-03T00:00:00Z",
  },

  {
    id: "elig_11",
    service_id: "srv_5",
    addon_id: "addon_3",
    is_recommended: true,
    created_at: "2023-02-04T00:00:00Z",
  },
  {
    id: "elig_12",
    service_id: "srv_5",
    addon_id: "addon_4",
    is_recommended: true,
    created_at: "2023-02-04T00:00:00Z",
  },
  {
    id: "elig_13",
    service_id: "srv_5",
    addon_id: "addon_5",
    is_recommended: false,
    created_at: "2023-02-04T00:00:00Z",
  },
];

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatServiceCategoryType = (type: ServiceCategoryType): string => {
  switch (type) {
    case "beauty":
      return "Beauty";
    case "fitness":
      return "Fitness";
    case "therapy":
      return "Therapy";
    case "healthcare":
      return "Healthcare";
    default:
      return type;
  }
};

const getServiceCategoryTypeIcon = (type: ServiceCategoryType) => {
  switch (type) {
    case "beauty":
      return "💄";
    case "fitness":
      return "🏋️";
    case "therapy":
      return "🧘";
    case "healthcare":
      return "🏥";
    default:
      return "📋";
  }
};

const getServiceCategoryTypeBadgeVariant = (type: ServiceCategoryType) => {
  switch (type) {
    case "beauty":
      return "warning" as const;
    case "fitness":
      return "success" as const;
    case "therapy":
      return "secondary" as const;
    case "healthcare":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const formatServiceSubcategoryType = (type: ServiceSubcategoryType): string => {
  switch (type) {
    case "hair_and_makeup":
      return "Hair & Makeup";
    case "spray_tan":
      return "Spray Tan";
    case "esthetician":
      return "Esthetician";
    case "massage_therapy":
      return "Massage Therapy";
    case "iv_therapy":
      return "IV Therapy";
    case "physical_therapy":
      return "Physical Therapy";
    case "nurse_practitioner":
      return "Nurse Practitioner";
    case "phycisian":
      return "Physician";
    case "chiropractor":
      return "Chiropractor";
    case "yoga_instructor":
      return "Yoga Instructor";
    case "pilates_instructor":
      return "Pilates Instructor";
    case "personal_trainer":
      return "Personal Trainer";
    default:
      return type
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
};

const getServiceSubcategoryTypeIcon = (type: ServiceSubcategoryType) => {
  switch (type) {
    case "hair_and_makeup":
      return "💇";
    case "spray_tan":
      return "��️";
    case "esthetician":
      return "✨";
    case "massage_therapy":
      return "🤲";
    case "iv_therapy":
      return "💉";
    case "physical_therapy":
      return "🦴";
    case "nurse_practitioner":
      return "👩‍⚕️";
    case "phycisian":
      return "👨‍⚕️";
    case "chiropractor":
      return "��";
    case "yoga_instructor":
      return "🧘";
    case "pilates_instructor":
      return "🤸";
    case "personal_trainer":
      return "💪";
    default:
      return "🔧";
  }
};

const getServiceSubcategoryTypeBadgeVariant = (
  type: ServiceSubcategoryType,
) => {
  const categoryMap: Record<
    string,
    "success" | "warning" | "secondary" | "outline"
  > = {
    hair_and_makeup: "warning",
    spray_tan: "warning",
    esthetician: "warning",
    massage_therapy: "secondary",
    iv_therapy: "outline",
    physical_therapy: "outline",
    nurse_practitioner: "outline",
    phycisian: "outline",
    chiropractor: "outline",
    yoga_instructor: "success",
    pilates_instructor: "success",
    personal_trainer: "success",
  };
  return categoryMap[type] || "secondary";
};

// These functions will be moved inside the component to access real data

export default function AdminServices() {
  // Data states
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ServiceSubcategory[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [addonEligibility, setAddonEligibility] = useState<
    ServiceAddonEligibility[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<
    "services" | "categories" | "subcategories" | "addon-management"
  >("services");

  // Filter states
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");

  // Modal states
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isServiceDetailsOpen, setIsServiceDetailsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<ServiceCategory | null>(null);
  const [isCategoryDetailsOpen, setIsCategoryDetailsOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] =
    useState<ServiceSubcategory | null>(null);
  const [isSubcategoryDetailsOpen, setIsSubcategoryDetailsOpen] =
    useState(false);
  const [selectedAddon, setSelectedAddon] = useState<ServiceAddon | null>(null);
  const [isAddonDetailsOpen, setIsAddonDetailsOpen] = useState(false);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [addonForAssignment, setAddonForAssignment] =
    useState<ServiceAddon | null>(null);
  const [isNewAssignmentModalOpen, setIsNewAssignmentModalOpen] =
    useState(false);
  const [selectedServiceForAssignment, setSelectedServiceForAssignment] =
    useState<string>("");
  const [selectedAddonsForAssignment, setSelectedAddonsForAssignment] =
    useState<string[]>([]);
  const [newAssignmentRecommended, setNewAssignmentRecommended] =
    useState(false);
  const [newAssignmentActive, setNewAssignmentActive] = useState(true);

  // Add-on edit/delete states
  const [isEditAddonOpen, setIsEditAddonOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [isDeleteAddonConfirmOpen, setIsDeleteAddonConfirmOpen] =
    useState(false);
  const [addonToDelete, setAddonToDelete] = useState<ServiceAddon | null>(null);

  // Image upload states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Add new item modal states
  const [isAddServiceOpen, setIsAddServiceOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false);
  const [isAddAddonOpen, setIsAddAddonOpen] = useState(false);

  // Edit modal states
  const [isEditServiceOpen, setIsEditServiceOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Delete confirmation modal states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Category edit/delete states
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ServiceCategory | null>(null);
  const [isDeleteCategoryConfirmOpen, setIsDeleteCategoryConfirmOpen] =
    useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Subcategory edit/delete states
  const [isEditSubcategoryOpen, setIsEditSubcategoryOpen] = useState(false);
  const [editingSubcategory, setEditingSubcategory] =
    useState<ServiceSubcategory | null>(null);
  const [isDeleteSubcategoryConfirmOpen, setIsDeleteSubcategoryConfirmOpen] =
    useState(false);
  const [subcategoryToDelete, setSubcategoryToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Form states for new items
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    subcategory_id: "",
    min_price: "",
    duration_minutes: "",
    image_url: "",
    is_active: true,
    is_featured: false,
    is_popular: false,
  });

  const [newCategory, setNewCategory] = useState({
    service_category_type: "",
    description: "",
    image_url: "",
    is_active: true,
    sort_order: "",
  });

  const [newSubcategory, setNewSubcategory] = useState({
    service_subcategory_type: "",
    description: "",
    category_id: "",
    image_url: "",
    is_active: true,
  });

  const [newAddon, setNewAddon] = useState({
    name: "",
    description: "",
    is_active: true,
  });

  // Fetch data from Supabase
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching all service data from Supabase...");

      // First try a simple services query to test basic access
      console.log("Testing basic services access...");
      const simpleServicesTest = await supabase
        .from("services")
        .select("count", { count: "exact", head: true });

      console.log("Simple services test result:", simpleServicesTest);

      if (simpleServicesTest.error) {
        console.error(
          "Basic services access failed:",
          simpleServicesTest.error,
        );
        setError(
          `Services table access error: ${JSON.stringify(simpleServicesTest.error)}`,
        );
        return;
      }

      // Fetch all data in parallel
      const [
        servicesResult,
        categoriesResult,
        subcategoriesResult,
        addonsResult,
        addonEligibilityResult,
      ] = await Promise.all([
        // Services with subcategory and category joins
        supabase
          .from("services")
          .select(
            `
            *,
            service_subcategories (
              service_subcategory_type,
              service_categories (
                service_category_type
              )
            )
          `,
          )
          .order("created_at", { ascending: false }),

        // Categories
        supabase
          .from("service_categories")
          .select("*")
          .order("sort_order", { ascending: true }),

        // Subcategories with category join
        supabase
          .from("service_subcategories")
          .select(
            `
            *,
            service_categories (
              service_category_type
            )
          `,
          )
          .order("created_at", { ascending: false }),

        // Service addons
        supabase
          .from("service_addons")
          .select("*")
          .order("created_at", { ascending: false }),

        // Service addon eligibility relationships
        supabase
          .from("service_addon_eligibility")
          .select(
            `
            *,
            services (
              name
            ),
            service_addons (
              name
            )
          `,
          )
          .order("created_at", { ascending: false }),
      ]);

      console.log("Supabase responses:", {
        services: servicesResult,
        categories: categoriesResult,
        subcategories: subcategoriesResult,
        addons: addonsResult,
        addonEligibility: addonEligibilityResult,
      });

      // Handle services with detailed logging
      console.log("Services result details:", {
        error: servicesResult.error,
        data: servicesResult.data,
        status: servicesResult.status,
        statusText: servicesResult.statusText,
      });

      if (servicesResult.error) {
        console.error("Services error object:", servicesResult.error);
        console.error("Services error type:", typeof servicesResult.error);
        console.error(
          "Services error keys:",
          Object.keys(servicesResult.error),
        );

        let errorMessage = "Unknown services error";
        if (servicesResult.error.message) {
          errorMessage = servicesResult.error.message;
        } else if (servicesResult.error.error_description) {
          errorMessage = servicesResult.error.error_description;
        } else {
          try {
            errorMessage = JSON.stringify(servicesResult.error);
          } catch (e) {
            errorMessage = String(servicesResult.error);
          }
        }

        console.log("Trying fallback services query without joins...");
        const fallbackServicesResult = await supabase
          .from("services")
          .select("*")
          .order("created_at", { ascending: false });

        if (fallbackServicesResult.error) {
          setError(
            `Services Error (both queries failed): ${errorMessage} | Fallback: ${fallbackServicesResult.error.message || "unknown"}`,
          );
        } else {
          console.log(
            "Fallback services query worked:",
            fallbackServicesResult.data?.length || 0,
            "records",
          );
          setServices(fallbackServicesResult.data || []);
        }
      } else {
        console.log(
          "Services loaded successfully:",
          servicesResult.data?.length || 0,
          "records",
        );
        setServices(servicesResult.data || []);
      }

      // Handle categories
      if (categoriesResult.error) {
        console.error("Categories error:", categoriesResult.error);
        setError(
          `Categories Error: ${categoriesResult.error.message || JSON.stringify(categoriesResult.error)} (Code: ${categoriesResult.error.code || "unknown"})`,
        );
      } else {
        setCategories(categoriesResult.data || []);
      }

      // Handle subcategories
      if (subcategoriesResult.error) {
        console.error("Subcategories error:", subcategoriesResult.error);
        setError(
          `Subcategories Error: ${subcategoriesResult.error.message || JSON.stringify(subcategoriesResult.error)} (Code: ${subcategoriesResult.error.code || "unknown"})`,
        );
      } else {
        setSubcategories(subcategoriesResult.data || []);
      }

      // Handle addons
      if (addonsResult.error) {
        console.error("Addons error:", addonsResult.error);
        setError(
          `Addons Error: ${addonsResult.error.message || JSON.stringify(addonsResult.error)} (Code: ${addonsResult.error.code || "unknown"})`,
        );
      } else {
        setAddons(addonsResult.data || []);
      }

      // Handle addon eligibility
      if (addonEligibilityResult.error) {
        console.error("Addon eligibility error:", addonEligibilityResult.error);
        setError(
          `Addon Eligibility Error: ${addonEligibilityResult.error.message || JSON.stringify(addonEligibilityResult.error)} (Code: ${addonEligibilityResult.error.code || "unknown"})`,
        );
      } else {
        setAddonEligibility(addonEligibilityResult.data || []);
      }

      console.log(
        "Successfully fetched all service data including addon relationships",
      );
    } catch (err) {
      console.error("Unexpected error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Connection Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Image upload functions
  const uploadServiceImage = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);

      // Generate unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `image-services/${fileName}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeServiceImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split("/");
      const filePath = pathSegments.slice(-2).join("/"); // Get 'image-services/filename'

      // Remove file from storage
      const { error } = await supabase.storage
        .from("roam-file-storage")
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing image:", error);
      throw error;
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      const imageUrl = await uploadServiceImage(file);
      setNewService({ ...newService, image_url: imageUrl });
      setImagePreview(imageUrl);
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveImage = async () => {
    if (newService.image_url) {
      try {
        await removeServiceImage(newService.image_url);
        setNewService({ ...newService, image_url: "" });
        setImagePreview(null);
      } catch (error) {
        console.error("Error removing image:", error);
        // Continue anyway to clear the UI
        setNewService({ ...newService, image_url: "" });
        setImagePreview(null);
      }
    }
  };

  const handleEditImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editingService) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      // Remove old image if exists
      if (editingService.image_url) {
        await removeServiceImage(editingService.image_url);
      }

      const imageUrl = await uploadServiceImage(file);
      setEditingService({ ...editingService, image_url: imageUrl });
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleEditRemoveImage = async () => {
    if (editingService?.image_url) {
      try {
        await removeServiceImage(editingService.image_url);
        setEditingService({ ...editingService, image_url: null });
      } catch (error) {
        console.error("Error removing image:", error);
        // Continue anyway to clear the UI
        setEditingService({ ...editingService, image_url: null });
      }
    }
  };

  // Category image upload functions
  const uploadCategoryImage = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);

      // Generate unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `image-categories/${fileName}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading category image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeCategoryImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split("/");
      const filePath = pathSegments.slice(-2).join("/"); // Get 'image-categories/filename'

      // Remove file from storage
      const { error } = await supabase.storage
        .from("roam-file-storage")
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing category image:", error);
      throw error;
    }
  };

  const handleCategoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      const imageUrl = await uploadCategoryImage(file);
      setNewCategory({ ...newCategory, image_url: imageUrl });
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveCategoryImage = async () => {
    if (newCategory.image_url) {
      try {
        await removeCategoryImage(newCategory.image_url);
        setNewCategory({ ...newCategory, image_url: "" });
      } catch (error) {
        console.error("Error removing category image:", error);
        // Continue anyway to clear the UI
        setNewCategory({ ...newCategory, image_url: "" });
      }
    }
  };

  const handleEditCategoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editingCategory) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      // Remove old image if exists
      if (editingCategory.image_url) {
        await removeCategoryImage(editingCategory.image_url);
      }

      const imageUrl = await uploadCategoryImage(file);
      setEditingCategory({ ...editingCategory, image_url: imageUrl });
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleEditRemoveCategoryImage = async () => {
    if (editingCategory?.image_url) {
      try {
        await removeCategoryImage(editingCategory.image_url);
        setEditingCategory({ ...editingCategory, image_url: null });
      } catch (error) {
        console.error("Error removing category image:", error);
        // Continue anyway to clear the UI
        setEditingCategory({ ...editingCategory, image_url: null });
      }
    }
  };

  // Subcategory image upload functions
  const uploadSubcategoryImage = async (file: File): Promise<string> => {
    try {
      setUploadingImage(true);

      // Generate unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `image-subcategories/${fileName}`;

      // Upload file to Supabase storage
      const { data, error } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file);

      if (error) throw error;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading subcategory image:", error);
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const removeSubcategoryImage = async (imageUrl: string) => {
    try {
      // Extract file path from URL
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split("/");
      const filePath = pathSegments.slice(-2).join("/"); // Get 'image-subcategories/filename'

      // Remove file from storage
      const { error } = await supabase.storage
        .from("roam-file-storage")
        .remove([filePath]);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing subcategory image:", error);
      throw error;
    }
  };

  const handleSubcategoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      const imageUrl = await uploadSubcategoryImage(file);
      setNewSubcategory({ ...newSubcategory, image_url: imageUrl });
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveSubcategoryImage = async () => {
    if (newSubcategory.image_url) {
      try {
        await removeSubcategoryImage(newSubcategory.image_url);
        setNewSubcategory({ ...newSubcategory, image_url: "" });
      } catch (error) {
        console.error("Error removing subcategory image:", error);
        // Continue anyway to clear the UI
        setNewSubcategory({ ...newSubcategory, image_url: "" });
      }
    }
  };

  const handleEditSubcategoryImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !editingSubcategory) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    try {
      // Remove old image if exists
      if (editingSubcategory.image_url) {
        await removeSubcategoryImage(editingSubcategory.image_url);
      }

      const imageUrl = await uploadSubcategoryImage(file);
      setEditingSubcategory({ ...editingSubcategory, image_url: imageUrl });
    } catch (error) {
      alert("Failed to upload image. Please try again.");
    }
  };

  const handleEditRemoveSubcategoryImage = async () => {
    if (editingSubcategory?.image_url) {
      try {
        await removeSubcategoryImage(editingSubcategory.image_url);
        setEditingSubcategory({ ...editingSubcategory, image_url: null });
      } catch (error) {
        console.error("Error removing subcategory image:", error);
        // Continue anyway to clear the UI
        setEditingSubcategory({ ...editingSubcategory, image_url: null });
      }
    }
  };

  // Service-Addon Assignment functions
  const createServiceAddonAssignment = async (
    serviceId: string,
    addonId: string,
    isRecommended: boolean = false,
  ) => {
    try {
      const { data, error } = await supabase
        .from("service_addon_eligibility")
        .upsert(
          {
            service_id: serviceId,
            addon_id: addonId,
            is_recommended: isRecommended,
          },
          {
            onConflict: "service_id,addon_id",
          },
        )
        .select();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating service-addon assignment:", error);
      throw error;
    }
  };

  const removeServiceAddonAssignment = async (
    serviceId: string,
    addonId: string,
  ) => {
    try {
      const { error } = await supabase
        .from("service_addon_eligibility")
        .delete()
        .eq("service_id", serviceId)
        .eq("addon_id", addonId);

      if (error) throw error;
    } catch (error) {
      console.error("Error removing service-addon assignment:", error);
      throw error;
    }
  };

  const handleServiceAssignmentToggle = async (
    serviceId: string,
    addonId: string,
    isCurrentlyAssigned: boolean,
  ) => {
    try {
      if (isCurrentlyAssigned) {
        await removeServiceAddonAssignment(serviceId, addonId);
      } else {
        await createServiceAddonAssignment(serviceId, addonId, false);
      }

      // Refresh the addon eligibility data
      await fetchAllData();
    } catch (error) {
      alert(
        `Failed to ${isCurrentlyAssigned ? "remove" : "create"} assignment. Please try again.`,
      );
    }
  };

  // Add-on management functions
  const updateAddon = async () => {
    if (!editingAddon) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_addons")
        .update({
          name: editingAddon.name,
          description: editingAddon.description,
          is_active: editingAddon.is_active,
        })
        .eq("id", editingAddon.id);

      if (error) throw error;

      setEditingAddon(null);
      setIsEditAddonOpen(false);
      await fetchAllData();
      alert("Add-on updated successfully!");
    } catch (error: any) {
      console.error("Error updating add-on:", error);
      alert(`Error updating add-on: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteAddon = async () => {
    if (!addonToDelete) return;

    try {
      setSaving(true);

      // First, delete all assignments for this add-on
      const { error: assignmentError } = await supabase
        .from("service_addon_eligibility")
        .delete()
        .eq("addon_id", addonToDelete.id);

      if (assignmentError) throw assignmentError;

      // Then delete the add-on itself
      const { error } = await supabase
        .from("service_addons")
        .delete()
        .eq("id", addonToDelete.id);

      if (error) throw error;

      setAddonToDelete(null);
      setIsDeleteAddonConfirmOpen(false);
      await fetchAllData();
      alert("Add-on deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting add-on:", error);
      alert(`Error deleting add-on: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Create new service
  const createService = async () => {
    try {
      setSaving(true);
      const { error } = await supabase.from("services").insert([
        {
          ...newService,
          min_price: parseFloat(newService.min_price),
          duration_minutes: parseInt(newService.duration_minutes),
        },
      ]);

      if (error) throw error;

      setNewService({
        name: "",
        description: "",
        subcategory_id: "",
        min_price: "",
        duration_minutes: "",
        image_url: "",
        is_active: true,
        is_featured: false,
        is_popular: false,
      });
      setImagePreview(null);
      setIsAddServiceOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error creating service:", error);
      alert(`Error creating service: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Update existing service
  const updateService = async () => {
    if (!editingService) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("services")
        .update({
          name: editingService.name,
          description: editingService.description,
          subcategory_id: editingService.subcategory_id,
          min_price: editingService.min_price,
          duration_minutes: editingService.duration_minutes,
          image_url: editingService.image_url,
          is_active: editingService.is_active,
          is_featured: editingService.is_featured,
          is_popular: editingService.is_popular,
        })
        .eq("id", editingService.id);

      if (error) throw error;

      setEditingService(null);
      setIsEditServiceOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating service:", error);
      alert(`Error updating service: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Show delete confirmation dialog
  const showDeleteConfirmation = (serviceId: string, serviceName: string) => {
    setServiceToDelete({ id: serviceId, name: serviceName });
    setIsDeleteConfirmOpen(true);
  };

  // Actually delete the service after confirmation
  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("services")
        .delete()
        .eq("id", serviceToDelete.id);

      if (error) throw error;

      await fetchAllData(); // Refresh the data
      setIsDeleteConfirmOpen(false);
      setServiceToDelete(null);

      // You could add a toast notification here instead of alert
      alert(`Service "${serviceToDelete.name}" has been deleted successfully.`);
    } catch (error: any) {
      console.error("Error deleting service:", error);
      alert(`Error deleting service: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Create new category
  const createCategory = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!newCategory.service_category_type.trim()) {
        alert("Category type is required");
        setSaving(false);
        return;
      }

      // Prepare the data
      const categoryType = newCategory.service_category_type.trim();
      const dataToInsert = {
        service_category_type: categoryType,
        description: newCategory.description.trim(),
        image_url: newCategory.image_url || null,
        is_active: newCategory.is_active,
        sort_order: newCategory.sort_order
          ? parseInt(newCategory.sort_order)
          : null,
      };

      console.log("Creating category with data:", dataToInsert);

      // Check if the category type already exists in our current data
      const existingTypes = categories.map((c) => c.service_category_type);
      const typeExists = existingTypes.includes(categoryType);

      console.log("Existing category types:", existingTypes);
      console.log("Type exists?", typeExists);

      // Step 1: Try to insert the category directly first
      console.log("Step 1: Attempting to insert category");
      const insertResponse = await supabase
        .from("service_categories")
        .insert([dataToInsert])
        .select();

      const { error, data } = insertResponse;

      // If we get an enum constraint error, try to add the enum value
      if (
        error &&
        error.code === "22P02" &&
        error.message?.includes("invalid input value for enum")
      ) {
        console.log(
          "Step 2: Enum constraint error detected, attempting to add enum value",
        );

        try {
          // First, check if the custom function exists by trying to call it
          console.log("Attempting to call add_category_type function");
          const { data: functionResult, error: enumError } = await supabase.rpc(
            "add_category_type",
            {
              new_type: categoryType,
            },
          );

          if (enumError) {
            console.error("Custom function error details:", enumError);

            // Check if the error is because the function doesn't exist
            if (
              enumError.message?.includes("function") &&
              (enumError.message?.includes("does not exist") ||
                enumError.message?.includes("not found") ||
                enumError.message?.includes("schema cache"))
            ) {
              // Function doesn't exist - provide setup instructions
              throw new Error(`⚠️ DATABASE SETUP REQUIRED

The database function 'add_category_type' is missing from your Supabase database.

🔧 TO FIX THIS ISSUE:

Option 1 - Set up automatic enum management (RECOMMENDED):
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of 'enum_management_functions.sql' file
3. Execute the SQL to create the required functions
4. Try creating the category again

Option 2 - Manual fix for this specific case:
Run this SQL command in Supabase SQL Editor:
ALTER TYPE service_category_types ADD VALUE '${categoryType}';

���� Option 1 is recommended as it will prevent this error for future enum additions.`);
            } else {
              // Function exists but failed for another reason
              throw new Error(`Failed to add enum value via database function.

Error: ${enumError.message}

Please manually run this SQL command in Supabase:
ALTER TYPE service_category_types ADD VALUE '${categoryType}';`);
            }
          }

          console.log("Enum value added via custom function:", functionResult);

          // Step 3: Retry the insert after adding the enum value
          console.log("Step 3: Retrying category insert");
          const retryResponse = await supabase
            .from("service_categories")
            .insert([dataToInsert])
            .select();

          if (retryResponse.error) {
            console.error("Error on retry:", retryResponse.error);
            throw retryResponse.error;
          }

          console.log(
            "Category created successfully on retry:",
            retryResponse.data,
          );
        } catch (enumHandlingError) {
          console.error("Error handling enum constraint:", enumHandlingError);
          throw enumHandlingError;
        }
      } else if (error) {
        console.error("Error inserting category:", error);
        throw error;
      } else {
        console.log("Category created successfully:", data);
      }

      setNewCategory({
        service_category_type: "",
        description: "",
        image_url: "",
        is_active: true,
        sort_order: "",
      });
      setIsAddCategoryOpen(false);
      await fetchAllData();

      alert("Category created successfully!");
    } catch (error: any) {
      console.error("Error creating category:", error);

      // Enhanced error message extraction (same as subcategory)
      let errorMessage = "Unknown error occurred";

      // Handle specific database enum constraint error
      if (
        error?.code === "22P02" &&
        error?.message?.includes(
          "invalid input value for enum service_category_types",
        )
      ) {
        const match = error.message.match(
          /invalid input value for enum service_category_types: "([^"]+)"/,
        );
        const invalidValue = match ? match[1] : "unknown";

        // Get existing category types for suggestions
        const existingTypes = [
          ...new Set(categories.map((c) => c.service_category_type)),
        ].sort();
        const suggestions =
          existingTypes.length > 0
            ? `\n\nExisting types: ${existingTypes.join(", ")}`
            : "";

        errorMessage = `The category type "${invalidValue}" is not allowed by the database.\n\nTo fix this, you need to:\n1. Use an existing category type, OR\n2. Add "${invalidValue}" to the database enum "service_category_types"\n\nTo add to the enum, run this SQL command:\nALTER TYPE service_category_types ADD VALUE '${invalidValue}';${suggestions}`;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error.details) {
        errorMessage = error.details;
      }

      alert(`Error creating category: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Edit category
  const updateCategory = async () => {
    if (!editingCategory) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_categories")
        .update({
          service_category_type: editingCategory.service_category_type,
          description: editingCategory.description,
          image_url: editingCategory.image_url,
          is_active: editingCategory.is_active,
          sort_order: editingCategory.sort_order
            ? parseInt(editingCategory.sort_order.toString())
            : null,
        })
        .eq("id", editingCategory.id);

      if (error) throw error;

      setEditingCategory(null);
      setIsEditCategoryOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating category:", error);
      alert(`Error updating category: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete category
  const deleteCategory = async () => {
    if (!categoryToDelete) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_categories")
        .delete()
        .eq("id", categoryToDelete.id);

      if (error) throw error;

      setCategoryToDelete(null);
      setIsDeleteCategoryConfirmOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      alert(`Error deleting category: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Edit subcategory
  const updateSubcategory = async () => {
    if (!editingSubcategory) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_subcategories")
        .update({
          service_subcategory_type: editingSubcategory.service_subcategory_type,
          description: editingSubcategory.description,
          category_id: editingSubcategory.category_id,
          is_active: editingSubcategory.is_active,
        })
        .eq("id", editingSubcategory.id);

      if (error) throw error;

      setEditingSubcategory(null);
      setIsEditSubcategoryOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error updating subcategory:", error);

      // Better error message extraction
      let errorMessage = "Unknown error occurred";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error_description) {
        errorMessage = error.error_description;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error.details) {
        errorMessage = error.details;
      }

      alert(`Error updating subcategory: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete subcategory
  const deleteSubcategory = async () => {
    if (!subcategoryToDelete) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_subcategories")
        .delete()
        .eq("id", subcategoryToDelete.id);

      if (error) throw error;

      setSubcategoryToDelete(null);
      setIsDeleteSubcategoryConfirmOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting subcategory:", error);
      alert(`Error deleting subcategory: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Create new subcategory
  const createSubcategory = async () => {
    try {
      setSaving(true);

      // Validate required fields
      if (!newSubcategory.service_subcategory_type.trim()) {
        alert("Subcategory type is required");
        setSaving(false);
        return;
      }

      if (!newSubcategory.category_id.trim()) {
        alert("Parent category is required");
        setSaving(false);
        return;
      }

      // Validate that the category_id exists in the categories list
      const selectedCategory = categories.find(
        (c) => c.id === newSubcategory.category_id,
      );
      if (!selectedCategory) {
        alert(
          "The selected parent category is invalid. Please refresh the page and try again.",
        );
        setSaving(false);
        return;
      }

      // Prepare the data
      const subcategoryType = newSubcategory.service_subcategory_type.trim();
      const dataToInsert = {
        service_subcategory_type: subcategoryType,
        description: newSubcategory.description.trim(),
        category_id: newSubcategory.category_id,
        is_active: newSubcategory.is_active,
      };

      console.log("Creating subcategory with data:", dataToInsert);

      // Check if the subcategory type already exists in our current data
      const existingTypes = subcategories.map(
        (s) => s.service_subcategory_type,
      );
      const typeExists = existingTypes.includes(subcategoryType);

      console.log("Existing subcategory types:", existingTypes);
      console.log("Type exists?", typeExists);

      // Step 1: Try to insert the subcategory directly first
      console.log("Step 1: Attempting to insert subcategory");
      const insertResponse = await supabase
        .from("service_subcategories")
        .insert([dataToInsert])
        .select();

      const { error, data } = insertResponse;

      // If we get an enum constraint error, try to add the enum value
      if (
        error &&
        error.code === "22P02" &&
        error.message?.includes("invalid input value for enum")
      ) {
        console.log(
          "Step 2: Enum constraint error detected, attempting to add enum value",
        );

        try {
          // First, check if the custom function exists by trying to call it
          console.log("Attempting to call add_subcategory_type function");
          const { data: functionResult, error: enumError } = await supabase.rpc(
            "add_subcategory_type",
            {
              new_type: subcategoryType,
            },
          );

          if (enumError) {
            console.error("Custom function error details:", enumError);

            // Check if the error is because the function doesn't exist
            if (
              enumError.message?.includes("function") &&
              (enumError.message?.includes("does not exist") ||
                enumError.message?.includes("not found") ||
                enumError.message?.includes("schema cache"))
            ) {
              // Function doesn't exist - provide setup instructions
              throw new Error(`⚠️ DATABASE SETUP REQUIRED

The database function 'add_subcategory_type' is missing from your Supabase database.

🔧 TO FIX THIS ISSUE:

Option 1 - Set up automatic enum management (RECOMMENDED):
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of 'enum_management_functions.sql' file
3. Execute the SQL to create the required functions
4. Try creating the subcategory again

Option 2 - Manual fix for this specific case:
Run this SQL command in Supabase SQL Editor:
ALTER TYPE service_subcategory_types ADD VALUE '${subcategoryType}';

💡 Option 1 is recommended as it will prevent this error for future enum additions.`);
            } else {
              // Function exists but failed for another reason
              throw new Error(`Failed to add enum value via database function.

Error: ${enumError.message}

Please manually run this SQL command in Supabase:
ALTER TYPE service_subcategory_types ADD VALUE '${subcategoryType}';`);
            }
          }

          console.log("Enum value added via custom function:", functionResult);

          // Step 3: Retry the insert after adding the enum value
          console.log("Step 3: Retrying subcategory insert");
          const retryResponse = await supabase
            .from("service_subcategories")
            .insert([dataToInsert])
            .select();

          if (retryResponse.error) {
            console.error("Error on retry:", retryResponse.error);
            throw retryResponse.error;
          }

          console.log(
            "Subcategory created successfully on retry:",
            retryResponse.data,
          );
        } catch (enumHandlingError) {
          console.error("Error handling enum constraint:", enumHandlingError);
          throw enumHandlingError;
        }
      } else if (error) {
        console.error("Error inserting subcategory:", error);
        throw error;
      } else {
        console.log("Subcategory created successfully:", data);
      }

      console.log("Subcategory created successfully:", data);

      setNewSubcategory({
        service_subcategory_type: "",
        description: "",
        category_id: "",
        is_active: true,
      });
      setIsAddSubcategoryOpen(false);
      await fetchAllData();

      alert("Subcategory created successfully!");
    } catch (error: any) {
      // Force the error to be properly logged
      console.error("Raw error object:", error);
      console.error("Error type:", typeof error);
      console.error("Error constructor:", error.constructor.name);

      // Try to extract all possible error information
      let errorDetails = {};
      let errorMessage = "Unknown error occurred";

      try {
        // Get all enumerable properties of the error object
        errorDetails = Object.getOwnPropertyNames(error).reduce((acc, key) => {
          try {
            acc[key] = error[key];
          } catch (e) {
            acc[key] = `[Unable to access ${key}]`;
          }
          return acc;
        }, {} as any);

        console.error("Error properties:", errorDetails);

        // Handle specific database enum constraint error
        if (
          error?.code === "22P02" &&
          error?.message?.includes(
            "invalid input value for enum service_subcategory_types",
          )
        ) {
          const match = error.message.match(
            /invalid input value for enum service_subcategory_types: "([^"]+)"/,
          );
          const invalidValue = match ? match[1] : "unknown";

          // Get existing subcategory types for suggestions
          const existingTypes = [
            ...new Set(subcategories.map((s) => s.service_subcategory_type)),
          ].sort();
          const suggestions =
            existingTypes.length > 0
              ? `\n\nExisting types: ${existingTypes.join(", ")}`
              : "";

          errorMessage = `The subcategory type "${invalidValue}" is not allowed by the database.\n\nTo fix this, you need to:\n1. Use an existing subcategory type, OR\n2. Add "${invalidValue}" to the database enum "service_subcategory_types"\n\nTo add to the enum, run this SQL command:\nALTER TYPE service_subcategory_types ADD VALUE '${invalidValue}';${suggestions}`;
        }
        // Try multiple ways to get a meaningful error message
        else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.error_description) {
          errorMessage = error.error_description;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (error?.hint) {
          errorMessage = error.hint;
        } else if (error?.code) {
          errorMessage = `Database error code: ${error.code}`;
        } else {
          // Use JSON.stringify as last resort but catch any circular reference errors
          try {
            errorMessage = JSON.stringify(
              error,
              (key, value) => {
                if (typeof value === "object" && value !== null) {
                  if (value instanceof Error) {
                    return {
                      name: value.name,
                      message: value.message,
                      stack: value.stack,
                    };
                  }
                }
                return value;
              },
              2,
            );
          } catch (stringifyError) {
            errorMessage = `Error object could not be stringified: ${stringifyError}`;
          }
        }
      } catch (extractionError) {
        console.error("Error during error extraction:", extractionError);
        errorMessage = `Error extraction failed: ${extractionError}`;
      }

      console.error("Final error message:", errorMessage);
      console.error("Data that was being inserted:", dataToInsert);

      alert(`Error creating subcategory: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // Create new addon
  const createAddon = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("service_addons")
        .insert([newAddon]);

      if (error) throw error;

      setNewAddon({
        name: "",
        description: "",
        is_active: true,
      });
      setIsAddAddonOpen(false);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error creating addon:", error);
      alert(`Error creating addon: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Filter data based on status
  const filteredServices = services.filter((service) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && service.is_active) ||
      (statusFilter === "inactive" && !service.is_active);

    const categoryMatch =
      categoryFilter === "all" ||
      service.service_subcategories?.service_categories
        ?.service_category_type === categoryFilter;

    const subcategoryMatch =
      subcategoryFilter === "all" ||
      service.service_subcategories?.service_subcategory_type ===
        subcategoryFilter;

    return statusMatch && categoryMatch && subcategoryMatch;
  });

  const filteredCategories = categories.filter((category) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && category.is_active) ||
      (statusFilter === "inactive" && !category.is_active);
    return statusMatch;
  });

  const filteredSubcategories = subcategories.filter((subcategory) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && subcategory.is_active) ||
      (statusFilter === "inactive" && !subcategory.is_active);
    return statusMatch;
  });

  const filteredAddons = addons.filter((addon) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && addon.is_active) ||
      (statusFilter === "inactive" && !addon.is_active);
    return statusMatch;
  });

  const serviceStats = {
    totalServices: services.length,
    activeServices: services.filter((s) => s.is_active).length,
    featuredServices: services.filter((s) => s.is_featured).length,
    popularServices: services.filter((s) => s.is_popular).length,
    totalCategories: categories.filter((c) => c.is_active).length,
    totalSubcategories: subcategories.filter((s) => s.is_active).length,
    totalAddons: addons.filter((a) => a.is_active).length,
    totalAddonEligibilities: addonEligibility.length,
    recommendedAddonEligibilities: addonEligibility.filter(
      (ae) => ae.is_recommended,
    ).length,
    avgPrice:
      services.length > 0
        ? services.reduce((sum, s) => sum + s.min_price, 0) / services.length
        : 0,
    avgDuration:
      services.length > 0
        ? services.reduce((sum, s) => sum + s.duration_minutes, 0) /
          services.length
        : 0,
  };

  // Helper functions to get eligibility relationships
  const getEligibleServicesForAddon = (addonId: string) => {
    const eligibleServiceIds = addonEligibility
      .filter((e) => e.addon_id === addonId)
      .map((e) => e.service_id);

    return services.filter((s) => eligibleServiceIds.includes(s.id));
  };

  const getRecommendedServicesForAddon = (addonId: string) => {
    const recommendedServiceIds = addonEligibility
      .filter((e) => e.addon_id === addonId && e.is_recommended)
      .map((e) => e.service_id);

    return services.filter((s) => recommendedServiceIds.includes(s.id));
  };

  const getEligibleAddonsForService = (serviceId: string) => {
    const eligibleAddonIds = addonEligibility
      .filter((e) => e.service_id === serviceId)
      .map((e) => e.addon_id);

    return addons.filter((a) => eligibleAddonIds.includes(a.id));
  };

  // Service columns
  const serviceColumns: Column[] = [
    {
      key: "name",
      header: "Service",
      sortable: true,
      render: (value: string, row: Service) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={`${row.name} service image`}
              className="w-10 h-10 rounded-lg object-cover border-2 border-roam-blue/20"
              onError={(e) => {
                // Fallback to letter icon on image load error
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display =
                    "flex";
                }
              }}
            />
          ) : null}
          <div
            className={`w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm ${row.image_url ? "hidden" : ""}`}
          >
            {row.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <div>
            <div className="font-medium text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">
              {row.service_subcategories?.service_categories
                ?.service_category_type
                ? formatServiceCategoryType(
                    row.service_subcategories.service_categories
                      .service_category_type,
                  )
                : "No category"}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category_hierarchy",
      header: "Category Path",
      render: (value: any, row: Service) => (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {row.service_subcategories?.service_categories
              ?.service_category_type
              ? formatServiceCategoryType(
                  row.service_subcategories.service_categories
                    .service_category_type,
                )
              : "No category"}
          </span>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-medium">
            {row.service_subcategories?.service_subcategory_type
              ? formatServiceSubcategoryType(
                  row.service_subcategories.service_subcategory_type,
                )
              : "No subcategory"}
          </span>
        </div>
      ),
    },
    {
      key: "pricing",
      header: "Price & Duration",
      sortable: true,
      render: (value: any, row: Service) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3 h-3 text-roam-success" />
            <span className="font-semibold text-roam-success">
              {formatPrice(row.min_price)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(row.duration_minutes)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (value: any, row: Service) => (
        <div className="flex gap-1">
          {row.is_featured && (
            <ROAMBadge
              variant="warning"
              size="sm"
              className="flex items-center gap-1"
            >
              <Crown className="w-3 h-3" />
              Featured
            </ROAMBadge>
          )}
          {row.is_popular && (
            <ROAMBadge
              variant="success"
              size="sm"
              className="flex items-center gap-1"
            >
              <Flame className="w-3 h-3" />
              Popular
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: Service) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Service) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedService(row);
              setIsServiceDetailsOpen(true);
            }}
            title="View Service"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit Service"
            onClick={() => {
              setEditingService(row);
              setIsEditServiceOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete Service"
            onClick={() => showDeleteConfirmation(row.id, row.name)}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Category columns
  const categoryColumns: Column[] = [
    {
      key: "service_category_type",
      header: "Category",
      sortable: true,
      render: (value: ServiceCategoryType, row: ServiceCategory) => (
        <div className="flex items-center gap-3">
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={`${formatServiceCategoryType(value)} category image`}
              className="w-10 h-10 rounded-lg object-cover border-2 border-roam-blue/20"
              onError={(e) => {
                // Fallback to icon on image load error
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                if (target.nextElementSibling) {
                  (target.nextElementSibling as HTMLElement).style.display =
                    "flex";
                }
              }}
            />
          ) : null}
          <div
            className={`w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm ${row.image_url ? "hidden" : ""}`}
          >
            <span className="text-base">
              {getServiceCategoryTypeIcon(value)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium text-foreground">
                {formatServiceCategoryType(value)}
              </div>
              <ROAMBadge
                variant={getServiceCategoryTypeBadgeVariant(value)}
                size="sm"
              >
                {value}
              </ROAMBadge>
            </div>
            <div className="text-sm text-muted-foreground">
              {row.description}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "subcategories_count",
      header: "Subcategories",
      render: (value: any, row: ServiceCategory) => (
        <div className="flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {subcategories.filter((s) => s.category_id === row.id).length}
          </span>
        </div>
      ),
    },
    {
      key: "services_count",
      header: "Total Services",
      render: (value: any, row: ServiceCategory) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {
              services.filter((s) => {
                const subcategory = subcategories.find(
                  (sub) => sub.id === s.subcategory_id,
                );
                return subcategory?.category_id === row.id;
              }).length
            }
          </span>
        </div>
      ),
    },
    {
      key: "sort_order",
      header: "Order",
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-medium">#{value || "N/A"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: any, row: ServiceCategory) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: ServiceCategory) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedCategory(row);
              setIsCategoryDetailsOpen(true);
            }}
            title="View Category"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit Category"
            onClick={() => {
              setEditingCategory(row);
              setIsEditCategoryOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete Category"
            onClick={() => {
              setCategoryToDelete({
                id: row.id,
                name: formatServiceCategoryType(row.service_category_type),
              });
              setIsDeleteCategoryConfirmOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Subcategory columns
  const subcategoryColumns: Column[] = [
    {
      key: "service_subcategory_type",
      header: "Subcategory",
      sortable: true,
      render: (value: ServiceSubcategoryType, row: ServiceSubcategory) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-roam-light-blue to-roam-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            <span className="text-base">
              {getServiceSubcategoryTypeIcon(value)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="font-medium text-foreground">
                {formatServiceSubcategoryType(value)}
              </div>
              <ROAMBadge
                variant={getServiceSubcategoryTypeBadgeVariant(value)}
                size="sm"
              >
                {value.replace(/_/g, " ")}
              </ROAMBadge>
            </div>
            <div className="text-sm text-muted-foreground">
              {row.description}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "category_name",
      header: "Parent Category",
      sortable: true,
      render: (value: string, row: ServiceSubcategory) => (
        <div className="flex items-center gap-2">
          <span className="text-base">
            {getServiceCategoryTypeIcon(
              row.service_categories?.service_category_type || "beauty",
            )}
          </span>
          <span className="font-medium text-roam-blue">
            {row.service_categories?.service_category_type
              ? formatServiceCategoryType(
                  row.service_categories.service_category_type,
                )
              : "No category"}
          </span>
          <ROAMBadge
            variant={getServiceCategoryTypeBadgeVariant(
              row.service_categories?.service_category_type || "beauty",
            )}
            size="sm"
          >
            {row.service_categories?.service_category_type || "unknown"}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "services_count",
      header: "Services",
      render: (value: any, row: ServiceSubcategory) => (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {services.filter((s) => s.subcategory_id === row.id).length}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: any, row: ServiceSubcategory) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: ServiceSubcategory) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedSubcategory(row);
              setIsSubcategoryDetailsOpen(true);
            }}
            title="View Subcategory"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit Subcategory"
            onClick={() => {
              setEditingSubcategory(row);
              setIsEditSubcategoryOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete Subcategory"
            onClick={() => {
              setSubcategoryToDelete({
                id: row.id,
                name: formatServiceSubcategoryType(
                  row.service_subcategory_type,
                ),
              });
              setIsDeleteSubcategoryConfirmOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Add-on columns
  const addonColumns: Column[] = [
    {
      key: "name",
      header: "Add-On",
      sortable: true,
      render: (value: string, row: ServiceAddon) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">
              {row.description}
            </div>
          </div>
        </div>
      ),
    },

    {
      key: "type",
      header: "Type",
      render: (value: any, row: ServiceAddon) => (
        <div className="flex flex-col gap-1">
          <ROAMBadge
            variant="outline"
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            <Plus className="w-3 h-3" />
            Service Enhancement
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "eligible_services",
      header: "Eligible Services",
      render: (value: any, row: ServiceAddon) => {
        const eligibleServices = getEligibleServicesForAddon(row.id);
        const recommendedServices = getRecommendedServicesForAddon(row.id);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3 text-muted-foreground" />
              <span className="text-sm font-medium">
                {eligibleServices.length} services
              </span>
            </div>
            {recommendedServices.length > 0 && (
              <div className="flex items-center gap-2">
                <Star className="w-3 h-3 text-roam-warning" />
                <span className="text-xs text-muted-foreground">
                  {recommendedServices.length} recommended
                </span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: ServiceAddon) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "updated_at",
      header: "Last Updated",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: ServiceAddon) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedAddon(row);
              setIsAddonDetailsOpen(true);
            }}
            title="View Add-on"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Edit Add-on"
            onClick={() => console.log("Edit addon:", row.id)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            title="Delete Add-on"
            onClick={() => console.log("Delete addon:", row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Services">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Services"
            value={serviceStats.totalServices}
            icon={<Package className="w-5 h-5" />}
            changeText={`${serviceStats.activeServices} active`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Categories"
            value={serviceStats.totalCategories}
            icon={<Layers className="w-5 h-5" />}
            changeText={`${serviceStats.totalSubcategories} subcategories`}
            changeType="neutral"
          />

          <ROAMStatCard
            title="Avg Price"
            value={formatPrice(serviceStats.avgPrice)}
            icon={<DollarSign className="w-5 h-5" />}
            changeText="Across all services"
            changeType="neutral"
          />

          <ROAMStatCard
            title="Avg Duration"
            value={formatDuration(Math.round(serviceStats.avgDuration))}
            icon={<Clock className="w-5 h-5" />}
            changeText="Service duration"
            changeType="neutral"
          />
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("services")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "services"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Services ({serviceStats.totalServices})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "categories"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Categories ({serviceStats.totalCategories})
            </button>
            <button
              onClick={() => setActiveTab("subcategories")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "subcategories"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Subcategories ({serviceStats.totalSubcategories})
            </button>
            <button
              onClick={() => setActiveTab("addon-management")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "addon-management"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Add-Ons & Service Assignments ({serviceStats.totalAddons})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive",
                    )
                  }
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Category:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setSubcategoryFilter("all"); // Reset subcategory when category changes
                  }}
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All Categories</option>
                  {categories
                    .filter((cat) => cat.is_active)
                    .map((category) => (
                      <option
                        key={category.id}
                        value={category.service_category_type}
                      >
                        {category.service_category_type
                          .charAt(0)
                          .toUpperCase() +
                          category.service_category_type.slice(1)}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Subcategory:</label>
                <select
                  value={subcategoryFilter}
                  onChange={(e) => setSubcategoryFilter(e.target.value)}
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                  disabled={categoryFilter === "all"}
                >
                  <option value="all">All Subcategories</option>
                  {subcategories
                    .filter(
                      (sub) =>
                        sub.is_active &&
                        (categoryFilter === "all" ||
                          sub.service_categories?.service_category_type ===
                            categoryFilter),
                    )
                    .map((subcategory) => (
                      <option
                        key={subcategory.id}
                        value={subcategory.service_subcategory_type}
                      >
                        {subcategory.service_subcategory_type
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() + word.slice(1),
                          )
                          .join(" ")}
                      </option>
                    ))}
                </select>
              </div>

              <div className="text-sm text-muted-foreground ml-auto">
                {loading
                  ? "Loading..."
                  : `Showing ${filteredServices.length} of ${services.length} services`}
                {error && (
                  <div className="text-orange-600 text-xs mt-1">{error}</div>
                )}
              </div>
            </div>

            <ROAMDataTable
              title="All Services"
              columns={serviceColumns}
              data={loading ? [] : filteredServices}
              searchable={true}
              filterable={false}
              addable={true}
              onAdd={() => setIsAddServiceOpen(true)}
              onRowClick={(service) => console.log("View service:", service)}
              pageSize={10}
            />
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive",
                    )
                  }
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground ml-auto">
                {loading
                  ? "Loading..."
                  : `Showing ${filteredCategories.length} of ${categories.length} categories`}
                {error && (
                  <div className="text-orange-600 text-xs mt-1">{error}</div>
                )}
              </div>
            </div>

            <ROAMDataTable
              title="Service Categories"
              columns={categoryColumns}
              data={loading ? [] : filteredCategories}
              searchable={true}
              filterable={false}
              addable={false}
              onRowClick={(category) => console.log("View category:", category)}
              pageSize={10}
            />
          </div>
        )}

        {activeTab === "subcategories" && (
          <div className="space-y-4">
            {/* Filter Controls */}
            <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "all" | "active" | "inactive",
                    )
                  }
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="text-sm text-muted-foreground ml-auto">
                {loading
                  ? "Loading..."
                  : `Showing ${filteredSubcategories.length} of ${subcategories.length} subcategories`}
                {error && (
                  <div className="text-orange-600 text-xs mt-1">{error}</div>
                )}
              </div>
            </div>

            <ROAMDataTable
              title="Service Subcategories"
              columns={subcategoryColumns}
              data={loading ? [] : filteredSubcategories}
              searchable={true}
              filterable={false}
              addable={false}
              onRowClick={(subcategory) =>
                console.log("View subcategory:", subcategory)
              }
              pageSize={10}
            />
          </div>
        )}

        {activeTab === "addon-management" && (
          <div className="space-y-8">
            {/* Add-Ons Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <ROAMStatCard
                title="Total Add-Ons"
                value={serviceStats.totalAddons}
                icon={<Puzzle className="w-5 h-5" />}
                changeText={`${addons.filter((a) => a.is_active).length} active`}
                changeType="positive"
              />

              <ROAMStatCard
                title="Service Assignments"
                value={serviceStats.totalAddonEligibilities}
                icon={<Package className="w-5 h-5" />}
                changeText={`${serviceStats.recommendedAddonEligibilities} recommended`}
                changeType="neutral"
              />

              <ROAMStatCard
                title="Coverage Rate"
                value={`${serviceStats.totalAddons > 0 ? Math.round((serviceStats.totalAddonEligibilities / (serviceStats.totalAddons * services.length)) * 100) : 0}%`}
                icon={<TrendingUp className="w-5 h-5" />}
                changeText="Service-addon coverage"
                changeType="neutral"
              />
            </div>

            {/* Unified Add-On Management */}
            <div className="space-y-6">
              {/* Filter Controls */}
              <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">View:</label>
                  <select
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(
                        e.target.value as "all" | "active" | "inactive",
                      )
                    }
                    className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                  >
                    <option value="all">All Add-Ons</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div className="text-sm text-muted-foreground ml-auto">
                  {loading
                    ? "Loading..."
                    : `Showing ${filteredAddons.length} add-ons with ${addonEligibility.length} service assignments`}
                  {error && (
                    <div className="text-orange-600 text-xs mt-1">{error}</div>
                  )}
                </div>
              </div>

              {/* Enhanced Add-Ons Table with Service Assignments */}
              <ROAMDataTable
                title="Add-Ons & Service Assignments"
                columns={[
                  {
                    key: "name",
                    header: "Add-On",
                    sortable: true,
                    render: (value: string, row: ServiceAddon) => (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                          <Puzzle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {value}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {row.description}
                          </div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "type",
                    header: "Type",
                    render: (value: any, row: ServiceAddon) => (
                      <ROAMBadge
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 w-fit"
                      >
                        <Plus className="w-3 h-3" />
                        Service Enhancement
                      </ROAMBadge>
                    ),
                  },
                  {
                    key: "eligible_services",
                    header: "Service Assignments",
                    render: (value: any, row: ServiceAddon) => {
                      const eligibleServices = getEligibleServicesForAddon(
                        row.id,
                      );
                      const recommendedServices =
                        getRecommendedServicesForAddon(row.id);

                      return (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Package className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {eligibleServices.length} services
                            </span>
                          </div>
                          {recommendedServices.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Star className="w-3 h-3 text-roam-warning" />
                              <span className="text-xs text-muted-foreground">
                                {recommendedServices.length} recommended
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "assignment_actions",
                    header: "Quick Assign",
                    render: (value: any, row: ServiceAddon) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log(
                              "Assignment button clicked for addon:",
                              row,
                            );
                            setAddonForAssignment(row);
                            setIsAssignmentModalOpen(true);
                          }}
                        >
                          Assign to Services
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAddon(row);
                            setIsAddonDetailsOpen(true);
                          }}
                        >
                          View Assignments
                        </Button>
                      </div>
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    sortable: true,
                    render: (value: any, row: ServiceAddon) => (
                      <ROAMBadge
                        variant={row.is_active ? "success" : "secondary"}
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </ROAMBadge>
                    ),
                  },
                  {
                    key: "actions",
                    header: "Actions",
                    render: (value: any, row: ServiceAddon) => (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedAddon(row);
                            setIsAddonDetailsOpen(true);
                          }}
                          title="View Add-on & Assignments"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Edit Add-on"
                          onClick={() => {
                            setEditingAddon(row);
                            setIsEditAddonOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          title="Delete Add-on"
                          onClick={() => {
                            setAddonToDelete(row);
                            setIsDeleteAddonConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ),
                  },
                ]}
                data={loading ? [] : filteredAddons}
                searchable={true}
                filterable={false}
                addable={true}
                onAdd={() => setIsAddAddonOpen(true)}
                onRowClick={(addon) => console.log("View addon:", addon)}
                pageSize={10}
              />
            </div>
          </div>
        )}
      </div>

      {/* Service Details Modal */}
      <Dialog
        open={isServiceDetailsOpen}
        onOpenChange={setIsServiceDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-6 h-6 text-roam-blue" />
              Service Details - {selectedService?.name}
            </DialogTitle>
            <DialogDescription>
              View comprehensive service information including pricing,
              availability, and performance metrics.
            </DialogDescription>
          </DialogHeader>

          {selectedService && (
            <div className="space-y-6">
              {/* Service Image */}
              {selectedService.image_url && (
                <div className="w-full">
                  <img
                    src={selectedService.image_url}
                    alt={`${selectedService.name} service image`}
                    className="w-full h-64 object-cover rounded-lg border-2 border-border"
                    onError={(e) => {
                      // Hide image if it fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Service Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Service Name
                        </div>
                        <div className="font-medium">
                          {selectedService.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Category
                        </div>
                        <div className="font-medium">
                          {selectedService.category_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Subcategory
                        </div>
                        <div className="font-medium">
                          {selectedService.subcategory_name}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Pricing & Duration
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Minimum Price
                        </div>
                        <div className="font-medium text-roam-blue">
                          {formatPrice(selectedService.min_price)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Duration
                        </div>
                        <div className="font-medium">
                          {formatDuration(selectedService.duration_minutes)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Status
                        </div>
                        <div className="flex gap-2 mt-1">
                          <ROAMBadge
                            variant={
                              selectedService.is_active
                                ? "success"
                                : "secondary"
                            }
                          >
                            {selectedService.is_active ? "Active" : "Inactive"}
                          </ROAMBadge>
                          {selectedService.is_featured && (
                            <ROAMBadge
                              variant="warning"
                              className="flex items-center gap-1"
                            >
                              <Crown className="w-3 h-3" />
                              Featured
                            </ROAMBadge>
                          )}
                          {selectedService.is_popular && (
                            <ROAMBadge
                              variant="success"
                              className="flex items-center gap-1"
                            >
                              <Flame className="w-3 h-3" />
                              Popular
                            </ROAMBadge>
                          )}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {selectedService.description && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Description
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedService.description}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Available Add-Ons
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  {(() => {
                    const eligibleAddons = getEligibleAddonsForService(
                      selectedService.id,
                    );
                    const recommendedAddons = eligibleAddons.filter((addon) => {
                      return sampleAddonEligibility.some(
                        (e) =>
                          e.service_id === selectedService.id &&
                          e.addon_id === addon.id &&
                          e.is_recommended,
                      );
                    });

                    if (eligibleAddons.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <Puzzle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            No add-ons available for this service.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-roam-blue">
                              {eligibleAddons.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Available Add-Ons
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-roam-warning">
                              {recommendedAddons.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Recommended
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-roam-success">
                              {formatPrice(
                                eligibleAddons.reduce(
                                  (sum, addon) => sum + addon.price,
                                  0,
                                ),
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Total Add-On Value
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">
                            Available Add-Ons
                          </h4>
                          {eligibleAddons.map((addon) => {
                            const isRecommended = recommendedAddons.some(
                              (ra) => ra.id === addon.id,
                            );
                            return (
                              <div
                                key={addon.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                                    <Puzzle className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {addon.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Service Enhancement
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isRecommended && (
                                    <ROAMBadge
                                      variant="warning"
                                      size="sm"
                                      className="flex items-center gap-1"
                                    >
                                      <Star className="w-3 h-3" />
                                      Recommended
                                    </ROAMBadge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Category Details Modal */}
      <Dialog
        open={isCategoryDetailsOpen}
        onOpenChange={setIsCategoryDetailsOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-6 h-6 text-roam-blue" />
              Category Details - {selectedCategory?.name}
            </DialogTitle>
            <DialogDescription>
              View detailed category information including description,
              subcategories, and associated services.
            </DialogDescription>
          </DialogHeader>

          {selectedCategory && (
            <div className="space-y-6">
              {/* Category Image */}
              {selectedCategory.image_url && (
                <div className="w-full">
                  <img
                    src={selectedCategory.image_url}
                    alt={`${selectedCategory.name} category image`}
                    className="w-full h-64 object-cover rounded-lg border-2 border-border"
                    onError={(e) => {
                      // Hide image if it fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                </div>
              )}

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Category Information
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Category Name
                      </div>
                      <div className="font-medium">{selectedCategory.name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Status
                      </div>
                      <ROAMBadge
                        variant={
                          selectedCategory.is_active ? "success" : "secondary"
                        }
                        className="mt-1"
                      >
                        {selectedCategory.is_active ? "Active" : "Inactive"}
                      </ROAMBadge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Sort Order
                      </div>
                      <div className="font-medium">
                        {selectedCategory.sort_order || "Not set"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Created
                      </div>
                      <div className="font-medium">
                        {formatDate(selectedCategory.created_at)}
                      </div>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {selectedCategory.description && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Description
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedCategory.description}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Category Statistics
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-roam-blue">
                        {
                          sampleSubcategories.filter(
                            (s) => s.category_id === selectedCategory.id,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Subcategories
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-roam-success">
                        {
                          sampleServices.filter(
                            (s) => s.category_name === selectedCategory.name,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Services
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-roam-warning">
                        {
                          sampleServices.filter(
                            (s) =>
                              s.category_name === selectedCategory.name &&
                              s.is_active,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Active Services
                      </div>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subcategory Details Modal */}
      <Dialog
        open={isSubcategoryDetailsOpen}
        onOpenChange={setIsSubcategoryDetailsOpen}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-6 h-6 text-roam-blue" />
              Subcategory Details - {selectedSubcategory?.name}
            </DialogTitle>
            <DialogDescription>
              View subcategory information including related services and parent
              category details.
            </DialogDescription>
          </DialogHeader>

          {selectedSubcategory && (
            <div className="space-y-6">
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Subcategory Information
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Grid3X3 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Subcategory Name
                      </div>
                      <div className="font-medium">
                        {selectedSubcategory.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Parent Category
                      </div>
                      <div className="font-medium">
                        {selectedSubcategory.category_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Status
                      </div>
                      <ROAMBadge
                        variant={
                          selectedSubcategory.is_active
                            ? "success"
                            : "secondary"
                        }
                        className="mt-1"
                      >
                        {selectedSubcategory.is_active ? "Active" : "Inactive"}
                      </ROAMBadge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Created
                      </div>
                      <div className="font-medium">
                        {formatDate(selectedSubcategory.created_at)}
                      </div>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {selectedSubcategory.description && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Description
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedSubcategory.description}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Subcategory Statistics
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-roam-blue">
                        {
                          sampleServices.filter(
                            (s) =>
                              s.subcategory_name === selectedSubcategory.name,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Services
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-roam-success">
                        {
                          sampleServices.filter(
                            (s) =>
                              s.subcategory_name === selectedSubcategory.name &&
                              s.is_active,
                          ).length
                        }
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Active Services
                      </div>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add-on Details Modal */}
      <Dialog open={isAddonDetailsOpen} onOpenChange={setIsAddonDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="w-6 h-6 text-roam-blue" />
              Add-on Details - {selectedAddon?.name}
            </DialogTitle>
            <DialogDescription>
              View detailed add-on information including pricing, availability,
              and service compatibility.
            </DialogDescription>
          </DialogHeader>

          {selectedAddon && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Add-on Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Puzzle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Add-on Name
                        </div>
                        <div className="font-medium">{selectedAddon.name}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Status
                        </div>
                        <ROAMBadge
                          variant={
                            selectedAddon.is_active ? "success" : "secondary"
                          }
                          className="mt-1"
                        >
                          {selectedAddon.is_active ? "Active" : "Inactive"}
                        </ROAMBadge>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Add-on Type & Dates
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Type
                        </div>
                        <div className="mt-1">
                          <ROAMBadge
                            variant="outline"
                            className="flex items-center gap-1 w-fit"
                          >
                            <Plus className="w-3 h-3" />
                            Service Enhancement
                          </ROAMBadge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>
                        <div className="font-medium">
                          {formatDate(selectedAddon.created_at)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Last Updated
                        </div>
                        <div className="font-medium">
                          {formatDate(selectedAddon.updated_at)}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {selectedAddon.description && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Description
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedAddon.description}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Service Eligibility
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  {(() => {
                    const eligibleServices = getEligibleServicesForAddon(
                      selectedAddon.id,
                    );
                    const recommendedServices = getRecommendedServicesForAddon(
                      selectedAddon.id,
                    );

                    if (eligibleServices.length === 0) {
                      return (
                        <div className="text-center py-6">
                          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            This add-on is not yet configured for any services.
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-roam-blue">
                              {eligibleServices.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Eligible Services
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-roam-warning">
                              {recommendedServices.length}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Recommended
                            </div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-roam-success">
                              {Math.round(
                                (recommendedServices.length /
                                  eligibleServices.length) *
                                  100,
                              )}
                              %
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Recommend Rate
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">
                            Eligible Services
                          </h4>
                          {eligibleServices.map((service) => {
                            const isRecommended = recommendedServices.some(
                              (rs) => rs.id === service.id,
                            );
                            return (
                              <div
                                key={service.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                                    {service.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-medium text-sm">
                                      {service.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      {service.business_name}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-roam-success">
                                    {formatPrice(service.min_price)}
                                  </span>
                                  {isRecommended && (
                                    <ROAMBadge
                                      variant="warning"
                                      size="sm"
                                      className="flex items-center gap-1"
                                    >
                                      <Star className="w-3 h-3" />
                                      Recommended
                                    </ROAMBadge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Service Modal */}
      <Dialog open={isAddServiceOpen} onOpenChange={setIsAddServiceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-roam-blue" />
              Add New Service
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="service_name">Service Name *</Label>
              <Input
                id="service_name"
                value={newService.name}
                onChange={(e) =>
                  setNewService({ ...newService, name: e.target.value })
                }
                placeholder="Enter service name"
              />
            </div>

            <div>
              <Label htmlFor="service_description">Description</Label>
              <Textarea
                id="service_description"
                value={newService.description}
                onChange={(e) =>
                  setNewService({ ...newService, description: e.target.value })
                }
                placeholder="Describe the service"
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div>
              <Label>Service Image</Label>
              <div className="space-y-3">
                {newService.image_url || imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview || newService.image_url}
                      alt="Service preview"
                      className="w-full h-48 object-cover rounded-lg border-2 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={handleRemoveImage}
                      disabled={uploadingImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Upload service image
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage}
                        onClick={() =>
                          document
                            .getElementById("service-image-upload")
                            ?.click()
                        }
                      >
                        {uploadingImage ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Choose File
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
                <input
                  id="service-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="service_subcategory">Subcategory *</Label>
              <Select
                value={newService.subcategory_id}
                onValueChange={(value) =>
                  setNewService({ ...newService, subcategory_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subcategory" />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((subcategory) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      <div className="flex items-center gap-2">
                        <span>
                          {getServiceSubcategoryTypeIcon(
                            subcategory.service_subcategory_type,
                          )}
                        </span>
                        <span>
                          {formatServiceSubcategoryType(
                            subcategory.service_subcategory_type,
                          )}{" "}
                          (
                          {subcategory.service_categories?.service_category_type
                            ? formatServiceCategoryType(
                                subcategory.service_categories
                                  .service_category_type,
                              )
                            : "No category"}
                          )
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service_price">Minimum Price *</Label>
                <Input
                  id="service_price"
                  type="number"
                  step="0.01"
                  value={newService.min_price}
                  onChange={(e) =>
                    setNewService({ ...newService, min_price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="service_duration">Duration (minutes) *</Label>
                <Input
                  id="service_duration"
                  type="number"
                  value={newService.duration_minutes}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      duration_minutes: e.target.value,
                    })
                  }
                  placeholder="60"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="service_active"
                  checked={newService.is_active}
                  onCheckedChange={(checked) =>
                    setNewService({ ...newService, is_active: checked })
                  }
                />
                <Label htmlFor="service_active">Active service</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="service_featured"
                  checked={newService.is_featured}
                  onCheckedChange={(checked) =>
                    setNewService({ ...newService, is_featured: checked })
                  }
                />
                <Label htmlFor="service_featured">Featured service</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="service_popular"
                  checked={newService.is_popular}
                  onCheckedChange={(checked) =>
                    setNewService({ ...newService, is_popular: checked })
                  }
                />
                <Label htmlFor="service_popular">Popular service</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddServiceOpen(false);
                  setNewService({
                    name: "",
                    description: "",
                    subcategory_id: "",
                    min_price: "",
                    duration_minutes: "",
                    is_active: true,
                    is_featured: false,
                    is_popular: false,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createService}
                disabled={
                  saving ||
                  !newService.name ||
                  !newService.subcategory_id ||
                  !newService.min_price ||
                  !newService.duration_minutes
                }
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Service
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Service Modal */}
      <Dialog open={isEditServiceOpen} onOpenChange={setIsEditServiceOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-roam-blue" />
              Edit Service
            </DialogTitle>
          </DialogHeader>

          {editingService && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_service_name">Service Name *</Label>
                <Input
                  id="edit_service_name"
                  value={editingService.name}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter service name"
                />
              </div>

              <div>
                <Label htmlFor="edit_service_description">Description</Label>
                <Textarea
                  id="edit_service_description"
                  value={editingService.description || ""}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the service"
                  rows={3}
                />
              </div>

              {/* Image Upload for Edit */}
              <div>
                <Label>Service Image</Label>
                <div className="space-y-3">
                  {editingService.image_url ? (
                    <div className="relative">
                      <img
                        src={editingService.image_url}
                        alt="Service preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleEditRemoveImage}
                        disabled={uploadingImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Upload service image
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingImage}
                          onClick={() =>
                            document
                              .getElementById("edit-service-image-upload")
                              ?.click()
                          }
                        >
                          {uploadingImage ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    id="edit-service-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleEditImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_service_subcategory">Subcategory *</Label>
                <Select
                  value={editingService.subcategory_id}
                  onValueChange={(value) =>
                    setEditingService({
                      ...editingService,
                      subcategory_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subcategory" />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategories.map((subcategory) => (
                      <SelectItem key={subcategory.id} value={subcategory.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {getServiceSubcategoryTypeIcon(
                              subcategory.service_subcategory_type,
                            )}
                          </span>
                          <span>
                            {formatServiceSubcategoryType(
                              subcategory.service_subcategory_type,
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit_min_price">Minimum Price *</Label>
                  <Input
                    id="edit_min_price"
                    type="number"
                    step="0.01"
                    value={editingService.min_price}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        min_price: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="edit_duration_minutes">
                    Duration (minutes) *
                  </Label>
                  <Input
                    id="edit_duration_minutes"
                    type="number"
                    value={editingService.duration_minutes}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="60"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_active"
                    checked={editingService.is_active}
                    onCheckedChange={(checked) =>
                      setEditingService({
                        ...editingService,
                        is_active: checked,
                      })
                    }
                  />
                  <Label htmlFor="edit_is_active">Active service</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_featured"
                    checked={editingService.is_featured}
                    onCheckedChange={(checked) =>
                      setEditingService({
                        ...editingService,
                        is_featured: checked,
                      })
                    }
                  />
                  <Label htmlFor="edit_is_featured">Featured service</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit_is_popular"
                    checked={editingService.is_popular}
                    onCheckedChange={(checked) =>
                      setEditingService({
                        ...editingService,
                        is_popular: checked,
                      })
                    }
                  />
                  <Label htmlFor="edit_is_popular">Popular service</Label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditServiceOpen(false);
                    setEditingService(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateService}
                  disabled={
                    saving ||
                    !editingService.name ||
                    !editingService.subcategory_id ||
                    !editingService.min_price ||
                    !editingService.duration_minutes
                  }
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="w-4 w-4 mr-2" />
                  )}
                  Update Service
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Service
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Are you sure you want to delete this service?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">
                    "{serviceToDelete?.name}"
                  </span>{" "}
                  will be permanently removed.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ This action cannot be undone. The service will be permanently
                deleted from the database.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setServiceToDelete(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteService}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Service
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation Dialog */}
      <Dialog
        open={isDeleteCategoryConfirmOpen}
        onOpenChange={setIsDeleteCategoryConfirmOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Category
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Are you sure you want to delete this category?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">
                    "{categoryToDelete?.name}"
                  </span>{" "}
                  will be permanently removed.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ This action cannot be undone. The category and all its
                associated subcategories will be permanently deleted from the
                database.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteCategoryConfirmOpen(false);
                setCategoryToDelete(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteCategory}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Category
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Subcategory Confirmation Dialog */}
      <Dialog
        open={isDeleteSubcategoryConfirmOpen}
        onOpenChange={setIsDeleteSubcategoryConfirmOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              Delete Subcategory
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  Are you sure you want to delete this subcategory?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">
                    "{subcategoryToDelete?.name}"
                  </span>{" "}
                  will be permanently removed.
                </p>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">
                ⚠️ This action cannot be undone. The subcategory and all its
                associated services will be permanently deleted from the
                database.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteSubcategoryConfirmOpen(false);
                setSubcategoryToDelete(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSubcategory}
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Subcategory
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-roam-blue" />
              Edit Category
            </DialogTitle>
          </DialogHeader>

          {editingCategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_service_category_type">
                  Category Type *
                </Label>
                <Input
                  id="edit_service_category_type"
                  value={editingCategory.service_category_type}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      service_category_type: e.target.value,
                    })
                  }
                  placeholder="Enter category type (e.g., beauty, fitness, therapy)"
                />
              </div>

              <div>
                <Label htmlFor="edit_category_description">Description</Label>
                <Textarea
                  id="edit_category_description"
                  value={editingCategory.description}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the category"
                  rows={3}
                />
              </div>

              {/* Image Upload for Edit Category */}
              <div>
                <Label>Category Image</Label>
                <div className="space-y-3">
                  {editingCategory.image_url ? (
                    <div className="relative">
                      <img
                        src={editingCategory.image_url}
                        alt="Category preview"
                        className="w-full h-48 object-cover rounded-lg border-2 border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={handleEditRemoveCategoryImage}
                        disabled={uploadingImage}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Upload category image
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingImage}
                          onClick={() =>
                            document
                              .getElementById("edit-category-image-upload")
                              ?.click()
                          }
                        >
                          {uploadingImage ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  <input
                    id="edit-category-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleEditCategoryImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit_category_sort_order">Sort Order</Label>
                <Input
                  id="edit_category_sort_order"
                  type="number"
                  value={editingCategory.sort_order?.toString() || ""}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      sort_order: e.target.value
                        ? parseInt(e.target.value)
                        : null,
                    })
                  }
                  placeholder="1"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_category_active"
                  checked={editingCategory.is_active}
                  onCheckedChange={(checked) =>
                    setEditingCategory({
                      ...editingCategory,
                      is_active: checked,
                    })
                  }
                />
                <Label htmlFor="edit_category_active">Active category</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditCategoryOpen(false);
                    setEditingCategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateCategory}
                  disabled={saving || !editingCategory.service_category_type}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  Update Category
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Subcategory Modal */}
      <Dialog
        open={isEditSubcategoryOpen}
        onOpenChange={setIsEditSubcategoryOpen}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Grid3X3 className="w-5 h-5 text-roam-blue" />
              Edit Subcategory
            </DialogTitle>
          </DialogHeader>

          {editingSubcategory && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_service_subcategory_type">
                  Subcategory Type *
                </Label>
                <Input
                  id="edit_service_subcategory_type"
                  value={editingSubcategory.service_subcategory_type}
                  onChange={(e) =>
                    setEditingSubcategory({
                      ...editingSubcategory,
                      service_subcategory_type: e.target.value,
                    })
                  }
                  placeholder="Enter subcategory type (e.g., hair_and_makeup, spray_tan)"
                />
              </div>

              <div>
                <Label htmlFor="edit_subcategory_category">
                  Parent Category *
                </Label>
                <Select
                  value={editingSubcategory.category_id}
                  onValueChange={(value) =>
                    setEditingSubcategory({
                      ...editingSubcategory,
                      category_id: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {getServiceCategoryTypeIcon(
                              category.service_category_type,
                            )}
                          </span>
                          <span>
                            {formatServiceCategoryType(
                              category.service_category_type,
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit_subcategory_description">
                  Description
                </Label>
                <Textarea
                  id="edit_subcategory_description"
                  value={editingSubcategory.description}
                  onChange={(e) =>
                    setEditingSubcategory({
                      ...editingSubcategory,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the subcategory"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_subcategory_active"
                  checked={editingSubcategory.is_active}
                  onCheckedChange={(checked) =>
                    setEditingSubcategory({
                      ...editingSubcategory,
                      is_active: checked,
                    })
                  }
                />
                <Label htmlFor="edit_subcategory_active">
                  Active subcategory
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditSubcategoryOpen(false);
                    setEditingSubcategory(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateSubcategory}
                  disabled={
                    saving ||
                    !editingSubcategory.service_subcategory_type ||
                    !editingSubcategory.category_id
                  }
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  Update Subcategory
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Addon Modal */}
      <Dialog open={isAddAddonOpen} onOpenChange={setIsAddAddonOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-roam-blue" />
              Add New Service Add-On
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="addon_name">Add-On Name *</Label>
              <Input
                id="addon_name"
                value={newAddon.name}
                onChange={(e) =>
                  setNewAddon({ ...newAddon, name: e.target.value })
                }
                placeholder="Enter add-on name"
              />
            </div>

            <div>
              <Label htmlFor="addon_description">Description</Label>
              <Textarea
                id="addon_description"
                value={newAddon.description}
                onChange={(e) =>
                  setNewAddon({ ...newAddon, description: e.target.value })
                }
                placeholder="Describe the add-on"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="addon_active"
                checked={newAddon.is_active}
                onCheckedChange={(checked) =>
                  setNewAddon({ ...newAddon, is_active: checked })
                }
              />
              <Label htmlFor="addon_active">Active add-on</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddAddonOpen(false);
                  setNewAddon({
                    name: "",
                    description: "",
                    is_active: true,
                  });
                }}
              >
                Cancel
              </Button>
              <Button onClick={createAddon} disabled={saving || !newAddon.name}>
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Add-On
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Service Assignment Modal */}
      <Dialog
        open={isAssignmentModalOpen}
        onOpenChange={(open) => {
          console.log("Assignment modal open state changed to:", open);
          setIsAssignmentModalOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-roam-blue" />
              Assign Add-on to Services - {addonForAssignment?.name}
            </DialogTitle>
          </DialogHeader>

          {addonForAssignment && (
            <div className="space-y-6">
              {/* Current Assignment Summary */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Current Assignments
                </h3>
                <div className="text-sm text-muted-foreground">
                  {getEligibleServicesForAddon(addonForAssignment.id).length}{" "}
                  services currently assigned
                </div>
              </div>

              {/* Available Services to Assign */}
              <div className="space-y-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Available Services
                </h3>

                {/* Service Category & Subcategory Filters */}
                <div className="flex gap-4 items-center bg-muted/20 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Category:</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setSubcategoryFilter("all"); // Reset subcategory when category changes
                      }}
                      className="px-2 py-1 border border-border rounded text-xs bg-background"
                    >
                      <option value="all">All Categories</option>
                      {categories
                        .filter((cat) => cat.is_active)
                        .map((category) => (
                          <option
                            key={category.id}
                            value={category.service_category_type}
                          >
                            {category.service_category_type
                              .charAt(0)
                              .toUpperCase() +
                              category.service_category_type.slice(1)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Subcategory:</label>
                    <select
                      value={subcategoryFilter}
                      onChange={(e) => setSubcategoryFilter(e.target.value)}
                      className="px-2 py-1 border border-border rounded text-xs bg-background"
                      disabled={categoryFilter === "all"}
                    >
                      <option value="all">All Subcategories</option>
                      {subcategories
                        .filter(
                          (sub) =>
                            sub.is_active &&
                            (categoryFilter === "all" ||
                              sub.service_categories?.service_category_type ===
                                categoryFilter),
                        )
                        .map((subcategory) => (
                          <option
                            key={subcategory.id}
                            value={subcategory.service_subcategory_type}
                          >
                            {subcategory.service_subcategory_type
                              .split("_")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1),
                              )
                              .join(" ")}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  <div className="space-y-2 p-4">
                    {services
                      .filter((service) => {
                        const categoryMatch =
                          categoryFilter === "all" ||
                          service.service_subcategories?.service_categories
                            ?.service_category_type === categoryFilter;

                        const subcategoryMatch =
                          subcategoryFilter === "all" ||
                          service.service_subcategories
                            ?.service_subcategory_type === subcategoryFilter;

                        return categoryMatch && subcategoryMatch;
                      })
                      .map((service) => {
                        const isAssigned = getEligibleServicesForAddon(
                          addonForAssignment.id,
                        ).some((es) => es.id === service.id);

                        return (
                          <div
                            key={service.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                                {getServiceSubcategoryTypeIcon(
                                  service.service_subcategories
                                    ?.service_subcategory_type || "",
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {service.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {service.service_subcategories
                                    ?.service_subcategory_type
                                    ? formatServiceSubcategoryType(
                                        service.service_subcategories
                                          .service_subcategory_type,
                                      )
                                    : "No subcategory"}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {isAssigned && (
                                <ROAMBadge variant="success" size="sm">
                                  <Check className="w-3 h-3 mr-1" />
                                  Assigned
                                </ROAMBadge>
                              )}
                              <Button
                                size="sm"
                                variant={isAssigned ? "destructive" : "default"}
                                onClick={() =>
                                  handleServiceAssignmentToggle(
                                    service.id,
                                    addonForAssignment.id,
                                    isAssigned,
                                  )
                                }
                              >
                                {isAssigned ? "Unassign" : "Assign"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAssignmentModalOpen(false);
                    setAddonForAssignment(null);
                  }}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setIsAssignmentModalOpen(false);
                    setAddonForAssignment(null);
                  }}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Assignment Modal */}
      <Dialog
        open={isNewAssignmentModalOpen}
        onOpenChange={setIsNewAssignmentModalOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="w-5 h-5 text-roam-blue" />
              Create New Service-Addon Assignment
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Create new assignments between services and add-ons to define
                which add-ons are available for specific services.
              </p>
            </div>

            {/* Service Selection */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Package className="w-4 h-4" />
                Select Service
              </h3>
              <div className="grid gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="selected-service"
                      value={service.id}
                      checked={selectedServiceForAssignment === service.id}
                      onChange={(e) =>
                        setSelectedServiceForAssignment(e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      {service.image_url ? (
                        <img
                          src={service.image_url}
                          alt={service.name}
                          className="w-6 h-6 rounded object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded flex items-center justify-center text-white text-xs">
                          {service.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{service.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Add-on Selection */}
            <div className="space-y-4">
              <h3 className="font-medium flex items-center gap-2">
                <Puzzle className="w-4 h-4" />
                Select Add-ons
              </h3>
              <div className="grid gap-3 max-h-48 overflow-y-auto border rounded-lg p-3">
                {addons.map((addon) => (
                  <label
                    key={addon.id}
                    className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={addon.id}
                      checked={selectedAddonsForAssignment.includes(addon.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAddonsForAssignment([
                            ...selectedAddonsForAssignment,
                            addon.id,
                          ]);
                        } else {
                          setSelectedAddonsForAssignment(
                            selectedAddonsForAssignment.filter(
                              (id) => id !== addon.id,
                            ),
                          );
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded flex items-center justify-center text-white text-xs">
                        <Puzzle className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-medium">{addon.name}</span>
                        {addon.description && (
                          <p className="text-xs text-muted-foreground">
                            {addon.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="font-medium">Assignment Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={newAssignmentRecommended}
                    onChange={(e) =>
                      setNewAssignmentRecommended(e.target.checked)
                    }
                  />
                  <span className="text-sm">Mark as recommended add-on</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={newAssignmentActive}
                    onChange={(e) => setNewAssignmentActive(e.target.checked)}
                  />
                  <span className="text-sm">Active assignment</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewAssignmentModalOpen(false);
                  // Reset form
                  setSelectedServiceForAssignment("");
                  setSelectedAddonsForAssignment([]);
                  setNewAssignmentRecommended(false);
                  setNewAssignmentActive(true);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (
                    !selectedServiceForAssignment ||
                    selectedAddonsForAssignment.length === 0
                  ) {
                    alert("Please select a service and at least one add-on.");
                    return;
                  }

                  try {
                    // Create assignments for each selected add-on
                    for (const addonId of selectedAddonsForAssignment) {
                      await createServiceAddonAssignment(
                        selectedServiceForAssignment,
                        addonId,
                        newAssignmentRecommended,
                      );
                    }

                    // Reset form and close modal
                    setSelectedServiceForAssignment("");
                    setSelectedAddonsForAssignment([]);
                    setNewAssignmentRecommended(false);
                    setNewAssignmentActive(true);
                    setIsNewAssignmentModalOpen(false);

                    // Refresh data
                    await fetchAllData();

                    alert(
                      `Successfully created ${selectedAddonsForAssignment.length} assignment(s)!`,
                    );
                  } catch (error) {
                    alert("Failed to create assignments. Please try again.");
                  }
                }}
                disabled={
                  !selectedServiceForAssignment ||
                  selectedAddonsForAssignment.length === 0
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Assignments
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Add-on Modal */}
      <Dialog open={isEditAddonOpen} onOpenChange={setIsEditAddonOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Puzzle className="w-5 h-5 text-roam-blue" />
              Edit Add-on
            </DialogTitle>
          </DialogHeader>

          {editingAddon && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit_addon_name">Add-on Name *</Label>
                <Input
                  id="edit_addon_name"
                  value={editingAddon.name}
                  onChange={(e) =>
                    setEditingAddon({
                      ...editingAddon,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter add-on name"
                />
              </div>

              <div>
                <Label htmlFor="edit_addon_description">Description</Label>
                <Textarea
                  id="edit_addon_description"
                  value={editingAddon.description || ""}
                  onChange={(e) =>
                    setEditingAddon({
                      ...editingAddon,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the add-on"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_addon_active"
                  checked={editingAddon.is_active}
                  onCheckedChange={(checked) =>
                    setEditingAddon({
                      ...editingAddon,
                      is_active: checked,
                    })
                  }
                />
                <Label htmlFor="edit_addon_active">Active add-on</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditAddonOpen(false);
                    setEditingAddon(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateAddon}
                  disabled={saving || !editingAddon.name}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Edit className="w-4 h-4 mr-2" />
                  )}
                  Update Add-on
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Add-on Confirmation Dialog */}
      <Dialog
        open={isDeleteAddonConfirmOpen}
        onOpenChange={setIsDeleteAddonConfirmOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              Delete Add-on
            </DialogTitle>
          </DialogHeader>

          {addonToDelete && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-sm">
                  Are you sure you want to delete{" "}
                  <strong>"{addonToDelete.name}"</strong>?
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This action cannot be undone. The add-on and all its
                  service assignments will be permanently deleted from the
                  database.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteAddonConfirmOpen(false);
                    setAddonToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteAddon}
                  disabled={saving}
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete Add-on
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
