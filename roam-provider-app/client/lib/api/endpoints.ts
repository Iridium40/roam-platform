import { apiClient } from "./client";

// Types for API requests and responses
export interface BusinessInfoData {
  businessName: string;
  businessType: "independent" | "small_business" | "franchise" | "enterprise" | "other";
  contactEmail: string;
  phone: string;
  serviceCategories: string[];
  serviceSubcategories: string[];
  businessHours: { [key: string]: { open: string; close: string } };
  businessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  website?: string;
  socialMedia?: any;
  businessDescription?: string;
  yearsExperience: string;
}

export interface OnboardingStatus {
  phase: "phase1" | "phase2" | "complete";
  currentStep: string;
  needsOnboarding: boolean;
  userData?: {
    email: string;
    id: string;
  };
  businessData?: any;
  applicationData?: any;
  setupProgress?: any;
}

export interface ApplicationSubmissionData {
  userId: string;
  businessId: string;
  finalConsents: {
    informationAccuracy: boolean;
    termsAccepted: boolean;
    backgroundCheckConsent: boolean;
  };
}

export interface Phase2TokenValidation {
  token: string;
}

export interface Phase2ProgressData {
  businessId: string;
  step: string;
  data: any;
}

export interface BusinessProfile {
  businessName: string;
  detailedDescription: string;
  websiteUrl: string;
  socialMediaLinks: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  logoUrl?: string;
  coverImageUrl?: string;
  businessCategoryRefined?: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  business_id: string;
  location_id: string;
  first_name: string;
  last_name: string;
  email: string;
  provider_role: "provider" | "owner" | "dispatcher";
  is_active: boolean;
  image_url?: string;
  cover_image_url?: string;
}

// Onboarding API endpoints
export const onboardingAPI = {
  // Get onboarding status
  getStatus: (userId: string) =>
    apiClient.get<OnboardingStatus>(`/onboarding/status/${userId}`),

  // Submit business information
  submitBusinessInfo: (data: BusinessInfoData) =>
    apiClient.post<{ businessId: string }>("/onboarding/business-info", data),

  // Upload documents
  uploadDocuments: (formData: FormData) =>
    apiClient.uploadFile<{ documents: any[] }>("/onboarding/upload-documents", formData),

  // Submit application
  submitApplication: (data: ApplicationSubmissionData) =>
    apiClient.post<{ applicationId: string }>("/onboarding/submit-application", data),

  // Validate Phase 2 token
  validatePhase2Token: (data: Phase2TokenValidation) =>
    apiClient.post<{ valid: boolean; businessId: string; userId: string }>(
      "/onboarding/validate-phase2-token",
      data
    ),

  // Save Phase 2 progress
  savePhase2Progress: (data: Phase2ProgressData) =>
    apiClient.post("/onboarding/save-phase2-progress", data),

  // Get Phase 2 progress
  getPhase2Progress: (businessId: string) =>
    apiClient.get(`/onboarding/phase2-progress/${businessId}`),

  // Complete onboarding
  complete: (data: { userId: string; businessId: string; phase2Data: any }) =>
    apiClient.post("/onboarding/complete", data),
};

// Business API endpoints
export const businessAPI = {
  // Get business profile
  getProfile: (businessId: string) =>
    apiClient.get<BusinessProfile>(`/business/profile/${businessId}`),

  // Update business profile
  updateProfile: (businessId: string, data: Partial<BusinessProfile>) =>
    apiClient.put<BusinessProfile>(`/business/profile/${businessId}`, data),
};

// Provider API endpoints
export const providerAPI = {
  // Get provider profile
  getProfile: (userId: string) =>
    apiClient.get<ProviderProfile>(`/provider/profile/${userId}`),

  // Update provider profile
  updateProfile: (userId: string, data: Partial<ProviderProfile>) =>
    apiClient.put<ProviderProfile>(`/provider/profile/${userId}`, data),
};

// Admin API endpoints
export const adminAPI = {
  // Approve application
  approveApplication: (data: {
    businessId: string;
    adminUserId: string;
    approvalNotes?: string;
    sendEmail?: boolean;
  }) =>
    apiClient.post("/admin/approve-application", data),

  // Reject application
  rejectApplication: (data: {
    businessId: string;
    adminUserId: string;
    reason: string;
    nextSteps: string;
    sendEmail?: boolean;
  }) =>
    apiClient.post("/admin/reject-application", data),

  // Delete test user
  deleteTestUser: (data: { email: string }) =>
    apiClient.delete("/admin/delete-test-user", { body: JSON.stringify(data) }),

  // List test users
  listTestUsers: () =>
    apiClient.get<{ users: any[] }>("/admin/list-test-users"),
};

// Stripe API endpoints
export const stripeAPI = {
  // Create verification session
  createVerificationSession: (data: { userId: string; businessId: string }) =>
    apiClient.post<{ sessionId: string; clientSecret: string }>(
      "/stripe/create-verification-session",
      data
    ),

  // Check verification status
  checkVerificationStatus: (sessionId: string) =>
    apiClient.get<{ status: string; verified: boolean }>(
      `/stripe/check-verification-status/${sessionId}`
    ),

  // Create Connect account
  createConnectAccount: (data: { userId: string; businessId: string }) =>
    apiClient.post<{ accountId: string; accountLink: string }>(
      "/stripe/create-connect-account",
      data
    ),
};

// Plaid API endpoints
export const plaidAPI = {
  // Create link token
  createLinkToken: (data: { userId: string; businessId: string }) =>
    apiClient.post<{ linkToken: string }>("/plaid/create-link-token", data),

  // Exchange public token
  exchangePublicToken: (data: { publicToken: string; userId: string; businessId: string }) =>
    apiClient.post("/plaid/exchange-public-token", data),
};

// Test API endpoints
export const testAPI = {
  // Generate Phase 2 token
  generatePhase2Token: (data: { businessId: string }) =>
    apiClient.post<{
      success: boolean;
      token: string;
      businessId: string;
      userId: string;
      applicationId: string;
      phase2Url: string;
      expiresAt: string;
    }>("/test/generate-phase2-token", data),
};

// Notifications API endpoints
export const notificationsAPI = {
  // Edge notifications
  edge: (data: any) =>
    apiClient.post("/notifications/edge", data),
};

// Bookings API endpoints
export const bookingsAPI = {
  // Get bookings for a business
  getBookings: (params: {
    business_id: string;
    provider_id?: string;
    limit?: number;
    offset?: number;
    status?: string;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value.toString());
      }
    });
    return apiClient.get(`/bookings?${searchParams.toString()}`);
  },
  
  // Update booking status
  updateStatus: (data: { bookingId: string; status: string }) =>
    apiClient.post("/bookings/status-update", data),
};

// Twilio API endpoints
export const twilioAPI = {
  // Conversations
  conversations: (data: any) =>
    apiClient.post("/twilio-conversations", data),
};

// Auth API endpoints
export const authAPI = {
  // Sign up
  signup: (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) =>
    apiClient.post("/auth/signup", data),
};

// Export all APIs
export const api = {
  onboarding: onboardingAPI,
  business: businessAPI,
  provider: providerAPI,
  admin: adminAPI,
  stripe: stripeAPI,
  plaid: plaidAPI,
  test: testAPI,
  notifications: notificationsAPI,
  bookings: bookingsAPI,
  twilio: twilioAPI,
  auth: authAPI,
};

export default api;
