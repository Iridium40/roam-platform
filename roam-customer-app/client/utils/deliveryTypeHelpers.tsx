import { MapPin, Home, Video, ArrowLeftRight } from 'lucide-react';

/**
 * Delivery Type Helper Utilities
 * 
 * Database values: business_location, customer_location, virtual, both_locations
 * Display labels: Business, Mobile, Virtual, Both
 */

export type DeliveryType = 'business_location' | 'customer_location' | 'virtual' | 'both_locations';

/**
 * Get icon component for delivery type
 * Returns the component itself, not JSX
 */
export function getDeliveryTypeIcon(type: string | null) {
  switch (type) {
    case 'business_location':
      return Home;
    case 'customer_location':
      return MapPin;
    case 'virtual':
      return Video;
    case 'both_locations':
      return ArrowLeftRight;
    default:
      return MapPin;
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
    icon: Home,
  },
  {
    value: 'customer_location',
    label: 'Mobile',
    description: 'Service at customer location',
    icon: MapPin,
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
