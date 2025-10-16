import { Car, Building, Video, ArrowLeftRight } from 'lucide-react';

/**
 * Delivery Type Helper Utilities
 * 
 * Database values: business_location, customer_location, virtual, both_locations
 * Display labels: Business, Mobile, Virtual, Both
 */

export type DeliveryType = 'business_location' | 'customer_location' | 'virtual' | 'both_locations';

/**
 * Get icon for delivery type
 */
export function getDeliveryTypeIcon(type: string | null) {
  switch (type) {
    case 'business_location':
      return <Building className="h-4 w-4" />;
    case 'customer_location':
      return <Car className="h-4 w-4" />;
    case 'virtual':
      return <Video className="h-4 w-4" />;
    case 'both_locations':
      return <ArrowLeftRight className="h-4 w-4" />;
    default:
      return <Car className="h-4 w-4" />;
  }
}

/**
 * Get display label for delivery type
 */
export function getDeliveryTypeLabel(type: string | null): string {
  switch (type) {
    case 'business_location':
      return 'Business';
    case 'customer_location':
      return 'Mobile';
    case 'virtual':
      return 'Virtual';
    case 'both_locations':
      return 'Both';
    default:
      return 'Mobile';
  }
}

/**
 * Get full description for delivery type
 */
export function getDeliveryTypeDescription(type: string | null): string {
  switch (type) {
    case 'business_location':
      return 'Service provided at business location';
    case 'customer_location':
      return 'Mobile service at customer location';
    case 'virtual':
      return 'Virtual service (online/remote)';
    case 'both_locations':
      return 'Service available at business or customer location';
    default:
      return 'Mobile service at customer location';
  }
}

/**
 * Delivery type options for select inputs
 */
export const DELIVERY_TYPE_OPTIONS = [
  {
    value: 'business_location',
    label: 'Business',
    description: 'Service at business location',
    icon: Building,
  },
  {
    value: 'customer_location',
    label: 'Mobile',
    description: 'Service at customer location',
    icon: Car,
  },
  {
    value: 'virtual',
    label: 'Virtual',
    description: 'Online/Remote service',
    icon: Video,
  },
  {
    value: 'both_locations',
    label: 'Both',
    description: 'Business or customer location',
    icon: ArrowLeftRight,
  },
] as const;
