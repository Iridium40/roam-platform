import { VercelRequest, VercelResponse } from '@vercel/node';
import { markMessagesAsRead } from '@roam/shared/src/api/mark-messages-read';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return markMessagesAsRead(req, res);
}

