import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createNotificationAPI } from '@roam/shared';

// Create notification API with shared service
const api = createNotificationAPI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
