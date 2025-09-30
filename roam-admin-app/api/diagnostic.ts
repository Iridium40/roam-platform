import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Simple diagnostic endpoint
    const response = {
      status: 'success',
      message: 'Admin API is working',
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}