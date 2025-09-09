import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSystemConfig } from "./routes/system-config";
import { handleSendApprovalEmail } from "./routes/send-approval-email";
import { handleValidatePhase2Token } from "./routes/validate-phase2-token";
import { handleBusinessServiceCategories } from "./routes/business-service-categories";
import { handleBusinessServiceSubcategories } from "./routes/business-service-subcategories";
import { handleBusinesses } from "./routes/businesses";
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
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/system-config", handleSystemConfig);
  app.post("/api/send-approval-email", handleSendApprovalEmail);
  app.post("/api/validate-phase2-token", handleValidatePhase2Token);
  
  // Business management routes
  app.get("/api/businesses", handleBusinesses);
  
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
