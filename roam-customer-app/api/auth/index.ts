import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createAuthAPI, SupabaseAuthService } from '@roam/shared';

// Create auth service with default email service
const authService = new SupabaseAuthService();
const api = createAuthAPI(authService);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
