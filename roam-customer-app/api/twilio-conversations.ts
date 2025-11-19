import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import server-side handler from shared package (server-only entry point)
import twilioConversationsHandler from "@roam/shared/dist/api/twilio-conversations-handler.js";

/**
 * Unified Twilio Conversations API Handler for Customer App
 * Uses the shared handler from @roam/shared package
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
