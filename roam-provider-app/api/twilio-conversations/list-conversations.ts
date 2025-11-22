import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';
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
    // If userType is 'provider', get their provider_id to filter conversations
    let providerId: string | undefined;
    if (userType === 'provider') {
      const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data: providerData } = await supabase
          .from('providers')
          .select('id, provider_role')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        
        // Only filter by provider_id if provider_role is 'provider' (not 'owner' or 'dispatcher')
        if (providerData?.provider_role === 'provider') {
          providerId = providerData.id;
        }
      }
    }

    const conversations = await conversationsService.getConversationsForUser(
      userId,
      userType,
      businessId,
      providerId
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

