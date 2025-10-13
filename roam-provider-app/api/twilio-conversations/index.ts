import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTwilioConversationsAPI, createTwilioConversationsWithDBFromEnv } from '@roam/shared';

// Create Twilio conversations service and API
const twilioService = createTwilioConversationsWithDBFromEnv();
if (!twilioService) {
  throw new Error('Twilio conversations service not configured');
}
const api = createTwilioConversationsAPI(twilioService);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
