import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleTestSMS, handleGetSMSSettings } from "./routes/sms";
import {
  handleEdgeNotifications,
  handleNotificationUpdates,
} from "./routes/edge-notifications";
import { requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { validateRequest } from "./middleware/validation";
import { schemas } from "../shared";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  
  // For Stripe webhooks, we need the raw body for signature verification
  // So we apply raw body parser BEFORE json parser, but only for webhook route
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
  
  // For all other routes, use JSON parser
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

  // SMS routes
  app.post("/api/sms/test", handleTestSMS);
  app.get("/api/sms/settings/:id", handleGetSMSSettings);

  // Auth routes with validation
  app.post("/api/auth/signup", 
    validateRequest(schemas.signup),
    async (req, res) => {
      try {
        const signupHandler = await import("../api/auth");
        await signupHandler.default(req, res);
      } catch (error) {
        console.error("Error importing signup handler:", error);
        res.status(500).json({ error: "Failed to load signup handler" });
      }
    }
  );

  // MFA routes with validation
  app.post("/api/mfa/setup", 
    requireAuth(['customer', 'provider', 'owner', 'dispatcher', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const mfaHandler = await import("../api/mfa");
        await mfaHandler.default(req, res);
      } catch (error) {
        console.error("Error importing MFA handler:", error);
        res.status(500).json({ error: "Failed to load MFA handler" });
      }
    }
  );

  // Service routes
  app.get("/api/services/get-service",
    async (req, res) => {
      try {
        const getServiceHandler = await import("../api/services/get-service");
        await getServiceHandler.default(req, res);
      } catch (error) {
        console.error("Error importing get-service handler:", error);
        res.status(500).json({ error: "Failed to load get-service handler" });
      }
    }
  );

  // Review routes
  app.get("/api/reviews/business",
    async (req, res) => {
      try {
        const businessReviewsHandler = await import("../api/reviews/business");
        await businessReviewsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing business reviews handler:", error);
        res.status(500).json({ error: "Failed to load business reviews handler" });
      }
    }
  );

  app.get("/api/reviews/provider",
    async (req, res) => {
      try {
        const providerReviewsHandler = await import("../api/reviews/provider");
        await providerReviewsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider reviews handler:", error);
        res.status(500).json({ error: "Failed to load provider reviews handler" });
      }
    }
  );

  app.get("/api/reviews/bulk-ratings",
    async (req, res) => {
      try {
        const bulkRatingsHandler = await import("../api/reviews/bulk-ratings");
        await bulkRatingsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing bulk ratings handler:", error);
        res.status(500).json({ error: "Failed to load bulk ratings handler" });
      }
    }
  );

  // Booking routes with validation
  app.get("/api/bookings/list",
    async (req, res) => {
      try {
        const listHandler = await import("../api/bookings/list");
        await listHandler.default(req, res);
      } catch (error) {
        console.error("Error importing bookings list handler:", error);
        res.status(500).json({ error: "Failed to load bookings list handler" });
      }
    }
  );

  app.post("/api/bookings", 
    requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
    validateRequest(schemas.createBooking),
    async (req: AuthenticatedRequest, res) => {
      try {
        const bookingHandler = await import("../api/bookings/create");
        await bookingHandler.default(req, res);
      } catch (error) {
        console.error("Error importing booking creation handler:", error);
        res.status(500).json({ error: "Failed to load booking creation handler" });
      }
    }
  );

  app.patch("/api/bookings/:bookingId/status", 
    requireAuth(['owner', 'dispatcher', 'provider', 'admin']),
    validateRequest(schemas.updateBookingStatus),
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

  // Payment routes with validation
  app.post("/api/stripe/payment-intent", 
    requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
    validateRequest(schemas.createPaymentIntent),
    async (req: AuthenticatedRequest, res) => {
      try {
        const paymentHandler = await import("../api/stripe/payment-intent");
        await paymentHandler.default(req, res);
      } catch (error) {
        console.error("Error importing payment intent handler:", error);
        res.status(500).json({ error: "Failed to load payment intent handler" });
      }
    }
  );

  app.post("/api/stripe/create-payment-intent", 
    requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const createPaymentHandler = await import("../api/stripe/create-payment-intent");
        await createPaymentHandler.default(req, res);
      } catch (error) {
        console.error("Error importing create payment intent handler:", error);
        res.status(500).json({ error: "Failed to load create payment intent handler" });
      }
    }
  );

  app.post("/api/stripe/customer", 
    requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const customerHandler = await import("../api/stripe/customer");
        await customerHandler.default(req, res);
      } catch (error) {
        console.error("Error importing customer handler:", error);
        res.status(500).json({ error: "Failed to load customer handler" });
      }
    }
  );

  app.post("/api/stripe/subscription",
    requireAuth(['customer', 'owner', 'dispatcher', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const subscriptionHandler = await import("../api/stripe/subscription");
        await subscriptionHandler.default(req, res);
      } catch (error) {
        console.error("Error importing subscription handler:", error);
        res.status(500).json({ error: "Failed to load subscription handler" });
      }
    }
  );

  app.post("/api/stripe/create-checkout-session",
    async (req, res) => {
      try {
        const checkoutHandler = await import("../api/stripe/create-checkout-session");
        await checkoutHandler.default(req, res);
      } catch (error) {
        console.error("Error importing checkout session handler:", error);
        res.status(500).json({ error: "Failed to load checkout session handler" });
      }
    }
  );

  app.post("/api/stripe/create-tip-checkout-session",
    async (req, res) => {
      try {
        const tipCheckoutHandler = await import("../api/stripe/create-tip-checkout-session");
        await tipCheckoutHandler.default(req, res);
      } catch (error) {
        console.error("Error importing tip checkout session handler:", error);
        res.status(500).json({ error: "Failed to load tip checkout session handler" });
      }
    }
  );

  app.post("/api/stripe/create-tip-payment-intent",
    async (req, res) => {
      try {
        const tipPaymentIntentHandler = await import("../api/stripe/create-tip-payment-intent");
        await tipPaymentIntentHandler.default(req, res);
      } catch (error) {
        console.error("Error importing tip payment intent handler:", error);
        res.status(500).json({ error: "Failed to load tip payment intent handler" });
      }
    }
  );

  app.post("/api/stripe/create-balance-checkout-session",
    async (req, res) => {
      try {
        const balanceCheckoutHandler = await import("../api/stripe/create-balance-checkout-session");
        await balanceCheckoutHandler.default(req, res);
      } catch (error) {
        console.error("Error importing balance checkout session handler:", error);
        res.status(500).json({ error: "Failed to load balance checkout session handler" });
      }
    }
  );

  app.post("/api/stripe/create-balance-payment-intent",
    async (req, res) => {
      try {
        const balancePaymentHandler = await import("../api/stripe/create-balance-payment-intent");
        await balancePaymentHandler.default(req, res);
      } catch (error) {
        console.error("Error importing balance payment intent handler:", error);
        res.status(500).json({ error: "Failed to load balance payment intent handler" });
      }
    }
  );

  // Webhook handler function (used by both routes)
  const handleStripeWebhook = async (req: any, res: any) => {
    console.log('🎯 [WEBHOOK] Received webhook request from Stripe');
    console.log('🎯 [WEBHOOK] Headers:', req.headers);
    console.log('🎯 [WEBHOOK] Body type:', typeof req.body, 'Is Buffer:', Buffer.isBuffer(req.body));
    try {
      const webhookHandler = await import("../api/stripe/webhook");
      await webhookHandler.default(req, res);
      console.log('✅ [WEBHOOK] Webhook handler completed successfully');
    } catch (error) {
      console.error("❌ [WEBHOOK] Error importing/running webhook handler:", error);
      res.status(500).json({ error: "Failed to load webhook handler" });
    }
  };

  // Production webhook endpoint (configured in Stripe Dashboard)
  app.post("/api/webhooks/stripe", handleStripeWebhook);
  
  // Local/development webhook endpoint (for Stripe CLI)
  app.post("/api/stripe/webhook", handleStripeWebhook);

  app.get("/api/stripe/session",
    async (req, res) => {
      try {
        const sessionHandler = await import("../api/stripe/session");
        await sessionHandler.default(req, res);
      } catch (error) {
        console.error("Error importing session handler:", error);
        res.status(500).json({ error: "Failed to load session handler" });
      }
    }
  );

  // Notification routes
  app.post("/api/notifications", 
    requireAuth(['customer', 'provider', 'owner', 'dispatcher', 'admin']),
    validateRequest(schemas.sendNotification),
    async (req: AuthenticatedRequest, res) => {
      try {
        const notificationHandler = await import("../api/notifications");
        await notificationHandler.default(req, res);
      } catch (error) {
        console.error("Error importing notification handler:", error);
        res.status(500).json({ error: "Failed to load notification handler" });
      }
    }
  );

  // Edge notifications routes (development equivalent)
  app.get("/api/notifications/edge", handleEdgeNotifications);
  app.patch("/api/notifications/edge", handleNotificationUpdates);

  // Twilio conversations routes
  app.post("/api/twilio-conversations",
    requireAuth(['customer', 'provider', 'owner', 'dispatcher', 'admin']),
    async (req: AuthenticatedRequest, res) => {
      try {
        const conversationsHandler = await import("../api/twilio-conversations");
        await conversationsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing twilio conversations handler:", error);
        res.status(500).json({ error: "Failed to load twilio conversations handler" });
      }
    }
  );

  // Contact form submission route (no auth required)
  app.post("/api/contact/submit",
    async (req, res) => {
      try {
        const contactHandler = await import("../api/contact/submit");
        await contactHandler.default(req, res);
      } catch (error) {
        console.error("Error importing contact handler:", error);
        res.status(500).json({ error: "Failed to load contact handler" });
      }
    }
  );

  // Chat API route (no auth required for now)
  app.post("/api/chat",
    async (req, res) => {
      try {
        const chatHandler = await import("../api/chat");
        await chatHandler.default(req, res);
      } catch (error) {
        console.error("Error importing chat handler:", error);
        res.status(500).json({ error: "Failed to load chat handler" });
      }
    }
  );

  // Newsletter subscription route (no auth required)
  app.post("/api/subscribe",
    async (req, res) => {
      try {
        const subscribeHandler = await import("../api/subscribe");
        await subscribeHandler.default(req, res);
      } catch (error) {
        console.error("Error importing subscribe handler:", error);
        res.status(500).json({ error: "Failed to load subscribe handler" });
      }
    }
  );

  // Business search route
  app.get("/api/businesses/search",
    async (req, res) => {
      try {
        const searchHandler = await import("../api/businesses/search");
        await searchHandler.default(req, res);
      } catch (error) {
        console.error("Error importing businesses search handler:", error);
        res.status(500).json({ error: "Failed to load businesses search handler" });
      }
    }
  );

  // Featured businesses route (server-side to bypass RLS joins)
  app.get("/api/businesses/featured",
    async (req, res) => {
      try {
        const featuredHandler = await import("../api/businesses/featured");
        await featuredHandler.default(req, res);
      } catch (error) {
        console.error("Error importing featured businesses handler:", error);
        res.status(500).json({ error: "Failed to load featured businesses handler" });
      }
    }
  );

  // Businesses-by-service route (server-side to bypass RLS joins)
  app.get("/api/businesses/by-service",
    async (req, res) => {
      try {
        const handler = await import("../api/businesses/by-service");
        await handler.default(req, res);
      } catch (error) {
        console.error("Error importing businesses by-service handler:", error);
        res.status(500).json({ error: "Failed to load businesses by-service handler" });
      }
    }
  );

  // Providers-by-service route (server-side to bypass RLS joins)
  app.get("/api/providers/by-service",
    async (req, res) => {
      try {
        const handler = await import("../api/providers/by-service");
        await handler.default(req, res);
      } catch (error) {
        console.error("Error importing providers by-service handler:", error);
        res.status(500).json({ error: "Failed to load providers by-service handler" });
      }
    }
  );

  // Favorites routes
  app.get("/api/favorites/service",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/service");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing service favorites handler:", error);
        res.status(500).json({ error: "Failed to load service favorites handler" });
      }
    }
  );

  app.post("/api/favorites/service",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/service");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing service favorites handler:", error);
        res.status(500).json({ error: "Failed to load service favorites handler" });
      }
    }
  );

  app.delete("/api/favorites/service",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/service");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing service favorites handler:", error);
        res.status(500).json({ error: "Failed to load service favorites handler" });
      }
    }
  );

  // Provider favorites routes
  app.get("/api/favorites/provider",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/provider");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider favorites handler:", error);
        res.status(500).json({ error: "Failed to load provider favorites handler" });
      }
    }
  );

  app.post("/api/favorites/provider",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/provider");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider favorites handler:", error);
        res.status(500).json({ error: "Failed to load provider favorites handler" });
      }
    }
  );

  app.delete("/api/favorites/provider",
    async (req, res) => {
      try {
        const favoritesHandler = await import("../api/favorites/provider");
        await favoritesHandler.default(req, res);
      } catch (error) {
        console.error("Error importing provider favorites handler:", error);
        res.status(500).json({ error: "Failed to load provider favorites handler" });
      }
    }
  );

  // User settings routes
  app.get("/api/user-settings",
    async (req, res) => {
      try {
        const userSettingsHandler = await import("../api/user-settings");
        await userSettingsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing user settings handler:", error);
        res.status(500).json({ error: "Failed to load user settings handler" });
      }
    }
  );

  app.post("/api/user-settings",
    async (req, res) => {
      try {
        const userSettingsHandler = await import("../api/user-settings");
        await userSettingsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing user settings handler:", error);
        res.status(500).json({ error: "Failed to load user settings handler" });
      }
    }
  );

  app.put("/api/user-settings",
    async (req, res) => {
      try {
        const userSettingsHandler = await import("../api/user-settings");
        await userSettingsHandler.default(req, res);
      } catch (error) {
        console.error("Error importing user settings handler:", error);
        res.status(500).json({ error: "Failed to load user settings handler" });
      }
    }
  );

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

// For Vercel deployment
export default createServer();
