import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Loader2, Clock, DollarSign } from 'lucide-react';
import { EligibleService, ServiceFormData } from '@/types/services';

interface AddServiceModalProps {
  eligibleServices: EligibleService[];
  onAddService: (serviceForm: ServiceFormData) => Promise<void>;
  loading: boolean;
}

export function AddServiceModal({
  eligibleServices,
  onAddService,
  loading,
}: AddServiceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    service_id: '',
    business_price: '',
    business_duration_minutes: '',
    delivery_type: 'customer_location',
    is_active: true,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!serviceForm.service_id) {
      newErrors.service_id = 'Please select a service';
    }

    if (!serviceForm.business_price) {
      newErrors.business_price = 'Please enter a price';
    } else {
      const price = parseFloat(serviceForm.business_price);
      if (isNaN(price) || price <= 0) {
        newErrors.business_price = 'Please enter a valid price';
      }
    }

    if (!serviceForm.business_duration_minutes) {
      newErrors.business_duration_minutes = 'Please enter a duration';
    } else {
      const duration = parseInt(serviceForm.business_duration_minutes);
      if (isNaN(duration) || duration <= 0) {
        newErrors.business_duration_minutes = 'Please enter a valid duration';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddService(serviceForm);
      // Reset form and close modal
      setServiceForm({
        service_id: '',
        business_price: '',
        business_duration_minutes: '',
        delivery_type: 'customer_location',
        is_active: true,
      });
      setErrors({});
      setIsOpen(false);
    } catch (error) {
      console.error('Error adding service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = eligibleServices.find(
    s => s.id === serviceForm.service_id
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Service</DialogTitle>
          <DialogDescription>
            Add a new service to offer to your customers. You can set your own pricing and delivery options.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-2">
            <Label htmlFor="service">Select Service *</Label>
            <Select
              value={serviceForm.service_id}
              onValueChange={(value) =>
                setServiceForm(prev => ({ ...prev, service_id: value }))
              }
            >
              <SelectTrigger id="service">
                <SelectValue placeholder="Choose a service to offer" />
              </SelectTrigger>
              <SelectContent>
                {eligibleServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    <div className="flex items-center space-x-2">
                      <span>{service.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {service.service_subcategories?.service_categories?.service_category_type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.service_id && (
              <p className="text-sm text-destructive">{errors.service_id}</p>
            )}
          </div>

          {/* Selected Service Details */}
          {selectedService && (
            <div className="p-4 border rounded-lg bg-muted/50">
              <div className="flex items-start space-x-4">
                {selectedService.image_url && (
                  <img
                    src={selectedService.image_url}
                    alt={selectedService.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{selectedService.name}</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedService.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Min: ${selectedService.min_price}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{selectedService.duration_minutes}m</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pricing */}
          <div className="space-y-2">
            <Label htmlFor="price">Your Price *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={serviceForm.business_price}
                onChange={(e) =>
                  setServiceForm(prev => ({ ...prev, business_price: e.target.value }))
                }
                className="pl-10"
              />
            </div>
            {errors.business_price && (
              <p className="text-sm text-destructive">{errors.business_price}</p>
            )}
            {selectedService && (
              <p className="text-sm text-muted-foreground">
                Recommended minimum: ${selectedService.min_price}
              </p>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes) *</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="duration"
                type="number"
                min="1"
                placeholder="60"
                value={serviceForm.business_duration_minutes}
                onChange={(e) =>
                  setServiceForm(prev => ({ ...prev, business_duration_minutes: e.target.value }))
                }
                className="pl-10"
              />
            </div>
            {errors.business_duration_minutes && (
              <p className="text-sm text-destructive">{errors.business_duration_minutes}</p>
            )}
            {selectedService && (
              <p className="text-sm text-muted-foreground">
                Platform default: {selectedService.duration_minutes} minutes
              </p>
            )}
          </div>

          {/* Delivery Type */}
          <div className="space-y-2">
            <Label htmlFor="delivery">Delivery Type</Label>
            <Select
              value={serviceForm.delivery_type}
              onValueChange={(value: 'customer_location' | 'business_location' | 'virtual' | 'both_locations') =>
                setServiceForm(prev => ({ ...prev, delivery_type: value }))
              }
            >
              <SelectTrigger id="delivery">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="business_location">Business</SelectItem>
                <SelectItem value="customer_location">Mobile</SelectItem>
                <SelectItem value="virtual">Virtual</SelectItem>
                <SelectItem value="both_locations">Both (Business or Mobile)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Status */}
          <div className="flex items-center space-x-2">
            <Switch
              id="active"
              checked={serviceForm.is_active}
              onCheckedChange={(checked) =>
                setServiceForm(prev => ({ ...prev, is_active: checked }))
              }
            />
            <Label htmlFor="active">Make service available immediately</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || loading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}