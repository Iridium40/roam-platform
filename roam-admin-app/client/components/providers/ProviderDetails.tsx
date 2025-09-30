import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Star,
  UserCheck,
  Shield,
  ShieldCheck,
  Award,
  Package,
  FileText,
} from "lucide-react";

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
  business_name: string;
}

interface ProviderService {
  id: string;
  business_id: string;
  service_id: string;
  business_name: string;
  service_name: string;
  service_category: string;
  base_price: number;
  custom_price?: number;
  is_active: boolean;
  created_at: string;
}

interface ProviderDetailsProps {
  provider: Provider | null;
  isOpen: boolean;
  onClose: () => void;
  providerServices?: ProviderService[];
}

export function ProviderDetails({
  provider,
  isOpen,
  onClose,
  providerServices = [],
}: ProviderDetailsProps) {
  if (!provider) return null;

  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const getVerificationBadgeVariant = (
    status: VerificationStatus
  ): "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "neutral" => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "under_review":
        return "warning";
      case "documents_submitted":
        return "outline";
      case "pending":
      default:
        return "secondary";
    }
  };

  const getBackgroundCheckBadgeVariant = (
    status: BackgroundCheckStatus
  ): "default" | "secondary" | "outline" | "success" | "warning" | "danger" | "neutral" => {
    switch (status) {
      case "approved":
        return "success";
      case "rejected":
        return "danger";
      case "under_review":
        return "warning";
      case "pending":
      default:
        return "secondary";
    }
  };

  const currentProviderServices = providerServices.filter(
    (service) => service.business_id === provider.business_id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-roam-blue/10 rounded-full flex items-center justify-center">
              <span className="text-lg font-medium text-roam-blue">
                {provider.first_name.charAt(0)}
                {provider.last_name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {provider.first_name} {provider.last_name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatEnumDisplay(provider.provider_role)} at {provider.business_name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="contact">Contact</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Info */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">Basic Information</ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Full Name</div>
                      <div className="font-medium">
                        {provider.first_name} {provider.last_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <a
                        href={`mailto:${provider.email}`}
                        className="font-medium hover:text-roam-blue hover:underline transition-colors"
                      >
                        {provider.email}
                      </a>
                    </div>
                  </div>

                  {provider.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Phone</div>
                        <a
                          href={`tel:${provider.phone}`}
                          className="font-medium hover:text-roam-blue hover:underline transition-colors"
                        >
                          {provider.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {provider.experience_years && (
                    <div className="flex items-center gap-3">
                      <Award className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Experience</div>
                        <div className="font-medium">
                          {provider.experience_years} year{provider.experience_years !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  )}
                </ROAMCardContent>
              </ROAMCard>

              {/* Status & Verification */}
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">Status & Verification</ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Business</div>
                      <div className="font-medium">{provider.business_name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Account Status</div>
                      <ROAMBadge
                        variant={provider.is_active ? "success" : "secondary"}
                        className="mt-1"
                      >
                        {provider.is_active ? "Active" : "Inactive"}
                      </ROAMBadge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Verification Status</div>
                      <ROAMBadge
                        variant={getVerificationBadgeVariant(provider.verification_status)}
                        className="mt-1"
                      >
                        {formatEnumDisplay(provider.verification_status)}
                      </ROAMBadge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Background Check</div>
                      <ROAMBadge
                        variant={getBackgroundCheckBadgeVariant(provider.background_check_status)}
                        className="mt-1"
                      >
                        {formatEnumDisplay(provider.background_check_status)}
                      </ROAMBadge>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Joined</div>
                      <div className="font-medium">
                        {new Date(provider.created_at).toLocaleDateString("en-US", {
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

            {/* Bio Section */}
            {provider.bio && (
              <ROAMCard>
                <ROAMCardHeader>
                  <ROAMCardTitle className="text-base">Professional Bio</ROAMCardTitle>
                </ROAMCardHeader>
                <ROAMCardContent>
                  <p className="text-sm leading-relaxed">{provider.bio}</p>
                </ROAMCardContent>
              </ROAMCard>
            )}
          </TabsContent>

          <TabsContent value="contact" className="space-y-6">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Contact Information</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      Primary Contact
                    </h4>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">Email</div>
                        <a
                          href={`mailto:${provider.email}`}
                          className="font-medium hover:text-roam-blue hover:underline transition-colors"
                        >
                          {provider.email}
                        </a>
                      </div>
                    </div>
                    {provider.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Phone</div>
                          <a
                            href={`tel:${provider.phone}`}
                            className="font-medium hover:text-roam-blue hover:underline transition-colors"
                          >
                            {provider.phone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {(provider.notification_email || provider.notification_phone) && (
                    <div className="space-y-4">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        Notification Preferences
                      </h4>
                      {provider.notification_email && (
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Notification Email
                            </div>
                            <a
                              href={`mailto:${provider.notification_email}`}
                              className="font-medium hover:text-roam-blue hover:underline transition-colors"
                            >
                              {provider.notification_email}
                            </a>
                          </div>
                        </div>
                      )}
                      {provider.notification_phone && (
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm text-muted-foreground">
                              Notification Phone
                            </div>
                            <a
                              href={`tel:${provider.notification_phone}`}
                              className="font-medium hover:text-roam-blue hover:underline transition-colors"
                            >
                              {provider.notification_phone}
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="services" className="space-y-6">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Provider Services</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="space-y-4">
                  {currentProviderServices.length > 0 ? (
                    <div className="grid gap-4">
                      {currentProviderServices.map((providerService) => (
                        <div
                          key={providerService.id}
                          className="flex items-center justify-between p-4 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Package className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">
                                {providerService.service_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {providerService.service_category}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">
                              ${providerService.custom_price?.toFixed(2) || 
                                providerService.base_price.toFixed(2)}
                            </div>
                            <ROAMBadge
                              variant={providerService.is_active ? "success" : "secondary"}
                              className="text-xs"
                            >
                              {providerService.is_active ? "Active" : "Inactive"}
                            </ROAMBadge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No services found for this provider</p>
                    </div>
                  )}
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <ROAMCard>
              <ROAMCardHeader>
                <ROAMCardTitle className="text-base">Performance Metrics</ROAMCardTitle>
              </ROAMCardHeader>
              <ROAMCardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-2">
                      <Star className="w-4 h-4 fill-roam-yellow text-roam-yellow" />
                      <span className="text-lg font-bold">
                        {provider.average_rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                    <div className="text-xs text-muted-foreground">
                      ({provider.total_reviews} reviews)
                    </div>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-roam-blue mb-2">
                      {provider.total_bookings}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Bookings</div>
                    <div className="text-xs text-muted-foreground">All time</div>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-roam-success mb-2">
                      {provider.completed_bookings}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(
                        (provider.completed_bookings / provider.total_bookings) * 100
                      )}
                      % completion rate
                    </div>
                  </div>

                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold text-roam-warning mb-2">
                      {provider.total_bookings - provider.completed_bookings}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending/Cancelled</div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(
                        ((provider.total_bookings - provider.completed_bookings) /
                          provider.total_bookings) *
                          100
                      )}
                      % rate
                    </div>
                  </div>
                </div>
              </ROAMCardContent>
            </ROAMCard>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}