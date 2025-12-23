import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import server-side handler from shared package (server-only entry point)
import twilioConversationsHandler from "../../packages/shared/dist/api/twilio-conversations-handler.js";

/**
 * Unified Twilio Conversations API Handler for Provider App
 * Uses the shared handler from @roam/shared package
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}

// Enable body parsing with increased size limit for media uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
