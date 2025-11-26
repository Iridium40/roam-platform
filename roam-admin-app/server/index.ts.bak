import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo.js";
import { handleSystemConfig } from "./routes/system-config.js";
import { handleTestSMS, handleGetSMSSettings } from "./routes/sms.js";
import { handleUploadImage } from "./routes/storage.js";
import { handleSendApprovalEmail } from "./routes/send-approval-email.js";
import { handleSendRejectionEmail } from "./routes/send-rejection-email.js";
import { handleSendContactReply } from "./routes/send-contact-reply.js";
import { handleValidatePhase2Token } from "./routes/validate-phase2-token.js";
import { handleBusinessServiceCategories } from "./routes/business-service-categories.js";
import { handleBusinessServiceSubcategories } from "./routes/business-service-subcategories.js";
import { handleBusinesses, handleVerificationStats } from "./routes/businesses.js";
import { handleBusinessDocuments } from "./routes/business-documents.js";
import { handleUsers, handleUserActivity } from "./routes/users.js";
import { handleBookings, handleBookingStats, handleBookingTrends } from "./routes/bookings.js";
import { 
  handleFinancialStats, 
  handleTransactions, 
  handlePayoutRequests, 
  handleUpdatePayoutStatus, 
  handleRevenueData 
} from "./routes/financial.js";
import { 
  handleReportMetrics,
  handleUserReports,
  handleBookingReports,
  handleBusinessReports,
  handleServiceReports
} from "./routes/reports.js";
import { 
  handleReviews, 
  handleReviewModeration, 
  handleFlaggedReviews 
} from "./routes/reviews.js";
import { 
  handlePromotions, 
  handlePromotionUsage, 
  handlePromotionActivation 
} from "./routes/promotions.js";
import { 
  handleAnnouncements, 
  handleAnnouncementPublication, 
  handleActiveAnnouncements 
} from "./routes/announcements.js";
import {
  handleCustomers,
  handleCustomerLocations,
  handleCustomerBookings,
  handleUpdateCustomerStatus
} from "./routes/customers.js";
import { handleServices, handleAllServiceData } from "./routes/services.js";

export function createServer() {
  const app = express();
  
  // Get port from environment or use default
  const port = process.env.PORT || 3001;

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    return res.json({ ok: true, timestamp: Date.now() });
  });

  // SMS routes
  app.post("/api/sms/test", handleTestSMS);
  app.get("/api/sms/settings/:id", handleGetSMSSettings);

  // Storage routes
  app.post("/api/storage/upload-image", handleUploadImage);

  app.get("/api/demo", handleDemo);
  app.get("/api/system-config", handleSystemConfig);
  app.post("/api/system-config", handleSystemConfig);
  app.put("/api/system-config/:id", handleSystemConfig);
  app.delete("/api/system-config/:id", handleSystemConfig);
  app.post("/api/send-approval-email", handleSendApprovalEmail);
  app.post("/api/send-rejection-email", handleSendRejectionEmail);
  app.post("/api/send-contact-reply", handleSendContactReply);
  app.post("/api/validate-phase2-token", handleValidatePhase2Token);
  
  // Test routes - disabled in production build to avoid Vite resolution issues
  // Uncomment and use dynamic import for local development if needed
  // app.post("/api/test/generate-phase2-token", async (req, res) => {
  //   try {
  //     const handler = await import("./routes/test/generate-phase2-token.js");
  //     return handler.default(req, res);
  //   } catch (error) {
  //     console.error("Test route not available:", error);
  //     return res.status(503).json({ error: "Test route not available in this environment" });
  //   }
  // });
  
  // Business management routes
  app.get("/api/businesses", handleBusinesses);
  app.put("/api/businesses", handleBusinesses);
  app.get("/api/verification/stats", handleVerificationStats);
  app.get("/api/business-documents", handleBusinessDocuments);
  
  // User management routes (monitoring only)
  app.get("/api/users", handleUsers);
  app.get("/api/users/activity", handleUserActivity);
  
  // Customer management routes
  app.get("/api/customers", handleCustomers);
  app.get("/api/customers/locations", handleCustomerLocations);
  app.get("/api/customers/bookings", handleCustomerBookings);
  app.post("/api/customers/update-status", handleUpdateCustomerStatus);
  
  // Service management routes
  app.get("/api/services/all-data", handleAllServiceData);
  app.get("/api/services", handleServices);
  app.post("/api/services", handleServices);
  app.put("/api/services/:id", handleServices);
  app.delete("/api/services/:id", handleServices);
  
  // Booking management routes (monitoring only)
  app.get("/api/bookings", handleBookings);
  app.get("/api/bookings/stats", handleBookingStats);
  app.get("/api/bookings/trends", handleBookingTrends);
  
  // Business service management routes
  app.get("/api/business-service-categories", handleBusinessServiceCategories);
  app.post("/api/business-service-categories", handleBusinessServiceCategories);
  app.delete("/api/business-service-categories", handleBusinessServiceCategories);
  
  app.get("/api/business-service-subcategories", handleBusinessServiceSubcategories);
  app.post("/api/business-service-subcategories", handleBusinessServiceSubcategories);
  app.delete("/api/business-service-subcategories", handleBusinessServiceSubcategories);
  
  // Financial management routes
  app.get("/api/financial/stats", handleFinancialStats);
  app.get("/api/financial/transactions", handleTransactions);
  app.get("/api/financial/payouts", handlePayoutRequests);
  app.post("/api/financial/payouts/update-status", handleUpdatePayoutStatus);
  app.get("/api/financial/revenue-data", handleRevenueData);
  
  // Reports and analytics routes
  app.get("/api/reports/metrics", handleReportMetrics);
  app.get("/api/reports/users", handleUserReports);
  app.get("/api/reports/bookings", handleBookingReports);
  app.get("/api/reports/businesses", handleBusinessReports);
  app.get("/api/reports/services", handleServiceReports);

  // Reviews management routes
  app.get("/api/reviews", handleReviews);
  app.post("/api/reviews", handleReviews);
  app.put("/api/reviews/:id", handleReviews);
  app.delete("/api/reviews/:id", handleReviews);
  app.post("/api/reviews/:id/moderate", handleReviewModeration);
  app.get("/api/reviews/flagged", handleFlaggedReviews);

  // Promotions management routes
  app.get("/api/promotions", handlePromotions);
  app.post("/api/promotions", handlePromotions);
  app.put("/api/promotions/:id", handlePromotions);
  app.delete("/api/promotions/:id", handlePromotions);
  app.get("/api/promotions/:id/usage", handlePromotionUsage);
  app.post("/api/promotions/:id/activate", handlePromotionActivation);
  app.post("/api/promotions/:id/deactivate", handlePromotionActivation);

  // Announcements management routes
  app.get("/api/announcements", handleAnnouncements);
  app.post("/api/announcements", handleAnnouncements);
  app.put("/api/announcements/:id", handleAnnouncements);
  app.delete("/api/announcements/:id", handleAnnouncements);
  app.post("/api/announcements/:id/publish", handleAnnouncementPublication);
  app.post("/api/announcements/:id/unpublish", handleAnnouncementPublication);
  app.get("/api/announcements/active", handleActiveAnnouncements);

  return app;
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const app = createServer();
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}
