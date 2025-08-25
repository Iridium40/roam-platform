import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleSystemConfig } from "./routes/system-config";
import { handleSendApprovalEmail } from "./routes/send-approval-email";
import { handleValidatePhase2Token } from "./routes/validate-phase2-token";

export function createServer() {
  const app = express();

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

  return app;
}
