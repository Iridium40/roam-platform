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
import { Calendar, Clock, DollarSign, Star, Flame, Users, MapPin, Phone, Mail, Tag, Edit, X } from "lucide-react";

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

interface ServiceDetailsProps {
  item: Service | ServiceCategory | ServiceSubcategory | ServiceAddon | null;
  type: "service" | "category" | "subcategory" | "addon";
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (item: any) => void;
}

export function ServiceDetails({
  item,
  type,
  isOpen,
  onClose,
  onEdit,
}: ServiceDetailsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  if (!item) return null;

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
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes} minutes`;
  };

  const renderServiceOverview = (service: Service) => (
    <div className="space-y-6">
      {/* Header with image and basic info */}
      <div className="flex gap-6">
        {service.image_url && (
          <img
            src={service.image_url}
            alt={service.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{service.name}</h3>
            {service.description && (
              <p className="text-muted-foreground mt-2">{service.description}</p>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <ROAMBadge variant={service.is_active ? "success" : "secondary"}>
              {service.is_active ? "Active" : "Inactive"}
            </ROAMBadge>
            {service.is_featured && (
              <ROAMBadge variant="warning">
                <Star className="w-3 h-3 mr-1" />
                Featured
              </ROAMBadge>
            )}
            {service.is_popular && (
              <ROAMBadge variant="danger">
                <Flame className="w-3 h-3 mr-1" />
                Popular
              </ROAMBadge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Service Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(service.min_price)}
            </div>
            <p className="text-sm text-muted-foreground">Starting price</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(service.duration_minutes)}
            </div>
            <p className="text-sm text-muted-foreground">Estimated time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {service.service_subcategories?.service_categories && (
                <div>
                  <span className="font-medium">Category: </span>
                  <span>{formatEnumDisplay(service.service_subcategories.service_categories.service_category_type)}</span>
                </div>
              )}
              {service.service_subcategories && (
                <div>
                  <span className="font-medium">Subcategory: </span>
                  <span>{formatEnumDisplay(service.service_subcategories.service_subcategory_type)}</span>
                </div>
              )}
            </div>
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
              {new Date(service.created_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(service.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCategoryOverview = (category: ServiceCategory) => (
    <div className="space-y-6">
      <div className="flex gap-6">
        {category.image_url && (
          <img
            src={category.image_url}
            alt={category.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{category.name}</h3>
            {category.description && (
              <p className="text-muted-foreground mt-2">{category.description}</p>
            )}
          </div>
          
          <ROAMBadge variant={category.is_active ? "success" : "secondary"}>
            {category.is_active ? "Active" : "Inactive"}
          </ROAMBadge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Category Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {formatEnumDisplay(category.service_category_type)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Sort Order</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {category.sort_order !== null ? category.sort_order : "N/A"}
            </div>
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
              {new Date(category.created_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(category.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderSubcategoryOverview = (subcategory: ServiceSubcategory) => (
    <div className="space-y-6">
      <div className="flex gap-6">
        {subcategory.image_url && (
          <img
            src={subcategory.image_url}
            alt={subcategory.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{subcategory.name}</h3>
            {subcategory.description && (
              <p className="text-muted-foreground mt-2">{subcategory.description}</p>
            )}
          </div>
          
          <ROAMBadge variant={subcategory.is_active ? "success" : "secondary"}>
            {subcategory.is_active ? "Active" : "Inactive"}
          </ROAMBadge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Subcategory Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {formatEnumDisplay(subcategory.service_subcategory_type)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Parent Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">
              {subcategory.service_categories 
                ? formatEnumDisplay(subcategory.service_categories.service_category_type)
                : "N/A"}
            </div>
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
              {new Date(subcategory.created_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(subcategory.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAddonOverview = (addon: ServiceAddon) => (
    <div className="space-y-6">
      <div className="flex gap-6">
        {addon.image_url && (
          <img
            src={addon.image_url}
            alt={addon.name}
            className="w-32 h-32 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-2xl font-bold">{addon.name}</h3>
            {addon.description && (
              <p className="text-muted-foreground mt-2">{addon.description}</p>
            )}
          </div>
          
          <ROAMBadge variant={addon.is_active ? "success" : "secondary"}>
            {addon.is_active ? "Active" : "Inactive"}
          </ROAMBadge>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {new Date(addon.created_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(addon.created_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {new Date(addon.updated_at).toLocaleDateString()}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(addon.updated_at).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderOverview = () => {
    switch (type) {
      case "service":
        return renderServiceOverview(item as Service);
      case "category":
        return renderCategoryOverview(item as ServiceCategory);
      case "subcategory":
        return renderSubcategoryOverview(item as ServiceSubcategory);
      case "addon":
        return renderAddonOverview(item as ServiceAddon);
      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (type) {
      case "service":
        return "Service Details";
      case "category":
        return "Category Details";
      case "subcategory":
        return "Subcategory Details";
      case "addon":
        return "Add-on Details";
      default:
        return "Details";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{getModalTitle()}</DialogTitle>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit(item)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {type === "service" ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="pricing">Pricing & Availability</TabsTrigger>
              <TabsTrigger value="assignments">Provider Assignments</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="mt-6">
              {renderOverview()}
            </TabsContent>
            
            <TabsContent value="pricing" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pricing & Availability</CardTitle>
                  <CardDescription>
                    Pricing tiers and availability information for this service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Pricing and availability details would be loaded here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="assignments" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Provider Assignments</CardTitle>
                  <CardDescription>
                    Providers who offer this service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Provider assignment details would be loaded here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="mt-6">
            {renderOverview()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}