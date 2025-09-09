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
import { useToast } from "@/hooks/use-toast";
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
  Building2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Eye,
  Edit,
  MoreHorizontal,
  TrendingUp,
  FileText,
  Globe,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  Star,
  MapPin,
  Navigation,
  Home,
  Truck,
  User,
  Users,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  Plus,
  Settings,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type VerificationStatus = "pending" | "approved" | "rejected" | "suspended";
type DeliveryType = "business" | "customer" | "mobile";
type BusinessType =
  | "independent"
  | "small_business"
  | "franchise"
  | "enterprise"
  | "other";

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
  | "health_coach"
  | "chiropractor"
  | "yoga_instructor"
  | "pilates_instructor"
  | "personal_trainer";
type ProviderVerificationStatus =
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

type DocumentVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "under_review";

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

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_connect_account_id: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: Record<string, any> | string | null; // JSONB field - can be object or stringified JSON
  social_media: Record<string, any> | null;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: ServiceCategoryType[] | null;
  service_subcategories: ServiceSubcategoryType[] | null;
  is_featured: boolean | null;
}

interface BusinessLocation {
  id: string;
  business_id: string;
  location_name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  created_at: string;
  is_primary: boolean | null;
  offers_mobile_services: boolean | null;
  mobile_service_radius: number | null;
}

interface BusinessServiceCategory {
  id: string;
  business_id: string;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description: string | null;
  };
}

interface BusinessServiceSubcategory {
  id: string;
  business_id: string;
  category_id: string | null;
  subcategory_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description: string | null;
  };
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
    description: string | null;
  };
}

interface BusinessService {
  id: string;
  business_id: string;
  service_id: string;
  business_price: number;
  is_active: boolean;
  created_at: string;
  delivery_type: DeliveryType | null;
  services?: {
    id: string;
    name: string;
    duration_minutes: number;
    min_price: number;
    description: string | null;
  };
}

interface Provider {
  id: string;
  user_id?: string;
  business_id: string;
  business_name: string;
  location_id?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  bio?: string;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  date_of_birth?: string;
  experience_years?: number;
  verification_status: ProviderVerificationStatus;
  background_check_status: BackgroundCheckStatus;
  provider_role: ProviderRole;
  business_managed: boolean;
  notification_email?: string | null;
  notification_phone?: string | null;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
}

const sampleBusinesses: BusinessProfile[] = [
  {
    id: "1",
    business_name: "Miami Spa & Wellness",
    contact_email: "contact@miamispa.com",
    phone: "+1-305-555-0123",
    status: "active",
    verification_status: "verified",
    stripe_connect_account_id: "acct_1234567890",
    is_active: true,
    created_at: "2023-11-15T00:00:00Z",
    website_url: "https://miamispa.com",
    business_hours: {
      sunday: "10:00-16:00",
      monday: "9:00-18:00",
      tuesday: "9:00-18:00",
      wednesday: "9:00-18:00",
      thursday: "9:00-18:00",
      friday: "9:00-20:00",
      saturday: "8:00-20:00",
    },
    social_media: {
      instagram: "@miamispa",
      facebook: "MiamiSpaWellness",
    },
    business_type: "small_business",
  },
  {
    id: "2",
    business_name: "Elite Fitness Center",
    contact_email: "hello@elitefitness.com",
    phone: "+1-305-555-0124",
    status: "active",
    verification_status: "verified",
    stripe_connect_account_id: "acct_2345678901",
    is_active: true,
    created_at: "2023-12-01T00:00:00Z",
    website_url: "https://elitefitness.com",
    business_hours: {
      sunday: "7:00-19:00",
      monday: "5:00-22:00",
      tuesday: "5:00-22:00",
      wednesday: "5:00-22:00",
      thursday: "5:00-22:00",
      friday: "5:00-22:00",
      saturday: "6:00-20:00",
    },
    business_type: "franchise",
  },
  {
    id: "3",
    business_name: "Zen Massage Therapy",
    contact_email: "info@zenmassage.com",
    phone: "+1-305-555-0125",
    status: "pending",
    verification_status: "under_review",
    is_active: true,
    created_at: "2024-01-10T00:00:00Z",
    verification_notes: "Pending business license verification",
    business_type: "independent",
  },
  {
    id: "4",
    business_name: "Coastal Beauty Salon",
    contact_email: "contact@coastalbeauty.com",
    phone: "+1-305-555-0126",
    status: "suspended",
    verification_status: "rejected",
    is_active: false,
    created_at: "2023-10-20T00:00:00Z",
    verification_notes: "Failed to provide required insurance documentation",
    business_type: "enterprise",
  },
  {
    id: "5",
    business_name: "Platinum Nails & Spa",
    contact_email: "booking@platinumnails.com",
    phone: "+1-305-555-0127",
    status: "active",
    verification_status: "pending",
    stripe_connect_account_id: "acct_3456789012",
    is_active: true,
    created_at: "2024-01-05T00:00:00Z",
    website_url: "https://platinumnails.com",
    business_type: "small_business",
  },
];

const sampleLocations: BusinessLocation[] = [
  {
    id: "loc_1",
    business_id: "1",
    business_name: "Miami Spa & Wellness",
    location_name: "Downtown Miami Location",
    address_line1: "123 Biscayne Boulevard",
    address_line2: "Suite 200",
    city: "Miami",
    state: "FL",
    postal_code: "33132",
    country: "USA",
    latitude: 25.7617,
    longitude: -80.1918,
    is_active: true,
    created_at: "2023-11-15T00:00:00Z",
    is_primary: true,
    delivery_type: "business",
    mobile_service_radius: null,
  },
  {
    id: "loc_2",
    business_id: "1",
    business_name: "Miami Spa & Wellness",
    location_name: "South Beach Branch",
    address_line1: "456 Ocean Drive",
    city: "Miami Beach",
    state: "FL",
    postal_code: "33139",
    country: "USA",
    latitude: 25.7907,
    longitude: -80.13,
    is_active: true,
    created_at: "2023-12-01T00:00:00Z",
    is_primary: false,
    delivery_type: "mobile",
    mobile_service_radius: 15,
  },
  {
    id: "loc_3",
    business_id: "2",
    business_name: "Elite Fitness Center",
    location_name: "Main Gym",
    address_line1: "789 Fitness Avenue",
    city: "Miami",
    state: "FL",
    postal_code: "33145",
    country: "USA",
    latitude: 25.7563,
    longitude: -80.3772,
    is_active: true,
    created_at: "2023-12-01T00:00:00Z",
    is_primary: true,
    delivery_type: "mobile",
    mobile_service_radius: 25,
  },
  {
    id: "loc_4",
    business_id: "3",
    business_name: "Zen Massage Therapy",
    location_name: "Coral Gables Studio",
    address_line1: "321 Miracle Mile",
    city: "Coral Gables",
    state: "FL",
    postal_code: "33134",
    country: "USA",
    latitude: 25.7479,
    longitude: -80.2578,
    is_active: true,
    created_at: "2024-01-10T00:00:00Z",
    is_primary: true,
    delivery_type: "mobile",
    mobile_service_radius: 20,
  },
  {
    id: "loc_5",
    business_id: "5",
    business_name: "Platinum Nails & Spa",
    location_name: "Aventura Mall Location",
    address_line1: "19501 Biscayne Boulevard",
    address_line2: "Level 2, Unit 215",
    city: "Aventura",
    state: "FL",
    postal_code: "33180",
    country: "USA",
    latitude: 25.9564,
    longitude: -80.1424,
    is_active: true,
    created_at: "2024-01-05T00:00:00Z",
    is_primary: true,
    delivery_type: "business",
    mobile_service_radius: null,
  },
];

const sampleProviders: Provider[] = [
  {
    id: "1",
    user_id: "user_1",
    business_id: "1",
    business_name: "Miami Spa & Wellness",
    location_id: "loc_1",
    first_name: "Sarah",
    last_name: "Martinez",
    email: "sarah.martinez@miamispa.com",
    phone: "+1-305-555-0201",
    bio: "Licensed massage therapist with specialization in deep tissue and Swedish massage.",
    is_active: true,
    created_at: "2023-09-15T00:00:00Z",
    date_of_birth: "1988-03-12",
    experience_years: 8,
    verification_status: "verified",
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
    business_id: "2",
    business_name: "Elite Fitness Center",
    location_id: "loc_3",
    first_name: "Marcus",
    last_name: "Johnson",
    email: "marcus@elitefitness.com",
    phone: "+1-305-555-0202",
    bio: "Certified personal trainer and nutritionist with focus on strength training.",
    is_active: true,
    created_at: "2023-10-20T00:00:00Z",
    date_of_birth: "1985-07-22",
    experience_years: 12,
    verification_status: "verified",
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
    business_id: "3",
    business_name: "Zen Massage Therapy",
    location_id: "loc_4",
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
    business_id: "4",
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
    business_id: "5",
    business_name: "Platinum Nails & Spa",
    location_id: "loc_5",
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
  {
    id: "6",
    user_id: "user_6",
    business_id: "1",
    business_name: "Miami Spa & Wellness",
    location_id: "loc_2",
    first_name: "Maria",
    last_name: "Garcia",
    email: "maria.garcia@miamispa.com",
    phone: "+1-305-555-0206",
    bio: "Experienced aesthetician specializing in facial treatments and skincare.",
    is_active: true,
    created_at: "2023-11-20T00:00:00Z",
    date_of_birth: "1990-08-14",
    experience_years: 5,
    verification_status: "verified",
    background_check_status: "approved",
    provider_role: "provider",
    business_managed: false,
    notification_email: "maria.alerts@miamispa.com",
    notification_phone: "+1-305-555-9206",
    total_bookings: 156,
    completed_bookings: 152,
    average_rating: 4.7,
    total_reviews: 89,
  },
];

const sampleBusinessDocuments: BusinessDocument[] = [
  {
    id: "bd_1",
    business_id: "biz_1",
    business_name: "Miami Spa & Wellness",
    document_type: "business_license",
    document_name: "Business Operating License",
    file_url: "/uploads/documents/miami_spa_license.pdf",
    file_size_bytes: 2457600,
    verification_status: "verified",
    verified_by: "admin_1",
    verified_at: "2023-09-16T10:30:00Z",
    expiry_date: "2025-09-15",
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "bd_2",
    business_id: "biz_1",
    business_name: "Miami Spa & Wellness",
    document_type: "insurance",
    document_name: "General Liability Insurance",
    file_url: "/uploads/documents/miami_spa_insurance.pdf",
    file_size_bytes: 1852400,
    verification_status: "verified",
    verified_by: "admin_1",
    verified_at: "2023-09-16T10:35:00Z",
    expiry_date: "2024-12-20",
    created_at: "2023-09-15T00:00:00Z",
  },
  {
    id: "bd_3",
    business_id: "biz_2",
    business_name: "Elite Fitness Center",
    document_type: "certification",
    document_name: "Fitness Facility Certification",
    file_url: "/uploads/documents/elite_fitness_cert.pdf",
    file_size_bytes: 3200000,
    verification_status: "under_review",
    expiry_date: "2025-10-20",
    created_at: "2023-10-20T00:00:00Z",
  },
  {
    id: "bd_4",
    business_id: "biz_3",
    business_name: "Zen Massage Therapy",
    document_type: "background_check",
    document_name: "Business Owner Background Check",
    file_url: "/uploads/documents/zen_massage_background.pdf",
    file_size_bytes: 956780,
    verification_status: "rejected",
    verified_by: "admin_2",
    verified_at: "2023-11-05T16:45:00Z",
    rejection_reason:
      "Background check results incomplete - missing fingerprint verification",
    created_at: "2023-11-01T00:00:00Z",
  },
  {
    id: "bd_5",
    business_id: "biz_4",
    business_name: "Urban Wellness Studio",
    document_type: "tax_id",
    document_name: "Federal Tax ID Certificate",
    file_url: "/uploads/documents/urban_wellness_tax.pdf",
    file_size_bytes: 442150,
    verification_status: "verified",
    verified_by: "admin_1",
    verified_at: "2023-12-10T09:15:00Z",
    created_at: "2023-12-08T00:00:00Z",
  },
];

const getStatusBadgeVariant = (status: BusinessStatus) => {
  switch (status) {
    case "active":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "suspended":
      return "danger" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getVerificationBadgeVariant = (status: VerificationStatus) => {
  switch (status) {
    case "approved":
      return "success" as const;
    case "pending":
      return "secondary" as const;
    case "suspended":
      return "warning" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const getProviderVerificationBadgeVariant = (
  status: ProviderVerificationStatus,
) => {
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

const getDocumentStatusBadgeVariant = (status: DocumentVerificationStatus) => {
  switch (status) {
    case "verified":
      return "success" as const;
    case "pending":
      return "secondary" as const;
    case "under_review":
      return "warning" as const;
    case "rejected":
      return "danger" as const;
    default:
      return "secondary" as const;
  }
};

const formatEnumDisplay = (enumValue: string): string => {
  return enumValue
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "Unknown size";

  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};

const getVerificationIcon = (status: VerificationStatus) => {
  switch (status) {
    case "approved":
      return <CheckCircle className="w-4 h-4" />;
    case "pending":
      return <Clock className="w-4 h-4" />;
    case "suspended":
      return <AlertTriangle className="w-4 h-4" />;
    case "rejected":
      return <XCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatServiceCategoryType = (category: ServiceCategoryType): string => {
  return formatEnumDisplay(category);
};

const getServiceCategoryTypeIcon = (category: ServiceCategoryType): string => {
  switch (category) {
    case "beauty":
      return "��";
    case "fitness":
      return "��";
    case "therapy":
      return "����";
    case "healthcare":
      return "🏥";
    default:
      return "🏢";
  }
};

const formatServiceSubcategoryType = (
  subcategory: ServiceSubcategoryType,
): string => {
  return formatEnumDisplay(subcategory);
};

const convertTo12Hour = (timeString: string): string => {
  // Handle time ranges like "9:00-18:00"
  if (timeString.includes("-")) {
    const [startTime, endTime] = timeString.split("-");
    return `${convertSingleTimeTo12Hour(startTime)} - ${convertSingleTimeTo12Hour(endTime)}`;
  }
  return convertSingleTimeTo12Hour(timeString);
};

const convertSingleTimeTo12Hour = (timeString: string): string => {
  // Parse time string like "9:00" or "18:00"
  const [hourStr, minuteStr] = timeString.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour === 0) {
    return `12:${minute.toString().padStart(2, "0")} AM`;
  } else if (hour < 12) {
    return `${hour}:${minute.toString().padStart(2, "0")} AM`;
  } else if (hour === 12) {
    return `12:${minute.toString().padStart(2, "0")} PM`;
  } else {
    return `${hour - 12}:${minute.toString().padStart(2, "0")} PM`;
  }
};

const parseBusinessHours = (
  businessHours: Record<string, any> | string | null,
): Record<string, any> | null => {
  if (!businessHours) return null;

  if (typeof businessHours === "string") {
    try {
      return JSON.parse(businessHours);
    } catch (e) {
      console.error("Failed to parse business_hours JSON:", e);
      return null;
    }
  }

  if (typeof businessHours === "object") {
    return businessHours;
  }

  return null;
};

const getBusinessTypeBadgeVariant = (type: BusinessType) => {
  switch (type) {
    case "enterprise":
      return "success" as const;
    case "franchise":
      return "warning" as const;
    case "small_business":
      return "secondary" as const;
    case "independent":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

type ProviderRole = "provider" | "owner" | "dispatcher";

interface ProviderForLocation {
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
  verification_status: string;
  background_check_status: string;
  provider_role: ProviderRole;
  business_managed: boolean;
  notification_email: string | null;
  notification_phone: string | null;
  total_bookings: number;
  completed_bookings: number;
  average_rating: number;
  total_reviews: number;
}

export default function AdminBusinesses() {
  const { toast } = useToast();
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [businessLocations, setBusinessLocations] = useState<
    BusinessLocation[]
  >([]);
  const [businessServices, setBusinessServices] = useState<BusinessService[]>(
    [],
  );
  const [providers, setProviders] = useState<ProviderForLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusinesses, setSelectedBusinesses] = useState<string[]>([]);
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessProfile | null>(null);
  const [isBusinessDetailsOpen, setIsBusinessDetailsOpen] = useState(false);
  const [isEditBusinessOpen, setIsEditBusinessOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] =
    useState<BusinessProfile | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BusinessProfile>>({
    business_name: "",
    contact_email: "",
    phone: "",
    verification_status: "pending",
    verification_notes: "",
    is_active: true,
    is_featured: false,
    business_type: "independent",
    service_categories: [],
    service_subcategories: [],
  });
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<
    "all" | BusinessType
  >("all");
  const [featuredFilter, setFeaturedFilter] = useState<
    "all" | "featured" | "not_featured"
  >("all");

  // Add new business modal states
  const [isAddBusinessOpen, setIsAddBusinessOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state for new business
  const [newBusiness, setNewBusiness] = useState({
    business_name: "",
    contact_email: "",
    phone: "",
    website_url: "",
    business_type: "small_business" as BusinessType,
    is_active: true,
    verification_status: "pending" as VerificationStatus,
  });

  // Service management states


  // Fetch businesses, business locations, and providers from Supabase
  useEffect(() => {
    fetchBusinesses();
    fetchBusinessLocations();
    fetchBusinessServices();
    fetchProviders();
  }, []);

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching businesses from API...");

      const response = await fetch('/api/businesses');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch businesses');
      }

      console.log("Business API response:", result);

      if (result.data) {
        console.log(
          `Successfully fetched ${result.data.length || 0} businesses from API`,
        );
        // Debug business hours data
        if (result.data && result.data.length > 0) {
          console.log(
            "Business hours debug:",
            result.data.map((b: any) => ({
              name: b.business_name,
              business_hours: b.business_hours,
              business_hours_type: typeof b.business_hours,
              service_categories: b.service_categories,
              service_subcategories: b.service_subcategories,
            })),
          );
        }
        setBusinesses(result.data || []);
        if (result.data.length === 0) {
          setError(
            "API connected successfully but no business records found.",
          );
        }
      } else {
        setError("No data received from API");
        setBusinesses([]);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Connection Error: ${errorMessage}`);
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessLocations = async () => {
    try {
      console.log("Fetching business locations from Supabase...");

      const { data, error } = await supabase
        .from("business_locations")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Business locations query response:", { data, error });

      if (error) {
        console.error("Business locations query error:", error);
        setError(
          `Business Locations Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.business_locations FOR SELECT USING (true);`,
        );
        setBusinessLocations([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} business locations from database`,
        );
        setBusinessLocations(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching business locations:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Business Locations Connection Error: ${errorMessage}`);
      setBusinessLocations([]);
    }
  };

  const fetchBusinessServices = async () => {
    try {
      console.log("Fetching business services from Supabase...");

      const { data, error } = await supabase
        .from("business_services")
        .select(
          `
          id,
          business_id,
          service_id,
          business_price,
          is_active,
          created_at,
          delivery_type,
          services (
            id,
            name,
            duration_minutes,
            min_price,
            description
          )
        `,
        )
        .order("created_at", { ascending: false });

      console.log("Business services query response:", { data, error });

      if (error) {
        console.error("Business services query error:", error);
        setError(
          `Business Services Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.business_services FOR SELECT USING (true);`,
        );
        setBusinessServices([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} business services from database`,
        );
        setBusinessServices(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching business services:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Business Services Connection Error: ${errorMessage}`);
      setBusinessServices([]);
    }
  };

  const fetchBusinessServiceCategories = async (businessId?: string) => {
    try {
      console.log("Fetching business service categories via API...");

      if (!businessId) {
        setBusinessServiceCategories([]);
        return;
      }

      const response = await fetch(`/api/business-service-categories?businessId=${businessId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business service categories');
      }

      const { data } = await response.json();

      console.log("Business service categories query response:", {
        data,
        error,
      });

      if (error) {
        console.error(
          "Full error object for business service categories:",
          error,
        );
        console.error("Error type:", typeof error);
        console.error("Error keys:", Object.keys(error || {}));

        let errorMessage = "Unknown error occurred";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.error_description) {
          errorMessage = error.error_description;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (error?.hint) {
          errorMessage = error.hint;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = `Serialization failed. Error type: ${typeof error}`;
          }
        }

        console.error("Business service categories query error:", errorMessage);
        setError(`Business Service Categories Query Error: ${errorMessage}`);
        setBusinessServiceCategories([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} business service categories from database`,
        );
        setBusinessServiceCategories(data || []);
      }
    } catch (err) {
      console.error(
        "Full catch error object for business service categories:",
        err,
      );
      console.error("Catch error type:", typeof err);
      console.error("Catch error keys:", Object.keys(err || {}));

      let errorMessage = "Unknown error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error_description) {
        errorMessage = err.error_description;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else {
        try {
          errorMessage = JSON.stringify(err);
        } catch (e) {
          errorMessage = `Serialization failed. Error type: ${typeof err}`;
        }
      }

      console.error(
        "Unexpected error fetching business service categories:",
        errorMessage,
      );
      setError(`Business Service Categories Connection Error: ${errorMessage}`);
      setBusinessServiceCategories([]);
    }
  };

  const fetchBusinessServiceSubcategories = async (businessId?: string) => {
    try {
      console.log("Fetching business service subcategories via API...");

      if (!businessId) {
        setBusinessServiceSubcategories([]);
        return;
      }

      const response = await fetch(`/api/business-service-subcategories?businessId=${businessId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch business service subcategories');
      }

      const { data } = await response.json();

      console.log("Business service subcategories query response:", {
        data,
        error,
      });

      if (error) {
        console.error(
          "Full error object for business service subcategories:",
          error,
        );
        console.error("Error type:", typeof error);
        console.error("Error keys:", Object.keys(error || {}));

        let errorMessage = "Unknown error occurred";
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.error_description) {
          errorMessage = error.error_description;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (error?.hint) {
          errorMessage = error.hint;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = `Serialization failed. Error type: ${typeof error}`;
          }
        }

        console.error(
          "Business service subcategories query error:",
          errorMessage,
        );
        setError(`Business Service Subcategories Query Error: ${errorMessage}`);
        setBusinessServiceSubcategories([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} business service subcategories from database`,
        );
        setBusinessServiceSubcategories(data || []);
      }
    } catch (err) {
      console.error(
        "Full catch error object for business service subcategories:",
        err,
      );
      console.error("Catch error type:", typeof err);
      console.error("Catch error keys:", Object.keys(err || {}));

      let errorMessage = "Unknown error occurred";
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      } else if (err?.error_description) {
        errorMessage = err.error_description;
      } else if (err?.details) {
        errorMessage = err.details;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else {
        try {
          errorMessage = JSON.stringify(err);
        } catch (e) {
          errorMessage = `Serialization failed. Error type: ${typeof err}`;
        }
      }

      console.error(
        "Unexpected error fetching business service subcategories:",
        errorMessage,
      );
      setError(
        `Business Service Subcategories Connection Error: ${errorMessage}`,
      );
      setBusinessServiceSubcategories([]);
    }
  };

  const fetchAvailableServiceCategories = async () => {
    try {
      console.log("Fetching available service categories from Supabase...");

      const { data, error } = await supabase
        .from("service_categories")
        .select("id, service_category_type, description")
        .eq("is_active", true)
        .order("service_category_type", { ascending: true });

      if (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error(
          "Available service categories query error:",
          errorMessage,
        );
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} available service categories`,
        );
        setAvailableServiceCategories(data || []);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error(
        "Unexpected error fetching available service categories:",
        errorMessage,
      );
    }
  };

  const fetchAvailableServiceSubcategories = async () => {
    try {
      console.log("Fetching available service subcategories from Supabase...");

      const { data, error } = await supabase
        .from("service_subcategories")
        .select("id, category_id, service_subcategory_type, description")
        .eq("is_active", true)
        .order("service_subcategory_type", { ascending: true });

      if (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        console.error(
          "Available service subcategories query error:",
          errorMessage,
        );
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} available service subcategories`,
        );
        setAvailableServiceSubcategories(data || []);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      console.error(
        "Unexpected error fetching available service subcategories:",
        errorMessage,
      );
    }
  };

  const fetchProviders = async () => {
    try {
      console.log("Fetching providers from Supabase...");

      const { data, error } = await supabase
        .from("providers")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("Providers query response:", { data, error });

      if (error) {
        console.error("Providers query error:", error);
        setError(
          `Providers Query Error: ${error.message}. You may need to create RLS policy: CREATE POLICY "Allow anon read access" ON public.providers FOR SELECT USING (true);`,
        );
        setProviders([]);
      } else {
        console.log(
          `Successfully fetched ${data?.length || 0} providers from database`,
        );
        setProviders(data || []);
      }
    } catch (err) {
      console.error("Unexpected error fetching providers:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(`Providers Connection Error: ${errorMessage}`);
      setProviders([]);
    }
  };

  // Create new business
  const createBusiness = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from("business_profiles")
        .insert([newBusiness]);

      if (error) throw error;

      setNewBusiness({
        business_name: "",
        contact_email: "",
        phone: "",
        website_url: "",
        business_type: "small_business",
        is_active: true,
        verification_status: "pending",
      });
      setIsAddBusinessOpen(false);
      await fetchBusinesses();
    } catch (error: any) {
      console.error("Error creating business:", error);
      alert(`Error creating business: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };



  // Toggle business active status
  const toggleBusinessStatus = async (
    businessId: string,
    newStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_active: newStatus })
        .eq("id", businessId);

      if (error) {
        console.error("Error updating business status:", error);
        alert(
          `Error updating business status: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        console.log(
          `Business ${businessId} status updated to ${newStatus ? "active" : "inactive"}`,
        );
        await fetchBusinesses(); // Refresh the businesses list
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    }
  };

  // Toggle business verification status
  const toggleVerificationStatus = async (
    businessId: string,
    newStatus: VerificationStatus,
  ) => {
    console.log("toggleVerificationStatus called with:", {
      businessId,
      newStatus,
      type: typeof newStatus,
    });

    // Validate enum value
    const validStatuses: VerificationStatus[] = [
      "pending",
      "approved",
      "rejected",
      "suspended",
    ];
    if (!validStatuses.includes(newStatus)) {
      const errorMsg = `Invalid verification status: '${newStatus}'. Valid values are: ${validStatuses.join(", ")}`;
      console.error(errorMsg);
      alert(errorMsg);
      return;
    }

    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ verification_status: newStatus })
        .eq("id", businessId);

      if (error) {
        console.error("Error updating verification status - details:");
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.error("Business ID:", businessId);
        console.error("New Status:", newStatus);
        console.error("Full error object:", error);
        console.error("Error keys:", Object.keys(error));
        console.error("Error JSON:", JSON.stringify(error, null, 2));

        let errorMessage = "Unknown error occurred";
        if (error?.message) {
          errorMessage = error.message;
        } else if (error?.details) {
          errorMessage = error.details;
        } else if (error?.hint) {
          errorMessage = error.hint;
        } else if (error?.code) {
          errorMessage = `Database error (code: ${error.code})`;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = "Failed to parse error details";
          }
        }

        alert(`Error updating verification status: ${errorMessage}`);
      } else {
        console.log(
          `Business ${businessId} verification status updated to ${newStatus}`,
        );
        await fetchBusinesses(); // Refresh the businesses list
      }
    } catch (err: any) {
      console.error("Unexpected error updating verification status:");
      console.error("Message:", err?.message);
      console.error("Code:", err?.code);
      console.error("Details:", err?.details);
      console.error("Type:", typeof err);
      console.error("Business ID:", businessId);
      console.error("New Status:", newStatus);
      console.error("Full error object:", err);
      if (err) {
        console.error("Error keys:", Object.keys(err));
        try {
          console.error("Error JSON:", JSON.stringify(err, null, 2));
        } catch (jsonErr) {
          console.error("Could not stringify error:", jsonErr);
        }
      }

      const errorMessage =
        err?.message || err?.details || err?.hint || "Unknown error";
      alert(`Unexpected error updating verification status: ${errorMessage}`);
    }
  };

  // Toggle business featured status
  const toggleFeaturedStatus = async (
    businessId: string,
    newStatus: boolean,
  ) => {
    try {
      const { error } = await supabase
        .from("business_profiles")
        .update({ is_featured: newStatus })
        .eq("id", businessId);

      if (error) {
        console.error("Error updating featured status:", error);
        alert(
          `Error updating featured status: ${error?.message || error?.error?.message || JSON.stringify(error)}`,
        );
      } else {
        console.log(
          `Business ${businessId} featured status updated to ${newStatus}`,
        );
        await fetchBusinesses(); // Refresh the businesses list
        toast({
          title: "Featured Status Updated",
          description: `Business ${newStatus ? "featured" : "unfeatured"} successfully.`,
        });
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(`Unexpected error: ${err}`);
    }
  };

  // Edit business functions
  const openEditBusiness = (business: BusinessProfile) => {
    setEditingBusiness(business);
    setEditFormData({
      business_name: business.business_name || "",
      contact_email: business.contact_email || "",
      phone: business.phone || "",
      verification_status: business.verification_status || "pending",
      verification_notes: business.verification_notes || "",
      is_active: business.is_active ?? true,
      is_featured: business.is_featured ?? false,
      business_type: business.business_type || "independent",
      service_categories: business.service_categories || [],
      service_subcategories: business.service_subcategories || [],
    });
    setIsEditBusinessOpen(true);
  };

  const handleSaveBusinessEdit = async () => {
    if (!editingBusiness) return;

    try {
      // Log the data being sent for debugging
      console.log("Updating business with data:", {
        business_name: editFormData.business_name,
        contact_email: editFormData.contact_email,
        phone: editFormData.phone,
        verification_status: editFormData.verification_status,
        verification_notes: editFormData.verification_notes,
        is_active: editFormData.is_active,
        is_featured: editFormData.is_featured,
        business_type: editFormData.business_type,
        service_categories: editFormData.service_categories,
        service_subcategories: editFormData.service_subcategories,
      });

      // First update the business profile
      const { error: profileError } = await supabase
        .from("business_profiles")
        .update({
          business_name: editFormData.business_name,
          contact_email: editFormData.contact_email,
          phone: editFormData.phone,
          verification_status: editFormData.verification_status,
          verification_notes: editFormData.verification_notes,
          is_active: editFormData.is_active,
          is_featured: editFormData.is_featured,
          business_type: editFormData.business_type,
        })
        .eq("id", editingBusiness.id);

      if (profileError) {
        console.error("Error updating business profile:", profileError);
        alert(
          `Error updating business profile: ${profileError.message || profileError.details || profileError.hint || JSON.stringify(profileError)}`,
        );
        return;
      }

      // Update service categories
      if (editFormData.service_categories) {
        // First, delete existing categories
        const deleteCategoriesResponse = await fetch('/api/business-service-categories', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ businessId: editingBusiness.id }),
        });

        if (!deleteCategoriesResponse.ok) {
          const errorData = await deleteCategoriesResponse.json();
          throw new Error(errorData.error || 'Failed to delete existing service categories');
        }

        // Then insert new ones
        for (const categoryType of editFormData.service_categories) {
          // Get the category ID from the service_categories table
          const { data: categoryData } = await supabase
            .from("service_categories")
            .select("id")
            .eq("service_category_type", categoryType)
            .single();

          if (categoryData) {
            const insertCategoryResponse = await fetch('/api/business-service-categories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                businessId: editingBusiness.id,
                categoryId: categoryData.id,
              }),
            });

            if (!insertCategoryResponse.ok) {
              const errorData = await insertCategoryResponse.json();
              throw new Error(errorData.error || 'Failed to insert service category');
            }
          }
        }
      }

      // Update service subcategories
      if (editFormData.service_subcategories) {
        // First, delete existing subcategories
        const deleteSubcategoriesResponse = await fetch('/api/business-service-subcategories', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ businessId: editingBusiness.id }),
        });

        if (!deleteSubcategoriesResponse.ok) {
          const errorData = await deleteSubcategoriesResponse.json();
          throw new Error(errorData.error || 'Failed to delete existing service subcategories');
        }

        // Then insert new ones
        for (const subcategoryType of editFormData.service_subcategories) {
          // Get the subcategory ID from the service_subcategories table
          const { data: subcategoryData } = await supabase
            .from("service_subcategories")
            .select("id")
            .eq("service_subcategory_type", subcategoryType)
            .single();

          if (subcategoryData) {
            const insertSubcategoryResponse = await fetch('/api/business-service-subcategories', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                businessId: editingBusiness.id,
                categoryId: subcategoryData.category_id,
                subcategoryId: subcategoryData.id,
              }),
            });

            if (!insertSubcategoryResponse.ok) {
              const errorData = await insertSubcategoryResponse.json();
              throw new Error(errorData.error || 'Failed to insert service subcategory');
            }
          }
        }
      }

      setIsEditBusinessOpen(false);
      setEditingBusiness(null);
      await fetchBusinesses(); // Refresh the businesses list

      toast({
        title: "Success",
        description: "Business updated successfully!",
      });
    } catch (err: any) {
      console.error("Error updating business:", err);
      console.error("Full error object:", JSON.stringify(err, null, 2));
      alert(
        `Error updating business: ${err.message || err.error?.message || JSON.stringify(err)}`,
      );
    }
  };

  // Document action handlers
  const viewDocument = (document: BusinessDocument) => {
    // Open document in new tab/window
    if (document.file_url) {
      window.open(document.file_url, "_blank");
    } else {
      alert("Document file not available");
    }
  };

  const approveDocument = async (document: BusinessDocument) => {
    try {
      console.log("Approving document:", document.id, document);

      // Show initial processing toast
      toast({
        title: "Verifying Document",
        description: `Processing verification for "${document.document_name}"...`,
        variant: "default",
      });

      // Get current admin user from Supabase auth
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      console.log("Auth user:", { user, authError });

      if (authError || !user) {
        throw new Error("Failed to get current user authentication");
      }

      // Get admin user record from admin_users table using auth user email
      const { data: adminUser, error: adminError } = await supabase
        .from("admin_users")
        .select("id, email")
        .eq("email", user.email)
        .single();

      console.log("Admin user lookup:", { adminUser, adminError });

      if (adminError || !adminUser) {
        throw new Error(
          `Failed to find admin user record for ${user.email}. Admin user may not exist in admin_users table.`,
        );
      }

      // Check if the document exists
      const { data: existingDoc, error: fetchError } = await supabase
        .from("business_documents")
        .select("id, verification_status")
        .eq("id", document.id)
        .single();

      console.log("Existing document check:", { existingDoc, fetchError });

      if (fetchError) {
        throw new Error(
          `Failed to find document: ${fetchError.message || JSON.stringify(fetchError)}`,
        );
      }

      // Update the document with verification details
      const { data, error } = await supabase
        .from("business_documents")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
          verified_by: adminUser.id,
        })
        .eq("id", document.id)
        .select();

      console.log("Update result:", { data, error });

      if (error) {
        console.error("Error approving document:", error);

        // Enhanced error message extraction
        let errorMessage = "Unknown error occurred";
        if (error.message) {
          errorMessage = error.message;
        } else if (error.error_description) {
          errorMessage = error.error_description;
        } else if (error.details) {
          errorMessage = error.details;
        } else if (typeof error === "string") {
          errorMessage = error;
        } else {
          try {
            errorMessage = JSON.stringify(error);
          } catch (e) {
            errorMessage = String(error);
          }
        }

        toast({
          variant: "destructive",
          title: "Error Approving Document",
          description: errorMessage,
        });
      } else {
        console.log("Document approved successfully");
        toast({
          title: "Document Approved",
          description: `Document "${document.document_name}" has been verified successfully!`,
          variant: "default",
        });
      }
    } catch (err: any) {
      console.error("Unexpected error approving document:", err);
      const errorMessage =
        err?.message ||
        err?.error_description ||
        JSON.stringify(err) ||
        String(err);
      toast({
        variant: "destructive",
        title: "Unexpected Error",
        description: errorMessage,
      });
    }
  };

  // Filter businesses based on selected filters
  const filteredBusinesses = businesses.filter((business) => {
    const statusMatch =
      statusFilter === "all" ||
      (statusFilter === "active" && business.is_active) ||
      (statusFilter === "inactive" && !business.is_active);

    const verificationMatch =
      verificationFilter === "all" ||
      (verificationFilter === "verified" &&
        business.verification_status === "approved") ||
      (verificationFilter === "unverified" &&
        business.verification_status !== "approved");

    const businessTypeMatch =
      businessTypeFilter === "all" ||
      business.business_type === businessTypeFilter;

    const featuredMatch =
      featuredFilter === "all" ||
      (featuredFilter === "featured" && business.is_featured) ||
      (featuredFilter === "not_featured" && !business.is_featured);

    return (
      statusMatch && verificationMatch && businessTypeMatch && featuredMatch
    );
  });

  const businessStats = {
    total: businesses.length,
    active: businesses.filter((b) => b.is_active).length,
    verified: businesses.filter((b) => b.verification_status === "verified")
      .length,
    pendingReview: businesses.filter(
      (b) =>
        b.verification_status === "pending" ||
        b.verification_status === "under_review",
    ).length,
    withStripe: businesses.filter((b) => b.stripe_connect_account_id).length,
  };

  const businessDocumentColumns: Column[] = [
    {
      key: "business_name",
      header: "Business",
      sortable: true,
      render: (value: string, row: BusinessDocument) => (
        <div className="flex items-center gap-3">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground">
              ID: {row.business_id}
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
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div>
            <div className="font-medium">{value}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {formatEnumDisplay(row.document_type)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "file_size_bytes",
      header: "File Info",
      render: (value: any, row: BusinessDocument) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">
            {formatFileSize(row.file_size_bytes)}
          </div>
          {row.expiry_date && (
            <div className="text-xs text-muted-foreground">
              Expires: {formatDate(row.expiry_date)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "verification_status",
      header: "Verification",
      render: (value: any, row: BusinessDocument) => (
        <div className="space-y-1">
          <ROAMBadge
            variant={getDocumentStatusBadgeVariant(row.verification_status)}
          >
            {formatEnumDisplay(row.verification_status)}
          </ROAMBadge>
          {row.verified_at && (
            <div className="text-xs text-muted-foreground">
              Verified: {formatDate(row.verified_at)}
            </div>
          )}
          {row.rejection_reason && (
            <div className="text-xs text-red-600 mt-1">
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
        <div className="text-sm text-muted-foreground">{formatDate(value)}</div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: BusinessDocument) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewDocument(row)}
            title="View Document"
            className="hover:bg-blue-50"
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.verification_status !== "verified" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => approveDocument(row)}
              title="Approve Document"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  const columns: Column[] = [
    {
      key: "business_name",
      header: "Name",
      sortable: true,
      render: (value: string, row: BusinessProfile) => (
        <div className="flex items-center gap-3">
          {row.logo_url ? (
            <img
              src={row.logo_url}
              alt={`${row.business_name} logo`}
              className="w-10 h-10 rounded-lg object-cover border-2 border-roam-blue/20"
              onError={(e) => {
                // Fallback to letter avatar on image load error
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
            className={`w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm ${row.logo_url ? "hidden" : ""}`}
          >
            {row.business_name?.charAt(0)?.toUpperCase() || "B"}
          </div>
          <div>
            <div className="font-medium text-foreground">{value}</div>
            {row.contact_email && (
              <div className="text-sm text-muted-foreground">
                <a
                  href={`mailto:${row.contact_email}`}
                  className="hover:text-roam-blue hover:underline transition-colors"
                >
                  {row.contact_email}
                </a>
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      sortable: true,
      render: (value: boolean) => (
        <ROAMBadge
          variant={value ? "success" : "secondary"}
          className="capitalize"
        >
          {value ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "verification_status",
      header: "Verification",
      sortable: true,
      render: (value: VerificationStatus, row: BusinessProfile) => (
        <div className="flex items-center gap-2">
          <ROAMBadge
            variant={getVerificationBadgeVariant(value)}
            className="capitalize flex items-center gap-1"
          >
            {getVerificationIcon(value)}
            {value.replace("_", " ")}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "business_type",
      header: "Type",
      sortable: true,
      render: (value: BusinessType) => (
        <ROAMBadge
          variant={getBusinessTypeBadgeVariant(value)}
          className="capitalize"
        >
          {formatEnumDisplay(value)}
        </ROAMBadge>
      ),
    },
    {
      key: "contact_info",
      header: "Contact",
      render: (value: any, row: BusinessProfile) => (
        <div className="space-y-1">
          {row.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3 h-3" />
              <a
                href={`tel:${row.phone}`}
                className="hover:text-roam-blue hover:underline transition-colors"
              >
                {row.phone}
              </a>
            </div>
          )}
          {row.website_url && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-3 h-3" />
              <a
                href={row.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-roam-blue hover:underline transition-colors"
              >
                Website
              </a>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "payment_status",
      header: "Payment",
      render: (value: any, row: BusinessProfile) => (
        <div className="flex items-center gap-2">
          {row.stripe_connect_account_id ? (
            <ROAMBadge variant="success" className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Connected
            </ROAMBadge>
          ) : (
            <ROAMBadge variant="secondary" className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Not Setup
            </ROAMBadge>
          )}
        </div>
      ),
    },
    {
      key: "is_featured",
      header: "Featured",
      sortable: true,
      render: (value: boolean | null, row: BusinessProfile) => (
        <div className="flex items-center gap-2">
          <ROAMBadge
            variant={value ? "warning" : "secondary"}
            className="flex items-center gap-1"
          >
            <Star className={`w-3 h-3 ${value ? "fill-current" : ""}`} />
            {value ? "Featured" : "Not Featured"}
          </ROAMBadge>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (value: any, row: BusinessProfile) => (
        <div className="flex items-center gap-2">
          {/* View Business */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedBusiness(row);
              setIsBusinessDetailsOpen(true);
            }}
            title="View Business"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {/* Edit Business */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:text-blue-800"
            onClick={() => openEditBusiness(row)}
            title="Edit Business"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Helper function to format address
  const formatAddress = (location: BusinessLocation) => {
    const parts = [
      location.address_line1,
      location.city,
      location.state,
      location.postal_code,
    ].filter(Boolean);
    return parts.join(", ");
  };

  // Location columns
  const locationColumns: Column[] = [
    {
      key: "location_name",
      header: "Location",
      sortable: true,
      render: (value: string, row: BusinessLocation) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-lg flex items-center justify-center text-white font-semibold text-sm">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="font-medium text-foreground">
              {value || "Main Location"}
              {row.is_primary && (
                <ROAMBadge variant="success" size="sm" className="ml-2">
                  <Home className="w-3 h-3 mr-1" />
                  Primary
                </ROAMBadge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {row.business_name}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (value: any, row: BusinessLocation) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{formatAddress(row)}</div>
          {row.address_line2 && (
            <div className="text-sm text-muted-foreground">
              {row.address_line2}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "delivery_type",
      header: "Service Type",
      sortable: true,
      render: (value: DeliveryType, row: BusinessLocation) => (
        <div className="space-y-1">
          <ROAMBadge
            variant={value === "mobile" ? "success" : "outline"}
            size="sm"
            className="flex items-center gap-1 w-fit"
          >
            {value === "mobile" ? (
              <Truck className="w-3 h-3" />
            ) : (
              <Building2 className="w-3 h-3" />
            )}
            {formatEnumDisplay(value)}
          </ROAMBadge>
          {value === "mobile" && row.mobile_service_radius && (
            <div className="text-xs text-muted-foreground">
              Radius: {row.mobile_service_radius} miles
            </div>
          )}
        </div>
      ),
    },
    {
      key: "coordinates",
      header: "Coordinates",
      render: (value: any, row: BusinessLocation) => (
        <div className="space-y-1">
          {row.latitude && row.longitude ? (
            <div className="text-sm font-mono">
              <div>
                {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
              </div>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                <Navigation className="w-3 h-3 mr-1" />
                View Map
              </Button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              No coordinates
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (value: any, row: BusinessLocation) => (
        <ROAMBadge variant={row.is_active ? "success" : "secondary"}>
          {row.is_active ? "Active" : "Inactive"}
        </ROAMBadge>
      ),
    },
    {
      key: "created_at",
      header: "Added",
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
      render: (value: any, row: BusinessLocation) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              const business = sampleBusinesses.find(
                (b) => b.id === row.business_id,
              );
              if (business) {
                setSelectedBusiness(business);
                setIsBusinessDetailsOpen(true);
              }
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit className="h-4 w-4" />
          </Button>
          {!row.is_primary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-roam-success"
            >
              <Home className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout title="Businesses">
      <div className="space-y-8">
        {/* Stats Overview */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ROAMStatCard
            title="Total Businesses"
            value={businessStats.total}
            icon={<Building2 className="w-5 h-5" />}
            changeText="2 new this month"
            changeType="positive"
            changeIcon={<TrendingUp className="w-3 h-3" />}
          />

          <ROAMStatCard
            title="Active Businesses"
            value={businessStats.active}
            icon={<CheckCircle className="w-5 h-5" />}
            changeText={
              businessStats.total > 0
                ? `${Math.round((businessStats.active / businessStats.total) * 100)}% of total`
                : "No businesses yet"
            }
            changeType="positive"
          />

          <ROAMStatCard
            title="Verified"
            value={businessStats.verified}
            icon={<Star className="w-5 h-5" />}
            changeText="Fully verified businesses"
            changeType="neutral"
          />

          <ROAMStatCard
            title="With Stripe Connect"
            value={businessStats.withStripe}
            icon={<CreditCard className="w-5 h-5" />}
            changeText="Payment processing enabled"
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
              <label className="text-sm font-medium">Verification:</label>
              <select
                value={verificationFilter}
                onChange={(e) =>
                  setVerificationFilter(
                    e.target.value as "all" | "verified" | "unverified",
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
                    e.target.value as "all" | "featured" | "not_featured",
                  )
                }
                className="px-3 py-1 border border-border rounded-md text-sm bg-background"
              >
                <option value="all">All</option>
                <option value="featured">Featured</option>
                <option value="not_featured">Not Featured</option>
              </select>
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchBusinesses();
                  fetchBusinessLocations();
                  fetchBusinessServices();
                  fetchProviders();
                }}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-roam-blue border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Refresh Data
              </Button>

              <div className="text-sm text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `Showing ${filteredBusinesses.length} of ${businesses.length} businesses`}
                {error && (
                  <div className="text-orange-600 text-xs mt-1">{error}</div>
                )}
              </div>
            </div>
          </div>

          <ROAMDataTable
            title="Businesses"
            columns={columns}
            data={loading ? [] : filteredBusinesses}
            searchable={true}
            filterable={false}
            addable={false}
            onAdd={() => setIsAddBusinessOpen(true)}
            onRowClick={(business) => console.log("View business:", business)}
            pageSize={10}
          />
        </div>
      </div>

      {/* Business Details Modal */}
      <Dialog
        open={isBusinessDetailsOpen}
        onOpenChange={setIsBusinessDetailsOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold">
                {selectedBusiness?.business_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              Business Details - {selectedBusiness?.business_name}
            </DialogTitle>
            <DialogDescription>
              View comprehensive business information including profile details,
              locations, services, and documents.
            </DialogDescription>
          </DialogHeader>

          {selectedBusiness && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Business Information
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business Name
                        </div>
                        <div className="font-medium">
                          {selectedBusiness.business_name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Contact Email
                        </div>
                        <div className="font-medium">
                          {selectedBusiness.contact_email ? (
                            <a
                              href={`mailto:${selectedBusiness.contact_email}`}
                              className="hover:text-roam-blue hover:underline transition-colors"
                            >
                              {selectedBusiness.contact_email}
                            </a>
                          ) : (
                            "Not provided"
                          )}
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
                          {selectedBusiness.phone ? (
                            <a
                              href={`tel:${selectedBusiness.phone}`}
                              className="hover:text-roam-blue hover:underline transition-colors"
                            >
                              {selectedBusiness.phone}
                            </a>
                          ) : (
                            "Not provided"
                          )}
                        </div>
                      </div>
                    </div>

                    {selectedBusiness.website_url && (
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Website
                          </div>
                          <div className="font-medium text-roam-blue">
                            <a
                              href={selectedBusiness.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {selectedBusiness.website_url}
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business Type
                        </div>
                        <ROAMBadge
                          variant={getBusinessTypeBadgeVariant(
                            selectedBusiness.business_type,
                          )}
                          className="mt-1 capitalize"
                        >
                          {formatEnumDisplay(selectedBusiness.business_type)}
                        </ROAMBadge>
                      </div>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>

                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Status & Verification
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Business Status
                        </div>
                        <ROAMBadge
                          variant={
                            selectedBusiness.is_active ? "success" : "secondary"
                          }
                          className="mt-1"
                        >
                          {selectedBusiness.is_active ? "ACTIVE" : "INACTIVE"}
                        </ROAMBadge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Verification Status
                        </div>
                        <ROAMBadge
                          variant={getVerificationBadgeVariant(
                            selectedBusiness.verification_status,
                          )}
                          className="mt-1"
                        >
                          {formatEnumDisplay(
                            selectedBusiness.verification_status,
                          )}
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
                          {new Date(
                            selectedBusiness.created_at,
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>

                    {selectedBusiness.stripe_connect_account_id && (
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">
                            Stripe Account
                          </div>
                          <div className="font-medium font-mono text-sm">
                            {selectedBusiness.stripe_connect_account_id}
                          </div>
                        </div>
                      </div>
                    )}
                  </ROAMCardContent>
                </ROAMCard>
              </div>

              {/* Service Categories and Subcategories */}
              {(selectedBusiness.service_categories?.length > 0 ||
                selectedBusiness.service_subcategories?.length > 0) && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Approved Service Categories
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent className="space-y-4">
                    {selectedBusiness.service_categories &&
                      selectedBusiness.service_categories.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Service Categories
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedBusiness.service_categories.map(
                              (category) => (
                                <ROAMBadge
                                  key={category}
                                  variant="success"
                                  size="sm"
                                  className="flex items-center gap-1"
                                >
                                  <span>
                                    {getServiceCategoryTypeIcon(category)}
                                  </span>
                                  {formatServiceCategoryType(category)}
                                </ROAMBadge>
                              ),
                            )}
                          </div>
                        </div>
                      )}

                    {selectedBusiness.service_subcategories &&
                      selectedBusiness.service_subcategories.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">
                            Service Subcategories
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedBusiness.service_subcategories.map(
                              (subcategory) => (
                                <ROAMBadge
                                  key={subcategory}
                                  variant="outline"
                                  size="sm"
                                >
                                  {formatServiceSubcategoryType(subcategory)}
                                </ROAMBadge>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Business Hours */}
              {(() => {
                const businessHours = parseBusinessHours(
                  selectedBusiness.business_hours,
                );

                console.log("Business hours debug for selected business:", {
                  business_name: selectedBusiness.business_name,
                  raw_business_hours: selectedBusiness.business_hours,
                  parsed_business_hours: businessHours,
                  business_hours_type: typeof selectedBusiness.business_hours,
                  parsed_type: typeof businessHours,
                  business_hours_keys: businessHours
                    ? Object.keys(businessHours)
                    : null,
                  sample_day_lookup: businessHours
                    ? {
                        monday_lower: businessHours["monday"],
                        Monday_capital: businessHours["Monday"],
                        friday_lower: businessHours["friday"],
                        Friday_capital: businessHours["Friday"],
                      }
                    : null,
                });

                // Store parsed business hours for use in the component
                selectedBusiness._parsedBusinessHours = businessHours;

                return businessHours && Object.keys(businessHours).length > 0;
              })() && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Business Hours
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                      {[
                        "Sunday",
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                      ].map((day) => {
                        // Use parsed business hours if available, otherwise try the raw data
                        const businessHours =
                          selectedBusiness._parsedBusinessHours ||
                          selectedBusiness.business_hours;

                        // Try both lowercase and capitalized day names for compatibility
                        const hours = businessHours
                          ? businessHours[day.toLowerCase()] ||
                            businessHours[day] ||
                            businessHours[
                              day.charAt(0).toUpperCase() +
                                day.slice(1).toLowerCase()
                            ]
                          : null;

                        return (
                          <div
                            key={day}
                            className="flex flex-col p-3 bg-muted/50 rounded-md text-center"
                          >
                            <span className="text-sm font-medium text-foreground mb-1">
                              {day}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {hours &&
                              typeof hours === "object" &&
                              hours.open &&
                              hours.close
                                ? convertTo12Hour(
                                    `${hours.open}-${hours.close}`,
                                  )
                                : typeof hours === "string" &&
                                    hours.trim() &&
                                    hours !== "Closed"
                                  ? convertTo12Hour(hours)
                                  : "Closed"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Show message when business hours are not available */}
              {(() => {
                const businessHours = parseBusinessHours(
                  selectedBusiness.business_hours,
                );
                return (
                  !businessHours || Object.keys(businessHours).length === 0
                );
              })() && (
                <ROAMCard>
                  <ROAMCardHeader>
                    <ROAMCardTitle className="text-base">
                      Business Hours
                    </ROAMCardTitle>
                  </ROAMCardHeader>
                  <ROAMCardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p>No business hours configured</p>
                      <p className="text-xs mt-1">
                        Business hours can be added through the business profile
                        settings
                      </p>
                    </div>
                  </ROAMCardContent>
                </ROAMCard>
              )}

              {/* Social Media & Verification Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedBusiness.social_media && (
                  <ROAMCard>
                    <ROAMCardHeader>
                      <ROAMCardTitle className="text-base">
                        Social Media
                      </ROAMCardTitle>
                    </ROAMCardHeader>
                    <ROAMCardContent className="space-y-3">
                      {Object.entries(selectedBusiness.social_media).map(
                        ([platform, handle]) => (
                          <div
                            key={platform}
                            className="flex items-center gap-3 min-w-0"
                          >
                            <div className="w-8 h-8 bg-roam-blue/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Globe className="w-4 h-4 text-roam-blue" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-muted-foreground capitalize">
                                {platform}
                              </div>
                              <div className="font-medium text-sm break-all">
                                {String(handle).startsWith("http") ? (
                                  <a
                                    href={String(handle)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-roam-blue hover:underline transition-colors"
                                    title={String(handle)}
                                  >
                                    {String(handle).length > 30
                                      ? `${String(handle).substring(0, 30)}...`
                                      : String(handle)}
                                  </a>
                                ) : (
                                  <span
                                    className="block"
                                    title={String(handle)}
                                  >
                                    {String(handle).length > 30
                                      ? `${String(handle).substring(0, 30)}...`
                                      : String(handle)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </ROAMCardContent>
                  </ROAMCard>
                )}

                {selectedBusiness.verification_notes && (
                  <ROAMCard>
                    <ROAMCardHeader>
                      <ROAMCardTitle className="text-base">
                        Verification Notes
                      </ROAMCardTitle>
                    </ROAMCardHeader>
                    <ROAMCardContent>
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-sm">
                          {selectedBusiness.verification_notes}
                        </p>
                      </div>
                    </ROAMCardContent>
                  </ROAMCard>
                )}
              </div>

              {/* Locations */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">
                    Business Locations
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {(() => {
                      const currentBusinessLocations = businessLocations.filter(
                        (loc) => loc.business_id === selectedBusiness.id,
                      );

                      return currentBusinessLocations.length > 0 ? (
                        currentBusinessLocations.map((location) => (
                          <div
                            key={location.id}
                            className="p-4 border rounded-lg space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-roam-blue" />
                                <span className="font-medium">
                                  {location.location_name || "Main Location"}
                                </span>
                                {location.is_primary && (
                                  <ROAMBadge variant="success" size="sm">
                                    Primary
                                  </ROAMBadge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <ROAMBadge
                                  variant={
                                    location.is_active ? "success" : "secondary"
                                  }
                                  size="sm"
                                >
                                  {location.is_active ? "Active" : "Inactive"}
                                </ROAMBadge>
                                {location.offers_mobile_services && (
                                  <ROAMBadge variant="warning" size="sm">
                                    Mobile Service
                                  </ROAMBadge>
                                )}
                              </div>
                            </div>

                            {(location.address_line1 || location.city) && (
                              <div className="text-sm text-muted-foreground">
                                {location.address_line1}
                                {location.address_line2 &&
                                  `, ${location.address_line2}`}
                                {location.address_line1 && <br />}
                                {[
                                  location.city,
                                  location.state,
                                  location.postal_code,
                                ]
                                  .filter(Boolean)
                                  .join(", ")}
                                {location.country &&
                                  location.country !== "USA" &&
                                  `, ${location.country}`}
                              </div>
                            )}

                            {location.offers_mobile_services &&
                              location.mobile_service_radius && (
                                <div className="text-sm text-muted-foreground">
                                  <span className="text-roam-blue">
                                    Service Radius:{" "}
                                    {location.mobile_service_radius} miles
                                  </span>
                                </div>
                              )}

                            {location.latitude && location.longitude && (
                              <div className="text-xs text-muted-foreground">
                                Coordinates: {location.latitude.toFixed(6)},{" "}
                                {location.longitude.toFixed(6)}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p>No locations configured for this business</p>
                        </div>
                      );
                    })()}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Business Services */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Business Services
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-4">
                    {(() => {
                      const currentBusinessServices = businessServices.filter(
                        (service) =>
                          service.business_id === selectedBusiness.id,
                      );

                      return currentBusinessServices.length > 0 ? (
                        <div className="space-y-3">
                          {currentBusinessServices.map((businessService) => (
                            <div
                              key={businessService.id}
                              className="p-4 border rounded-lg space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <Settings className="w-4 h-4 text-roam-blue" />
                                  <div>
                                    <div className="font-medium text-foreground">
                                      {businessService.services?.name ||
                                        "Service"}
                                    </div>
                                    {businessService.services?.description && (
                                      <div className="text-sm text-muted-foreground mt-1">
                                        {businessService.services.description}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <ROAMBadge
                                    variant={
                                      businessService.is_active
                                        ? "success"
                                        : "secondary"
                                    }
                                    size="sm"
                                  >
                                    {businessService.is_active
                                      ? "Active"
                                      : "Inactive"}
                                  </ROAMBadge>
                                  {businessService.delivery_type && (
                                    <ROAMBadge variant="outline" size="sm">
                                      {businessService.delivery_type
                                        .charAt(0)
                                        .toUpperCase() +
                                        businessService.delivery_type.slice(1)}
                                    </ROAMBadge>
                                  )}
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <div className="font-medium text-muted-foreground">
                                    Business Price
                                  </div>
                                  <div className="text-foreground flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />$
                                    {businessService.business_price.toFixed(2)}
                                  </div>
                                </div>

                                {businessService.services?.min_price && (
                                  <div>
                                    <div className="font-medium text-muted-foreground">
                                      Minimum Price
                                    </div>
                                    <div className="text-foreground flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />$
                                      {businessService.services.min_price.toFixed(
                                        2,
                                      )}
                                    </div>
                                  </div>
                                )}

                                {businessService.services?.duration_minutes && (
                                  <div>
                                    <div className="font-medium text-muted-foreground">
                                      Duration
                                    </div>
                                    <div className="text-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {
                                        businessService.services
                                          .duration_minutes
                                      }{" "}
                                      min
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t text-xs text-muted-foreground">
                                Added{" "}
                                {new Date(
                                  businessService.created_at,
                                ).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p>No services configured for this business</p>
                        </div>
                      );
                    })()}
                  </div>
                </ROAMCardContent>
              </ROAMCard>

              {/* Assigned Providers by Location */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assigned Providers by Location
                  </ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <div className="space-y-6">
                    {(() => {
                      const currentBusinessLocations = businessLocations.filter(
                        (loc) => loc.business_id === selectedBusiness.id,
                      );

                      const currentBusinessProviders = providers.filter(
                        (provider) =>
                          provider.business_id === selectedBusiness.id,
                      );

                      return currentBusinessLocations.length > 0 ? (
                        <>
                          {currentBusinessLocations.map((location) => {
                            const locationProviders =
                              currentBusinessProviders.filter(
                                (provider) =>
                                  provider.location_id === location.id,
                              );

                            return (
                              <div key={location.id} className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b">
                                  <MapPin className="w-4 h-4 text-roam-blue" />
                                  <span className="font-medium">
                                    {location.location_name || "Main Location"}
                                  </span>
                                  {location.is_primary && (
                                    <ROAMBadge variant="success" size="sm">
                                      Primary
                                    </ROAMBadge>
                                  )}
                                  <span className="text-sm text-muted-foreground ml-auto">
                                    {locationProviders.length} provider
                                    {locationProviders.length !== 1 ? "s" : ""}
                                  </span>
                                </div>

                                {locationProviders.length > 0 ? (
                                  <div className="grid gap-4">
                                    {locationProviders.map((provider) => (
                                      <div
                                        key={provider.id}
                                        className="p-4 border rounded-lg space-y-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                              {provider.first_name[0]}
                                              {provider.last_name[0] || ""}
                                            </div>
                                            <div>
                                              <div className="font-medium text-foreground">
                                                {provider.first_name}{" "}
                                                {provider.last_name}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {provider.email}
                                              </div>
                                            </div>
                                          </div>
                                          <ROAMBadge
                                            variant={
                                              provider.is_active
                                                ? "success"
                                                : "secondary"
                                            }
                                          >
                                            {provider.is_active
                                              ? "Active"
                                              : "Inactive"}
                                          </ROAMBadge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Provider Role
                                            </div>
                                            <ROAMBadge
                                              variant={
                                                provider.provider_role ===
                                                "owner"
                                                  ? "success"
                                                  : provider.provider_role ===
                                                      "dispatcher"
                                                    ? "warning"
                                                    : "secondary"
                                              }
                                              size="sm"
                                              className="mt-1 capitalize"
                                            >
                                              {provider.provider_role}
                                            </ROAMBadge>
                                          </div>

                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Manages Business
                                            </div>
                                            <ROAMBadge
                                              variant={
                                                provider.business_managed
                                                  ? "success"
                                                  : "secondary"
                                              }
                                              size="sm"
                                              className="mt-1"
                                            >
                                              {provider.business_managed
                                                ? "Yes"
                                                : "No"}
                                            </ROAMBadge>
                                          </div>

                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Notification Contacts
                                            </div>
                                            <div className="mt-1 space-y-1">
                                              {provider.notification_email && (
                                                <div className="text-xs">
                                                  <a
                                                    href={`mailto:${provider.notification_email}`}
                                                    className="text-roam-blue hover:underline"
                                                    title="Notification Email"
                                                  >
                                                    📧{" "}
                                                    {provider.notification_email
                                                      .length > 20
                                                      ? `${provider.notification_email.substring(0, 20)}...`
                                                      : provider.notification_email}
                                                  </a>
                                                </div>
                                              )}
                                              {provider.notification_phone && (
                                                <div className="text-xs">
                                                  <a
                                                    href={`tel:${provider.notification_phone}`}
                                                    className="text-roam-blue hover:underline"
                                                    title="Notification Phone"
                                                  >
                                                    📱{" "}
                                                    {
                                                      provider.notification_phone
                                                    }
                                                  </a>
                                                </div>
                                              )}
                                              {!provider.notification_email &&
                                                !provider.notification_phone && (
                                                  <span className="text-xs text-muted-foreground">
                                                    None set
                                                  </span>
                                                )}
                                            </div>
                                          </div>

                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Verification Status
                                            </div>
                                            <ROAMBadge
                                              variant={
                                                provider.verification_status ===
                                                "approved"
                                                  ? "success"
                                                  : provider.verification_status ===
                                                      "pending"
                                                    ? "secondary"
                                                    : "warning"
                                              }
                                              size="sm"
                                              className="mt-1"
                                            >
                                              {formatEnumDisplay(
                                                provider.verification_status,
                                              )}
                                            </ROAMBadge>
                                          </div>

                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Background Check
                                            </div>
                                            <ROAMBadge
                                              variant={
                                                provider.background_check_status ===
                                                "approved"
                                                  ? "success"
                                                  : provider.background_check_status ===
                                                      "under_review"
                                                    ? "warning"
                                                    : "secondary"
                                              }
                                              size="sm"
                                              className="mt-1"
                                            >
                                              {formatEnumDisplay(
                                                provider.background_check_status,
                                              )}
                                            </ROAMBadge>
                                          </div>

                                          <div>
                                            <div className="text-xs text-muted-foreground">
                                              Performance
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                              <Star className="w-3 h-3 fill-roam-yellow text-roam-yellow" />
                                              <span className="text-sm font-medium">
                                                {provider.average_rating.toFixed(
                                                  1,
                                                )}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                ({provider.total_reviews})
                                              </span>
                                            </div>
                                          </div>
                                        </div>

                                        {provider.bio && (
                                          <div className="pt-2 border-t">
                                            <div className="text-xs text-muted-foreground mb-1">
                                              Bio
                                            </div>
                                            <p className="text-sm">
                                              {provider.bio}
                                            </p>
                                          </div>
                                        )}

                                        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
                                          <span>
                                            {provider.experience_years || 0}{" "}
                                            years experience
                                          </span>
                                          <span>
                                            {provider.completed_bookings}/
                                            {provider.total_bookings} completed
                                            bookings
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-8 text-muted-foreground">
                                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                                    <p>
                                      No providers assigned to this location
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Providers not assigned to specific locations */}
                          {(() => {
                            const unassignedProviders =
                              currentBusinessProviders.filter(
                                (provider) => !provider.location_id,
                              );

                            if (unassignedProviders.length > 0) {
                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2 pb-2 border-b">
                                    <UserX className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      Unassigned to Location
                                    </span>
                                    <span className="text-sm text-muted-foreground ml-auto">
                                      {unassignedProviders.length} provider
                                      {unassignedProviders.length !== 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  </div>

                                  <div className="grid gap-4">
                                    {unassignedProviders.map((provider) => (
                                      <div
                                        key={provider.id}
                                        className="p-4 border rounded-lg bg-muted/30 space-y-3"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-muted-foreground to-muted rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                              {provider.first_name[0]}
                                              {provider.last_name[0] || ""}
                                            </div>
                                            <div>
                                              <div className="font-medium text-foreground">
                                                {provider.first_name}{" "}
                                                {provider.last_name}
                                              </div>
                                              <div className="text-sm text-muted-foreground">
                                                {provider.email}
                                              </div>
                                            </div>
                                          </div>
                                          <ROAMBadge
                                            variant="warning"
                                            size="sm"
                                          >
                                            Needs Location Assignment
                                          </ROAMBadge>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                          <p>No locations configured for this business</p>
                        </div>
                      );
                    })()}

                    {(() => {
                      const businessProviders = providers.filter(
                        (p) => p.business_id === selectedBusiness.id,
                      );

                      if (businessProviders.length === 0) {
                        return (
                          <div className="text-center py-8 text-muted-foreground">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p>No providers assigned to this business</p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </ROAMCardContent>
              </ROAMCard>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add New Business Modal */}
      <Dialog open={isAddBusinessOpen} onOpenChange={setIsAddBusinessOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-roam-blue" />
              Add New Business
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="business_name">Business Name *</Label>
              <Input
                id="business_name"
                value={newBusiness.business_name}
                onChange={(e) =>
                  setNewBusiness({
                    ...newBusiness,
                    business_name: e.target.value,
                  })
                }
                placeholder="Enter business name"
              />
            </div>

            <div>
              <Label htmlFor="contact_email">Contact Email</Label>
              <Input
                id="contact_email"
                type="email"
                value={newBusiness.contact_email}
                onChange={(e) =>
                  setNewBusiness({
                    ...newBusiness,
                    contact_email: e.target.value,
                  })
                }
                placeholder="business@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={newBusiness.phone}
                onChange={(e) =>
                  setNewBusiness({ ...newBusiness, phone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="website_url">Website URL</Label>
              <Input
                id="website_url"
                type="url"
                value={newBusiness.website_url}
                onChange={(e) =>
                  setNewBusiness({
                    ...newBusiness,
                    website_url: e.target.value,
                  })
                }
                placeholder="https://www.business.com"
              />
            </div>

            <div>
              <Label htmlFor="business_type">Business Type</Label>
              <Select
                value={newBusiness.business_type}
                onValueChange={(value: BusinessType) =>
                  setNewBusiness({ ...newBusiness, business_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="independent">Independent</SelectItem>
                  <SelectItem value="small_business">Small Business</SelectItem>
                  <SelectItem value="franchise">Franchise</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="verification_status">Verification Status</Label>
              <Select
                value={newBusiness.verification_status}
                onValueChange={(value: VerificationStatus) =>
                  setNewBusiness({ ...newBusiness, verification_status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={newBusiness.is_active}
                onCheckedChange={(checked) =>
                  setNewBusiness({ ...newBusiness, is_active: checked })
                }
              />
              <Label htmlFor="is_active">Active business</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddBusinessOpen(false);
                  setNewBusiness({
                    business_name: "",
                    contact_email: "",
                    phone: "",
                    website_url: "",
                    business_type: "small_business",
                    is_active: true,
                    verification_status: "pending",
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createBusiness}
                disabled={saving || !newBusiness.business_name}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Business
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Business Modal */}
      <Dialog open={isEditBusinessOpen} onOpenChange={setIsEditBusinessOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-6 h-6 text-roam-blue" />
              Edit Business
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Basic Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_name">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={editFormData.business_name}
                    readOnly
                    placeholder="Enter business name"
                    className="mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label htmlFor="business_type">Business Type</Label>
                  <select
                    id="business_type"
                    value={editFormData.business_type}
                    disabled
                    className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm bg-gray-50 cursor-not-allowed"
                  >
                    <option value="independent">Independent</option>
                    <option value="small_business">Small Business</option>
                    <option value="franchise">Franchise</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="contact_email">Contact Email</Label>
                  <Input
                    id="contact_email"
                    type="email"
                    value={editFormData.contact_email}
                    readOnly
                    placeholder="Enter contact email"
                    className="mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editFormData.phone}
                    readOnly
                    placeholder="Enter phone number"
                    className="mt-1 bg-gray-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Status Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Status Settings</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="verification_status">
                    Verification Status
                  </Label>
                  <select
                    id="verification_status"
                    value={editFormData.verification_status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        verification_status: e.target
                          .value as VerificationStatus,
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm bg-background"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              {/* Verification Notes */}
              <div className="mt-4">
                <Label htmlFor="verification_notes">Verification Notes</Label>
                <textarea
                  id="verification_notes"
                  value={editFormData.verification_notes || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      verification_notes: e.target.value,
                    })
                  }
                  placeholder="Add notes for the business regarding verification status (visible to business owner)"
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-border rounded-md text-sm bg-background resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editFormData.is_active}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        is_active: e.target.checked,
                      })
                    }
                    className="rounded border-border"
                  />
                  <Label htmlFor="is_active">Business is Active</Label>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={editFormData.is_featured}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        is_featured: e.target.checked,
                      })
                    }
                    className="rounded border-border"
                  />
                  <Label htmlFor="is_featured">Featured Business</Label>
                </div>
              </div>
            </div>

            {/* Service Categories */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Service Categories</h3>

              <div>
                <Label>Select Service Categories</Label>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  {(
                    [
                      "beauty",
                      "fitness",
                      "therapy",
                      "healthcare",
                    ] as ServiceCategoryType[]
                  ).map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`category_${category}`}
                        checked={
                          editFormData.service_categories?.includes(category) ||
                          false
                        }
                        onChange={(e) => {
                          const currentCategories =
                            editFormData.service_categories || [];
                          if (e.target.checked) {
                            setEditFormData({
                              ...editFormData,
                              service_categories: [
                                ...currentCategories,
                                category,
                              ],
                            });
                          } else {
                            setEditFormData({
                              ...editFormData,
                              service_categories: currentCategories.filter(
                                (c) => c !== category,
                              ),
                            });
                          }
                        }}
                        className="rounded border-border"
                      />
                      <Label
                        htmlFor={`category_${category}`}
                        className="capitalize"
                      >
                        {formatServiceCategoryType(category)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Select Service Subcategories</Label>
                <div className="mt-2 grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                  {(
                    [
                      "hair_and_makeup",
                      "spray_tan",
                      "esthetician",
                      "massage_therapy",
                      "iv_therapy",
                      "physical_therapy",
                      "nurse_practitioner",
                      "physician",
                      "health_coach",
                      "chiropractor",
                      "yoga_instructor",
                      "pilates_instructor",
                      "personal_trainer",
                    ] as ServiceSubcategoryType[]
                  ).map((subcategory) => (
                    <div
                      key={subcategory}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="checkbox"
                        id={`subcategory_${subcategory}`}
                        checked={
                          editFormData.service_subcategories?.includes(
                            subcategory,
                          ) || false
                        }
                        onChange={(e) => {
                          const currentSubcategories =
                            editFormData.service_subcategories || [];
                          if (e.target.checked) {
                            setEditFormData({
                              ...editFormData,
                              service_subcategories: [
                                ...currentSubcategories,
                                subcategory,
                              ],
                            });
                          } else {
                            setEditFormData({
                              ...editFormData,
                              service_subcategories:
                                currentSubcategories.filter(
                                  (s) => s !== subcategory,
                                ),
                            });
                          }
                        }}
                        className="rounded border-border"
                      />
                      <Label
                        htmlFor={`subcategory_${subcategory}`}
                        className="text-sm"
                      >
                        {formatEnumDisplay(subcategory)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditBusinessOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveBusinessEdit}>Save Changes</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
