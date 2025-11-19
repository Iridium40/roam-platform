import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import server-side handler directly (not from main @roam/shared index)
import twilioConversationsHandler from "@roam/shared/dist/api/twilio-conversations-handler";

/**
 * Unified Twilio Conversations API Handler for Provider App
 * Uses the shared handler from @roam/shared package
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
