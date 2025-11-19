import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTwilioConversationsService } from "@roam/shared/dist/services/twilio/TwilioConversationsService.js";

/**
 * Stub endpoint for listing conversations visible to the authenticated customer.
 * TODO: Implement conversation listing backed by conversation_metadata, conversation_participants, and message_notifications.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, userType } = req.body ?? {};
  if (!userId || !userType) {
    return res.status(400).json({ error: "userId and userType are required" });
  }

  const conversationsService = createTwilioConversationsService();
  if (!conversationsService) {
    return res.status(500).json({ error: "Conversations service not configured" });
  }

  // Placeholder response until implementation is complete
  return res.status(501).json({
    error: "Not implemented",
    message: "Conversation listing will be implemented using Supabase conversation tables.",
  });
}

