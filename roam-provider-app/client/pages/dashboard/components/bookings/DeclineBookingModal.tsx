import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, XCircle } from "lucide-react";

interface DeclineBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  bookingDetails?: {
    serviceName?: string;
    customerName?: string;
    bookingDate?: string;
  };
}

const DECLINE_REASONS = [
  "I'm unavailable at the requested time",
  "I'm not available in the requested location",
  "The service requested is outside my expertise",
  "I'm fully booked for this period",
  "Other (please specify)",
];

export default function DeclineBookingModal({
  isOpen,
  onClose,
  onConfirm,
  bookingDetails,
}: DeclineBookingModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    const finalReason = selectedReason === "Other (please specify)" 
      ? customReason 
      : selectedReason;

    if (!finalReason.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(finalReason);
      // Reset state after successful decline
      setSelectedReason("");
      setCustomReason("");
      onClose();
    } catch (error) {
      console.error("Error declining booking:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSelectedReason("");
      setCustomReason("");
      onClose();
    }
  };

  const isOtherSelected = selectedReason === "Other (please specify)";
  const isConfirmDisabled = 
    isSubmitting || 
    !selectedReason || 
    (isOtherSelected && !customReason.trim());

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="w-5 h-5" />
            Decline Booking
          </DialogTitle>
          <DialogDescription>
            {bookingDetails?.serviceName && (
              <span className="block mt-2">
                <strong>Service:</strong> {bookingDetails.serviceName}
                {bookingDetails.customerName && (
                  <> for {bookingDetails.customerName}</>
                )}
                {bookingDetails.bookingDate && (
                  <> on {bookingDetails.bookingDate}</>
                )}
              </span>
            )}
            <span className="block mt-2">
              Please select a reason for declining this booking. The customer will be notified via email.
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Reason for declining <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={selectedReason}
              onValueChange={setSelectedReason}
              className="space-y-2"
            >
              {DECLINE_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-3">
                  <RadioGroupItem value={reason} id={reason} />
                  <Label 
                    htmlFor={reason} 
                    className="text-sm font-normal cursor-pointer"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {isOtherSelected && (
            <div className="space-y-2">
              <Label htmlFor="customReason" className="text-sm font-medium">
                Please specify <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="customReason"
                placeholder="Enter your reason for declining..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                rows={3}
                disabled={isSubmitting}
                className="resize-none"
              />
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
            <p className="text-yellow-800">
              <strong>Note:</strong> The customer will receive an email notification with your reason for declining.
              They will be encouraged to book with another provider.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Declining...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Decline Booking
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

