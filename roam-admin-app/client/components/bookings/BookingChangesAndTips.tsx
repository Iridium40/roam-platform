import React from 'react';
import {
  ROAMCard,
  ROAMCardHeader,
  ROAMCardTitle,
  ROAMCardContent,
} from "@/components/ui/roam-card";
import { ROAMBadge } from "@/components/ui/roam-badge";
import {
  Heart,
  Clock,
  DollarSign,
  User,
  Calendar,
  CreditCard,
  Star,
} from "lucide-react";

// Types
type ChangeType = "reschedule" | "cancellation" | "modification" | "add_on" | "refund";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
type PayoutStatus = "pending" | "processing" | "paid" | "failed";
type TipStatus = "none" | "pending" | "completed" | "declined";

interface BookingChange {
  id: string;
  booking_id: string;
  change_type: ChangeType;
  changed_by_name: string;
  change_reason?: string;
  additional_cost: number;
  refund_amount: number;
  created_at: string;
}

interface BookingTip {
  id: string;
  booking_id: string;
  tip_amount: number;
  service_rating: number;
  customer_comment?: string;
  payment_status: PaymentStatus;
  payout_status: PayoutStatus;
  tip_given_at: string;
}

interface Booking {
  id: string;
  tip_status: TipStatus;
  tip_deadline?: string;
}

interface BookingChangesAndTipsProps {
  booking: Booking;
  bookingChanges: BookingChange[];
  bookingTips: BookingTip[];
  formatDateTime: (dateTime: string) => string;
  formatPrice: (amount: number) => string;
  formatEnumDisplay: (value: string) => string;
  getChangeTypeVariant: (type: ChangeType) => "default" | "secondary" | "success" | "warning" | "danger" | "neutral" | "outline";
}

export function BookingChangesAndTips({
  booking,
  bookingChanges,
  bookingTips,
  formatDateTime,
  formatPrice,
  formatEnumDisplay,
  getChangeTypeVariant,
}: BookingChangesAndTipsProps) {
  
  const relatedChanges = bookingChanges.filter(
    (change) => change.booking_id === booking.id
  );

  const relatedTips = bookingTips.filter(
    (tip) => tip.booking_id === booking.id
  );

  const renderTipContent = () => {
    if (relatedTips.length > 0) {
      const bookingTip = relatedTips[0];
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-600 fill-pink-600" />
              <span className="font-semibold text-lg text-roam-success">
                {formatPrice(bookingTip.tip_amount)}
              </span>
            </div>
            <ROAMBadge variant="success" size="sm">
              Tip Received
            </ROAMBadge>
          </div>

          {bookingTip.service_rating > 0 && (
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">
                {bookingTip.service_rating}/5 stars
              </span>
            </div>
          )}

          {bookingTip.customer_comment && (
            <div className="bg-muted/30 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Customer Comment:</div>
              <p className="text-sm text-muted-foreground">
                "{bookingTip.customer_comment}"
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium">Payment Status</div>
              <ROAMBadge
                variant="success"
                size="sm"
                className="mt-1"
              >
                {formatEnumDisplay(bookingTip.payment_status)}
              </ROAMBadge>
            </div>
            <div>
              <div className="font-medium">Payout Status</div>
              <ROAMBadge
                variant={
                  bookingTip.payout_status === "paid"
                    ? "success"
                    : "warning"
                }
                size="sm"
                className="mt-1"
              >
                {formatEnumDisplay(bookingTip.payout_status)}
              </ROAMBadge>
            </div>
          </div>

          <div className="text-xs text-muted-foreground border-t pt-2">
            Tip given on {formatDateTime(bookingTip.tip_given_at)}
          </div>
        </div>
      );
    } else if (booking.tip_status === "pending") {
      return (
        <div className="text-center py-6">
          <Heart className="w-12 h-12 text-roam-warning mx-auto mb-3" />
          <h4 className="font-medium mb-2">Tip Request Pending</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Customer has been invited to leave a tip for this completed service.
          </p>
          {booking.tip_deadline && (
            <div className="text-xs text-muted-foreground">
              Tip window expires: {formatDateTime(booking.tip_deadline)}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-center py-6">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            This booking is eligible for tips once completed.
          </p>
        </div>
      );
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Booking Changes */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4 text-roam-blue" />
            Booking Changes
          </ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          <div className="space-y-3">
            {relatedChanges.length > 0 ? (
              relatedChanges.map((change) => (
                <div
                  key={change.id}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <ROAMBadge
                      variant={getChangeTypeVariant(change.change_type)}
                      size="sm"
                    >
                      {formatEnumDisplay(change.change_type)}
                    </ROAMBadge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(change.created_at)}
                    </span>
                  </div>

                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>By: {change.changed_by_name}</span>
                    </div>
                    {change.change_reason && (
                      <div className="text-muted-foreground mt-1">
                        {change.change_reason}
                      </div>
                    )}
                  </div>

                  {(change.additional_cost > 0 || change.refund_amount > 0) && (
                    <div className="flex gap-2 text-sm border-t pt-2">
                      {change.additional_cost > 0 && (
                        <div className="flex items-center gap-1 text-roam-success">
                          <DollarSign className="w-3 h-3" />
                          <span>+{formatPrice(change.additional_cost)}</span>
                        </div>
                      )}
                      {change.refund_amount > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <CreditCard className="w-3 h-3" />
                          <span>-{formatPrice(change.refund_amount)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No changes made to this booking</p>
              </div>
            )}
          </div>
        </ROAMCardContent>
      </ROAMCard>

      {/* Tips Information */}
      <ROAMCard>
        <ROAMCardHeader>
          <ROAMCardTitle className="text-base flex items-center gap-2">
            <Heart className="w-4 h-4 text-pink-600" />
            Tips & Feedback
          </ROAMCardTitle>
        </ROAMCardHeader>
        <ROAMCardContent>
          {renderTipContent()}
        </ROAMCardContent>
      </ROAMCard>
    </div>
  );
}