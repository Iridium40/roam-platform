import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROAMBadge } from "@/components/ui/roam-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Calendar,
  CreditCard,
  Globe,
  Mail,
  Phone,
  MapPin,
  Star,
  Users,
  FileText,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import type { VerificationStatus, BusinessType } from "@roam/shared";

interface BusinessProfile {
  id: string;
  business_name: string;
  contact_email: string | null;
  phone: string | null;
  verification_status: VerificationStatus;
  stripe_account_id: string | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
  website_url: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  business_hours: Record<string, any> | string | null;
  social_media: Record<string, any> | null;
  verification_notes: string | null;
  business_type: BusinessType;
  service_categories: string[] | null;
  service_subcategories: string[] | null;
  is_featured: boolean | null;
}

interface BusinessDetailsProps {
  business: BusinessProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (business: BusinessProfile) => void;
  onApprove?: (business: BusinessProfile) => void;
  onReject?: (business: BusinessProfile) => void;
}

export function BusinessDetails({
  business,
  isOpen,
  onClose,
  onEdit,
  onApprove,
  onReject,
}: BusinessDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!business) return null;

  const formatEnumDisplay = (enumValue: string): string => {
    return enumValue
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatBusinessType = (type: BusinessType): string => {
    const typeMap: Record<BusinessType, string> = {
      independent: "Independent",
      small_business: "Small Business",
      franchise: "Franchise",
      enterprise: "Enterprise",
      other: "Other",
    };
    return typeMap[type] || formatEnumDisplay(type);
  };

  const getVerificationStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "approved":
        return (
          <ROAMBadge variant="success" className="text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            Approved
          </ROAMBadge>
        );
      case "rejected":
        return (
          <ROAMBadge variant="danger" className="text-sm">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </ROAMBadge>
        );
      case "suspended":
        return (
          <ROAMBadge variant="warning" className="text-sm">
            <XCircle className="w-4 h-4 mr-1" />
            Suspended
          </ROAMBadge>
        );
      case "pending":
      default:
        return (
          <ROAMBadge variant="secondary" className="text-sm">
            <Clock className="w-4 h-4 mr-1" />
            Pending
          </ROAMBadge>
        );
    }
  };

  const parseBusinessHours = (hours: Record<string, any> | string | null) => {
    if (!hours) return null;
    
    try {
      if (typeof hours === 'string') {
        return JSON.parse(hours);
      }
      return hours;
    } catch {
      return null;
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Header with logo and basic info */}
      <div className="flex gap-6">
        {business.logo_url || business.image_url ? (
          <img
            src={business.logo_url || business.image_url || ''}
            alt={business.business_name}
            className="w-24 h-24 rounded-lg object-cover"
          />
        ) : (
          <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center">
            <Building2 className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{business.business_name}</h3>
            <p className="text-muted-foreground">ID: {business.id}</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <ROAMBadge variant={business.is_active ? "success" : "secondary"}>
              {business.is_active ? "Active" : "Inactive"}
            </ROAMBadge>
            {getVerificationStatusBadge(business.verification_status)}
            {business.is_featured && (
              <ROAMBadge variant="warning">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </ROAMBadge>
            )}
            {business.stripe_account_id && (
              <ROAMBadge variant="default">
                <CreditCard className="w-3 h-3 mr-1" />
                Stripe Connected
              </ROAMBadge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Business Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Type: </span>
              <span>{formatBusinessType(business.business_type)}</span>
            </div>
            {business.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{business.contact_email}</span>
              </div>
            )}
            {business.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{business.phone}</span>
              </div>
            )}
            {business.website_url && (
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a
                  href={business.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {business.website_url}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Service Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {business.service_categories && business.service_categories.length > 0 ? (
                <div>
                  <span className="font-medium text-sm">Categories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {business.service_categories.map((category, index) => (
                      <ROAMBadge key={index} variant="outline" className="text-xs">
                        {formatEnumDisplay(category)}
                      </ROAMBadge>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No categories set</p>
              )}
              
              {business.service_subcategories && business.service_subcategories.length > 0 && (
                <div>
                  <span className="font-medium text-sm">Subcategories:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {business.service_subcategories.slice(0, 3).map((subcategory, index) => (
                      <ROAMBadge key={index} variant="secondary" className="text-xs">
                        {formatEnumDisplay(subcategory)}
                      </ROAMBadge>
                    ))}
                    {business.service_subcategories.length > 3 && (
                      <ROAMBadge variant="secondary" className="text-xs">
                        +{business.service_subcategories.length - 3} more
                      </ROAMBadge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <span className="font-medium">Status: </span>
              {getVerificationStatusBadge(business.verification_status)}
            </div>
            {business.verification_notes && (
              <div>
                <span className="font-medium text-sm">Notes:</span>
                <p className="text-sm text-muted-foreground mt-1">
                  {business.verification_notes}
                </p>
              </div>
            )}
            {business.verification_status === "pending" && (
              <div className="flex gap-2 mt-3">
                {onApprove && (
                  <Button
                    size="sm"
                    onClick={() => onApprove(business)}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </Button>
                )}
                {onReject && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onReject(business)}
                    className="flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {new Date(business.created_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(business.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderBusinessHours = () => {
    const hours = parseBusinessHours(business.business_hours);
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>
            Operating hours for this business
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hours ? (
            <div className="space-y-2">
              {Object.entries(hours).map(([day, time]) => (
                <div key={day} className="flex justify-between">
                  <span className="font-medium capitalize">{day}</span>
                  <span className="text-muted-foreground">
                    {typeof time === 'object' && time !== null 
                      ? JSON.stringify(time) 
                      : String(time)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              No business hours information available
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderLocations = () => (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>
          Business locations and service areas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Location details would be loaded from business_locations table
        </p>
      </CardContent>
    </Card>
  );

  const renderServices = () => (
    <Card>
      <CardHeader>
        <CardTitle>Services</CardTitle>
        <CardDescription>
          Services offered by this business
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Service details would be loaded from business_services table
        </p>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">Business Details</DialogTitle>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(business)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hours">Hours</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            {renderOverview()}
          </TabsContent>
          
          <TabsContent value="hours" className="mt-6">
            {renderBusinessHours()}
          </TabsContent>
          
          <TabsContent value="locations" className="mt-6">
            {renderLocations()}
          </TabsContent>
          
          <TabsContent value="services" className="mt-6">
            {renderServices()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}