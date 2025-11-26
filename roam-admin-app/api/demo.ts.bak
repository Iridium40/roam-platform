import { VercelRequest, VercelResponse } from '@vercel/node';
import { DemoResponse } from '../shared/api';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const response: DemoResponse = {
    message: "Hello from Express server",
  };
  res.status(200).json(response);
}
