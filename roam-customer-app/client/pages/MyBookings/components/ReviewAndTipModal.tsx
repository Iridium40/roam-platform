import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Star, DollarSign, MessageCircle, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import type { BookingWithDetails, ReviewFormData, TipFormData } from "@/types/index";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { TipCheckoutForm } from '@/components/TipCheckoutForm';

interface ReviewAndTipModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithDetails | null;
  initialStep?: 'review' | 'tip';
}

// Initialize Stripe only if publishable key is available
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const ReviewAndTipModal: React.FC<ReviewAndTipModalProps> = ({
  isOpen,
  onClose,
  booking,
  initialStep = 'review',
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<'review' | 'tip' | 'checkout' | 'success' | 'view'>('review');
  
  // Tip checkout state
  const [clientSecret, setClientSecret] = useState<string>('');
  const [tipCheckoutLoading, setTipCheckoutLoading] = useState(false);
  
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
  const [customTipAmount, setCustomTipAmount] = useState<string>('');

  // Check if review and tip already exist
  // Handle both array and single object cases for reviews
  const existingReview = booking?.reviews 
    ? (Array.isArray(booking.reviews) && booking.reviews.length > 0 
        ? booking.reviews[0] 
        : !Array.isArray(booking.reviews) 
          ? booking.reviews 
          : null)
    : null;
    
  const existingTip = booking?.tips && booking.tips.length > 0 ? booking.tips[0] : null;
  const hasSubmittedReview = !!existingReview;
  const hasSubmittedTip = !!existingTip;

  // Debug logging to understand the data
  logger.debug('REVIEW MODAL DEBUG:', {
    bookingId: booking?.id,
    bookingReviews: booking?.reviews,
    isReviewsArray: Array.isArray(booking?.reviews),
    reviewsLength: booking?.reviews?.length,
    existingReview,
    hasSubmittedReview,
    bookingTips: booking?.tips,
    tipsLength: booking?.tips?.length,
    existingTip,
    hasSubmittedTip
  });

  // Quick pick tip amounts
  const quickPickAmounts = [20, 40];

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

  // Reset loading states when modal opens/closes to prevent stuck states
  useEffect(() => {
    if (isOpen) {
      // Reset loading states when modal opens
      setTipCheckoutLoading(false);
      setIsSubmitting(false);
      setClientSecret('');
      console.log('🔄 Modal opened - reset loading states');
    }
  }, [isOpen]);

  // Set initial step based on existing review/tip or initialStep prop
  useEffect(() => {
    if (!isOpen) return; // Only set step when modal opens
    
    // If user specifically wants to tip (initialStep="tip"), show tip step
    if (initialStep === 'tip') {
      setCurrentStep('tip');
    } else if (hasSubmittedReview) {
      setCurrentStep('view');
    } else {
      setCurrentStep(initialStep);
    }
  }, [isOpen, hasSubmittedReview, initialStep]);

  const submitReview = async () => {
    if (!booking) return;

    try {
      // If the booking data already shows there are reviews, don't proceed
      if (hasSubmittedReview) {
        logger.debug('SUBMIT REVIEW DEBUG: Booking data shows review already exists, not proceeding');
        toast({
          title: "Review already submitted",
          description: "You have already submitted a review for this booking.",
          variant: "destructive",
        });
        throw new Error('Review already exists for this booking');
      }

      logger.debug('Submitting review via API for booking:', booking.id);

      // Submit review via API endpoint (avoids RLS issues)
      const apiBaseUrl = import.meta.env.VITE_API_URL || '';
      
      // Add timeout to prevent infinite spinning
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Review submission timeout - please try again')), 15000);
      });

      const submitPromise = fetch(`${apiBaseUrl}/api/reviews/submit-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: booking.id,
          overall_rating: reviewData.overall_rating,
          service_rating: reviewData.service_rating,
          communication_rating: reviewData.communication_rating,
          punctuality_rating: reviewData.punctuality_rating,
          review_text: reviewData.review_text,
          business_id: booking.business_id || null,
          provider_id: booking.providers?.id || booking.provider_id || null,
        }),
      });

      const response = await Promise.race([submitPromise, timeoutPromise]) as Response;

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle duplicate review error specifically
        if (response.status === 409) {
          toast({
            title: "Review already submitted",
            description: "You have already submitted a review for this booking.",
            variant: "destructive",
          });
          throw new Error('Review already exists for this booking');
        }
        
        throw new Error(errorData.error || 'Failed to submit review');
      }

      const data = await response.json();

      toast({
        title: "Review submitted successfully!",
        description: "Thank you for your feedback.",
      });

      return data.review;
    } catch (error) {
      logger.error('Error submitting review:', error);
      
      // Don't show generic error toast if it's already handled above
      if (error instanceof Error && error.message === 'Review already exists for this booking') {
        throw error;
      }
      
      toast({
        title: "Error submitting review",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTipSubmit = async () => {
    if (!booking || !booking.providers || tipData.tip_amount < 1) {
      console.error('TIP VALIDATION FAILED:', {
        hasBooking: !!booking,
        hasProvider: !!booking?.providers,
        tipAmount: tipData.tip_amount
      });
      toast({
        title: "Cannot process tip",
        description: "Missing required booking information",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!booking.customer_id || !booking.business_id) {
      console.error('TIP VALIDATION FAILED - Missing IDs:', {
        customerId: booking.customer_id,
        businessId: booking.business_id,
        providerId: booking.providers.id
      });
      toast({
        title: "Cannot process tip",
        description: "Missing required customer or business information",
        variant: "destructive",
      });
      return;
    }

    setTipCheckoutLoading(true);
    try {
      console.log('TIP SUBMISSION STARTED:', {
        bookingId: booking.id,
        customerId: booking.customer_id,
        providerId: booking.providers.id,
        businessId: booking.business_id,
        tipAmount: tipData.tip_amount
      });

      // Get auth headers - try multiple methods for Vercel compatibility
      let token: string | null = null;
      
      console.log('🔐 Getting auth token...');
      
      // Method 1: Try getting fresh session with timeout
      try {
        console.log('🔐 Attempting supabase.auth.getSession()...');
        
        // Add timeout to prevent hanging
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        );
        
        const { data: { session }, error: sessionError } = await Promise.race([
          sessionPromise, 
          timeoutPromise
        ]) as any;
        
        console.log('🔐 getSession result:', { hasSession: !!session, error: sessionError?.message });
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          logger.warn('Session retrieval failed, attempting refresh:', sessionError);
          
          // Try to refresh the session
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Token refresh failed:', refreshError);
            throw new Error('Your session has expired. Please sign in again.');
          }
          
          if (refreshedSession?.access_token) {
            token = refreshedSession.access_token;
            localStorage.setItem('roam_access_token', token);
            console.log('Token refreshed successfully');
            logger.debug('Using refreshed token for tip');
          }
        } else if (session?.access_token) {
          token = session.access_token;
          // Update localStorage with fresh token
          localStorage.setItem('roam_access_token', token);
          console.log('🔐 Got token from session');
          logger.debug('Using session token for tip');
        }
      } catch (error: any) {
        console.error('🔐 Auth error:', error?.message || error);
        logger.warn('Session retrieval failed for tip, trying localStorage:', error);
      }
      
      // Method 2: Fallback to localStorage cached token (may be expired)
      if (!token) {
        console.log('🔐 Trying localStorage fallback...');
        token = localStorage.getItem('roam_access_token');
        if (token) {
          console.log('🔐 Got token from localStorage');
          logger.debug('Using cached token for tip (may be expired)');
        }
      }
      
      // Method 3: If still no token, user needs to sign in
      if (!token) {
        console.error('🔐 No token available');
        throw new Error('You are not signed in. Please sign in and try again.');
      }
      
      console.log('🔐 Token acquired, proceeding with API call...');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Create Payment Intent for tip
      console.log('🚀 SENDING TIP REQUEST TO API...');
      const requestBody = {
        tip_amount: tipData.tip_amount,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        provider_id: booking.providers.id,
        business_id: booking.business_id,
        customer_message: tipData.customer_message,
      };
      console.log('Request body:', requestBody);
      
      // Add timeout to prevent infinite spinning
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error('❌ TIP REQUEST TIMEOUT after 30 seconds');
        controller.abort();
      }, 30000);
      
      let response: Response;
      try {
        response = await fetch('/api/stripe/create-tip-payment-intent', {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      console.log('📥 TIP API RESPONSE RECEIVED:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        logger.error('Tip payment intent creation failed:', errorData);
        console.error('TIP ERROR:', errorData); // Make error visible in console
        throw new Error(errorData.details || errorData.error || `Failed to create payment intent (${response.status})`);
      }

      const data = await response.json();
      logger.debug('Tip payment intent created successfully:', data);
      console.log('TIP SUCCESS:', data); // Make success visible in console
      
      if (!data.clientSecret) {
        console.error('TIP ERROR: No client secret in response:', data);
        throw new Error('No client secret received from server');
      }
      
      setClientSecret(data.clientSecret);
      setCurrentStep('checkout');
    } catch (error: any) {
      logger.error('Error creating tip payment intent:', error);
      console.error('TIP EXCEPTION:', error); // Make exception visible in console
      
      // Handle specific error types
      let errorMessage = 'Failed to process tip. Please try again.';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error processing tip",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      console.log('🏁 TIP SUBMIT FINALLY BLOCK - Setting loading to false');
      setTipCheckoutLoading(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (!booking) return;

    setIsSubmitting(true);
    try {
      await submitReview();
      setCurrentStep('success');
    } catch (error) {
      logger.error('Error in submission:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTipSubmitClick = async () => {
    console.log('🎯 TIP SUBMIT BUTTON CLICKED');
    console.log('Current tip data:', tipData);
    console.log('Booking data:', { id: booking?.id, customer_id: booking?.customer_id, business_id: booking?.business_id });
    await handleTipSubmit();
    console.log('🎯 TIP SUBMIT COMPLETED');
  };

  const handleTipCheckoutSuccess = () => {
    setCurrentStep('success');
    toast({
      title: "Tip sent successfully!",
      description: "Thank you for your generosity.",
    });
  };

  const handleTipCheckoutError = (error: string) => {
    toast({
      title: "Tip payment failed",
      description: error,
      variant: "destructive",
    });
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
              {booking.date} at {booking.time}
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
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Button
                  onClick={handleReviewSubmit}
                  disabled={isSubmitting || reviewData.overall_rating === 0}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Submit
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

              {/* Booking Total Display */}
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Service Total:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ${booking?.total_amount?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Quick Pick Buttons */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">Quick Pick</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {quickPickAmounts.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setTipData(prev => ({ ...prev, tip_amount: amount }));
                          setCustomTipAmount('');
                        }}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          tipData.tip_amount === amount
                            ? 'border-roam-blue bg-roam-blue/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="text-lg font-semibold">${amount}</div>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setTipData(prev => ({ ...prev, tip_amount: 0 }));
                        setCustomTipAmount('');
                      }}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        tipData.tip_amount === 0 && customTipAmount === ''
                          ? 'border-roam-blue bg-roam-blue/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-lg font-semibold">Custom</div>
                    </button>
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div className="space-y-2">
                  <Label htmlFor="custom-tip" className="text-sm font-medium">
                    Custom Amount (Minimum $1.00)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="custom-tip"
                      type="number"
                      placeholder="1.00"
                      value={customTipAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomTipAmount(value);
                        const numValue = parseFloat(value) || 0;
                        setTipData(prev => ({ ...prev, tip_amount: numValue }));
                      }}
                      className="pl-10"
                      min="1"
                      step="0.01"
                    />
                  </div>
                  {tipData.tip_amount > 0 && tipData.tip_amount < 1 && (
                    <p className="text-sm text-red-600">Minimum tip amount is $1.00</p>
                  )}
                </div>

                {/* Customer Message Input */}
                <div className="space-y-2">
                  <Label htmlFor="tip-message" className="text-sm font-medium">
                    Add a message (optional)
                  </Label>
                  <div className="relative">
                    <MessageCircle className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                    <Textarea
                      id="tip-message"
                      placeholder="Thank you for the great service!"
                      value={tipData.customer_message}
                      onChange={(e) => handleTipChange('customer_message', e.target.value)}
                      className="pl-10 min-h-[80px]"
                      maxLength={500}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {tipData.customer_message.length}/500 characters
                  </p>
                </div>

              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Close
                </Button>
                <Button
                  onClick={() => {
                    console.log('⚡ SUBMIT BUTTON CLICKED DIRECTLY');
                    console.log('tipCheckoutLoading:', tipCheckoutLoading);
                    console.log('tipData:', tipData);
                    handleTipSubmitClick();
                  }}
                  disabled={tipCheckoutLoading || tipData.tip_amount < 1}
                  className="flex-1"
                >
                  {tipCheckoutLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4 mr-2" />
                  )}
                  Submit
                </Button>
              </div>
            </div>
          )}

          {/* Tip Checkout Step */}
          {currentStep === 'checkout' && clientSecret && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Complete Your Tip</h3>
                <p className="text-gray-600">
                  Secure payment for {booking?.providers?.first_name}
                </p>
              </div>

              {stripePromise ? (
                <Elements 
                  stripe={stripePromise} 
                  options={{ 
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#3B82F6',
                      }
                    }
                  }}
                >
                  <TipCheckoutForm
                    tipAmount={tipData.tip_amount}
                    providerName={booking?.providers?.first_name || 'Provider'}
                    clientSecret={clientSecret}
                    onSuccess={handleTipCheckoutSuccess}
                    onError={handleTipCheckoutError}
                  />
                </Elements>
              ) : (
                <div className="p-4 text-center text-red-600">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                  <p>Stripe is not configured. Please contact support.</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep('tip')}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Back
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
