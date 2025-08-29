import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, DollarSign, MessageCircle, X, CheckCircle, Loader2 } from "lucide-react";
import type { BookingWithDetails, ReviewFormData, TipFormData } from "@/types/index";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ReviewAndTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
}

const ReviewAndTipModal: React.FC<ReviewAndTipModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'review' | 'tip' | 'success' | 'view'>('review');
  
  // Review form state
  const [reviewData, setReviewData] = useState<ReviewFormData>({
    overall_rating: 0,
    service_rating: 0,
    communication_rating: 0,
    punctuality_rating: 0,
    review_text: '',
  });

  // Tip form state
  const [tipData, setTipData] = useState<TipFormData>({
    tip_amount: 0,
    tip_percentage: 0,
    customer_message: '',
  });

  // Check if review and tip already exist
  const existingReview = booking?.reviews && booking.reviews.length > 0 ? booking.reviews[0] : null;
  const existingTip = booking?.tips && booking.tips.length > 0 ? booking.tips[0] : null;
  const hasSubmittedReview = !!existingReview;
  const hasSubmittedTip = !!existingTip;

  // Tip amount options (percentage-based)
  const tipOptions = [
    { amount: 5, percentage: 5 },
    { amount: 10, percentage: 10 },
    { amount: 15, percentage: 15 },
    { amount: 20, percentage: 20 },
    { amount: 25, percentage: 25 },
  ];

  // Calculate tip amounts based on booking total
  const calculatedTipAmounts = tipOptions.map(option => ({
    ...option,
    amount: Math.round((booking?.total_amount || 0) * (option.percentage / 100) * 100) / 100
  }));

  // Preset dollar amount options
  const presetTipAmounts = [
    { amount: 20, label: '$20' },
    { amount: 40, label: '$40' },
    { amount: 60, label: '$60' },
  ];

  const handleReviewChange = (field: keyof ReviewFormData, value: number | string) => {
    setReviewData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTipChange = (field: keyof TipFormData, value: number | string) => {
    setTipData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTipOptionSelect = (amount: number, percentage: number) => {
    setTipData(prev => ({
      ...prev,
      tip_amount: amount,
      tip_percentage: percentage
    }));
  };

  const handlePresetTipSelect = (amount: number) => {
    const percentage = booking?.total_amount ? Math.round((amount / booking.total_amount) * 100) : 0;
    setTipData(prev => ({
      ...prev,
      tip_amount: amount,
      tip_percentage: percentage
    }));
  };

  const handleCustomTipChange = (amount: string) => {
    const numAmount = parseFloat(amount) || 0;
    const percentage = booking?.total_amount ? Math.round((numAmount / booking.total_amount) * 100) : 0;
    
    setTipData(prev => ({
      ...prev,
      tip_amount: numAmount,
      tip_percentage: percentage
    }));
  };

  // Set initial step based on existing review/tip
  useEffect(() => {
    if (hasSubmittedReview) {
      setCurrentStep('view');
    } else {
      setCurrentStep('review');
    }
  }, [hasSubmittedReview]);

  const submitReview = async () => {
    if (!booking) return;

    try {
      // First, check if a review already exists for this booking
      const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('booking_id', booking.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected if no review exists
        throw checkError;
      }

      if (existingReview) {
        // Review already exists, show appropriate message
        toast({
          title: "Review already submitted",
          description: "You have already submitted a review for this booking.",
          variant: "destructive",
        });
        throw new Error('Review already exists for this booking');
      }

      // No existing review, proceed with insertion
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          overall_rating: reviewData.overall_rating,
          service_rating: reviewData.service_rating,
          communication_rating: reviewData.communication_rating,
          punctuality_rating: reviewData.punctuality_rating,
          review_text: reviewData.review_text,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Review submitted successfully!",
        description: "Thank you for your feedback.",
      });

      return data;
    } catch (error) {
      console.error('Error submitting review:', error);
      
      // Don't show generic error toast if it's already handled above
      if (error instanceof Error && error.message === 'Review already exists for this booking') {
        throw error;
      }
      
      toast({
        title: "Error submitting review",
        description: "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const submitTip = async () => {
    if (!booking || !booking.providers || tipData.tip_amount <= 0) return;

    try {
      // For now, just insert the tip record without payment processing
      const { data, error } = await supabase
        .from('tips')
        .insert({
          booking_id: booking.id,
          customer_id: booking.customer_id,
          provider_id: booking.providers.id,
          business_id: booking.business_id,
          tip_amount: tipData.tip_amount,
          tip_percentage: tipData.tip_percentage,
          payment_status: 'pending',
          platform_fee_amount: Math.round(tipData.tip_amount * 0.10 * 100) / 100, // 10% platform fee
          provider_net_amount: Math.round(tipData.tip_amount * 0.90 * 100) / 100, // 90% to provider
          customer_message: tipData.customer_message,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Tip submitted successfully!",
        description: "Payment processing will be implemented soon.",
      });

      return data;
    } catch (error) {
      console.error('Error submitting tip:', error);
      toast({
        title: "Error processing tip",
        description: "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (!booking) return;

    setIsSubmitting(true);
    try {
      // Submit review first
      await submitReview();

      // If there's a tip, proceed to tip step
      if (tipData.tip_amount > 0) {
        setCurrentStep('tip');
      } else {
        setCurrentStep('success');
      }
    } catch (error) {
      console.error('Error in submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTipSubmit = async () => {
    setIsSubmitting(true);
    try {
      await submitTip();
      setCurrentStep('success');
    } catch (error) {
      console.error('Error submitting tip:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipTip = () => {
    setCurrentStep('success');
  };

  const handleClose = () => {
    setCurrentStep('review');
    setReviewData({
      overall_rating: 0,
      service_rating: 0,
      communication_rating: 0,
      punctuality_rating: 0,
      review_text: '',
    });
    setTipData({
      tip_amount: 0,
      tip_percentage: 0,
      customer_message: '',
    });
    onClose();
  };

  if (!isOpen || !booking) return null;

  const renderStars = (rating: number, onRatingChange: (rating: number) => void, label: string) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">
            {currentStep === 'review' && 'Leave a Review'}
            {currentStep === 'tip' && 'Send a Tip'}
            {currentStep === 'success' && 'Thank You!'}
            {currentStep === 'view' && 'Your Submitted Review & Tip'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Booking Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{booking.service_name}</h3>
            <p className="text-sm text-gray-600">
              with {booking.providers?.first_name} {booking.providers?.last_name}
            </p>
            <p className="text-sm text-gray-600">
              {new Date(booking.date).toLocaleDateString()} at {booking.time}
            </p>
          </div>

          {/* Review Step */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="space-y-4">
                {renderStars(
                  reviewData.overall_rating,
                  (rating) => handleReviewChange('overall_rating', rating),
                  'Overall Experience *'
                )}
                
                {renderStars(
                  reviewData.service_rating || 0,
                  (rating) => handleReviewChange('service_rating', rating),
                  'Service Quality'
                )}
                
                {renderStars(
                  reviewData.communication_rating || 0,
                  (rating) => handleReviewChange('communication_rating', rating),
                  'Communication'
                )}
                
                {renderStars(
                  reviewData.punctuality_rating || 0,
                  (rating) => handleReviewChange('punctuality_rating', rating),
                  'Punctuality'
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="review-text" className="text-sm font-medium">
                  Additional Comments
                </Label>
                <Textarea
                  id="review-text"
                  placeholder="Share your experience with this provider..."
                  value={reviewData.review_text}
                  onChange={(e) => handleReviewChange('review_text', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || reviewData.overall_rating === 0}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Submit Review
                </Button>
              </div>
            </div>
          )}

          {/* Tip Step */}
          {currentStep === 'tip' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Show Your Appreciation</h3>
                <p className="text-gray-600">
                  Send a tip to {booking.providers?.first_name} for their excellent service
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-3 block">Preset Tip Amounts</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {presetTipAmounts.map((option) => (
                      <button
                        key={option.amount}
                        type="button"
                        onClick={() => handlePresetTipSelect(option.amount)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          tipData.tip_amount === option.amount
                            ? 'border-roam-blue bg-roam-blue/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg font-semibold">{option.label}</div>
                        <div className="text-sm text-gray-600">Fixed amount</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">Percentage-Based Tips</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {calculatedTipAmounts.map((option) => (
                      <button
                        key={option.percentage}
                        type="button"
                        onClick={() => handleTipOptionSelect(option.amount, option.percentage)}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          tipData.tip_amount === option.amount
                            ? 'border-roam-blue bg-roam-blue/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg font-semibold">${option.amount}</div>
                        <div className="text-sm text-gray-600">{option.percentage}%</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom-tip" className="text-sm font-medium">
                    Custom Amount
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="custom-tip"
                      type="number"
                      placeholder="0.00"
                      value={tipData.tip_amount || ''}
                      onChange={(e) => handleCustomTipChange(e.target.value)}
                      className="pl-10"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tip-message" className="text-sm font-medium">
                    Message (Optional)
                  </Label>
                  <Textarea
                    id="tip-message"
                    placeholder="Add a personal message..."
                    value={tipData.customer_message}
                    onChange={(e) => handleTipChange('customer_message', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleSkipTip}
                  className="flex-1"
                >
                  Skip Tip
                </Button>
                <Button
                  onClick={handleTipSubmit}
                  disabled={isSubmitting || tipData.tip_amount <= 0}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Send ${tipData.tip_amount} Tip
                </Button>
              </div>
            </div>
          )}

          {/* Success Step */}
          {currentStep === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h3 className="text-xl font-semibold">Thank You!</h3>
              <p className="text-gray-600">
                Your review has been submitted successfully.
                {tipData.tip_amount > 0 && ' Your tip is being processed.'}
              </p>
              <Button onClick={handleClose} className="mt-4">
                Close
              </Button>
            </div>
          )}

          {/* View Submitted Review & Tip Step */}
          {currentStep === 'view' && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Your Submitted Review & Tip</h3>
                <p className="text-gray-600">
                  You have already submitted feedback for this booking
                </p>
              </div>

              {/* Review Display */}
              {existingReview && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h4 className="font-semibold text-gray-900">Your Review</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Overall Experience:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= existingReview.overall_rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-600 ml-2">
                          {existingReview.overall_rating}/5
                        </span>
                      </div>
                    </div>

                    {existingReview.service_rating && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Service Quality:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= existingReview.service_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">
                            {existingReview.service_rating}/5
                          </span>
                        </div>
                      </div>
                    )}

                    {existingReview.communication_rating && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Communication:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= existingReview.communication_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">
                            {existingReview.communication_rating}/5
                          </span>
                        </div>
                      </div>
                    )}

                    {existingReview.punctuality_rating && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Punctuality:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= existingReview.punctuality_rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-600 ml-2">
                            {existingReview.punctuality_rating}/5
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {existingReview.review_text && (
                    <div className="mt-4">
                      <span className="text-sm font-medium block mb-2">Your Comments:</span>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                        {existingReview.review_text}
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    Submitted on {new Date(existingReview.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {/* Tip Display */}
              {existingTip && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Your Tip</h4>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Tip Amount:</span>
                    <span className="text-lg font-semibold text-green-600">
                      ${existingTip.tip_amount}
                    </span>
                  </div>

                  {existingTip.tip_percentage && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Percentage of Booking:</span>
                      <span className="text-sm text-gray-600">
                        {existingTip.tip_percentage}%
                      </span>
                    </div>
                  )}

                  {existingTip.customer_message && (
                    <div className="mt-3">
                      <span className="text-sm font-medium block mb-2">Your Message:</span>
                      <p className="text-sm text-gray-700 bg-white p-3 rounded border">
                        {existingTip.customer_message}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Payment Status:</span>
                    <span className={`text-sm px-2 py-1 rounded ${
                      existingTip.payment_status === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {existingTip.payment_status === 'paid' ? 'Paid' : 'Pending'}
                    </span>
                  </div>

                  <div className="text-xs text-gray-500">
                    Submitted on {new Date(existingTip.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewAndTipModal;
