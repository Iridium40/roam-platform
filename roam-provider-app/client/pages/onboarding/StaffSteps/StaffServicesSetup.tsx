import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DollarSign, ArrowRight, Info, Loader2, Package, CheckCircle, Clock } from 'lucide-react';

interface InvitationData {
  businessId: string;
}

interface BusinessService {
  id: string;
  service_id: string;
  business_price: number;
  delivery_type: string;
  services?: {
    name: string;
    description: string;
    duration_minutes: number;
  };
}

interface BusinessAddon {
  id: string;
  addon_id: string;
  custom_price: number | null;
  addons?: {
    name: string;
    description: string;
  };
}

interface ServicesData {
  selectedServices: string[];
}

interface StaffServicesSetupProps {
  invitationData: InvitationData;
  initialData: Partial<ServicesData>;
  onComplete: (data: ServicesData) => void;
  onBack: () => void;
}

export default function StaffServicesSetup({
  invitationData,
  initialData,
  onComplete,
  onBack,
}: StaffServicesSetupProps) {
  const [loading, setLoading] = useState(true);
  const [businessServices, setBusinessServices] = useState<BusinessService[]>([]);
  const [businessAddons, setBusinessAddons] = useState<BusinessAddon[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>(initialData.selectedServices || []);

  useEffect(() => {
    loadBusinessServices();
  }, []);

  const loadBusinessServices = async () => {
    try {
      setLoading(true);

      // Use API endpoint instead of direct Supabase query for onboarding
      // This bypasses RLS issues during the invitation flow
      const response = await fetch(`/api/business-eligible-services?business_id=${invitationData.businessId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load business services');
      }

      const data = await response.json();
      
      // Filter for only configured/active services
      const configuredServices = (data.eligible_services || [])
        .filter((service: any) => service.is_configured && service.business_is_active)
        .map((service: any) => ({
          id: service.id,
          service_id: service.id,
          business_price: service.business_price,
          delivery_type: service.delivery_type,
          services: {
            name: service.name,
            description: service.description,
            duration_minutes: service.duration_minutes
          }
        }));

      // Map eligible addons to expected format
      const eligibleAddons = (data.eligible_addons || []).map((addon: any) => ({
        id: addon.id,
        addon_id: addon.id,
        custom_price: null,
        addons: {
          name: addon.name,
          description: addon.description
        }
      }));

      setBusinessServices(configuredServices);
      setBusinessAddons(eligibleAddons);
      
    } catch (error) {
      console.error('Error loading business services:', error);
      // Set empty arrays on error to allow continuing
      setBusinessServices([]);
      setBusinessAddons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      } else {
        return [...prev, serviceId];
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ selectedServices });
  };

  const getDeliveryTypeLabel = (type: string) => {
    switch (type) {
      case 'business_location': return 'At Business';
      case 'customer_location': return 'Mobile';
      case 'both_locations': return 'Both';
      case 'virtual': return 'Virtual';
      default: return type;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-green-600">
              Select Your Services
            </CardTitle>
            <p className="text-foreground/70">
              Choose which services you can provide
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              These are the services offered by your business. Select the ones you can provide.
              All pricing is inherited from business settings.
            </AlertDescription>
          </Alert>

          {/* Business Services */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Available Services</Label>
              <Badge variant="outline">
                {selectedServices.length} Selected
              </Badge>
            </div>

            {businessServices.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No services have been configured yet. Contact your business owner to add services.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {businessServices.map(service => {
                  const isSelected = selectedServices.includes(service.service_id);
                  return (
                    <Card
                      key={service.id}
                      className={`p-4 transition-colors ${
                        isSelected ? 'border-green-500 bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleServiceToggle(service.service_id)}
                          className="mt-1 cursor-pointer"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{service.services?.name}</h4>
                            {isSelected && (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                          </div>
                          
                          <p className="text-sm text-foreground/60 mb-3">
                            {service.services?.description}
                          </p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 font-medium text-green-700">
                              <DollarSign className="w-4 h-4" />
                              ${service.business_price}
                            </span>
                            
                            {service.services?.duration_minutes && (
                              <span className="flex items-center gap-1 text-foreground/60">
                                <Clock className="w-4 h-4" />
                                {service.services.duration_minutes} min
                              </span>
                            )}
                            
                            <Badge variant="outline" className="text-xs">
                              {getDeliveryTypeLabel(service.delivery_type)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Business Add-ons (informational) */}
          {businessAddons.length > 0 && (
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Available Add-ons</Label>
              <Alert className="border-gray-200">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  These add-ons are available with the services you provide. Pricing is managed by your business.
                </AlertDescription>
              </Alert>
              
              <div className="grid gap-3 md:grid-cols-2">
                {businessAddons.map(addon => (
                  <div
                    key={addon.id}
                    className="p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{addon.addons?.name}</span>
                      <span className="text-sm text-green-700 font-medium">
                        {addon.custom_price ? `$${addon.custom_price}` : 'Variable'}
                      </span>
                    </div>
                    {addon.addons?.description && (
                      <p className="text-xs text-foreground/60 mt-1">
                        {addon.addons.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription className="text-sm">
              You can update your service offerings anytime from your dashboard.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
            >
              Back
            </Button>
            
            <Button
              type="submit"
              className="bg-roam-blue hover:bg-roam-blue/90"
              disabled={selectedServices.length === 0}
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

