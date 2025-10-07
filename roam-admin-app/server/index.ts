import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSystemConfig } from "./routes/system-config";
import { handleTestSMS, handleGetSMSSettings } from "./routes/sms";
import { handleUploadImage } from "./routes/storage";
import { handleSendApprovalEmail } from "./routes/send-approval-email";
import { handleSendContactReply } from "./routes/send-contact-reply";
import { handleValidatePhase2Token } from "./routes/validate-phase2-token";
import { handleBusinessServiceCategories } from "./routes/business-service-categories";
import { handleBusinessServiceSubcategories } from "./routes/business-service-subcategories";
import { handleBusinesses, handleVerificationStats } from "./routes/businesses";
import { handleBusinessDocuments } from "./routes/business-documents";
import { handleUsers, handleUserActivity } from "./routes/users";
import { handleBookings, handleBookingStats, handleBookingTrends } from "./routes/bookings";
import { 
  handleFinancialStats, 
  handleTransactions, 
  handlePayoutRequests, 
  handleUpdatePayoutStatus, 
  handleRevenueData 
} from "./routes/financial";
import { 
  handleReportMetrics,
  handleUserReports,
  handleBookingReports,
  handleBusinessReports,
  handleServiceReports
} from "./routes/reports";
import { 
  handleReviews, 
  handleReviewModeration, 
  handleFlaggedReviews 
} from "./routes/reviews";
import { 
  handlePromotions, 
  handlePromotionUsage, 
  handlePromotionActivation 
} from "./routes/promotions";
import { 
  handleAnnouncements, 
  handleAnnouncementPublication, 
  handleActiveAnnouncements 
} from "./routes/announcements";

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
  app.post("/api/send-approval-email", handleSendApprovalEmail);
  app.post("/api/send-contact-reply", handleSendContactReply);
  app.post("/api/validate-phase2-token", handleValidatePhase2Token);
  
  // Business management routes
  app.get("/api/businesses", handleBusinesses);
  app.put("/api/businesses", handleBusinesses);
  app.get("/api/verification/stats", handleVerificationStats);
  app.get("/api/business-documents", handleBusinessDocuments);
  
  // User management routes (monitoring only)
  app.get("/api/users", handleUsers);
  app.get("/api/users/activity", handleUserActivity);
  
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
