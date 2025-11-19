import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createTwilioConversationsService } from "../../../packages/shared/dist/services/twilio/TwilioConversationsService.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId, userType, businessId } = req.body ?? {};

  if (!userId || !userType) {
    return res.status(400).json({ error: "userId and userType are required" });
  }

  const conversationsService = createTwilioConversationsService();
  if (!conversationsService) {
    return res.status(500).json({ error: "Conversations service not configured" });
  }

  try {
    const conversations = await conversationsService.getConversationsForUser(
      userId,
      userType,
      businessId
    );
    return res.status(200).json({
      success: true,
      conversations,
    });
  } catch (error) {
    console.error("Error loading provider conversations:", error);
    return res.status(500).json({
      error: "Failed to load conversations",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

