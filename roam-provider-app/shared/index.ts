import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number');
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Business validation schemas
export const businessNameSchema = z.string().min(2, 'Business name must be at least 2 characters').max(100);
export const businessTypeSchema = z.enum(['sole_proprietorship', 'llc', 'corporation', 'partnership'] as const);
export const businessDescriptionSchema = z.string().max(500, 'Description must be less than 500 characters').optional();

export const createBusinessSchema = z.object({
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  contactEmail: emailSchema,
  phone: phoneSchema,
  businessDescription: businessDescriptionSchema,
});

// Export all schemas as a single object for convenience
export const schemas = {
  // Business schemas
  businessName: businessNameSchema,
  businessType: businessTypeSchema,
  businessDescription: businessDescriptionSchema,
  createBusiness: createBusinessSchema,
  businessInfo: createBusinessSchema, // Alias for server compatibility
  businessProfile: createBusinessSchema, // Alias for server compatibility
  
  // Additional schemas for server compatibility
  applicationSubmission: z.object({
    userId: uuidSchema,
    businessId: uuidSchema,
    finalConsents: z.object({
      informationAccuracy: z.boolean().refine(val => val === true, 'Must confirm information accuracy'),
      termsAccepted: z.boolean().refine(val => val === true, 'Must accept terms'),
      backgroundCheckConsent: z.boolean().refine(val => val === true, 'Must consent to background check')
    })
  }),
  
  phase2Progress: z.object({
    business_id: uuidSchema,
    step: z.enum([
      'welcome',
      'business_profile',
      'personal_profile', 
      'business_hours',
      'staff_management',
      'banking_payout',
      'service_pricing',
      'final_review'
    ]),
    data: z.record(z.any()).optional()
  }),
  
  plaidToken: z.object({
    publicToken: z.string(),
    metadata: z.object({
      institution: z.object({
        name: z.string()
      }),
      accounts: z.array(z.object({
        id: z.string(),
        name: z.string(),
        mask: z.string(),
        type: z.string(),
        subtype: z.string()
      }))
    })
  }),
  
  applicationApproval: z.object({
    applicationId: uuidSchema,
    approved: z.boolean(),
    reason: z.string().optional(),
    notes: z.string().optional()
  }),

  // User schemas
  signup: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    role: z.enum(['admin', 'owner', 'dispatcher', 'provider', 'customer'] as const),
    businessId: uuidSchema.optional(),
  }),

  userProfile: z.object({
    email: emailSchema,
    password: passwordSchema,
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    role: z.enum(['admin', 'owner', 'dispatcher', 'provider', 'customer'] as const),
    businessId: uuidSchema.optional(),
  }),

  // Booking schemas
  bookingStatusUpdate: z.object({
    bookingId: uuidSchema,
    status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'] as const),
    notifyCustomer: z.boolean().optional(),
    notifyProvider: z.boolean().optional(),
    notes: z.string().max(500).optional(),
  }),

  // Common schemas
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
  uuid: uuidSchema,
};
