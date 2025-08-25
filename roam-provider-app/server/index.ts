import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getOnboardingStatus } from "./routes/onboarding";
import {
  handleEdgeNotifications,
  handleNotificationUpdates,
} from "./routes/edge-notifications";
import { createLinkToken, exchangePublicToken, checkConnection } from "./routes/plaid";
import { requireAuth, requireBusinessAccess, AuthenticatedRequest } from "./middleware/auth";
import { validateRequest } from "./middleware/validation";
import { schemas } from "../shared";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
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

  app.get("/api/demo", handleDemo);

  // Public onboarding route
  app.get("/api/onboarding/status/:userId", getOnboardingStatus);

  // Business info route - use Vercel API function with validation
  app.post("/api/onboarding/business-info", 
    validateRequest(schemas.businessInfo),
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

  // Plaid routes
  app.post("/api/plaid/create-link-token", createLinkToken);
  app.post("/api/plaid/exchange-public-token", 
    validateRequest(schemas.plaidToken),
    exchangePublicToken
  );
  app.get("/api/plaid/check-connection/:userId", checkConnection);

  // Stripe create connect account route
  app.post("/api/stripe/create-connect-account", async (req, res) => {
    try {
      console.log("Local server: Stripe create connect account route called");
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

  // Phase 2 progress routes with auth
  app.post("/api/onboarding/save-phase2-progress", 
    requireAuth(['owner', 'admin']),
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

  // Provider profile routes with auth
  app.get("/api/provider/profile/:userId", 
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import("../api/provider/profile/[userId]");
        await profileHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load provider profile handler" });
      }
    }
  );

  app.put("/api/provider/profile/:userId", 
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    validateRequest(schemas.userProfile),
    async (req: AuthenticatedRequest, res) => {
      try {
        const profileHandler = await import("../api/provider/profile/[userId]");
        await profileHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider profile handler:", error);
        res
          .status(500)
          .json({ error: "Failed to load provider profile handler" });
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

  app.patch("/api/bookings/:bookingId/status", 
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    validateRequest(schemas.bookingStatusUpdate),
    async (req: AuthenticatedRequest, res) => {
      try {
        const statusHandler = await import("../api/bookings/status-update");
        await statusHandler.default(req, res);
      } catch (error) {
        console.error("Error importing booking status update handler:", error);
        res.status(500).json({ error: "Failed to load booking status update handler" });
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

  // Edge notifications routes (development equivalent)
  app.get("/api/notifications/edge", handleEdgeNotifications);
  app.patch("/api/notifications/edge", handleNotificationUpdates);

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
