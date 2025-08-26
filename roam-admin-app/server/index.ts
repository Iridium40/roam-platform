import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSystemConfig } from "./routes/system-config";
import { handleSendApprovalEmail } from "./routes/send-approval-email";
import { handleValidatePhase2Token } from "./routes/validate-phase2-token";
import { handleBusinessServiceCategories } from "./routes/business-service-categories";
import { handleBusinessServiceSubcategories } from "./routes/business-service-subcategories";

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
  
  // Business service management routes
  app.get("/api/business-service-categories", handleBusinessServiceCategories);
  app.post("/api/business-service-categories", handleBusinessServiceCategories);
  app.delete("/api/business-service-categories", handleBusinessServiceCategories);
  
  app.get("/api/business-service-subcategories", handleBusinessServiceSubcategories);
  app.post("/api/business-service-subcategories", handleBusinessServiceSubcategories);
  app.delete("/api/business-service-subcategories", handleBusinessServiceSubcategories);

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
