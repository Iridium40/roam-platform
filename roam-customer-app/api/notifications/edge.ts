import type { VercelRequest, VercelResponse } from "@vercel/node";

// Server-Sent Events (SSE) notification endpoint for Vercel edge runtime
export default async function handler(request: VercelRequest, response: VercelResponse) {
  // Enable CORS for SSE
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  response.setHeader('Cache-Control', 'no-cache');
  response.setHeader('Connection', 'keep-alive');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  try {
    // Handle relative URLs by constructing a full URL
    const requestUrl = request.url || '';
    const fullUrl = requestUrl.startsWith('http') 
      ? requestUrl 
      : `https://placeholder.com${requestUrl}`;
    
    const { searchParams } = new URL(fullUrl);
    const userId = searchParams.get('userId');
    const userType = searchParams.get('userType');

    if (!userId) {
      return response.status(400).json({ error: 'Missing userId' });
    }

    // For SSE, we need to send a stream of data
    if (request.method === 'GET') {
      // Set SSE headers
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial connection message
      response.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

      // For now, just send a heartbeat every 30 seconds to keep connection alive
      // In a real implementation, you would integrate with a proper notification service
      const heartbeatInterval = setInterval(() => {
        try {
          response.write('data: {"type":"heartbeat","timestamp":"' + new Date().toISOString() + '"}\n\n');
        } catch (error) {
          // Connection closed, clear interval
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Keep connection alive for 5 minutes
      setTimeout(() => {
        clearInterval(heartbeatInterval);
        response.end();
      }, 300000);

      // Handle client disconnect
      request.on('close', () => {
        clearInterval(heartbeatInterval);
        response.end();
      });

    } else if (request.method === 'PATCH') {
      // Handle marking notifications as read
      const body = await request.body as any;
      const { notificationId, read, userId: patchUserId, markAllRead } = body;

      if (markAllRead && patchUserId) {
        // Mark all notifications as read for user
        // In a real implementation, you would update the database
        return response.status(200).json({ success: true, message: 'All notifications marked as read' });
      } else if (notificationId && read !== undefined) {
        // Mark specific notification as read
        // In a real implementation, you would update the database
        return response.status(200).json({ success: true, message: 'Notification marked as read' });
      } else {
        return response.status(400).json({ error: 'Invalid request body' });
      }
    } else {
      return response.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Notification edge API error:', error);
    
    if (request.method === 'GET') {
      // For SSE, send error as event
      response.write('data: {"type":"error","message":"Internal server error"}\n\n');
      response.end();
    } else {
      return response.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
