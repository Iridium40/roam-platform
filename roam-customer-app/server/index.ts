import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  handleEdgeNotifications,
  handleNotificationUpdates,
} from "./routes/edge-notifications";
import { requireAuth, AuthenticatedRequest } from "./middleware/auth";
import { validateRequest } from "./middleware/validation";
import { schemas } from "@roam/shared";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
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

  // Booking routes with validation
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
