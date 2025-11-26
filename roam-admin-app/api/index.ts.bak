import { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from '../server/index.js';

const app = createServer();

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
