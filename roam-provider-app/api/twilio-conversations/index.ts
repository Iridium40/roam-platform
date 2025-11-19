import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilioConversationsHandler from "../../../packages/shared/dist/api/twilio-conversations-handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return twilioConversationsHandler(req, res);
}
