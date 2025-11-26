import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Car, Building, Video, Users, Clock } from 'lucide-react';
import { EligibleService } from '@/types/services';

interface EditServiceModalProps {
  service: EligibleService;
  onSave: (data: {
    service_id: string;
    business_price: string;
    business_duration_minutes: string;
    delivery_type: string;
    is_active: boolean;
  }) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}

export function EditServiceModal({
  service,
  onSave,
  onClose,
  loading,
}: EditServiceModalProps) {
  const [businessPrice, setBusinessPrice] = useState<string>(
    service.business_price?.toString() || service.min_price.toString()
  );
  const [businessDurationMinutes, setBusinessDurationMinutes] = useState<string>(
    service.business_duration_minutes?.toString() || service.duration_minutes.toString()
  );
  const [deliveryType, setDeliveryType] = useState<string>(
    service.delivery_type || 'customer_location'
  );
  const [isActive, setIsActive] = useState<boolean>(
    service.business_is_active ?? false
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const price = parseFloat(businessPrice);
    if (isNaN(price) || price < service.min_price) {
      setError(`Price must be at least $${service.min_price}`);
      return;
    }

    const duration = parseInt(businessDurationMinutes);
    if (isNaN(duration) || duration <= 0) {
      setError('Duration must be a valid positive number');
      return;
    }

    try {
      setSaving(true);
      
      const formData = {
        service_id: service.id,
        business_price: businessPrice,
        business_duration_minutes: businessDurationMinutes,
        delivery_type: deliveryType,
        is_active: isActive,
      };
      
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const deliveryTypeOptions = [
    {
      value: 'customer_location',
      label: 'Customer Location',
      icon: <Car className="h-4 w-4" />,
      description: 'Service provided at customer\'s location',
    },
    {
      value: 'business_location',
      label: 'Business Location',
      icon: <Building className="h-4 w-4" />,
      description: 'Customer comes to your business',
    },
    {
      value: 'virtual',
      label: 'Virtual/Online',
      icon: <Video className="h-4 w-4" />,
      description: 'Service provided remotely',
    },
    {
      value: 'both_locations',
      label: 'Both Locations',
      icon: <Users className="h-4 w-4" />,
      description: 'Available at customer or business location',
    },
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {service.is_configured ? 'Edit Service' : 'Configure Service'}
          </DialogTitle>
          <DialogDescription>
            Set your price and delivery options for {service.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Service Info */}
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-start space-x-3">
                {service.image_url && (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-medium">{service.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {service.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      Base: ${service.min_price}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {service.duration_minutes} min
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Price */}
            <div className="space-y-2">
              <Label htmlFor="business_price">
                Your Price
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="business_price"
                  type="number"
                  step="0.01"
                  min={service.min_price}
                  value={businessPrice}
                  onChange={(e) => setBusinessPrice(e.target.value)}
                  className="pl-9"
                  placeholder={`Min: ${service.min_price}`}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum price: ${service.min_price}
              </p>
            </div>

            {/* Business Duration */}
            <div className="space-y-2">
              <Label htmlFor="business_duration">
                Duration (minutes)
                <span className="text-destructive ml-1">*</span>
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="business_duration"
                  type="number"
                  min="1"
                  value={businessDurationMinutes}
                  onChange={(e) => setBusinessDurationMinutes(e.target.value)}
                  className="pl-9"
                  placeholder={`Default: ${service.duration_minutes}`}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Platform default: {service.duration_minutes} minutes
              </p>
            </div>

            {/* Delivery Type */}
            <div className="space-y-2">
              <Label htmlFor="delivery_type">
                Delivery Type
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Select value={deliveryType} onValueChange={setDeliveryType}>
                <SelectTrigger id="delivery_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {deliveryTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {option.icon}
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Make this service available to customers
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
