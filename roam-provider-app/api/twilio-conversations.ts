import type { VercelRequest, VercelResponse } from "@vercel/node";
import { twilioConversationsHandler } from "@roam/shared";

/**
 * Unified Twilio Conversations API Handler for Provider App
 * Uses the shared handler from @roam/shared package
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
