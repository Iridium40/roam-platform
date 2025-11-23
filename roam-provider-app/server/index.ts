import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getOnboardingStatus } from "./routes/onboarding";
import {
  handleEdgeNotifications,
  handleNotificationUpdates,
} from "./routes/edge-notifications";
// Plaid routes removed - using Stripe Connect for bank connections
import { getServiceEligibility } from "./routes/service-eligibility";
import { sendStaffInvite, createStaffManually, validateStaffInvitation, completeStaffOnboarding } from "./routes/staff";
import { 
  handleTestSMS, 
  handleGetSMSSettings, 
  handleBookingNotification,
  handleCancellationNotification,
  handleBookingReminder 
} from "./routes/sms";
import { requireAuth, requireBusinessAccess, requirePhase2Access, AuthenticatedRequest } from "./middleware/auth";
import { validateRequest } from "./middleware/validation";
import { schemas } from "../shared";

// Import supabase client from auth middleware
import { createClient } from '@supabase/supabase-js';

// Development mode: In-memory store for mock business services
const mockBusinessServicesStore = new Map<string, {
  business_id: string;
  service_id: string;
  business_price: number;
  delivery_type: string;
  is_active: boolean;
}>();

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Validate environment on startup
validateEnvironment();

// Create supabase client for database operations
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  }
);

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Increased for base64-encoded images
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  
  // Disable body parsing for file uploads - let multer handle it
  app.use('/api/onboarding/upload-documents', (req, res, next) => {
    console.log("Local server: Disabling body parser for upload-documents");
    next();
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  // Test endpoint to check development mode bypass
  app.post("/api/test-auth", (req, res) => {
    const isDev = process.env.NODE_ENV === 'development' || 
                  req.headers.host?.includes('localhost') ||
                  req.headers.host?.includes('127.0.0.1') ||
                  req.headers.host?.includes('3002');
    res.json({
      message: "Auth bypass working",
      body: req.body,
      headers: req.headers,
      isDevelopment: process.env.NODE_ENV === 'development',
      isDev: isDev,
      host: req.headers.host,
      nodeEnv: process.env.NODE_ENV
    });
  });

  app.get("/api/demo", handleDemo);

  // Public onboarding route
  app.get("/api/onboarding/status/:userId", getOnboardingStatus);

  // Business info route - use Vercel API function with validation
  app.post("/api/onboarding/business-info", 
    validateRequest(schemas.businessInfoRequest),
    async (req, res) => {
      try {
        const businessInfoHandler = await import(
          "../api/onboarding/business-info"
        );
        await businessInfoHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business-info handler:", error);
        res.status(500).json({ error: "Failed to load business-info handler" });
      }
    }
  );

  // Auth signup route with validation
  app.post("/api/auth/signup", 
    validateRequest(schemas.signup),
    async (req, res) => {
      try {
        const signupHandler = await import("../api/auth/signup");
        await signupHandler.default(req, res);
      } catch (error) {
        console.error("Error importing signup handler:", error);
        res.status(500).json({ error: "Failed to load signup handler" });
      }
    }
  );

  // Submit application route with validation
  app.post("/api/onboarding/submit-application", 
    validateRequest(schemas.applicationSubmission),
    async (req, res) => {
      try {
        const submitHandler = await import(
          "../api/onboarding/submit-application"
        );
        await submitHandler.default(req, res);
      } catch (error) {
        console.error("Error importing submit application handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load submit application handler" });
      }
    }
  );

  // Upload documents route
  app.post("/api/onboarding/upload-documents", async (req, res) => {
    try {
      console.log("Local server: Upload documents route called");
      console.log("Request headers:", req.headers);
      console.log("Request body keys:", Object.keys(req.body || {}));
      
      const uploadHandler = await import("../api/onboarding/upload-documents");
      await uploadHandler.default(req, res);
    } catch (error) {
      console.error("Error importing upload documents handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load upload documents handler" });
    }
  });

  // Plaid routes removed - using Stripe Connect for bank connections

  // Stripe create connect account route
  app.post("/api/stripe/create-connect-account", async (req, res) => {
    try {
      console.log("Local server: Stripe create connect account route called");
      
      // Development mode bypass for Stripe Connect
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Bypassing Stripe Connect account creation");
        
        // Return mock Stripe Connect account data
        res.json({
          success: true,
          account_id: 'acct_mock123456789',
          onboarding_url: 'https://dashboard.stripe.com/express/onboarding/on_mock123456789',
          testMode: true,
          message: 'Development mode: Mock Stripe Connect account created'
        });
        return;
      }
      
      const stripeHandler = await import("../api/stripe/create-connect-account");
      await stripeHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe create connect account handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load Stripe create connect account handler" });
    }
  });

  // Onboarding status route (dynamic parameter)
  app.get("/api/onboarding/status/:userId", async (req, res) => {
    try {
      const statusHandler = await import("../api/onboarding/status/[userId]");
      await statusHandler.default(req, res);
    } catch (error) {
      console.error("Error importing onboarding status handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load onboarding status handler" });
    }
  });

  // Phase 2 validation route
  app.post("/api/onboarding/validate-phase2-token", async (req, res) => {
    try {
      const validateHandler = await import(
        "../api/onboarding/validate-phase2-token"
      );
      await validateHandler.default(req, res);
    } catch (error) {
      console.error("Error importing validate phase2 token handler:", error);
      res
        .status(500)
        .json({ error: "Failed to load validate phase2 token handler" });
    }
  });

  // Phase 2 progress routes with Phase 2 access (no login required)
  app.post("/api/onboarding/save-phase2-progress", 
    requirePhase2Access(),
    validateRequest(schemas.phase2Progress),
    async (req: AuthenticatedRequest, res) => {
      try {
        const progressHandler = await import(
          "../api/onboarding/save-phase2-progress"
        );
        await progressHandler.default(req, res);
      } catch (error) {
        console.error("Error importing save phase2 progress handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load save phase2 progress handler" });
      }
    }
  );

  // GET Phase 2 progress by business ID
  app.get("/api/onboarding/phase2-progress/:businessId",
    requirePhase2Access(),
    async (req: AuthenticatedRequest, res) => {
      try {
        const progressHandler = await import(
          "../api/onboarding/phase2-progress/[businessId]"
        );
        // Transform Express req to match Vercel format
        const vercelReq = {
          ...req,
          query: { businessId: req.params.businessId }
        };
        await progressHandler.default(vercelReq as any, res as any);
      } catch (error) {
        console.error("Error importing get phase2 progress handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load get phase2 progress handler" });
      }
    }
  );

  // Phase 2 Provider Profile routes (no login required during Phase 2 onboarding)
  app.get("/api/provider/profile/:userId",
    requirePhase2Access(),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import("../api/provider/profile/[userId]");
        // Transform Express req to match Vercel format
        const vercelReq = {
          ...req,
          query: { userId: req.params.userId }
        };
        await profileHandler.default(vercelReq as any, res as any);
      } catch (error) {
        console.error("Error importing provider profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load provider profile handler" });
      }
    }
  );

  app.put("/api/provider/profile/:userId",
    requirePhase2Access(),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import("../api/provider/profile/[userId]");
        // Transform Express req to match Vercel format
        const vercelReq = {
          ...req,
          query: { userId: req.params.userId },
          body: req.body
        };
        await profileHandler.default(vercelReq as any, res as any);
      } catch (error) {
        console.error("Error importing provider profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load provider profile handler" });
      }
    }
  );

  // Business service eligibility route
  app.get("/api/business/service-eligibility",
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    getServiceEligibility
  );

  // Business tax info routes (Stripe Tax / 1099)
  app.get("/api/business/tax-info",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      const { getBusinessTaxInfo } = await import('./routes/tax-info');
      return getBusinessTaxInfo(req, res);
    }
  );
  app.put("/api/business/tax-info",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      const { upsertBusinessTaxInfo } = await import('./routes/tax-info');
      return upsertBusinessTaxInfo(req, res);
    }
  );

  // Business documents routes
  app.get("/api/business/documents",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const documentsHandler = await import("../api/business/documents");
        await documentsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business documents handler:", error);
        res.status(500).json({ error: "Failed to load business documents handler" });
      }
    }
  );
  
  app.post("/api/business/documents",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const documentsHandler = await import("../api/business/documents");
        await documentsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business documents handler:", error);
        res.status(500).json({ error: "Failed to load business documents handler" });
      }
    }
  );
  
  app.delete("/api/business/documents",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const documentsHandler = await import("../api/business/documents");
        await documentsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business documents handler:", error);
        res.status(500).json({ error: "Failed to load business documents handler" });
      }
    }
  );

  // Business document upload route (with service role for storage)
  app.post("/api/business/upload-document",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const uploadDocumentHandler = await import("../api/business/upload-document");
        await uploadDocumentHandler.default(req, res);
      } catch (error) {
        console.error("Error importing upload document handler:", error);
        res.status(500).json({ error: "Failed to load upload document handler" });
      }
    }
  );

  // Business hours routes
  app.get("/api/business/hours",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const { business_id } = req.query;

        if (!business_id || typeof business_id !== 'string') {
          return res.status(400).json({
            error: 'Business ID is required',
            code: 'INVALID_REQUEST'
          });
        }

        const { data, error } = await supabase
          .from('business_profiles')
          .select('business_hours')
          .eq('id', business_id)
          .single();

        if (error) {
          console.error('Error fetching business hours:', error);
          return res.status(500).json({
            error: 'Failed to fetch business hours',
            code: 'DATABASE_ERROR'
          });
        }

        return res.json({
          business_hours: data.business_hours || {}
        });
      } catch (error: any) {
        console.error('Error in GET /api/business/hours:', error);
        return res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  );

  app.put("/api/business/hours",
    requireAuth(['owner', 'dispatcher', 'admin']),
    async (req, res) => {
      try {
        const { business_id, business_hours } = req.body;

        if (!business_id || !business_hours) {
          return res.status(400).json({
            error: 'Business ID and business hours are required',
            code: 'INVALID_REQUEST'
          });
        }

        const { error } = await supabase
          .from('business_profiles')
          .update({ business_hours })
          .eq('id', business_id);

        if (error) {
          console.error('Error updating business hours:', error);
          return res.status(500).json({
            error: 'Failed to update business hours',
            code: 'DATABASE_ERROR'
          });
        }

        return res.json({
          success: true,
          message: 'Business hours updated successfully'
        });
      } catch (error: any) {
        console.error('Error in PUT /api/business/hours:', error);
        return res.status(500).json({
          error: 'Internal server error',
          code: 'INTERNAL_ERROR'
        });
      }
    }
  );

  // Business profile routes with auth and business access
  app.get("/api/business/profile/:businessId",
    requireAuth(['owner', 'dispatcher', 'admin']),
    requireBusinessAccess('businessId'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import(
          "../api/business/profile/[businessId]"
        );
        await profileHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load business profile handler" });
      }
    }
  );

  // Business profile route for Phase 2 onboarding (no login required)
  app.get("/api/onboarding/business-profile/:businessId",
    requirePhase2Access(),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import(
          "../api/business/profile/[businessId]"
        );
        await profileHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business profile handler for onboarding:", error);
        res
          .status(500)
          .json({ error: "Failed to load business profile handler" });
      }
    }
  );

  // Test business profile endpoint for development (no auth required)
  app.put("/api/test-business-profile",
    async (req, res) => {
      try {
        const { businessId, ...profileData } = req.body;
        
        console.log('Test business profile update:', { businessId, profileData });
        
        // In development mode, just return success
        res.json({
          success: true,
          message: 'Test business profile updated successfully',
          testMode: true,
          data: profileData
        });
      } catch (error) {
        console.error('Test business profile error:', error);
        res.status(500).json({ error: 'Test endpoint error' });
      }
    }
  );

  // Test Phase 2 progress endpoint for development (no auth required)
  app.post("/api/test-phase2-progress",
    async (req, res) => {
      try {
        const { business_id, step, data } = req.body;
        
        console.log('Test Phase 2 progress update:', { business_id, step, data });
        
        // In development mode, just return success
        res.json({
          success: true,
          message: 'Test Phase 2 progress updated successfully',
          testMode: true,
          step,
          data
        });
      } catch (error) {
        console.error('Test Phase 2 progress error:', error);
        res.status(500).json({ error: 'Test endpoint error' });
      }
    }
  );

  // Test personal profile endpoint for development (no auth required)
  app.put("/api/test-personal-profile",
    async (req, res) => {
      try {
        const { userId, ...profileData } = req.body;
        
        console.log('Test personal profile update:', { userId, profileData });
        
        // In development mode, just return success
        res.json({
          success: true,
          message: 'Test personal profile updated successfully',
          testMode: true,
          data: profileData
        });
      } catch (error) {
        console.error('Test personal profile error:', error);
        res.status(500).json({ error: 'Test endpoint error' });
      }
    }
  );

  // Image upload endpoint for Phase 2 onboarding (uses service role)
  app.post("/api/onboarding/upload-image",
    requirePhase2Access(),
    async (req: AuthenticatedRequest, res) => {
      try {
        const uploadHandler = await import("../api/onboarding/upload-image");
        // Transform Express req to match Vercel format
        const vercelReq = {
          ...req,
          query: req.query || {},
          body: req.body
        };
        await uploadHandler.default(vercelReq as any, res as any);
      } catch (error) {
        console.error("Error importing upload image handler:", error);
        res.status(500).json({ error: "Failed to load upload image handler" });
      }
    }
  );

  app.put("/api/business/profile/:businessId", 
    requireAuth(['owner', 'admin']),
    requireBusinessAccess('businessId'),
    validateRequest(schemas.businessProfile),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import(
          "../api/business/profile/[businessId]"
        );
        await profileHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load business profile handler" });
      }
    }
  );

  // Admin routes with admin-only auth
  app.post("/api/admin/approve-application", 
    requireAuth(['admin']),
    validateRequest(schemas.applicationApproval),
    async (req: AuthenticatedRequest, res) => {
      try {
        const approveHandler = await import("../api/admin/approve-application");
        await approveHandler.default(req, res);
      } catch (error) {
        console.error("Error importing approve application handler:", error);
        res.status(500).json({ error: "Failed to load approve application handler" });
      }
    }
  );

  app.post("/api/admin/reject-application", 
    requireAuth(['admin']),
    validateRequest(schemas.applicationApproval),
    async (req: AuthenticatedRequest, res) => {
      try {
        const rejectHandler = await import("../api/admin/reject-application");
        await rejectHandler.default(req, res);
      } catch (error) {
        console.error("Error importing reject application handler:", error);
        res.status(500).json({ error: "Failed to load reject application handler" });
      }
    }
  );

  // Booking routes with auth
  // TODO: Create ../api/bookings/create.ts file
  // app.post("/api/bookings", 
  //   requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
  //   validateRequest(schemas.booking),
  //   async (req: AuthenticatedRequest, res) => {
  //     try {
  //       const bookingHandler = await import("../api/bookings/create");
  //       await bookingHandler.default(req, res);
  //     } catch (error) {
  //       console.error("Error importing booking creation handler:", error);
  //       res.status(500).json({ error: "Failed to load booking creation handler" });
  //     }
  //   }
  // );

  // Get bookings for a business
  app.get("/api/bookings",
    async (req, res) => {
      try {
        const { business_id, limit = '1000', offset = '0', status } = req.query;
        
        if (!business_id) {
          return res.status(400).json({ error: "business_id is required" });
        }

        let query = supabase
          .from("bookings")
          .select(`
            *,
            customer_profiles (
              id,
              user_id,
              first_name,
              last_name,
              email,
              phone,
              image_url
            ),
            customer_locations (
              id,
              location_name,
              street_address,
              unit_number,
              city,
              state,
              zip_code,
              latitude,
              longitude,
              is_primary,
              is_active,
              access_instructions,
              location_type
            ),
            business_locations (
              id,
              location_name,
              address_line1,
              address_line2,
              city,
              state,
              postal_code
            ),
            services (
              id,
              name,
              description,
              duration_minutes,
              min_price
            ),
            providers (
              id,
              user_id,
              first_name,
              last_name
            )
          `)
          .eq('business_id', business_id)
          .order('booking_date', { ascending: false })
          .order('start_time', { ascending: false })
          .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

        if (status && status !== 'all') {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error fetching bookings:", error);
          return res.status(500).json({ error: error.message });
        }

        res.json({ bookings: data || [] });
      } catch (error: any) {
        console.error("Error in bookings endpoint:", error);
        res.status(500).json({ error: error.message || "Failed to fetch bookings" });
      }
    }
  );

  // Booking status update route
  app.post("/api/bookings/status-update", 
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        console.log('Booking status update request:', {
          body: req.body,
          user: req.user,
          auth: req.auth
        });
        
        const { bookingId, newStatus, updatedBy, reason, notifyCustomer = true, notifyProvider = true } = req.body;

        // Validate required fields
        if (!bookingId || !newStatus || !updatedBy) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Development mode bypass
        if (process.env.NODE_ENV === 'development') {
          console.log("Development mode: Mock booking status update");
          
          const mockBooking = {
            id: bookingId,
            booking_status: newStatus,
            updated_by: updatedBy,
            reason: reason,
            updated_at: new Date().toISOString(),
            customer_profiles: {
              id: 'customer-1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john.doe@example.com',
              phone: '+1234567890'
            },
            providers: {
              id: 'provider-1',
              first_name: 'Jane',
              last_name: 'Smith',
              email: 'jane.smith@example.com',
              phone: '+1234567890',
              user_id: 'user-1'
            },
            business_profiles: {
              id: 'business-1',
              name: 'Test Business',
              email: 'business@example.com'
            }
          };

          return res.status(200).json({ 
            success: true, 
            booking: mockBooking,
            testMode: true,
            message: 'Development mode: Mock booking status update'
          });
        }

        // Update booking status in Supabase
        console.log('Attempting to update booking:', {
          bookingId,
          newStatus,
          updatedBy,
          reason
        });
        
        const { data: booking, error: updateError} = await supabase
          .from('bookings')
          .update({
            booking_status: newStatus
          })
          .eq('id', bookingId)
          .select(`
            *,
            customer_profiles (
              id,
              first_name,
              last_name,
              email,
              phone,
              user_id
            ),
            providers (
              id,
              first_name,
              last_name,
              email,
              phone,
              user_id
            ),
            services (
              id,
              name
            )
          `)
          .single();

        if (updateError) {
          console.error('❌ Error updating booking:', {
            error: updateError,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            code: updateError.code,
            bookingId,
            newStatus
          });
          return res.status(500).json({ 
            error: 'Failed to update booking',
            details: updateError.message,
            code: updateError.code
          });
        }
        
        if (!booking) {
          console.error('❌ No booking returned after update:', { bookingId });
          return res.status(404).json({ 
            error: 'Booking not found or not updated',
            details: `No booking found with ID: ${bookingId}`
          });
        }
        
        console.log('✅ Booking updated successfully:', booking);

        // Create status update record (optional - don't fail if table doesn't exist)
        try {
        const { error: historyError } = await supabase
          .from('booking_status_history')
          .insert({
            booking_id: bookingId,
            status: newStatus,
            changed_by: updatedBy,
            reason: reason,
            changed_at: new Date().toISOString()
          });

        if (historyError) {
            console.warn('⚠️ Status history table may not exist or insert failed (non-fatal):', historyError.message);
            // Don't fail the request - status history is optional
          }
        } catch (historyCatchError) {
          console.warn('⚠️ Status history insert error (non-fatal):', historyCatchError);
          // Continue - status history is optional
        }

        // TODO: Send notifications if needed
        // For now, just log the notification intent
        console.log('Notification intent:', {
          booking,
          newStatus,
          notifyCustomer,
          notifyProvider
        });

        return res.status(200).json({ 
          success: true, 
          booking
        });

      } catch (error) {
        console.error('❌ Status update error:', {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          body: req.body
        });
        return res.status(500).json({ 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );

  // Service routes with auth
  // TODO: Create ../api/services/create.ts file
  // app.post("/api/services", 
  //   requireAuth(['owner', 'admin']),
  //   validateRequest(schemas.service),
  //   async (req: AuthenticatedRequest, res) => {
  //     try {
  //       const serviceHandler = await import("../api/services/create");
  //       await serviceHandler.default(req, res);
  //     } catch (error) {
  //       console.error("Error importing service creation handler:", error);
  //       res.status(500).json({ error: "Failed to load service creation handler" });
  //     }
  //   }
  // );

  // Business eligible services route
  app.get("/api/business-eligible-services", async (req, res) => {
    try {
      const { business_id } = req.query;
      
      if (!business_id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      // Development mode bypass - return mock data based on business type
      // Temporarily disabled to test with real Supabase data
      if (false && process.env.NODE_ENV === 'development') {
        console.log("Development mode: Returning mock eligible services for business:", business_id);
        
        // In development, we'll simulate that this business has been approved for
        // "Home Services" category with "House Cleaning" and "Lawn Care" subcategories
        const mockEligibleServices = [
          {
            id: 'service-1',
            name: 'House Cleaning',
            description: 'Professional house cleaning service including dusting, vacuuming, mopping, and bathroom cleaning',
            min_price: 50,
            duration_minutes: 120,
            is_active: true,
            subcategory_id: 'house-cleaning',
            is_configured: true,
            business_price: 75,
            business_duration_minutes: 150,
            delivery_type: 'customer_location',
            business_is_active: true,
            service_subcategories: {
              service_subcategory_type: 'House Cleaning',
              service_categories: {
                service_category_type: 'Home Services'
              }
            }
          },
          {
            id: 'service-2',
            name: 'Lawn Care',
            description: 'Complete lawn maintenance including mowing, edging, and basic landscaping',
            min_price: 75,
            duration_minutes: 90,
            is_active: true,
            subcategory_id: 'lawn-care',
            is_configured: false,
            business_price: null,
            business_duration_minutes: null,
            delivery_type: null,
            business_is_active: null,
            service_subcategories: {
              service_subcategory_type: 'Lawn Care',
              service_categories: {
                service_category_type: 'Home Services'
              }
            }
          },
          {
            id: 'service-3',
            name: 'Deep Cleaning',
            description: 'Intensive cleaning service for move-in/move-out or seasonal deep cleaning',
            min_price: 150,
            duration_minutes: 240,
            is_active: true,
            subcategory_id: 'deep-cleaning',
            is_configured: false,
            business_price: null,
            business_duration_minutes: null,
            delivery_type: null,
            business_is_active: null,
            service_subcategories: {
              service_subcategory_type: 'Deep Cleaning',
              service_categories: {
                service_category_type: 'Home Services'
              }
            }
          }
        ];

        const mockEligibleAddons = [
          {
            id: 'addon-1',
            name: 'Premium Cleaning Products',
            description: 'Eco-friendly, professional-grade cleaning materials',
            image_url: null,
            is_active: true
          },
          {
            id: 'addon-2',
            name: 'Window Cleaning',
            description: 'Interior and exterior window cleaning service',
            image_url: null,
            is_active: true
          },
          {
            id: 'addon-3',
            name: 'Carpet Cleaning',
            description: 'Professional carpet and upholstery cleaning',
            image_url: null,
            is_active: true
          },
          {
            id: 'addon-4',
            name: 'Garden Maintenance',
            description: 'Additional garden care and plant maintenance',
            image_url: null,
            is_active: true
          }
        ];

        // Create service-addon mapping (which addons are compatible with which services)
        const mockServiceAddonMap = {
          'service-1': ['addon-1', 'addon-2', 'addon-3'], // House Cleaning compatible addons
          'service-2': ['addon-4'], // Lawn Care compatible addons
          'service-3': ['addon-1', 'addon-2', 'addon-3'] // Deep Cleaning compatible addons
        };

        // Merge with in-memory store for services that have been updated
        const updatedServices = mockEligibleServices.map(service => {
          const key = `${business_id}:${service.id}`;
          const storedService = mockBusinessServicesStore.get(key);
          
          if (storedService) {
            console.log(`Merging stored data for service ${service.id}:`, storedService);
            return {
              ...service,
              is_configured: true,
              business_price: storedService.business_price,
              delivery_type: storedService.delivery_type,
              business_is_active: storedService.is_active
            };
          }
          
          return service;
        });

        res.json({
          business_id: business_id,
          service_count: updatedServices.length,
          addon_count: mockEligibleAddons.length,
          eligible_services: updatedServices,
          eligible_addons: mockEligibleAddons,
          service_addon_map: mockServiceAddonMap
        });
        return;
      }

                   // Production mode - query real database
             try {
               console.log("Production mode: Querying real database for eligible services");
               
               // Get business details and its approved subcategories
               const { data: business, error: businessError } = await supabase
                 .from('business_service_subcategories')
                 .select(`
                   subcategory_id,
                   service_subcategories(
                     id, 
                     service_subcategory_type,
                     service_categories(
                       id,
                       service_category_type
                     )
                   )
                 `)
                 .eq('business_id', business_id)
                 .eq('is_active', true);

                       if (businessError) {
                 console.error('Error fetching business subcategories:', businessError);
                 return res.status(500).json({ error: 'Failed to fetch business subcategories' });
               }
       
               if (!business || business.length === 0) {
                 console.log('No subcategories found for business:', business_id);
                 return res.json({
                   business_id: business_id,
                   service_count: 0,
                   addon_count: 0,
                   eligible_services: [],
                   eligible_addons: [],
                   service_addon_map: {}
                 });
               }
       
               // Extract subcategory IDs, filtering out null values
               const subcategoryIds = business
                 .map((bs: any) => bs.subcategory_id)
                 .filter((id: string) => id !== null && id !== undefined);

        // Get eligible services based on business subcategories
        const { data: eligibleServices, error: servicesError } = await supabase
          .from('services')
          .select(`
            id, 
            name, 
            description, 
            min_price,
            duration_minutes, 
            image_url, 
            is_active,
            subcategory_id,
            service_subcategories(
              service_subcategory_type,
              service_categories(service_category_type)
            )
          `)
          .in('subcategory_id', subcategoryIds)
          .eq('is_active', true);

        if (servicesError) {
          console.error('Error fetching eligible services:', servicesError);
          console.error('Error details:', JSON.stringify(servicesError, null, 2));
          return res.status(500).json({ 
            error: 'Failed to fetch eligible services',
            details: servicesError.message || 'Unknown database error'
          });
        }

        // Get service addons
        const { data: eligibleAddons, error: addonsError } = await supabase
          .from('service_addons')
          .select('id, name, description, image_url, is_active')
          .eq('is_active', true);

        if (addonsError) {
          console.error('Error fetching eligible addons:', addonsError);
          return res.status(500).json({ error: 'Failed to fetch eligible addons' });
        }

        // Get service-addon mappings
        const { data: serviceAddonMappings, error: mappingError } = await supabase
          .from('service_addon_eligibility')
          .select('service_id, addon_id, is_recommended');

        if (mappingError) {
          console.error('Error fetching service-addon mappings:', mappingError);
          return res.status(500).json({ error: 'Failed to fetch service-addon mappings' });
        }

        // Create service-addon map
        const serviceAddonMap: Record<string, string[]> = {};
        serviceAddonMappings?.forEach((mapping: any) => {
          if (!serviceAddonMap[mapping.service_id]) {
            serviceAddonMap[mapping.service_id] = [];
          }
          serviceAddonMap[mapping.service_id].push(mapping.addon_id);
        });

        // Get current business services to mark as configured
        const { data: businessServices, error: businessServicesError } = await supabase
          .from('business_services')
          .select('service_id, business_price, delivery_type, is_active')
          .eq('business_id', business_id);

        if (businessServicesError) {
          console.error('Error fetching business services:', businessServicesError);
          // Don't return error, just continue without configured services
        }

        const configuredServiceIds = new Set(businessServices?.map(bs => bs.service_id) || []);
        const businessServicesMap = new Map(
          businessServices?.map(bs => [bs.service_id, bs]) || []
        );

        // Mark services as configured and add business-specific data
        const processedServices = eligibleServices?.map((service: any) => {
          const isConfigured = configuredServiceIds.has(service.id);
          const businessService = businessServicesMap.get(service.id);
          
          return {
            ...service,
            is_configured: isConfigured,
            business_price: businessService?.business_price,
            delivery_type: businessService?.delivery_type,
            business_is_active: businessService?.is_active
          };
        }) || [];

        const response = {
          business_id: business_id,
          service_count: processedServices.length,
          addon_count: eligibleAddons?.length || 0,
          eligible_services: processedServices,
          eligible_addons: eligibleAddons || [],
          service_addon_map: serviceAddonMap
        };

        res.json(response);
                   } catch (error) {
               console.error("Error in production eligible services:", error);
               console.error("Error details:", {
                 message: error.message,
                 code: error.code,
                 details: error.details,
                 hint: error.hint
               });
               res.status(500).json({ 
                 error: "Failed to fetch eligible services from database",
                 details: error.message,
                 code: error.code
               });
             }
    } catch (error) {
      console.error("Error in business eligible services:", error);
      res.status(500).json({ error: "Failed to fetch eligible services" });
    }
  });

  // Business services route
  app.get("/api/business/services", async (req, res) => {
    try {
      const { business_id } = req.query;
      
      if (!business_id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      // Development mode bypass - return mock data
      // Temporarily disabled to test with real Supabase data
      if (false && process.env.NODE_ENV === 'development') {
        console.log("Development mode: Returning mock business services");
        
        const mockBusinessServices = [
          {
            id: 'bs-1',
            business_id: business_id,
            service_id: 'service-1',
            business_price: 75,
            is_active: true,
            delivery_type: 'customer_location',
            services: {
              id: 'service-1',
              name: 'House Cleaning',
              description: 'Professional house cleaning service including dusting, vacuuming, mopping, and bathroom cleaning',
              min_price: 50,
              duration_minutes: 120,
              image_url: null,
              service_subcategories: {
                service_subcategory_type: 'House Cleaning',
                service_categories: {
                  service_category_type: 'Home Services'
              }
            }
          }
        },
          {
            id: 'bs-2',
            business_id: business_id,
            service_id: 'service-2',
            business_price: 95,
            is_active: true,
            delivery_type: 'customer_location',
            services: {
              id: 'service-2',
              name: 'Lawn Care',
              description: 'Complete lawn maintenance including mowing, edging, and basic landscaping',
              min_price: 75,
              duration_minutes: 90,
              image_url: null,
              service_subcategories: {
                service_subcategory_type: 'Lawn Care',
                service_categories: {
                  service_category_type: 'Home Services'
                }
              }
            }
          }
        ];

        const mockStats = {
          total_services: mockBusinessServices.length,
          active_services: mockBusinessServices.filter(s => s.is_active).length,
          total_bookings: 0,
          total_revenue: 0,
          avg_price: mockBusinessServices.reduce((sum, s) => sum + s.business_price, 0) / mockBusinessServices.length
        };

        res.json({
          services: mockBusinessServices,
          stats: mockStats
        });
        return;
      }

      // Production mode - query real database
      try {
        console.log("Production mode: Querying real database for business services");
        
        // Get business services with service details
        const { data: businessServices, error: servicesError } = await supabase
          .from('business_services')
          .select(`
            id,
            business_id,
            service_id,
            business_price,
            delivery_type,
            is_active,
            created_at,
            services(
              id,
              name,
              description,
              min_price,
              duration_minutes,
              image_url,
              service_subcategories(
                service_subcategory_type,
                service_categories(service_category_type)
              )
            )
          `)
          .eq('business_id', business_id);

        if (servicesError) {
          console.error('Error fetching business services:', servicesError);
          console.error('Error details:', JSON.stringify(servicesError, null, 2));
          return res.status(500).json({ 
            error: 'Failed to fetch business services',
            details: servicesError.message || 'Unknown database error'
          });
        }

        const stats = {
          total_services: businessServices?.length || 0,
          active_services: businessServices?.filter(s => s.is_active).length || 0,
          total_bookings: 0, // Would come from bookings data
          total_revenue: 0, // Would come from bookings data
          avg_price: businessServices && businessServices.length > 0 
            ? businessServices.reduce((sum, s) => sum + (s.business_price || 0), 0) / businessServices.length 
            : 0
        };

        res.json({
          services: businessServices || [],
          stats
        });
      } catch (error) {
        console.error("Error in production business services:", error);
        res.status(500).json({ error: "Failed to fetch business services from database" });
      }
    } catch (error) {
      console.error("Error in business services:", error);
      res.status(500).json({ error: "Failed to fetch business services" });
    }
  });

  // Add/Update business service route
  app.post("/api/business/services", async (req, res) => {
    try {
      const { business_id, service_id, business_price, business_duration_minutes, delivery_type, is_active } = req.body;
      
      if (!business_id || !service_id || !business_price) {
        return res.status(400).json({ error: "Business ID, service ID, and price are required" });
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Mock adding/updating business service");
        
        const mockService = {
          id: `bs-${Date.now()}`,
          business_id,
          service_id,
          business_price: parseFloat(business_price),
          business_duration_minutes: business_duration_minutes ? parseInt(business_duration_minutes) : 60,
          delivery_type: delivery_type || 'customer_location',
          is_active: is_active !== false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        res.json({ service: mockService });
        return;
      }

      // Production mode - insert/update in database
      try {
        console.log("Production mode: Adding/updating business service in database");
        
        // Fetch the service to get default duration if needed
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', service_id)
          .single();

        if (serviceError || !serviceData) {
          return res.status(404).json({ error: 'Service not found' });
        }

        // Determine the final duration - use custom value or default to service duration
        const finalDuration = business_duration_minutes !== undefined && business_duration_minutes !== null && business_duration_minutes !== ''
          ? parseInt(business_duration_minutes)
          : serviceData.duration_minutes;
        
        // Check if service already exists
        const { data: existingService, error: checkError } = await supabase
          .from('business_services')
          .select('id')
          .eq('business_id', business_id)
          .eq('service_id', service_id)
          .single();

        let result;
        if (existingService) {
          // Update existing service
          const { data, error } = await supabase
            .from('business_services')
            .update({
              business_price: parseFloat(business_price),
              business_duration_minutes: finalDuration,
              delivery_type: delivery_type || 'customer_location',
              is_active: is_active !== false,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingService.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Insert new service
          const { data, error } = await supabase
            .from('business_services')
            .insert({
              business_id,
              service_id,
              business_price: parseFloat(business_price),
              business_duration_minutes: finalDuration,
              delivery_type: delivery_type || 'customer_location',
              is_active: is_active !== false
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        res.json({ service: result });
      } catch (error) {
        console.error("Error in production business service operation:", error);
        res.status(500).json({ error: "Failed to add/update business service in database" });
      }
    } catch (error) {
      console.error("Error in business service operation:", error);
      res.status(500).json({ error: "Failed to process business service operation" });
    }
  });

  // Update business service route (PUT)
  app.put("/api/business/services", async (req, res) => {
    try {
      const { business_id, service_id, business_price, business_duration_minutes, delivery_type, is_active } = req.body;
      
      if (!business_id || !service_id) {
        return res.status(400).json({ error: "Business ID and service ID are required" });
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Mock updating business service");
        
        const mockService = {
          id: `bs-${Date.now()}`,
          business_id,
          service_id,
          business_price: business_price ? parseFloat(business_price) : null,
          business_duration_minutes: business_duration_minutes ? parseInt(business_duration_minutes) : null,
          delivery_type: delivery_type || null,
          is_active: is_active !== undefined ? is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        res.json({ service: mockService });
        return;
      }

      // Production mode - update in database
      try {
        console.log("Production mode: Updating business service in database");
        
        // Fetch the service to get default duration if needed
        const { data: serviceData, error: serviceError } = await supabase
          .from('services')
          .select('duration_minutes')
          .eq('id', service_id)
          .single();

        if (serviceError || !serviceData) {
          return res.status(404).json({ error: 'Service not found' });
        }
        
        // Build upsert object with all required fields
        const upsertData: any = {
          business_id,
          service_id
        };
        
        if (business_price !== undefined) upsertData.business_price = parseFloat(business_price);
        
        // Handle business_duration_minutes - use custom value or default to service duration
        if (business_duration_minutes !== undefined && business_duration_minutes !== null && business_duration_minutes !== '') {
          upsertData.business_duration_minutes = parseInt(business_duration_minutes);
        } else {
          upsertData.business_duration_minutes = serviceData.duration_minutes;
        }
        
        if (delivery_type !== undefined) upsertData.delivery_type = delivery_type;
        if (is_active !== undefined) upsertData.is_active = is_active;

        // Use upsert to insert if not exists, or update if exists
        const { data, error } = await supabase
          .from('business_services')
          .upsert(upsertData, {
            onConflict: 'business_id,service_id'
          })
          .select()
          .single();

        if (error) {
          console.error('Error upserting business service:', error);
          return res.status(500).json({ 
            error: 'Failed to update business service',
            details: error.message 
          });
        }

        if (!data) {
          return res.status(404).json({ error: 'Business service operation failed' });
        }

        res.json({ service: data });
      } catch (error) {
        console.error("Error in production business service update:", error);
        res.status(500).json({ error: "Failed to update business service in database" });
      }
    } catch (error) {
      console.error("Error in business service update:", error);
      res.status(500).json({ error: "Failed to process business service update" });
    }
  });

  // Business eligible addons route
  app.get("/api/business-eligible-addons", async (req, res) => {
    try {
      const { business_id } = req.query;
      
      if (!business_id) {
        return res.status(400).json({ error: "Business ID is required" });
      }

      try {
        console.log("Loading eligible addons for business:", business_id);
        
        // Get all active services for this business
        const { data: businessServices, error: servicesError } = await supabase
          .from('business_services')
          .select('service_id')
          .eq('business_id', business_id)
          .eq('is_active', true);

        if (servicesError) {
          console.error('Error fetching business services:', servicesError);
          console.error('Supabase error details:', JSON.stringify(servicesError, null, 2));
          return res.status(500).json({ 
            error: 'Failed to fetch business services',
            details: servicesError.message,
            code: servicesError.code
          });
        }

        console.log(`Found ${businessServices?.length || 0} active services for business`)
        console.log(`Found ${businessServices?.length || 0} active services for business`);

        if (!businessServices || businessServices.length === 0) {
          console.log('No active services found for business:', business_id);
          return res.json({
            business_id: business_id,
            addon_count: 0,
            eligible_addons: []
          });
        }

        const serviceIds = businessServices.map((bs: any) => bs.service_id);
        console.log('Service IDs:', serviceIds);

        // Get eligible addons for these services
        const { data: addonEligibility, error: eligibilityError } = await supabase
          .from('service_addon_eligibility')
          .select(`
            addon_id,
            service_id,
            is_recommended
          `)
          .in('service_id', serviceIds);

        if (eligibilityError) {
          console.error('Error fetching addon eligibility:', eligibilityError);
          console.error('Supabase eligibility error details:', JSON.stringify(eligibilityError, null, 2));
          return res.status(500).json({ 
            error: 'Failed to fetch addon eligibility',
            details: eligibilityError.message,
            code: eligibilityError.code
          });
        }

        console.log(`Found ${addonEligibility?.length || 0} addon eligibility records`);

        // Get unique addon IDs
        const addonIds = [...new Set(addonEligibility?.map((ae: any) => ae.addon_id) || [])];
        console.log('Unique addon IDs:', addonIds);

        if (addonIds.length === 0) {
          console.log('No eligible addons found for this business services');
          return res.json({
            business_id: business_id,
            addon_count: 0,
            eligible_addons: []
          });
        }

        // Get addon details
        const { data: addons, error: addonsError } = await supabase
          .from('service_addons')
          .select('id, name, description, image_url, is_active')
          .in('id', addonIds)
          .eq('is_active', true);

        if (addonsError) {
          console.error('Error fetching addons:', addonsError);
          console.error('Supabase addons error details:', JSON.stringify(addonsError, null, 2));
          return res.status(500).json({ 
            error: 'Failed to fetch addons',
            details: addonsError.message,
            code: addonsError.code
          });
        }

        console.log(`Found ${addons?.length || 0} active addons`);

        // Get current business addon configurations
        const { data: businessAddons, error: businessAddonsError } = await supabase
          .from('business_addons')
          .select('addon_id, custom_price, is_available')
          .eq('business_id', business_id);

        if (businessAddonsError) {
          console.error('Error fetching business addons:', businessAddonsError);
          console.error('Supabase business addons error details:', JSON.stringify(businessAddonsError, null, 2));
          // Don't fail the request if business addons fetch fails - just log it
        }

        console.log(`Found ${businessAddons?.length || 0} business addon configurations`);
        console.log(`Found ${businessAddons?.length || 0} business addon configurations`);

        const businessAddonsMap = new Map(
          businessAddons?.map((ba: any) => [ba.addon_id, ba]) || []
        );

        // Count compatible services for each addon
        const addonServiceCountMap = new Map();
        addonEligibility?.forEach((ae: any) => {
          const count = addonServiceCountMap.get(ae.addon_id) || 0;
          addonServiceCountMap.set(ae.addon_id, count + 1);
        });

        // Merge addon details with business configuration
        const processedAddons = addons?.map((addon: any) => {
          const businessAddon = businessAddonsMap.get(addon.id);
          const isConfigured = !!businessAddon;
          
          return {
            ...addon,
            is_configured: isConfigured,
            custom_price: businessAddon?.custom_price,
            is_available: businessAddon?.is_available,
            compatible_service_count: addonServiceCountMap.get(addon.id) || 0
          };
        }) || [];

        console.log(`Returning ${processedAddons.length} processed addons`);

        res.json({
          business_id: business_id,
          addon_count: processedAddons.length,
          eligible_addons: processedAddons
        });
      } catch (error) {
        console.error("Error in eligible addons:", error);
        console.error("Stack trace:", error instanceof Error ? error.stack : 'No stack trace');
        res.status(500).json({ 
          error: "Failed to fetch eligible addons from database",
          details: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    } catch (error) {
      console.error("Error in business eligible addons (outer):", error);
      console.error("Stack trace (outer):", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        error: "Failed to fetch eligible addons",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Update business addon route
  app.put("/api/business/addons", async (req, res) => {
    try {
      const { business_id, addon_id, custom_price, is_available } = req.body;
      
      if (!business_id || !addon_id) {
        return res.status(400).json({ error: "Business ID and addon ID are required" });
      }

      try {
        console.log("Updating business addon in database");
        
        // Check if addon already exists
        const { data: existingAddon, error: checkError } = await supabase
          .from('business_addons')
          .select('id')
          .eq('business_id', business_id)
          .eq('addon_id', addon_id)
          .single();

        let result;
        if (existingAddon) {
          // Update existing addon
          const { data, error } = await supabase
            .from('business_addons')
            .update({
              custom_price: custom_price !== undefined ? parseFloat(custom_price) : null,
              is_available: is_available !== undefined ? is_available : true
            })
            .eq('id', existingAddon.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Insert new addon
          const { data, error } = await supabase
            .from('business_addons')
            .insert({
              business_id,
              addon_id,
              custom_price: custom_price !== undefined ? parseFloat(custom_price) : null,
              is_available: is_available !== undefined ? is_available : true
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        res.json({ 
          success: true,
          addon: result 
        });
      } catch (error) {
        console.error("Error updating business addon:", error);
        res.status(500).json({ 
          error: "Failed to update business addon in database",
          details: error.message
        });
      }
    } catch (error) {
      console.error("Error in business addon update:", error);
      res.status(500).json({ error: "Failed to update business addon" });
    }
  });

  // Add/Update business addon route (legacy POST endpoint, kept for backward compatibility)
  app.post("/api/business/addons", async (req, res) => {
    try {
      const { business_id, addon_id, custom_price, is_available } = req.body;
      
      if (!business_id || !addon_id) {
        return res.status(400).json({ error: "Business ID and addon ID are required" });
      }

      // Development mode bypass
      if (process.env.NODE_ENV === 'development') {
        console.log("Development mode: Mock adding/updating business addon");
        
        const mockAddon = {
          id: `ba-${Date.now()}`,
          business_id,
          addon_id,
          custom_price: custom_price ? parseFloat(custom_price) : null,
          is_available: is_available !== false,
          created_at: new Date().toISOString()
        };

        res.json({ addon: mockAddon });
        return;
      }

      // Production mode - insert/update in database
      try {
        console.log("Production mode: Adding/updating business addon in database");
        
        // Check if addon already exists
        const { data: existingAddon, error: checkError } = await supabase
          .from('business_addons')
          .select('id')
          .eq('business_id', business_id)
          .eq('addon_id', addon_id)
          .single();

        let result;
        if (existingAddon) {
          // Update existing addon
          const { data, error } = await supabase
            .from('business_addons')
            .update({
              custom_price: custom_price ? parseFloat(custom_price) : null,
              is_available: is_available !== false
            })
            .eq('id', existingAddon.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Insert new addon
          const { data, error } = await supabase
            .from('business_addons')
            .insert({
              business_id,
              addon_id,
              custom_price: custom_price ? parseFloat(custom_price) : null,
              is_available: is_available !== false
            })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        res.json({ addon: result });
      } catch (error) {
        console.error("Error in production business addon operation:", error);
        res.status(500).json({ error: "Failed to add/update business addon in database" });
      }
    } catch (error) {
      console.error("Error in business addon operation:", error);
      res.status(500).json({ error: "Failed to process business addon operation" });
    }
  });

  // Edge notifications routes (development equivalent)
  app.get("/api/notifications/edge", handleEdgeNotifications);
  app.patch("/api/notifications/edge", handleNotificationUpdates);

  // Staff management routes
  app.post("/api/staff/invite", sendStaffInvite);
  app.post("/api/staff/create-manual", createStaffManually);
  app.post("/api/staff/validate-invitation", validateStaffInvitation);
  app.post("/api/staff/complete-onboarding", completeStaffOnboarding);

  // SMS notification routes
  app.post("/api/sms/test", handleTestSMS);
  app.get("/api/sms/settings/:providerId", handleGetSMSSettings);
  app.post("/api/sms/booking-notification", handleBookingNotification);
  app.post("/api/sms/cancellation-notification", handleCancellationNotification);
  app.post("/api/sms/reminder", handleBookingReminder);

  // ==================== Stripe Financial Routes ====================
  
  // Stripe Connect account status check
  app.get("/api/stripe/check-connect-account-status", async (req, res) => {
    try {
      const statusHandler = await import("../api/stripe/check-connect-account-status");
      await statusHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe Connect status handler:", error);
      res.status(500).json({ error: "Failed to load Stripe Connect status handler" });
    }
  });
  
  // Stripe balance
  app.get("/api/stripe/balance", async (req, res) => {
    try {
      const balanceHandler = await import("../api/stripe/balance");
      await balanceHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe balance handler:", error);
      res.status(500).json({ error: "Failed to load Stripe balance handler" });
    }
  });

  // Stripe payouts
  app.get("/api/stripe/payouts", async (req, res) => {
    try {
      const payoutsHandler = await import("../api/stripe/payouts");
      await payoutsHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe payouts handler:", error);
      res.status(500).json({ error: "Failed to load Stripe payouts handler" });
    }
  });

  app.post("/api/stripe/payouts", async (req, res) => {
    try {
      const payoutsHandler = await import("../api/stripe/payouts");
      await payoutsHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe payouts handler:", error);
      res.status(500).json({ error: "Failed to load Stripe payouts handler" });
    }
  });

  // Stripe transactions
  app.get("/api/stripe/transactions", async (req, res) => {
    try {
      const transactionsHandler = await import("../api/stripe/transactions");
      await transactionsHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe transactions handler:", error);
      res.status(500).json({ error: "Failed to load Stripe transactions handler" });
    }
  });

  // Stripe payout schedule
  app.get("/api/stripe/payout-schedule", async (req, res) => {
    try {
      const scheduleHandler = await import("../api/stripe/payout-schedule");
      await scheduleHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe payout schedule handler:", error);
      res.status(500).json({ error: "Failed to load Stripe payout schedule handler" });
    }
  });

  app.put("/api/stripe/payout-schedule", async (req, res) => {
    try {
      const scheduleHandler = await import("../api/stripe/payout-schedule");
      await scheduleHandler.default(req as any, res as any);
    } catch (error) {
      console.error("Error importing Stripe payout schedule handler:", error);
      res.status(500).json({ error: "Failed to load Stripe payout schedule handler" });
    }
  });

  // ==================== End Stripe Financial Routes ====================

  // ==================== Provider Services Management ====================
  
  // Get provider services
  app.get("/api/provider/services/:providerId", requireAuth, async (req, res) => {
    try {
      const { providerId } = req.params;

      if (!providerId) {
        return res.status(400).json({ error: "Provider ID is required" });
      }

      // Get provider services with service details
      const { data: providerServices, error: servicesError } = await supabase
        .from('provider_services')
        .select(`
          id,
          provider_id,
          service_id,
          is_active,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url
          )
        `)
        .eq('provider_id', providerId);

      if (servicesError) {
        console.error('Error fetching provider services:', servicesError);
        return res.status(500).json({ 
          error: 'Failed to fetch provider services',
          details: servicesError.message 
        });
      }

      res.json({
        provider_id: providerId,
        services: providerServices || []
      });
    } catch (error: any) {
      console.error('Error in /api/provider/services/:providerId:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Assign services to provider (bulk operation)
  app.post("/api/provider/services", requireAuth, async (req, res) => {
    try {
      const { provider_id, service_ids } = req.body;

      if (!provider_id || !Array.isArray(service_ids)) {
        return res.status(400).json({ 
          error: "Provider ID and service IDs array are required" 
        });
      }

      // First, deactivate all existing provider services
      const { error: deactivateError } = await supabase
        .from('provider_services')
        .update({ is_active: false })
        .eq('provider_id', provider_id);

      if (deactivateError) {
        console.error('Error deactivating provider services:', deactivateError);
        return res.status(500).json({ 
          error: 'Failed to update provider services',
          details: deactivateError.message 
        });
      }

      // Then, upsert the new service assignments
      if (service_ids.length > 0) {
        const providerServices = service_ids.map(service_id => ({
          provider_id,
          service_id,
          is_active: true
        }));

        const { error: upsertError } = await supabase
          .from('provider_services')
          .upsert(providerServices, { 
            onConflict: 'provider_id,service_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('Error upserting provider services:', upsertError);
          return res.status(500).json({ 
            error: 'Failed to assign services',
            details: upsertError.message 
          });
        }
      }

      res.json({
        success: true,
        message: 'Provider services updated successfully',
        assigned_count: service_ids.length
      });
    } catch (error: any) {
      console.error('Error in /api/provider/services POST:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Get provider addons
  app.get("/api/provider/addons/:providerId", requireAuth, async (req, res) => {
    try {
      const { providerId } = req.params;

      if (!providerId) {
        return res.status(400).json({ error: "Provider ID is required" });
      }

      // Get provider addons with addon details
      const { data: providerAddons, error: addonsError } = await supabase
        .from('provider_addons')
        .select(`
          id,
          provider_id,
          addon_id,
          is_active,
          created_at,
          service_addons (
            id,
            name,
            description,
            image_url
          )
        `)
        .eq('provider_id', providerId);

      if (addonsError) {
        console.error('Error fetching provider addons:', addonsError);
        return res.status(500).json({ 
          error: 'Failed to fetch provider addons',
          details: addonsError.message 
        });
      }

      res.json({
        provider_id: providerId,
        addons: providerAddons || []
      });
    } catch (error: any) {
      console.error('Error in /api/provider/addons/:providerId:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // Assign addons to provider (bulk operation)
  app.post("/api/provider/addons", requireAuth, async (req, res) => {
    try {
      const { provider_id, addon_ids } = req.body;

      if (!provider_id || !Array.isArray(addon_ids)) {
        return res.status(400).json({ 
          error: "Provider ID and addon IDs array are required" 
        });
      }

      // First, deactivate all existing provider addons
      const { error: deactivateError } = await supabase
        .from('provider_addons')
        .update({ is_active: false })
        .eq('provider_id', provider_id);

      if (deactivateError) {
        console.error('Error deactivating provider addons:', deactivateError);
        return res.status(500).json({ 
          error: 'Failed to update provider addons',
          details: deactivateError.message 
        });
      }

      // Then, upsert the new addon assignments
      if (addon_ids.length > 0) {
        const providerAddons = addon_ids.map(addon_id => ({
          provider_id,
          addon_id,
          is_active: true
        }));

        const { error: upsertError } = await supabase
          .from('provider_addons')
          .upsert(providerAddons, { 
            onConflict: 'provider_id,addon_id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error('Error upserting provider addons:', upsertError);
          return res.status(500).json({ 
            error: 'Failed to assign addons',
            details: upsertError.message 
          });
        }
      }

      res.json({
        success: true,
        message: 'Provider addons updated successfully',
        assigned_count: addon_ids.length
      });
    } catch (error: any) {
      console.error('Error in /api/provider/addons POST:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  // ==================== End Provider Services Management ====================

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: error.details,
        userMessage: 'Please check your input and try again.'
      });
    }
    
    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
        userMessage: 'Please sign in to continue.'
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      userMessage: 'Something went wrong. Please try again later.'
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Route not found',
      code: 'NOT_FOUND',
      userMessage: 'The requested resource was not found.'
    });
  });

  return app;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const port = process.env.PORT || 3002;
  app.listen(port, () => {
    console.log(`Provider app server running on port ${port}`);
  });
}
