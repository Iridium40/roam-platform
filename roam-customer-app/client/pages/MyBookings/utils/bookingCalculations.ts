import type { BookingWithDetails } from "@/types/index";

export interface CancellationDetails {
  totalAmount: number;
  cancellationFee: number;
  refundAmount: number;
  isWithin24Hours: boolean;
  isPastBooking: boolean;
  hoursUntilBooking: number;
}

// Calculate cancellation fee and refund amount
export const calculateCancellationDetails = (booking: BookingWithDetails): CancellationDetails => {
  const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
  const now = new Date();
  const hoursUntilBooking =
    (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Extract total amount for calculations (remove $ and convert to number)
  const totalAmount = parseFloat(booking.price?.replace("$", "") || "0");
  
  // Calculate service amount and platform fee (20% of service amount)
  // totalAmount = serviceAmount + (serviceAmount * 0.2) = serviceAmount * 1.2
  // Therefore: serviceAmount = totalAmount / 1.2
  const platformFeePercentage = 0.2; // 20% platform fee
  const serviceAmount = totalAmount / (1 + platformFeePercentage);
  const platformFee = serviceAmount * platformFeePercentage;

  // Apply cancellation policy
  let cancellationFee = 0;
  let refundAmount = serviceAmount; // Default: refund service amount only (platform fee is non-refundable)
  let isWithin24Hours = false;
  let isPastBooking = false;

  // IMPORTANT: Only charge/refund if booking was confirmed by provider
  // If still pending, no payment has been charged yet, so no refund
  const isConfirmed = booking.booking_status === 'confirmed';

  if (!isConfirmed) {
    // Booking not confirmed yet - no payment charged, so no refund
    cancellationFee = 0;
    refundAmount = 0;
  } else if (hoursUntilBooking <= 0) {
    // Booking is in the past - no refund allowed, keep everything
    isPastBooking = true;
    cancellationFee = totalAmount;
    refundAmount = 0;
  } else if (hoursUntilBooking <= 24) {
    // Within 24 hours - no refund allowed, keep everything
    isWithin24Hours = true;
    cancellationFee = totalAmount;
    refundAmount = 0;
  } else {
    // More than 24 hours - refund service amount only, keep platform fee
    cancellationFee = platformFee;
    refundAmount = serviceAmount;
  }

  return {
    totalAmount,
    cancellationFee,
    refundAmount,
    isWithin24Hours,
    isPastBooking,
    hoursUntilBooking,
  };
};

// Format booking date for display
export const formatBookingDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

import { getDeliveryTypeLabel as getDeliveryLabel, getDeliveryTypeIcon as getDeliveryIcon } from '@/utils/deliveryTypeHelpers';

// Check if booking is within 24 hours
export const isWithin24Hours = (booking: BookingWithDetails) => {
  const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`);
  const now = new Date();
  const hoursUntilBooking =
    (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  return hoursUntilBooking <= 24 && hoursUntilBooking > 0;
};

// Get delivery type label (using centralized helper)
export const getDeliveryTypeLabel = (type: string) => {
  return getDeliveryLabel(type);
};

// Get delivery type icon (using centralized helper)
export const getDeliveryTypeIcon = (type: string) => {
  return getDeliveryIcon(type);
};
