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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw, Plus } from "lucide-react";
import {
  UserCheck,
  UserX,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Shield,
  ShieldCheck,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  TrendingUp,
  Star,
  Calendar,
  Award,
  Building2,
  Phone,
  Mail,
  MapPin,
  Settings,
  DollarSign,
  Package,
  FileText,
  Download,
  Upload,
  Puzzle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  business_profiles?: {
    business_name: string;
  };
}

interface ProviderService {
  id: string;
  business_id: string;
  service_id: string;
  is_active: boolean;
  created_at: string;
  services?: {
    id: string;
    name: string;
    description: string | null;
    min_price: number;
    duration_minutes: number;
    is_active: boolean;
    service_subcategories?: {
      name: string; // Deprecated field
      service_subcategory_type: ServiceSubcategoryType;
      service_categories?: {
        name: string; // Deprecated field
        service_category_type: ServiceCategoryType;
      };
    };
  };
}

interface ProviderAddon {
  id: string;
  business_id: string;
  addon_id: string;
  is_active: boolean;
  created_at: string;
  service_addons?: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    is_active: boolean;
  };
}

type DocumentVerificationStatus = "pending" | "approved" | "rejected";

// MIGRATION NOTICE: The document verification system is being migrated from provider-focused to business-focused
// - provider_documents table has been renamed to business_documents
// - Admin panel will now onboard and verify businesses (not individual providers)
// - Businesses will be responsible for onboarding and verifying their own providers
// - This Documents tab should be moved to AdminBusinesses page or refactored to reflect business verification
// - All business_id references should become business_id references
// - All business_name references should become business_name references

interface BusinessDocument {
  id: string;
  business_id: string;
  business_name: string; // Joined from business_profiles
  document_type: string;
  document_name: string;
  file_url: string;
  file_size_bytes?: number;
  verification_status: DocumentVerificationStatus;
  verified_by?: string;
  verified_at?: string;
  rejection_reason?: string;
  expiry_date?: string;
  created_at: string;
}

const sampleProviderServices: ProviderService[] = [
  {
    id: "ps_1",
    business_id: "1",
    service_id: "srv_1",
    business_name: "Miami Spa & Wellness",
    service_name: "Deep Tissue Massage",
    service_category: "Massage Therapy",
    base_price: 120.0,
    custom_price: 135.0,
    is_active: true,
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "ps_2",
    business_id: "1",
    service_id: "srv_2",
    business_name: "Miami Spa & Wellness",
    service_name: "Swedish Massage",
    service_category: "Massage Therapy",
    base_price: 100.0,
    custom_price: 115.0,
    is_active: true,
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "ps_3",
    business_id: "2",
    service_id: "srv_3",
    business_name: "Elite Fitness Center",
    service_name: "Personal Training",
    service_category: "Fitness",
    base_price: 80.0,
    custom_price: 90.0,
    is_active: true,
    created_at: "2023-10-20T00:00:00Z",
  },
  {
    id: "ps_4",
    business_id: "2",
    service_id: "srv_4",
    business_name: "Elite Fitness Center",
    service_name: "Nutrition Consultation",
    service_category: "Fitness",
    base_price: 60.0,
    is_active: true,
    created_at: "2023-10-20T00:00:00Z",
  },
  {
    id: "ps_5",
    business_id: "3",
    service_id: "srv_5",
    business_name: "Zen Massage Therapy",
    service_name: "Aromatherapy Massage",
    service_category: "Wellness",
    base_price: 110.0,
    custom_price: 125.0,
    is_active: true,
    created_at: "2023-12-05T00:00:00Z",
  },
  {
    id: "ps_6",
    business_id: "3",
    service_id: "srv_6",
    business_name: "Zen Massage Therapy",
    service_name: "Reflexology",
    service_category: "Wellness",
    base_price: 90.0,
    is_active: false,
    created_at: "2023-12-05T00:00:00Z",
  },
  {
    id: "ps_7",
    business_id: "5",
    service_id: "srv_7",
    business_name: "Platinum Nails & Spa",
    service_name: "Gel Manicure",
    service_category: "Beauty",
    base_price: 45.0,
    custom_price: 50.0,
    is_active: true,
    created_at: "2024-01-08T00:00:00Z",
  },
  {
    id: "ps_8",
    business_id: "5",
    service_id: "srv_8",
    business_name: "Platinum Nails & Spa",
    service_name: "Acrylic Nails",
    service_category: "Beauty",
    base_price: 55.0,
    custom_price: 65.0,
    is_active: true,
    created_at: "2024-01-08T00:00:00Z",
  },
];

const sampleBusinessDocuments: BusinessDocument[] = [
  {
    id: "pd_1",
    business_id: "bus_001",
    business_name: "Serenity Spa & Wellness",
    document_type: "license",
    document_name: "Massage Therapy License",
    file_url: "/uploads/documents/sarah_martinez_license.pdf",
    file_size_bytes: 2457600,
    verification_status: "approved",
    verified_by: "admin_1",
    verified_at: "2023-09-16T10:30:00Z",
    expiry_date: "2025-09-15",
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "pd_2",
    business_id: "bus_001",
    business_name: "Serenity Spa & Wellness",
    document_type: "insurance",
    document_name: "Professional Liability Insurance",
    file_url: "/uploads/documents/sarah_martinez_insurance.pdf",
    file_size_bytes: 1852400,
    verification_status: "approved",
    verified_by: "admin_1",
    verified_at: "2023-09-16T10:35:00Z",
    expiry_date: "2024-08-20",
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "pd_3",
    business_id: "2",
    business_name: "Marcus Johnson",
    document_type: "certification",
    document_name: "Personal Training Certification",
    file_url: "/uploads/documents/marcus_johnson_cert.pdf",
    file_size_bytes: 3200000,
    verification_status: "approved",
    verified_by: "admin_2",
    verified_at: "2023-10-21T14:20:00Z",
    expiry_date: "2025-10-20",
    created_at: "2023-10-20T00:00:00Z",
  },
  {
    id: "pd_4",
    business_id: "2",
    business_name: "Marcus Johnson",
    document_type: "background_check",
    document_name: "Background Check Report",
    file_url: "/uploads/documents/marcus_johnson_background.pdf",
    file_size_bytes: 1456800,
    verification_status: "approved",
    verified_by: "admin_2",
    verified_at: "2023-10-21T14:25:00Z",
    created_at: "2023-10-20T00:00:00Z",
  },
  {
    id: "pd_5",
    business_id: "3",
    business_name: "Lisa Chen",
    document_type: "license",
    document_name: "Holistic Therapy License",
    file_url: "/uploads/documents/lisa_chen_license.pdf",
    file_size_bytes: 2100000,
    verification_status: "pending",
    created_at: "2023-12-05T00:00:00Z",
  },
  {
    id: "pd_6",
    business_id: "3",
    business_name: "Lisa Chen",
    document_type: "insurance",
    document_name: "Professional Insurance Policy",
    file_url: "/uploads/documents/lisa_chen_insurance.pdf",
    file_size_bytes: 1800000,
    verification_status: "pending",
    created_at: "2023-12-05T00:00:00Z",
  },
  {
    id: "pd_7",
    business_id: "4",
    business_name: "Jessica Rodriguez",
    document_type: "license",
    document_name: "Esthetician License",
    file_url: "/uploads/documents/jessica_rodriguez_license.pdf",
    file_size_bytes: 2800000,
    verification_status: "rejected",
    verified_by: "admin_1",
    verified_at: "2023-08-15T09:45:00Z",
    rejection_reason:
      "License appears to be expired. Please upload current valid license.",
    expiry_date: "2023-07-30",
    created_at: "2023-08-12T00:00:00Z",
  },
  {
    id: "pd_8",
    business_id: "5",
    business_name: "Amanda Thompson",
    document_type: "certification",
    document_name: "Nail Technician Certificate",
    file_url: "/uploads/documents/amanda_thompson_cert.pdf",
    file_size_bytes: 1950000,
    verification_status: "pending",
    created_at: "2024-01-08T00:00:00Z",
  },
];

const sampleProviders: Provider[] = [
  {
    id: "1",
    user_id: "user_1",
    business_id: "biz_1",
    business_name: "Miami Spa & Wellness",
    first_name: "Sarah",
    last_name: "Martinez",
    email: "sarah.martinez@miamispa.com",
    phone: "+1-305-555-0201",
    bio: "Licensed massage therapist with specialization in deep tissue and Swedish massage.",
    is_active: true,
    created_at: "2023-09-15T00:00:00Z",
    date_of_birth: "1988-03-12",
    experience_years: 8,
    verification_status: "approved",
    background_check_status: "approved",
    provider_role: "provider",
    business_managed: false,
    notification_email: "sarah.notifications@miamispa.com",
    notification_phone: "+1-305-555-9201",
    total_bookings: 245,
    completed_bookings: 238,
    average_rating: 4.8,
    total_reviews: 156,
  },
  {
    id: "2",
    user_id: "user_2",
    business_id: "biz_2",
    business_name: "Elite Fitness Center",
    first_name: "Marcus",
    last_name: "Johnson",
    email: "marcus@elitefitness.com",
    phone: "+1-305-555-0202",
    bio: "Certified personal trainer and nutritionist with focus on strength training.",
    is_active: true,
    created_at: "2023-10-20T00:00:00Z",
    date_of_birth: "1985-07-22",
    experience_years: 12,
    verification_status: "approved",
    background_check_status: "approved",
    provider_role: "owner",
    business_managed: true,
    notification_email: "marcus.alerts@elitefitness.com",
    notification_phone: "+1-305-555-9202",
    total_bookings: 189,
    completed_bookings: 185,
    average_rating: 4.9,
    total_reviews: 98,
  },
  {
    id: "3",
    user_id: "user_3",
    business_id: "biz_3",
    business_name: "Zen Massage Therapy",
    first_name: "Lisa",
    last_name: "Chen",
    email: "lisa.chen@zenmassage.com",
    phone: "+1-305-555-0203",
    bio: "Holistic wellness practitioner specializing in aromatherapy and reflexology.",
    is_active: true,
    created_at: "2023-12-05T00:00:00Z",
    date_of_birth: "1990-11-08",
    experience_years: 6,
    verification_status: "under_review",
    background_check_status: "under_review",
    provider_role: "provider",
    business_managed: false,
    notification_email: null,
    notification_phone: null,
    total_bookings: 67,
    completed_bookings: 65,
    average_rating: 4.7,
    total_reviews: 42,
  },
  {
    id: "4",
    user_id: "user_4",
    business_id: "biz_4",
    business_name: "Coastal Beauty Salon",
    first_name: "Jessica",
    last_name: "Rodriguez",
    email: "jessica@coastalbeauty.com",
    phone: "+1-305-555-0204",
    bio: "Licensed esthetician and makeup artist with 10 years of experience.",
    is_active: false,
    created_at: "2023-08-12T00:00:00Z",
    date_of_birth: "1987-05-18",
    experience_years: 10,
    verification_status: "rejected",
    background_check_status: "rejected",
    provider_role: "dispatcher",
    business_managed: true,
    notification_email: "jessica.dispatch@coastalbeauty.com",
    notification_phone: "+1-305-555-9204",
    total_bookings: 123,
    completed_bookings: 115,
    average_rating: 4.2,
    total_reviews: 78,
  },
  {
    id: "5",
    user_id: "user_5",
    business_id: "biz_5",
    business_name: "Platinum Nails & Spa",
    first_name: "Amanda",
    last_name: "Thompson",
    email: "amanda@platinumnails.com",
    phone: "+1-305-555-0205",
    bio: "Nail technician and spa specialist with expertise in gel and acrylic applications.",
    is_active: true,
    created_at: "2024-01-08T00:00:00Z",
    date_of_birth: "1992-09-25",
    experience_years: 4,
    verification_status: "pending",
    background_check_status: "pending",
    provider_role: "provider",
    business_managed: false,
    notification_email: "amanda.notify@platinumnails.com",
    notification_phone: null,
    total_bookings: 45,
    completed_bookings: 43,
    average_rating: 4.6,
    total_reviews: 28,
  },
];

const formatEnumDisplay = (value: string): string => {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getVerificationBadgeVariant = (status: VerificationStatus) => {
  switch (status) {
    case "approved":
      return "success" as const;
    case "documents_submitted":
      return "warning" as const;
    case "under_review":
      return "warning" as const;
    case "pending":
      return "secondary" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getBackgroundCheckBadgeVariant = (status: BackgroundCheckStatus) => {
  switch (status) {
    case "approved":
      return "success" as const;
    case "under_review":
      return "warning" as const;
    case "pending":
      return "secondary" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getVerificationIcon = (status: VerificationStatus) => {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-3 h-3" />;
    case "documents_submitted":
      return <AlertTriangle className="w-3 h-3" />;
    case "under_review":
      return <AlertTriangle className="w-3 h-3" />;
    case "pending":
      return <Clock className="w-3 h-3" />;
    case "rejected":
      return <XCircle className="w-3 h-3" />;
    default:
      return <Clock className="w-3 h-3" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const calculateAge = (birthDate: string) => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
};

type ServiceCategoryType = "beauty" | "fitness" | "therapy" | "healthcare";

type ServiceSubcategoryType =
  | "hair_and_makeup"
  | "spray_tan"
  | "esthetician"
  | "massage_therapy"
  | "iv_therapy"
  | "physical_therapy"
  | "nurse_practitioner"
  | "physician"
  | "chiropractor"
  | "yoga_instructor"
  | "pilates_instructor"
  | "personal_trainer";

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
    case "physician":
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

export default function AdminProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderService[]>(
    [],
  );
  const [providerAddons, setProviderAddons] = useState<ProviderAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [selectedProviderServices, setSelectedProviderServices] = useState<
    string[]
  >([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [isProviderDetailsOpen, setIsProviderDetailsOpen] = useState(false);
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | VerificationStatus
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [roleFilter, setRoleFilter] = useState<"all" | ProviderRole>("all");
  const [isAddProviderOpen, setIsAddProviderOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [businesses, setBusinesses] = useState<
    { id: string; business_name: string }[]
  >([]);
  const [newProvider, setNewProvider] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    business_id: "",
    date_of_birth: "",
    experience_years: "",
    provider_role: "provider" as ProviderRole,
    business_managed: false,
    notification_email: "",
    notification_phone: "",
    is_active: true,
  });

  // Fetch providers, provider services, provider add-ons, and businesses from Supabase
  useEffect(() => {
    fetchProviders();
    fetchProviderServices();
    fetchProviderAddons();
    fetchBusinesses();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching providers from Supabase...");

      const { data, error } = await supabase
        .from("providers")
        .select(
          `
          *,
          business_profiles!business_id (
            business_name
          )
        `,
        )
        .order("created_at", { ascending: false });

      console.log("Provider query response:", { data, error });

      if (error) {
        console.error("Query error:", error);
        setError(`Query Error: ${error.message} (Code: ${error.code})`);
        setProviders([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} providers from database`,
        );
        setProviders(data || []);
        if (data?.length === 0) {
          setError(
            "Database connected successfully but no provider records found.",
          );
        }
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Connection Error: ${errorMessage}`);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderServices = async () => {
    try {
      console.log("Fetching provider services from Supabase...");

      const { data, error } = await supabase
        .from("provider_services")
        .select(
          `
          *,
          services (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            is_active,
            service_subcategories (
              service_subcategory_type,
              service_categories (
                service_category_type
              )
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      console.log("Provider services query response:", { data, error });

      if (error) {
        console.error("Provider services query error:", error);

        // Extract error message properly
        const errorMessage =
          error?.message ||
          error?.error_description ||
          JSON.stringify(error) ||
          "Unknown error";
        console.log("Provider services error details:", {
          message: error?.message,
          code: error?.code,
          details: error?.details,
          hint: error?.hint,
        });

        // If the complex query fails, try a simple one
        console.log("Trying simple provider services query...");
        const { data: simpleData, error: simpleError } = await supabase
          .from("provider_services")
          .select("*")
          .order("created_at", { ascending: false });

        if (simpleError) {
          console.error(
            "Simple provider services query also failed:",
            simpleError,
          );
          const simpleErrorMessage =
            simpleError?.message ||
            simpleError?.error_description ||
            JSON.stringify(simpleError) ||
            "Unknown error";
          setError(
            `Provider Services Access Error: ${simpleErrorMessage}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.provider_services FOR SELECT USING (true);`,
          );
          setProviderServices([]);
        } else {
          console.log(
            `Simple query succeeded: ${simpleData?.length || 0} provider services`,
          );
          setProviderServices(simpleData || []);
          setError(
            `Provider services loaded but without service details (${errorMessage}). Complex join may need permissions.`,
          );
        }
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} provider services with service details`,
        );
        setProviderServices(data || []);
        if ((data?.length || 0) === 0) {
          setError(
            "Provider services table is empty. This is normal if no provider services have been created yet.",
          );
        } else {
          setError(null); // Clear any previous errors
        }
      }
    } catch (err) {
      console.error("Unexpected error fetching provider services:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Provider Services Connection Error: ${errorMessage}`);
      setProviderServices([]);
    }
  };

  const fetchProviderAddons = async () => {
    try {
      console.log("Fetching provider add-ons from Supabase...");

      const { data, error } = await supabase
        .from("provider_addons")
        .select(
          `
          *,
          service_addons (
            id,
            name,
            description,
            image_url,
            is_active
          )
        `,
        )
        .order("created_at", { ascending: false });

      console.log("Provider add-ons query response:", { data, error });

      if (error) {
        console.error("Provider add-ons query error:", error);
        const errorMessage =
          error?.message ||
          error?.error_description ||
          JSON.stringify(error) ||
          "Unknown error";
        const errorCode = error?.code || "unknown";
        setError(
          `Provider Add-ons Query Error: ${errorMessage} (Code: ${errorCode})`,
        );
        setProviderAddons([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} provider add-ons from database`,
        );
        setProviderAddons(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching provider add-ons:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Provider Add-ons Connection Error: ${errorMessage}`);
      setProviderAddons([]);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from("business_profiles")
        .select("id, business_name")
        .eq("is_active", true)
        .order("business_name");

      if (error) {
        console.error("Error fetching businesses:", error);
      } else {
        setBusinesses(data || []);
      }
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  };

  const createProvider = async () => {
    if (
      !newProvider.first_name ||
      !newProvider.last_name ||
      !newProvider.email ||
      !newProvider.business_id
    ) {
      alert(
        "Please fill in all required fields (First Name, Last Name, Email, Business)",
      );
      return;
    }

    setSaving(true);
    try {
      const providerData = {
        first_name: newProvider.first_name.trim(),
        last_name: newProvider.last_name.trim(),
        email: newProvider.email.trim(),
        phone: newProvider.phone.trim() || null,
        bio: newProvider.bio.trim() || null,
        business_id: newProvider.business_id,
        date_of_birth: newProvider.date_of_birth || null,
        experience_years: newProvider.experience_years
          ? parseInt(newProvider.experience_years)
          : null,
        provider_role: newProvider.provider_role,
        business_managed: newProvider.business_managed,
        notification_email: newProvider.notification_email.trim() || null,
        notification_phone: newProvider.notification_phone.trim() || null,
        is_active: newProvider.is_active,
        verification_status: "pending" as VerificationStatus,
        background_check_status: "pending" as BackgroundCheckStatus,
        total_bookings: 0,
        completed_bookings: 0,
        average_rating: 0,
        total_reviews: 0,
      };

      const { data, error } = await supabase
        .from("providers")
        .insert([providerData]).select(`
          *,
          business_profiles!business_id (
            business_name
          )
        `);

      if (error) {
        console.error("Error creating provider:", error);
        alert(
          `Error creating provider: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        console.log("Provider created successfully:", data);
        setIsAddProviderOpen(false);
        setNewProvider({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          bio: "",
          business_id: "",
          date_of_birth: "",
          experience_years: "",
          provider_role: "provider" as ProviderRole,
          business_managed: false,
          notification_email: "",
          notification_phone: "",
          is_active: true,
        });
        await fetchProviders(); // Refresh the providers list
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    } finally {
      setSaving(false);
    }
  };

  // Toggle provider active status
  const toggleProviderStatus = async (
    providerId: string,
    newStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from("providers")
        .update({ is_active: newStatus })
        .eq("id", providerId);

      if (error) {
        console.error("Error updating provider status:", error);
        alert(
          `Error updating provider status: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        console.log(
          `Provider ${providerId} status updated to ${newStatus ? "active" : "inactive"}`,
        );
        await fetchProviders(); // Refresh the providers list
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    }
  };

  // Toggle provider verification status
  const toggleVerificationStatus = async (
    providerId: string,
    newStatus: VerificationStatus,
  ) => {
    try {
      const { error } = await supabase
        .from("providers")
        .update({ verification_status: newStatus })
        .eq("id", providerId);

      if (error) {
        console.error("Error updating verification status:", error);
        alert(
          `Error updating verification status: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        console.log(
          `Provider ${providerId} verification status updated to ${newStatus}`,
        );
        await fetchProviders(); // Refresh the providers list
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    }
  };

  // Filter providers based on selected filters
  const filteredProviders = providers.filter((provider) => {
    const verificationMatch =
      verificationFilter === "all" ||
      provider.verification_status === verificationFilter;

    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && provider.is_active) ||
      (statusFilter === "inactive" && !provider.is_active);

    const roleMatch =
      roleFilter === "all" || provider.provider_role === roleFilter;

    return verificationMatch && statusMatch && roleMatch;
  });

  const providerStats = {
    total: providers.length,
    active: providers.filter((p) => p.is_active).length,
    verified: providers.filter((p) => p.verification_status === "approved")
      .length,
    backgroundApproved: providers.filter(
      (p) => p.background_check_status === "approved",
    ).length,
    avgRating:
      providers.length > 0
        ? providers.reduce((sum, p) => sum + p.average_rating, 0) /
          providers.length
        : 0,
    totalBookings: providers.reduce((sum, p) => sum + p.total_bookings, 0),
    avgExperience:
      providers.length > 0
        ? providers.reduce((sum, p) => sum + (p.experience_years || 0), 0) /
          providers.length
        : 0,
  };

  const businessDocumentStats = {
    total: sampleBusinessDocuments.length,
    pending: sampleBusinessDocuments.filter(
      (pd) => pd.verification_status === "pending",
    ).length,
    approved: sampleBusinessDocuments.filter(
      (pd) => pd.verification_status === "approved",
    ).length,
    rejected: sampleBusinessDocuments.filter(
      (pd) => pd.verification_status === "rejected",
    ).length,
    expiringSoon: sampleBusinessDocuments.filter((pd) => {
      if (!pd.expiry_date) return false;
      const expiryDate = new Date(pd.expiry_date);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      return expiryDate <= thirtyDaysFromNow;
    }).length,
    totalSizeBytes: sampleBusinessDocuments.reduce(
      (sum, pd) => sum + (pd.file_size_bytes || 0),
      0,
    ),
  };

  const columns: Column[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      render: (value: string, row: Provider) => {
        const initials =
          `${row.first_name?.[0] || ""}${row.last_name?.[0] || ""}`.toUpperCase() ||
          "PR";
        const fullName =
          `${row.first_name || ""} ${row.last_name || ""}`.trim() || "No name";

        return (
          <div className="flex items-center gap-3">
            {row.image_url ? (
              <img
                src={row.image_url}
                alt={`${fullName} avatar`}
                className="w-10 h-10 rounded-full object-cover border-2 border-roam-blue/20"
                onError={(e) => {
                  // Fallback to initials on image load error
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
              className={`w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold text-sm ${row.image_url ? "hidden" : ""}`}
            >
              {initials}
            </div>
            <div>
              <div className="font-medium text-foreground">{fullName}</div>
              <div className="text-sm text-muted-foreground">
                {row.email || "No email"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "business_name",
      header: "Business",
      sortable: true,
      render: (value: string, row: Provider) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {row.business_profiles?.business_name || "Unknown Business"}
          </span>
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Verification",
      sortable: true,
      render: (value: VerificationStatus, row: Provider) => (
        <div className="space-y-1">
          <ROAMBadge
            variant={getVerificationBadgeVariant(value)}
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            {getVerificationIcon(value)}
            {formatEnumDisplay(value)}
          </ROAMBadge>
          <ROAMBadge
            variant={getBackgroundCheckBadgeVariant(
              row.background_check_status,
            )}
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            <Shield className="w-3 h-3" />
            {formatEnumDisplay(row.background_check_status)}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "provider_role",
      header: "Role",
      sortable: true,
      render: (value: ProviderRole) => (
        <ROAMBadge
          variant={
            value === "owner"
              ? "success"
              : value === "dispatcher"
                ? "warning"
                : "secondary"
          }
          className="capitalize"
        >
          {value}
        </ROAMBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: Provider) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Joined",
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
      render: (value: any, row: Provider) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedProvider(row);
              setIsProviderDetailsOpen(true);
            }}
            title="View Provider"
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${
              row.is_active
                ? "text-roam-warning hover:text-roam-warning"
                : "text-roam-success hover:text-roam-success"
            }`}
            onClick={() => toggleProviderStatus(row.id, !row.is_active)}
            title={row.is_active ? "Deactivate Provider" : "Activate Provider"}
          >
            {row.is_active ? (
              <UserX className="h-4 w-4" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getDocumentStatusBadgeVariant = (
    status: DocumentVerificationStatus,
  ) => {
    switch (status) {
      case "approved":
        return "success" as const;
      case "pending":
        return "secondary" as const;
      case "rejected":
        return "danger" as const;
      default:
        return "secondary" as const;
    }
  };

  const getDocumentStatusIcon = (status: DocumentVerificationStatus) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="w-3 h-3" />;
      case "pending":
        return <Clock className="w-3 h-3" />;
      case "rejected":
        return <XCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const businessDocumentColumns: Column[] = [
    {
      key: "business_name",
      header: "Business",
      sortable: true,
      render: (value: string, row: BusinessDocument) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {row.business_name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </div>
          <div>
            <div className="font-medium text-foreground">
              {row.business_name}
            </div>
            <div className="text-sm text-muted-foreground">
              Provider ID: {row.business_id}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "document_name",
      header: "Document",
      sortable: true,
      render: (value: string, row: BusinessDocument) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-roam-blue" />
          <div>
            <div className="font-medium text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {row.document_type.replace("_", " ")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Status",
      sortable: true,
      render: (value: DocumentVerificationStatus) => (
        <ROAMBadge
          variant={getDocumentStatusBadgeVariant(value)}
          size="sm"
          className="flex items-center gap-1 w-fit"
        >
          {getDocumentStatusIcon(value)}
          {formatEnumDisplay(value)}
        </ROAMBadge>
      ),
    },
    {
      key: "file_info",
      header: "File Info",
      render: (value: any, row: BusinessDocument) => (
        <div className="space-y-1">
          {row.file_size_bytes && (
            <div className="text-sm text-muted-foreground">
              {formatFileSize(row.file_size_bytes)}
            </div>
          )}
          {row.expiry_date && (
            <div className="text-xs text-muted-foreground">
              Expires: {formatDate(row.expiry_date)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "verification_details",
      header: "Verification",
      render: (value: any, row: BusinessDocument) => (
        <div className="space-y-1">
          {row.verified_at && (
            <div className="text-xs text-muted-foreground">
              Verified: {formatDate(row.verified_at)}
            </div>
          )}
          {row.rejection_reason && (
            <div
              className="text-xs text-red-600 max-w-40 truncate"
              title={row.rejection_reason}
            >
              {row.rejection_reason}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Uploaded",
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
      render: (value: any, row: BusinessDocument) => (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
          {row.verification_status === "pending" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-roam-success"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-roam-danger"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Providers">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Providers"
            value={providerStats.total}
            icon={<UserCheck className="w-5 h-5" />}
            changeText="3 new this month"
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Active Providers"
            value={providerStats.active}
            icon={<Users className="w-5 h-5" />}
            changeText={`${Math.round((providerStats.active / providerStats.total) * 100)}% of total`}
            changeType="positive"
          />

          <ROAMStatCard
            title="Avg Rating"
            value={providerStats.avgRating.toFixed(1)}
            icon={<Star className="w-5 h-5" />}
            changeText="Platform average"
            changeType="neutral"
          />

          <ROAMStatCard
            title="Total Bookings"
            value={providerStats.totalBookings.toLocaleString()}
            icon={<Calendar className="w-5 h-5" />}
            changeText="All time bookings"
            changeType="positive"
          />
        </div>

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
              <label className="text-sm font-medium">
                Verification Status:
              </label>
              <select
                value={verificationFilter}
                onChange={(e) =>
                  setVerificationFilter(
                    e.target.value as "all" | VerificationStatus,
                  )
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
                onChange={(e) =>
                  setRoleFilter(e.target.value as "all" | ProviderRole)
                }
                className="px-3 py-1 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="provider">Provider</option>
                <option value="owner">Owner</option>
                <option value="dispatcher">Dispatcher</option>
              </select>
            </div>

            <div className="text-sm text-muted-foreground ml-auto">
              {loading
                ? "Loading..."
                : `Showing ${filteredProviders.length} of ${providers.length} providers`}
              {error && (
                <div className="text-orange-600 text-xs mt-1">{error}</div>
              )}
            </div>
          </div>

          {/* Providers Table */}
          <ROAMDataTable
            title="Providers"
            columns={columns}
            data={loading ? [] : filteredProviders}
            searchable={true}
            filterable={false}
            addable={true}
            onAdd={() => setIsAddProviderOpen(true)}
            onRowClick={(provider) => console.log("View provider:", provider)}
            pageSize={10}
          />
        </div>
      </div>

      {/* Add Provider Modal */}
      <Dialog open={isAddProviderOpen} onOpenChange={setIsAddProviderOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white">
                <Plus className="w-4 h-4" />
              </div>
              Add New Provider
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={newProvider.first_name}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={newProvider.last_name}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newProvider.email}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="provider@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newProvider.phone}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="+1-555-123-4567"
                  />
                </div>
              </div>
            </div>

            {/* Business and Professional Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Professional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="business_id">Business *</Label>
                  <Select
                    value={newProvider.business_id}
                    onValueChange={(value) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        business_id: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a business" />
                    </SelectTrigger>
                    <SelectContent>
                      {businesses.map((business) => (
                        <SelectItem key={business.id} value={business.id}>
                          {business.business_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience_years">Experience (Years)</Label>
                  <Input
                    id="experience_years"
                    type="number"
                    min="0"
                    max="50"
                    value={newProvider.experience_years}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        experience_years: e.target.value,
                      }))
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="provider_role">Provider Role</Label>
                <Select
                  value={newProvider.provider_role}
                  onValueChange={(value: ProviderRole) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      provider_role: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="provider">Provider</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={newProvider.date_of_birth}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      date_of_birth: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Professional Bio</Label>
                <Textarea
                  id="bio"
                  value={newProvider.bio}
                  onChange={(e) =>
                    setNewProvider((prev) => ({ ...prev, bio: e.target.value }))
                  }
                  placeholder="Brief description of experience and specializations..."
                  rows={3}
                />
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Notification Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notification_email">Notification Email</Label>
                  <Input
                    id="notification_email"
                    type="email"
                    value={newProvider.notification_email}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        notification_email: e.target.value,
                      }))
                    }
                    placeholder="notifications@example.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dedicated email for notifications (optional)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification_phone">Notification Phone</Label>
                  <Input
                    id="notification_phone"
                    value={newProvider.notification_phone}
                    onChange={(e) =>
                      setNewProvider((prev) => ({
                        ...prev,
                        notification_phone: e.target.value,
                      }))
                    }
                    placeholder="+1-555-123-4567"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dedicated phone for SMS notifications (optional)
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Status & Permissions
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={newProvider.is_active}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="is_active">Active Provider</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="business_managed"
                  checked={newProvider.business_managed}
                  onChange={(e) =>
                    setNewProvider((prev) => ({
                      ...prev,
                      business_managed: e.target.checked,
                    }))
                  }
                  className="rounded border-gray-300"
                />
                <Label htmlFor="business_managed">Can Manage Business</Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setIsAddProviderOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={createProvider}
                disabled={
                  saving ||
                  !newProvider.first_name ||
                  !newProvider.last_name ||
                  !newProvider.email ||
                  !newProvider.business_id
                }
                className="min-w-[100px]"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Provider"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Provider Details Modal */}
      <Dialog
        open={isProviderDetailsOpen}
        onOpenChange={setIsProviderDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold">
                {selectedProvider?.first_name[0]}
                {selectedProvider?.last_name?.[0] || ""}
              </div>
              Provider Details - {selectedProvider?.first_name}{" "}
              {selectedProvider?.last_name}
            </DialogTitle>
            <DialogDescription>
              View comprehensive provider information including profile,
              services, and performance metrics.
            </DialogDescription>
          </DialogHeader>

          {selectedProvider && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Personal Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Full Name
                        </div>
                        <div className="font-medium">
                          {selectedProvider.first_name}{" "}
                          {selectedProvider.last_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Email
                        </div>
                        <div className="font-medium">
                          {selectedProvider.email || "Not provided"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Phone
                        </div>
                        <div className="font-medium">
                          {selectedProvider.phone || "Not provided"}
                        </div>
                      </div>
                    </div>

                    {selectedProvider.date_of_birth && (
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Date of Birth
                          </div>
                          <div className="font-medium">
                            {new Date(
                              selectedProvider.date_of_birth,
                            ).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Experience
                        </div>
                        <div className="font-medium">
                          {selectedProvider.experience_years || 0} years
                        </div>
                      </div>
                    </div>

                    {(selectedProvider.notification_email ||
                      selectedProvider.notification_phone) && (
                      <div className="border-t pt-4 mt-4">
                        <div className="text-sm font-medium text-muted-foreground mb-3">
                          Notification Settings
                        </div>
                        {selectedProvider.notification_email && (
                          <div className="flex items-center gap-3 mb-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm text-muted-foreground">
                                Notification Email
                              </div>
                              <div className="font-medium">
                                <a
                                  href={`mailto:${selectedProvider.notification_email}`}
                                  className="hover:text-roam-blue hover:underline transition-colors"
                                >
                                  {selectedProvider.notification_email}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                        {selectedProvider.notification_phone && (
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <div className="text-sm text-muted-foreground">
                                Notification Phone
                              </div>
                              <div className="font-medium">
                                <a
                                  href={`tel:${selectedProvider.notification_phone}`}
                                  className="hover:text-roam-blue hover:underline transition-colors"
                                >
                                  {selectedProvider.notification_phone}
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Business & Status
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business
                        </div>
                        <div className="font-medium">
                          {selectedProvider.business_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Account Status
                        </div>
                        <ROAMBadge
                          variant={
                            selectedProvider.is_active ? "success" : "secondary"
                          }
                          className="mt-1"
                        >
                          {selectedProvider.is_active ? "Active" : "Inactive"}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Verification Status
                        </div>
                        <ROAMBadge
                          variant={getVerificationBadgeVariant(
                            selectedProvider.verification_status,
                          )}
                          className="mt-1"
                        >
                          {formatEnumDisplay(
                            selectedProvider.verification_status,
                          )}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Background Check
                        </div>
                        <ROAMBadge
                          variant={getBackgroundCheckBadgeVariant(
                            selectedProvider.background_check_status,
                          )}
                          className="mt-1"
                        >
                          {formatEnumDisplay(
                            selectedProvider.background_check_status,
                          )}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Joined
                        </div>
                        <div className="font-medium">
                          {new Date(
                            selectedProvider.created_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Performance Metrics */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Performance Metrics
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-roam-yellow text-roam-yellow" />
                        <span className="text-lg font-bold">
                          {selectedProvider.average_rating.toFixed(1)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Average Rating
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ({selectedProvider.total_reviews} reviews)
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-blue mb-2">
                        {selectedProvider.total_bookings}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Bookings
                      </div>
                      <div className="text-xs text-muted-foreground">
                        All time
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-success mb-2">
                        {selectedProvider.completed_bookings}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Completed
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(
                          (selectedProvider.completed_bookings /
                            selectedProvider.total_bookings) *
                            100,
                        )}
                        % completion rate
                      </div>
                    </div>

                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-lg font-bold text-roam-warning mb-2">
                        {selectedProvider.total_bookings -
                          selectedProvider.completed_bookings}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pending/Cancelled
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {Math.round(
                          ((selectedProvider.total_bookings -
                            selectedProvider.completed_bookings) /
                            selectedProvider.total_bookings) *
                            100,
                        )}
                        % rate
                      </div>
                    </div>
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Bio Section */}
              {selectedProvider.bio && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Professional Bio
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <p className="text-sm leading-relaxed">
                      {selectedProvider.bio}
                    </p>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Provider Services */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Provider Services
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {(() => {
                      const currentProviderServices = providerServices.filter(
                        (service) =>
                          service.business_id === selectedProvider.id,
                      );

                      return currentProviderServices.length > 0 ? (
                        <div className="grid gap-4">
                          {currentProviderServices.map((providerService) => (
                            <div
                              key={providerService.id}
                              className="p-4 border rounded-lg space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium">
                                    {providerService.services?.name ||
                                      "Unknown Service"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {providerService.services
                                      ?.service_subcategories
                                      ?.service_categories
                                      ?.service_category_type
                                      ? formatServiceCategoryType(
                                          providerService.services
                                            .service_subcategories
                                            .service_categories
                                            .service_category_type,
                                        )
                                      : "No category"}
                                    {providerService.services
                                      ?.service_subcategories
                                      ?.service_subcategory_type &&
                                      ` • ${formatServiceSubcategoryType(providerService.services.service_subcategories.service_subcategory_type)}`}
                                  </div>
                                </div>
                                <ROAMBadge
                                  variant={
                                    providerService.services?.is_active
                                      ? "success"
                                      : "secondary"
                                  }
                                >
                                  {providerService.services?.is_active
                                    ? "Active"
                                    : "Inactive"}
                                </ROAMBadge>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    Min Price:{" "}
                                  </span>
                                  <span className="font-medium">
                                    $
                                    {providerService.services?.min_price?.toFixed(
                                      2,
                                    ) || "0.00"}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    Duration:{" "}
                                  </span>
                                  <span className="font-medium">
                                    {providerService.services
                                      ?.duration_minutes || 0}{" "}
                                    min
                                  </span>
                                </div>
                              </div>

                              {providerService.services?.description && (
                                <div className="text-sm text-muted-foreground pt-2 border-t">
                                  {providerService.services.description}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          No services assigned to this provider
                        </div>
                      );
                    })()}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Provider Add-Ons */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Provider Add-Ons
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {(() => {
                      const currentProviderAddons = providerAddons.filter(
                        (addon) => addon.business_id === selectedProvider.id,
                      );

                      return currentProviderAddons.length > 0 ? (
                        <div className="grid gap-4">
                          {currentProviderAddons.map((providerAddon) => (
                            <div
                              key={providerAddon.id}
                              className="p-4 border rounded-lg space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-gradient-to-br from-roam-light-blue to-roam-yellow rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                                    <Puzzle className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="font-medium">
                                      {providerAddon.service_addons?.name ||
                                        "Unknown Add-On"}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      Service Enhancement
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ROAMBadge
                                    variant={
                                      providerAddon.is_active
                                        ? "success"
                                        : "secondary"
                                    }
                                  >
                                    {providerAddon.is_active
                                      ? "Active"
                                      : "Inactive"}
                                  </ROAMBadge>
                                  <ROAMBadge
                                    variant={
                                      providerAddon.service_addons?.is_active
                                        ? "outline"
                                        : "secondary"
                                    }
                                    size="sm"
                                  >
                                    {providerAddon.service_addons?.is_active
                                      ? "Available"
                                      : "Unavailable"}
                                  </ROAMBadge>
                                </div>
                              </div>

                              {providerAddon.service_addons?.description && (
                                <div className="text-sm text-muted-foreground pt-2 border-t">
                                  {providerAddon.service_addons.description}
                                </div>
                              )}

                              <div className="text-xs text-muted-foreground">
                                Added: {formatDate(providerAddon.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Puzzle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p>No add-ons assigned to this provider</p>
                        </div>
                      );
                    })()}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Provider Documents */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Documents & Verification
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {sampleBusinessDocuments.length > 0 ? (
                      <div className="grid gap-4">
                        {sampleBusinessDocuments.slice(0, 3).map((document) => (
                          <div
                            key={document.id}
                            className="p-4 border rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {document.document_name}
                                </div>
                                <div className="text-sm text-muted-foreground capitalize">
                                  {document.document_type.replace("_", " ")}
                                </div>
                              </div>
                              <ROAMBadge
                                variant={getDocumentStatusBadgeVariant(
                                  document.verification_status,
                                )}
                              >
                                {formatEnumDisplay(
                                  document.verification_status,
                                )}
                              </ROAMBadge>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {document.expiry_date && (
                                <span>
                                  Expires: {formatDate(document.expiry_date)}
                                </span>
                              )}
                              <span>
                                Uploaded: {formatDate(document.created_at)}
                              </span>
                            </div>

                            {document.rejection_reason && (
                              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                                <strong>Rejection Reason:</strong>{" "}
                                {document.rejection_reason}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No documents uploaded by this provider
                      </div>
                    )}
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
