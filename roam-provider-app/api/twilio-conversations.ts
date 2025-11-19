import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import server-side handler using relative path (Vercel serverless compatibility)
// Note: TypeScript resolves without .js, but runtime needs .js extension
import twilioConversationsHandler from "../../packages/shared/dist/api/twilio-conversations-handler";

/**
 * Unified Twilio Conversations API Handler for Provider App
 * Uses the shared handler from @roam/shared package
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
