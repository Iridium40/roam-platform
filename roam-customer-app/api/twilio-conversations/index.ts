import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTwilioConversationsAPI, createTwilioConversationsService } from '@roam/shared';

// Create Twilio conversations service and API
const twilioService = createTwilioConversationsService();
const api = createTwilioConversationsAPI(twilioService);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
