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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  DollarSign,
  User,
  Percent,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Gift,
  Target,
  Users,
  CalendarRange,
  BarChart3,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

type SavingsType = "percentage_off" | "fixed_amount";

interface Promotion {
  id: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  business_id?: string;
  image_url?: string;
  promo_code: string;
  service_id?: string;
  savings_type?: SavingsType;
  savings_amount?: number;
  savings_max_amount?: number;
  business_profiles?: {
    id: string;
    business_name: string;
  };
  services?: {
    id: string;
    name: string;
  };
}

interface PromotionUsage {
  id: string;
  promotion_id: string;
  booking_id: string;
  discount_applied: number;
  original_amount: number;
  final_amount: number;
  created_at: string;
  used_at: string;
  // Joined data from related tables
  promotions?: {
    id: string;
    title: string;
  };
  bookings?: {
    id: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
    };
    services?: {
      id: string;
      name: string;
    };
  };
}

interface BusinessProfile {
  id: string;
  business_name: string;
}

interface Service {
  id: string;
  name: string;
  business_id?: string;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateTimeString: string) => {
  return new Date(dateTimeString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

const getPromotionStatusVariant = (promotion: Promotion) => {
  if (!promotion.is_active) return "secondary" as const;

  const now = new Date();
  const startDate = promotion.start_date
    ? new Date(promotion.start_date)
    : null;
  const endDate = promotion.end_date ? new Date(promotion.end_date) : null;

  if (startDate && now < startDate) return "warning" as const;
  if (endDate && now > endDate) return "secondary" as const;

  return "success" as const;
};

const getPromotionStatusText = (promotion: Promotion) => {
  if (!promotion.is_active) return "Inactive";

  const now = new Date();
  const startDate = promotion.start_date
    ? new Date(promotion.start_date)
    : null;
  const endDate = promotion.end_date ? new Date(promotion.end_date) : null;

  if (startDate && now < startDate) return "Scheduled";
  if (endDate && now > endDate) return "Expired";

  return "Active";
};

const isPromotionActive = (promotion: Promotion) => {
  if (!promotion.is_active) return false;

  const now = new Date();
  const startDate = promotion.start_date
    ? new Date(promotion.start_date)
    : null;
  const endDate = promotion.end_date ? new Date(promotion.end_date) : null;

  if (startDate && now < startDate) return false;
  if (endDate && now > endDate) return false;

  return true;
};

export default function AdminPromotions() {
  const { toast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promotionUsage, setPromotionUsage] = useState<PromotionUsage[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"promotions" | "usage">(
    "promotions",
  );
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(
    null,
  );
  const [isPromotionDetailsOpen, setIsPromotionDetailsOpen] = useState(false);
  const [isCreateEditOpen, setIsCreateEditOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "scheduled" | "expired"
  >("all");
  const [businessFilter, setBusinessFilter] = useState<string>("all");
  const [businessSearchQuery, setBusinessSearchQuery] = useState<string>("");
  const [isBusinessSearchOpen, setIsBusinessSearchOpen] =
    useState<boolean>(false);
  const [selectedBusinessName, setSelectedBusinessName] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [businessServices, setBusinessServices] = useState<Service[]>([]);
  const [serviceSearchQuery, setServiceSearchQuery] = useState<string>("");
  const [isServiceSearchOpen, setIsServiceSearchOpen] =
    useState<boolean>(false);
  const [selectedServiceName, setSelectedServiceName] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [promotionToDelete, setPromotionToDelete] = useState<Promotion | null>(
    null,
  );

  // Fetch promotions from Supabase
  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("promotions")
        .select(
          `
          *,
          business_profiles (
            id,
            business_name
          ),
          services (
            id,
            name
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching promotions - details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        const errorMessage =
          error?.message ||
          error?.details ||
          error?.hint ||
          "Unknown database error";
        setError(
          `Promotions Query Error: ${errorMessage}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.promotions FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} promotions`);
      setPromotions(data || []);
    } catch (error: any) {
      console.error("Error in fetchPromotions - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error type:", typeof error);
      const errorMessage = error?.message || error?.details || "Unknown error";
      setError(`Failed to fetch promotions data: ${errorMessage}`);
    }
  };

  // Fetch promotion usage with related data
  const fetchPromotionUsage = async () => {
    try {
      const { data, error } = await supabase
        .from("promotion_usage")
        .select(
          `
          *,
          promotions (
            id,
            title
          ),
          bookings (
            id,
            customer_profiles (
              id,
              first_name,
              last_name
            ),
            services (
              id,
              name
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching promotion usage - details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        const errorMessage =
          error?.message ||
          error?.details ||
          error?.hint ||
          "Unknown database error";
        setError(
          `Promotion Usage Query Error: ${errorMessage}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.promotion_usage FOR SELECT USING (true);`,
        );
        return;
      }

      console.log(`Fetched ${data?.length || 0} promotion usage records`);
      setPromotionUsage(data || []);
    } catch (error: any) {
      console.error("Error in fetchPromotionUsage - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error type:", typeof error);
      const errorMessage = error?.message || error?.details || "Unknown error";
      setError(`Failed to fetch promotion usage data: ${errorMessage}`);
    }
  };

  // Fetch businesses from Supabase
  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name")
        .eq("is_active", true)
        .order("business_name", { ascending: true });

      if (error) {
        console.error("Error fetching businesses - details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        return;
      }

      console.log(`Fetched ${data?.length || 0} businesses`);
      setBusinesses(data || []);
    } catch (error: any) {
      console.error("Error in fetchBusinesses - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error type:", typeof error);
    }
  };

  // Fetch services from Supabase
  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select(
          `
          id,
          name,
          subcategory_id,
          is_active,
          service_subcategories (
            service_categories (
              id
            )
          )
        `,
        )
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error fetching services - details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        return;
      }

      console.log(`Fetched ${data?.length || 0} services`);
      setServices(data || []);
    } catch (error: any) {
      console.error("Error in fetchServices - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error type:", typeof error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchPromotions(),
      fetchPromotionUsage(),
      fetchBusinesses(),
      fetchServices(),
    ]);
    setLoading(false);
  };

  const refreshData = async () => {
    await fetchAllData();
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // Close search dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest("#business_search") &&
        !target.closest(".business-search-dropdown")
      ) {
        setIsBusinessSearchOpen(false);
      }
      if (
        !target.closest("#service_search") &&
        !target.closest(".service-search-dropdown")
      ) {
        setIsServiceSearchOpen(false);
      }
    };

    if (isBusinessSearchOpen || isServiceSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isBusinessSearchOpen, isServiceSearchOpen]);

  // Image handling functions
  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);

      // Create a unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `promotion-${Date.now()}.${fileExt}`;
      const filePath = `promotion-images/${fileName}`;

      console.log("Uploading file:", {
        fileName,
        filePath,
        fileSize: file.size,
        fileType: file.type,
      });

      // Upload to Supabase Storage (try direct upload)
      console.log(
        "Attempting upload to bucket: roam-file-storage, path:",
        filePath,
      );

      const { data, error } = await supabase.storage
        .from("roam-file-storage")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      console.log("Upload response:", { data, error });

      if (error) {
        console.error("Error uploading image:", error);

        // Handle specific storage errors
        let errorMessage = "Unknown error occurred";
        if (error.message) {
          errorMessage = error.message;
        } else if (error.error) {
          errorMessage = error.error;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = "Failed to parse error details";
          }
        }

        // Check for common storage issues
        if (
          errorMessage.includes("bucket") &&
          errorMessage.includes("not found")
        ) {
          errorMessage =
            "Storage bucket configuration issue. Please contact administrator.";
        } else if (
          errorMessage.includes("permission") ||
          errorMessage.includes("denied")
        ) {
          errorMessage =
            "Storage permission issue. Please contact administrator.";
        } else if (
          errorMessage.includes("size") ||
          errorMessage.includes("large")
        ) {
          errorMessage = "File is too large. Please select a smaller image.";
        }

        toast({
          title: "Upload Error",
          description: `Failed to upload image: ${errorMessage}`,
          variant: "destructive",
        });
        return;
      }

      // Get public URL
      try {
        const {
          data: { publicUrl },
        } = supabase.storage.from("roam-file-storage").getPublicUrl(filePath);

        console.log("Generated public URL:", publicUrl);

        if (!publicUrl) {
          throw new Error("Failed to generate public URL");
        }

        // Update form data with image URL
        setFormData({ ...formData, image_url: publicUrl });
        setImagePreview(publicUrl);
      } catch (urlError) {
        console.error("Error generating public URL:", urlError);
        toast({
          title: "URL Error",
          description: "Failed to generate image URL. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Image uploaded successfully!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error in handleImageUpload:", error);
      const errorMessage =
        error?.message ||
        error?.error_description ||
        JSON.stringify(error) ||
        "Unknown error occurred";
      toast({
        title: "Upload Error",
        description: `Failed to upload image: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageRemove = async () => {
    try {
      if (formData.image_url) {
        // Extract file path from URL for storage deletion
        const urlParts = formData.image_url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `promotion-images/${fileName}`;

        // Delete from Supabase Storage
        const { error } = await supabase.storage
          .from("roam-file-storage")
          .remove([filePath]);

        if (error) {
          console.error("Error deleting image:", error);
          const errorMessage =
            error?.message ||
            error?.error_description ||
            JSON.stringify(error) ||
            "Unknown error occurred";
          toast({
            title: "Delete Error",
            description: `Failed to delete old image: ${errorMessage}`,
            variant: "destructive",
          });
        }
      }

      // Update form data
      setFormData({ ...formData, image_url: undefined });
      setImagePreview(null);

      toast({
        title: "Success",
        description: "Image removed successfully!",
        variant: "default",
      });
    } catch (error: any) {
      console.error("Error in handleImageRemove:", error);
      const errorMessage =
        error?.message ||
        error?.error_description ||
        JSON.stringify(error) ||
        "Unknown error occurred";
      toast({
        title: "Remove Error",
        description: `Failed to remove image: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      handleImageUpload(file);
    }
  };

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<Promotion>>({
    title: "",
    description: "",
    start_date: "",
    end_date: "",
    is_active: true,
    business_id: "",
    image_url: "",
    promo_code: "",
    service_id: "",
    savings_type: "percentage_off",
    savings_amount: undefined,
    savings_max_amount: undefined,
  });

  // Helper function to get services for a specific business
  const getBusinessServices = async (
    businessId: string,
  ): Promise<Service[]> => {
    try {
      const { data, error } = await supabase
        .from("business_services")
        .select(
          `
          service_id,
          services (
            id,
            name
          )
        `,
        )
        .eq("business_id", businessId)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching business services - details:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        console.error("Business ID:", businessId);
        return [];
      }

      return (
        data?.map((bs) => ({
          id: bs.services.id,
          name: bs.services.name,
          business_id: businessId,
        })) || []
      );
    } catch (error: any) {
      console.error("Error in getBusinessServices - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Business ID:", businessId);
      console.error("Error type:", typeof error);
      return [];
    }
  };

  // Helper functions to get display names from joined data
  const getCustomerName = (usage: PromotionUsage) => {
    if (usage.bookings?.customer_profiles) {
      const { first_name, last_name } = usage.bookings.customer_profiles;
      return `${first_name} ${last_name}`;
    }
    return "Unknown Customer";
  };

  const getServiceName = (usage: PromotionUsage) => {
    return usage.bookings?.services?.name || "Unknown Service";
  };

  const getPromotionTitle = (usage: PromotionUsage) => {
    return usage.promotions?.title || "Unknown Promotion";
  };

  // Filter promotions based on selected status and business
  const filteredPromotions = promotions.filter((promotion) => {
    const statusMatch =
      statusFilter === "all" ||
      getPromotionStatusText(promotion).toLowerCase() === statusFilter;

    const businessMatch =
      businessFilter === "all" ||
      (businessFilter === "global" && !promotion.business_id) ||
      promotion.business_id === businessFilter;

    return statusMatch && businessMatch;
  });

  const promotionStats = {
    totalPromotions: promotions.length,
    activePromotions: promotions.filter(isPromotionActive).length,
    inactivePromotions: promotions.filter((p) => !p.is_active).length,
    scheduledPromotions: promotions.filter((p) => {
      const now = new Date();
      const startDate = p.start_date ? new Date(p.start_date) : null;
      return p.is_active && startDate && now < startDate;
    }).length,
    expiredPromotions: promotions.filter((p) => {
      const now = new Date();
      const endDate = p.end_date ? new Date(p.end_date) : null;
      return p.is_active && endDate && now > endDate;
    }).length,
    totalUsage: promotionUsage.length,
    totalDiscount: promotionUsage.reduce(
      (sum, usage) => sum + usage.discount_applied,
      0,
    ),
    totalSavings: promotionUsage.reduce(
      (sum, usage) => sum + usage.discount_applied,
      0,
    ),
    averageDiscount:
      promotionUsage.length > 0
        ? promotionUsage.reduce(
            (sum, usage) => sum + usage.discount_applied,
            0,
          ) / promotionUsage.length
        : 0,
  };

  const handleCreateEdit = async () => {
    // Validate required fields
    if (!formData.title?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a promotion title",
        variant: "destructive",
      });
      return;
    }

    if (!formData.promo_code?.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a promo code",
        variant: "destructive",
      });
      return;
    }

    if (!formData.savings_amount || formData.savings_amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid savings amount",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.savings_type === "percentage_off" &&
      formData.savings_amount > 100
    ) {
      toast({
        title: "Validation Error",
        description: "Percentage discount cannot exceed 100%",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.savings_type === "percentage_off" &&
      formData.savings_max_amount &&
      formData.savings_max_amount <= 0
    ) {
      toast({
        title: "Validation Error",
        description: "Maximum savings amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    try {
      // Validate and prepare data
      const promotionData = {
        title: formData.title?.trim(),
        description: formData.description?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        is_active: Boolean(formData.is_active),
        business_id: formData.business_id || null,
        image_url: formData.image_url || null,
        promo_code: formData.promo_code?.trim(),
        service_id: formData.service_id || null,
        savings_type: formData.savings_type,
        savings_amount: formData.savings_amount
          ? Number(formData.savings_amount)
          : null,
        savings_max_amount: formData.savings_max_amount
          ? Number(formData.savings_max_amount)
          : null,
      };

      console.log("Raw form data:", formData);
      console.log("Prepared promotion data:", promotionData);
      console.log("Data types:", {
        title: typeof promotionData.title,
        savings_amount: typeof promotionData.savings_amount,
        savings_max_amount: typeof promotionData.savings_max_amount,
        savings_type: typeof promotionData.savings_type,
        is_active: typeof promotionData.is_active,
      });

      if (editingPromotion) {
        const { error } = await supabase
          .from("promotions")
          .update(promotionData)
          .eq("id", editingPromotion.id);

        if (error) {
          console.error("Supabase update error details:", error);
          console.error("Error message:", error.message);
          console.error("Error code:", error.code);
          console.error("Error details:", error.details);
          console.error("Error hint:", error.hint);
          throw error;
        }
        toast({
          title: "Success",
          description: "Promotion updated successfully!",
          variant: "default",
        });
      } else {
        const { error } = await supabase
          .from("promotions")
          .insert([promotionData]);

        if (error) {
          console.error("Supabase insert error details:", error);
          console.error("Error message:", error.message);
          console.error("Error code:", error.code);
          console.error("Error details:", error.details);
          console.error("Error hint:", error.hint);
          throw error;
        }
        toast({
          title: "Success",
          description: "Promotion created successfully!",
          variant: "default",
        });
      }

      setIsCreateEditOpen(false);
      setEditingPromotion(null);
      setFormData({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        is_active: true,
        business_id: "",
        image_url: "",
        promo_code: "",
        service_id: "",
        savings_type: "percentage_off",
        savings_amount: undefined,
        savings_max_amount: undefined,
      });
      setBusinessSearchQuery("");
      setSelectedBusinessName("");
      setIsBusinessSearchOpen(false);
      setServiceSearchQuery("");
      setSelectedServiceName("");
      setIsServiceSearchOpen(false);
      setImagePreview(null);

      await fetchAllData();
    } catch (error: any) {
      // Detailed error logging
      console.error("Error saving promotion - full details:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error details:", error?.details);
      console.error("Error hint:", error?.hint);
      console.error("Error description:", error?.error_description);
      console.error("Error type:", typeof error);
      console.error("Error keys:", error ? Object.keys(error) : []);

      // Extract meaningful error message from different error formats
      let errorMessage = "Unknown error occurred";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (error?.hint) {
        errorMessage = error.hint;
      } else if (error?.error_description) {
        errorMessage = error.error_description;
      } else if (error?.code) {
        errorMessage = `Database error (code: ${error.code})`;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.constructor?.name) {
        errorMessage = `${error.constructor.name}: Check console for details`;
      } else {
        // Last resort - try to extract useful info
        try {
          const errorStr = JSON.stringify(error, null, 2);
          if (errorStr && errorStr !== "{}") {
            errorMessage = `Error details: ${errorStr}`;
          } else {
            errorMessage = "Unknown error - check console for details";
          }
        } catch (e) {
          errorMessage = "Failed to parse error details - check console";
        }
      }

      toast({
        title: "Error",
        description: `Failed to save promotion: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setPromotionToDelete(promotion);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!promotionToDelete) return;

    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", promotionToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Promotion "${promotionToDelete.title}" has been deleted successfully!`,
        variant: "default",
      });
      setIsDeleteConfirmOpen(false);
      setPromotionToDelete(null);
      await fetchAllData();
    } catch (error: any) {
      console.error("Error deleting promotion:", error);
      toast({
        title: "Error",
        description: `Failed to delete promotion: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setPromotionToDelete(null);
  };

  const openCreateModal = () => {
    setEditingPromotion(null);
    setFormData({
      title: "",
      description: "",
      start_date: "",
      end_date: "",
      is_active: true,
      business_id: "",
      image_url: "",
      promo_code: "",
      service_id: "",
      savings_type: "percentage_off",
      savings_amount: undefined,
      savings_max_amount: undefined,
    });
    setBusinessSearchQuery("");
    setSelectedBusinessName("");
    setIsBusinessSearchOpen(false);
    setServiceSearchQuery("");
    setSelectedServiceName("");
    setIsServiceSearchOpen(false);
    setImagePreview(null);
    setIsCreateEditOpen(true);
  };

  const openEditModal = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setFormData({
      title: promotion.title,
      description: promotion.description || "",
      start_date: promotion.start_date || "",
      end_date: promotion.end_date || "",
      is_active: promotion.is_active,
      business_id: promotion.business_id || "",
      image_url: promotion.image_url || "",
      promo_code: promotion.promo_code || "",
      service_id: promotion.service_id || "",
      savings_type: promotion.savings_type || "percentage_off",
      savings_amount: promotion.savings_amount || undefined,
      savings_max_amount: promotion.savings_max_amount || undefined,
    });
    setBusinessSearchQuery("");
    setSelectedBusinessName(promotion.business_profiles?.business_name || "");
    setIsBusinessSearchOpen(false);
    setServiceSearchQuery("");
    setSelectedServiceName(promotion.services?.name || "");
    setIsServiceSearchOpen(false);
    setImagePreview(promotion.image_url || null);
    setIsCreateEditOpen(true);
  };

  // Promotion columns
  const promotionColumns: Column[] = [
    {
      key: "title_description",
      header: "Promotion",
      render: (value: any, row: Promotion) => (
        <div className="flex items-center gap-3">
          {/* Promotion Image */}
          <div className="flex-shrink-0">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={row.title}
                className="w-12 h-12 rounded-lg object-cover border border-border"
                onError={(e) => {
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
              className={`w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm ${row.image_url ? "hidden" : ""}`}
            >
              <Gift className="w-6 h-6" />
            </div>
          </div>

          {/* Promotion Details */}
          <div className="space-y-1 min-w-0 flex-1">
            <div className="font-medium">{row.title}</div>
            {row.description && (
              <div className="text-sm text-muted-foreground line-clamp-2">
                {row.description}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: "promo_code",
      header: "Promo Code",
      sortable: true,
      render: (value: string, row: Promotion) => (
        <div className="space-y-1">
          <div className="font-mono font-semibold text-sm bg-muted px-2 py-1 rounded border">
            {row.promo_code}
          </div>
        </div>
      ),
    },
    {
      key: "savings",
      header: "Savings",
      render: (value: any, row: Promotion) => (
        <div className="space-y-1">
          {row.savings_type && row.savings_amount ? (
            <div>
              <div className="font-medium text-sm flex items-center gap-1">
                {row.savings_type === "percentage_off" ? (
                  <>
                    <Percent className="w-3 h-3" />
                    {row.savings_amount}%
                  </>
                ) : (
                  <>
                    <DollarSign className="w-3 h-3" />
                    {row.savings_amount}
                  </>
                )}
              </div>
              {row.savings_type === "percentage_off" &&
                row.savings_max_amount && (
                  <div className="text-xs text-muted-foreground">
                    Max: ${row.savings_max_amount}
                  </div>
                )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No savings configured
            </div>
          )}
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      render: (value: any, row: Promotion) => (
        <div className="space-y-1">
          {row.services ? (
            <div className="font-medium text-sm">{row.services.name}</div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {row.business_profiles ? "All Business Services" : "All Services"}
            </div>
          )}
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: Promotion) => (
        <ROAMBadge variant={getPromotionStatusVariant(row)}>
          {getPromotionStatusText(row)}
        </ROAMBadge>
      ),
    },
    {
      key: "business",
      header: "Business",
      render: (value: any, row: Promotion) => (
        <div className="space-y-1">
          {row.business_profiles ? (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                {row.business_profiles.business_name.charAt(0).toUpperCase()}
              </div>
              <span className="font-medium text-sm">
                {row.business_profiles.business_name}
              </span>
            </div>
          ) : (
            <ROAMBadge variant="secondary" className="text-xs">
              Global Promotion
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(value)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: Promotion) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedPromotion(row);
              setIsPromotionDetailsOpen(true);
            }}
            title="View Details"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditModal(row)}
            title="Edit Promotion"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleDeletePromotion(row)}
            title="Delete Promotion"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Usage columns
  const usageColumns: Column[] = [
    {
      key: "promotion_customer",
      header: "Promotion & Customer",
      render: (value: any, row: PromotionUsage) => (
        <div className="space-y-1">
          <div className="font-medium">{getPromotionTitle(row)}</div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{getCustomerName(row)}</span>
          </div>
        </div>
      ),
    },
    {
      key: "service_name",
      header: "Service",
      render: (value: any, row: PromotionUsage) => (
        <span className="font-medium">{getServiceName(row)}</span>
      ),
    },
    {
      key: "discount_details",
      header: "Discount Applied",
      render: (value: any, row: PromotionUsage) => {
        const discountPercent = (
          (row.discount_applied / row.original_amount) *
          100
        ).toFixed(1);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-roam-success" />
              <span className="font-semibold text-roam-success">
                {formatPrice(row.discount_applied)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({discountPercent}%)
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatPrice(row.original_amount)} →{" "}
              {formatPrice(row.final_amount)}
            </div>
          </div>
        );
      },
    },
    {
      key: "used_at",
      header: "Used Date",
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDateTime(value)}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Promotions">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-roam-blue" />
            <p className="text-muted-foreground">Loading promotions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Promotions">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Failed to Load Promotions
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                {error}
              </p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Promotions">
      <div className="space-y-8">
        {/* Header with Refresh Button */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Promotions Management</h1>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </div>
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Promotions"
            value={promotionStats.totalPromotions}
            icon={<Gift className="w-5 h-5" />}
            changeText={`${promotionStats.activePromotions} currently active`}
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Total Usage"
            value={promotionStats.totalUsage}
            icon={<Target className="w-5 h-5" />}
            changeText={`${Math.round(promotionStats.totalUsage / promotionStats.totalPromotions)} avg per promotion`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Total Discounts"
            value={formatPrice(promotionStats.totalDiscount)}
            icon={<DollarSign className="w-5 h-5" />}
            changeText={`${formatPrice(promotionStats.averageDiscount)} average discount`}
            changeType="neutral"
          />

          <ROAMStatCard
            title="Active Now"
            value={promotionStats.activePromotions}
            icon={<Activity className="w-5 h-5" />}
            changeText={`${promotionStats.scheduledPromotions} scheduled, ${promotionStats.expiredPromotions} expired`}
            changeType="positive"
            changeIcon={<CheckCircle className="w-3 h-3" />}
          />
        </div>

        {/* Promotion Status Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6">
          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Active Promotions</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-roam-success" />
                  <div>
                    <div className="text-2xl font-bold">
                      {promotionStats.activePromotions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Currently running
                    </div>
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Scheduled</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-8 h-8 text-roam-warning" />
                  <div>
                    <div className="text-2xl font-bold">
                      {promotionStats.scheduledPromotions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Starting soon
                    </div>
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Expired</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {promotionStats.expiredPromotions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Past end date
                    </div>
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>

          <ROAMCard>
            <ROAMCardHeader>
              <ROAMCardTitle>Inactive</ROAMCardTitle>
            </ROAMCardHeader>
            <ROAMCardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <div className="text-2xl font-bold">
                      {promotionStats.inactivePromotions}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Manually disabled
                    </div>
                  </div>
                </div>
              </div>
            </ROAMCardContent>
          </ROAMCard>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("promotions")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "promotions"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Promotions ({promotionStats.totalPromotions})
            </button>
            <button
              onClick={() => setActiveTab("usage")}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "usage"
                  ? "border-roam-blue text-roam-blue"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Usage Analytics ({promotionStats.totalUsage})
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "promotions" && (
          <div className="space-y-4 w-full overflow-hidden">
            {/* Filter Controls */}
            <div className="flex gap-4 items-center bg-muted/30 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as
                        | "all"
                        | "active"
                        | "inactive"
                        | "scheduled"
                        | "expired",
                    )
                  }
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Business:</label>
                <select
                  value={businessFilter}
                  onChange={(e) => setBusinessFilter(e.target.value)}
                  className="px-3 py-1 border border-border rounded-md text-sm bg-background"
                >
                  <option value="all">All Promotions</option>
                  <option value="global">Global Promotions</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.business_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm text-muted-foreground ml-auto">
                Showing {filteredPromotions.length} of {promotions.length}{" "}
                promotions
              </div>
            </div>

            <ROAMDataTable
              title="All Promotions"
              columns={promotionColumns}
              data={filteredPromotions}
              searchable={true}
              filterable={false}
              addable={true}
              onAdd={openCreateModal}
              onRowClick={(promotion) =>
                console.log("View promotion:", promotion)
              }
              pageSize={10}
            />
          </div>
        )}

        {activeTab === "usage" && (
          <ROAMDataTable
            title="Promotion Usage Analytics"
            columns={usageColumns}
            data={promotionUsage}
            searchable={true}
            filterable={false}
            addable={false}
            onRowClick={(usage) => console.log("View usage:", usage)}
            pageSize={10}
          />
        )}
      </div>

      {/* Create/Edit Promotion Modal */}
      <Dialog open={isCreateEditOpen} onOpenChange={setIsCreateEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-roam-blue" />
              {editingPromotion ? "Edit Promotion" : "Create New Promotion"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="title">Promotion Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Enter promotion title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="promo_code">Promo Code *</Label>
                <Input
                  id="promo_code"
                  value={formData.promo_code}
                  onChange={(e) => {
                    // Convert to uppercase and remove spaces/special chars for consistency
                    const promoCode = e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9]/g, "");
                    setFormData({ ...formData, promo_code: promoCode });
                  }}
                  placeholder="Enter promo code (e.g., SAVE20, WELCOME10)"
                  className="mt-1"
                  maxLength={20}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Promo code will be automatically formatted (uppercase,
                  alphanumeric only)
                </p>
              </div>

              {/* Savings Configuration */}
              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Savings Configuration *
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Savings Type */}
                  <div>
                    <Label htmlFor="savings_type">Discount Type *</Label>
                    <select
                      id="savings_type"
                      value={formData.savings_type || "percentage_off"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          savings_type: e.target.value as SavingsType,
                          // Clear max amount when switching to fixed amount
                          savings_max_amount:
                            e.target.value === "fixed_amount"
                              ? undefined
                              : formData.savings_max_amount,
                        })
                      }
                      className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                    >
                      <option value="percentage_off">
                        Percentage Discount (%)
                      </option>
                      <option value="fixed_amount">
                        Fixed Amount Discount ($)
                      </option>
                    </select>
                  </div>

                  {/* Savings Amount */}
                  <div>
                    <Label htmlFor="savings_amount">
                      {formData.savings_type === "percentage_off"
                        ? "Discount Percentage *"
                        : "Discount Amount *"}
                    </Label>
                    <div className="relative mt-1">
                      {formData.savings_type === "fixed_amount" && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <Input
                        id="savings_amount"
                        type="number"
                        value={formData.savings_amount || ""}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setFormData({
                            ...formData,
                            savings_amount: isNaN(value) ? undefined : value,
                          });
                        }}
                        placeholder={
                          formData.savings_type === "percentage_off"
                            ? "e.g., 20"
                            : "e.g., 10.00"
                        }
                        className={
                          formData.savings_type === "fixed_amount" ? "pl-8" : ""
                        }
                        min="0"
                        max={
                          formData.savings_type === "percentage_off"
                            ? "100"
                            : undefined
                        }
                        step={
                          formData.savings_type === "percentage_off"
                            ? "1"
                            : "0.01"
                        }
                      />
                      {formData.savings_type === "percentage_off" && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                          <Percent className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formData.savings_type === "percentage_off"
                        ? "Enter percentage between 1-100"
                        : "Enter fixed dollar amount"}
                    </p>
                  </div>
                </div>

                {/* Maximum Savings Amount (only for percentage) */}
                {formData.savings_type === "percentage_off" && (
                  <div>
                    <Label htmlFor="savings_max_amount">
                      Maximum Savings Amount (Optional)
                    </Label>
                    <div className="relative mt-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Input
                        id="savings_max_amount"
                        type="number"
                        value={formData.savings_max_amount || ""}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          setFormData({
                            ...formData,
                            savings_max_amount: isNaN(value)
                              ? undefined
                              : value,
                          });
                        }}
                        placeholder="e.g., 50.00"
                        className="pl-8"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cap the maximum dollar amount that can be saved (useful
                      for high-value items)
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter promotion description"
                  className="mt-1"
                  rows={3}
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <Label>Promotion Image (Optional)</Label>
                <div className="mt-1 space-y-3">
                  {/* Current Image Display */}
                  {(imagePreview || formData.image_url) && (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview || formData.image_url}
                        alt="Promotion"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                      />
                      <button
                        type="button"
                        onClick={handleImageRemove}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* Upload Input */}
                  {!(imagePreview || formData.image_url) && (
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="image-upload"
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="image-upload"
                        className={`cursor-pointer inline-flex flex-col items-center gap-2 ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          {uploadingImage ? (
                            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                          ) : (
                            <Plus className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {uploadingImage ? "Uploading..." : "Upload Image"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            PNG, JPG up to 5MB
                          </div>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Replace Image Button */}
                  {(imagePreview || formData.image_url) && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileInputChange}
                        className="hidden"
                        id="image-replace"
                        disabled={uploadingImage}
                      />
                      <label
                        htmlFor="image-replace"
                        className={`cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors ${uploadingImage ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        {uploadingImage ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Edit className="w-4 h-4" />
                        )}
                        {uploadingImage ? "Uploading..." : "Replace Image"}
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="business_search">
                  Assign to Business (Optional)
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="business_search"
                    value={businessSearchQuery}
                    onChange={(e) => {
                      setBusinessSearchQuery(e.target.value);
                      setIsBusinessSearchOpen(true);
                      if (!e.target.value) {
                        setFormData({
                          ...formData,
                          business_id: undefined,
                          service_id: undefined,
                        });
                        setSelectedBusinessName("");
                        setSelectedServiceName("");
                        setBusinessServices([]);
                      }
                    }}
                    onFocus={() => setIsBusinessSearchOpen(true)}
                    placeholder={
                      selectedBusinessName ||
                      "Search businesses or leave empty for global promotion..."
                    }
                    className="w-full"
                  />

                  {/* Search Results Dropdown */}
                  {isBusinessSearchOpen && businessSearchQuery && (
                    <div className="business-search-dropdown absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {businesses
                        .filter((business) =>
                          business.business_name
                            .toLowerCase()
                            .includes(businessSearchQuery.toLowerCase()),
                        )
                        .slice(0, 10) // Limit to 10 results
                        .map((business) => (
                          <div
                            key={business.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                business_id: business.id,
                                service_id: undefined,
                              });
                              setSelectedBusinessName(business.business_name);
                              setBusinessSearchQuery("");
                              setIsBusinessSearchOpen(false);
                              setSelectedServiceName("");
                              setBusinessServices([]);
                            }}
                            className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                          >
                            <div className="font-medium text-sm">
                              {business.business_name}
                            </div>
                          </div>
                        ))}

                      {/* No results message */}
                      {businesses.filter((business) =>
                        business.business_name
                          .toLowerCase()
                          .includes(businessSearchQuery.toLowerCase()),
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No businesses found matching "{businessSearchQuery}"
                        </div>
                      )}

                      {/* Clear selection option */}
                      <div
                        onClick={() => {
                          setFormData({
                            ...formData,
                            business_id: undefined,
                            service_id: undefined,
                          });
                          setSelectedBusinessName("");
                          setBusinessSearchQuery("");
                          setIsBusinessSearchOpen(false);
                          setSelectedServiceName("");
                          setBusinessServices([]);
                        }}
                        className="px-3 py-2 hover:bg-muted cursor-pointer border-t border-border bg-muted/50"
                      >
                        <div className="font-medium text-sm text-muted-foreground">
                          🌐 Global Promotion (All Businesses)
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected business display */}
                  {selectedBusinessName && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-roam-blue/10 text-roam-blue px-2 py-1 rounded text-xs">
                        <span>{selectedBusinessName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              business_id: undefined,
                              service_id: undefined,
                            });
                            setSelectedBusinessName("");
                            setBusinessSearchQuery("");
                            setSelectedServiceName("");
                            setBusinessServices([]);
                          }}
                          className="hover:text-roam-blue/80"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Search and select a business, or leave empty to make this
                  promotion available to all businesses
                </p>
              </div>

              {/* Service Assignment */}
              <div>
                <Label htmlFor="service_search">
                  Assign to Service (Optional)
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="service_search"
                    value={serviceSearchQuery}
                    onChange={async (e) => {
                      setServiceSearchQuery(e.target.value);
                      setIsServiceSearchOpen(true);
                      if (!e.target.value) {
                        setFormData({ ...formData, service_id: undefined });
                        setSelectedServiceName("");
                      }
                    }}
                    onFocus={async () => {
                      setIsServiceSearchOpen(true);
                      // Load appropriate services based on business selection
                      if (formData.business_id) {
                        // Load business-specific services
                        const businessServices = await getBusinessServices(
                          formData.business_id,
                        );
                        setBusinessServices(businessServices);
                      } else {
                        // Load all services for global promotion
                        setBusinessServices(services);
                      }
                    }}
                    placeholder={
                      selectedServiceName ||
                      (formData.business_id
                        ? "Search services offered by this business..."
                        : "Search all services for global promotion...")
                    }
                    className="w-full"
                  />

                  {/* Service Search Results Dropdown */}
                  {isServiceSearchOpen && serviceSearchQuery && (
                    <div className="service-search-dropdown absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      {businessServices
                        .filter((service) =>
                          service.name
                            .toLowerCase()
                            .includes(serviceSearchQuery.toLowerCase()),
                        )
                        .slice(0, 10)
                        .map((service) => (
                          <div
                            key={service.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                service_id: service.id,
                              });
                              setSelectedServiceName(service.name);
                              setServiceSearchQuery("");
                              setIsServiceSearchOpen(false);
                            }}
                            className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                          >
                            <div className="font-medium text-sm">
                              {service.name}
                            </div>
                          </div>
                        ))}

                      {/* No results message */}
                      {businessServices.filter((service) =>
                        service.name
                          .toLowerCase()
                          .includes(serviceSearchQuery.toLowerCase()),
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No services found matching "{serviceSearchQuery}"
                        </div>
                      )}

                      {/* Clear selection option */}
                      <div
                        onClick={() => {
                          setFormData({ ...formData, service_id: undefined });
                          setSelectedServiceName("");
                          setServiceSearchQuery("");
                          setIsServiceSearchOpen(false);
                        }}
                        className="px-3 py-2 hover:bg-muted cursor-pointer border-t border-border bg-muted/50"
                      >
                        <div className="font-medium text-sm text-muted-foreground">
                          🌐{" "}
                          {formData.business_id
                            ? "All Business Services"
                            : "All Services (Global)"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected service display */}
                  {selectedServiceName && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-roam-blue/10 text-roam-blue px-2 py-1 rounded text-xs">
                        <span>{selectedServiceName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, service_id: undefined });
                            setSelectedServiceName("");
                            setServiceSearchQuery("");
                          }}
                          className="hover:text-roam-blue/80"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.business_id
                    ? "Search and select a specific service, or leave empty to apply to all services offered by this business"
                    : "Search and select a specific service for a global promotion, or leave empty to apply to all services"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="rounded border-border"
                />
                <Label htmlFor="is_active">Promotion is active</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateEditOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateEdit}>
                {editingPromotion ? "Update Promotion" : "Create Promotion"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Promotion Details Modal */}
      <Dialog
        open={isPromotionDetailsOpen}
        onOpenChange={setIsPromotionDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-roam-blue" />
              Promotion Details
            </DialogTitle>
            <DialogDescription>
              View detailed promotion information including terms, usage
              statistics, and performance metrics.
            </DialogDescription>
          </DialogHeader>

          {selectedPromotion && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Promotion Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Title</div>
                      <div className="font-medium">
                        {selectedPromotion.title}
                      </div>
                    </div>

                    {selectedPromotion.description && (
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Description
                        </div>
                        <div className="font-medium">
                          {selectedPromotion.description}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="text-sm text-muted-foreground">
                        Status
                      </div>
                      <ROAMBadge
                        variant={getPromotionStatusVariant(selectedPromotion)}
                        className="mt-1"
                      >
                        {getPromotionStatusText(selectedPromotion)}
                      </ROAMBadge>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Active Period
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    {selectedPromotion.start_date ? (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Start Date
                          </div>
                          <div className="font-medium">
                            {formatDate(selectedPromotion.start_date)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No start date set
                      </div>
                    )}

                    {selectedPromotion.end_date ? (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            End Date
                          </div>
                          <div className="font-medium">
                            {formatDate(selectedPromotion.end_date)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        No end date set
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Created
                        </div>
                        <div className="font-medium">
                          {formatDateTime(selectedPromotion.created_at)}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Usage Analytics */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Usage Analytics
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  {(() => {
                    const usage = promotionUsage.filter(
                      (u) => u.promotion_id === selectedPromotion.id,
                    );
                    const totalUsage = usage.length;
                    const totalDiscount = usage.reduce(
                      (sum, u) => sum + u.discount_applied,
                      0,
                    );
                    const averageDiscount =
                      totalUsage > 0 ? totalDiscount / totalUsage : 0;

                    return (
                      <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-roam-blue">
                            {totalUsage}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Uses
                          </div>
                        </div>

                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-roam-success">
                            {formatPrice(totalDiscount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Total Discounts
                          </div>
                        </div>

                        <div className="text-center p-4 bg-muted/50 rounded-lg">
                          <div className="text-2xl font-bold text-roam-warning">
                            {formatPrice(averageDiscount)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Average Discount
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </ROAMCardContent>
              </ROAMCard>

              {/* Recent Usage */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Recent Usage
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-3">
                    {promotionUsage
                      .filter(
                        (usage) => usage.promotion_id === selectedPromotion.id,
                      )
                      .slice(0, 5)
                      .map((usage) => (
                        <div
                          key={usage.id}
                          className="p-3 border rounded-lg space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium">
                              {getCustomerName(usage)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDateTime(usage.used_at)}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getServiceName(usage)}
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>
                              Discount: {formatPrice(usage.discount_applied)}
                            </span>
                            <span>
                              Final: {formatPrice(usage.final_amount)}
                            </span>
                          </div>
                        </div>
                      ))}

                    {promotionUsage.filter(
                      (u) => u.promotion_id === selectedPromotion.id,
                    ).length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        No usage recorded for this promotion yet
                      </div>
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              Delete Promotion
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete the promotion "
              {promotionToDelete?.title}"? This action cannot be undone.
            </p>

            {promotionToDelete && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-destructive mb-1">
                    {promotionToDelete.title}
                  </div>
                  {promotionToDelete.description && (
                    <div className="text-muted-foreground">
                      {promotionToDelete.description.length > 100
                        ? `${promotionToDelete.description.substring(0, 100)}...`
                        : promotionToDelete.description}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={cancelDelete}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Promotion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
