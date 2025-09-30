import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

// Types
interface Review {
  id: string;
  booking_id: string;
  overall_rating: number;
  review_text?: string;
  is_approved: boolean;
  is_featured: boolean;
  moderation_notes?: string;
  created_at: string;
  bookings?: {
    id: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
    };
    providers?: {
      id: string;
      first_name: string;
      last_name: string;
      business_profiles?: {
        id: string;
        business_name: string;
      };
    };
    services?: {
      id: string;
      name: string;
    };
  };
}

interface ReviewModerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  review: Review | null;
  onSaveModerationNotes: (notes: string) => Promise<void>;
  getCustomerName: (review: Review) => string;
  getServiceName: (review: Review) => string;
  getBusinessName: (review: Review) => string;
}

export function ReviewModerationPanel({
  isOpen,
  onClose,
  review,
  onSaveModerationNotes,
  getCustomerName,
  getServiceName,
  getBusinessName,
}: ReviewModerationPanelProps) {
  const [moderationNotes, setModerationNotes] = useState("");

  // Update notes when review changes
  React.useEffect(() => {
    if (review) {
      setModerationNotes(review.moderation_notes || "");
    }
  }, [review]);

  const handleSave = async () => {
    await onSaveModerationNotes(moderationNotes);
    onClose();
  };

  const handleCancel = () => {
    setModerationNotes(review?.moderation_notes || "");
    onClose();
  };

  if (!review) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-6 h-6 text-roam-blue" />
            Moderation Notes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Review Summary */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm">
              <div className="font-medium mb-1">
                Review by {getCustomerName(review)}
              </div>
              <div className="text-muted-foreground">
                {getServiceName(review)} at {getBusinessName(review)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Rating: {review.overall_rating}/5 stars
              </div>
            </div>
          </div>

          {/* Review Text (if available) */}
          {review.review_text && (
            <div className="p-3 bg-muted/20 rounded-lg border-l-2 border-roam-blue">
              <div className="text-xs text-muted-foreground mb-1">Customer Review:</div>
              <div className="text-sm italic">
                "{review.review_text.substring(0, 200)}
                {review.review_text.length > 200 && "..."}"
              </div>
            </div>
          )}

          {/* Moderation Notes Input */}
          <div>
            <Label htmlFor="moderation_notes">Moderation Notes</Label>
            <Textarea
              id="moderation_notes"
              value={moderationNotes}
              onChange={(e) => setModerationNotes(e.target.value)}
              placeholder="Add notes about this review's moderation status, quality, or any concerns..."
              className="mt-1"
              rows={4}
            />
            <div className="text-xs text-muted-foreground mt-1">
              These notes are only visible to admin moderators
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}