import type { VercelRequest, VercelResponse } from "@vercel/node";

export const runtime = 'edge';

// Simple notification endpoint for Vercel edge runtime
export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Enable CORS
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    const { searchParams } = new URL(request.url || '');
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    if (!userId) {
      return response.status(400).json({ error: 'Missing userId' });
    }

    // For now, return a simple response indicating the service is available
    // In a real implementation, you would integrate with a proper notification service
    return response.status(200).json({
      success: true,
      message: 'Notification service available',
      userId,
      userType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification edge API error:', error);
    return response.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
