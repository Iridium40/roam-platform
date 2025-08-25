import type { VercelRequest, VercelResponse } from '@vercel/node';

// Twilio Conversations Service Interface
export interface TwilioConversationsService {
  createConversation(participants: string[]): Promise<{ conversationId: string; error?: string }>;
  addParticipant(conversationId: string, participant: string): Promise<{ success: boolean; error?: string }>;
  sendMessage(conversationId: string, message: string, author: string): Promise<{ messageId: string; error?: string }>;
  getMessages(conversationId: string): Promise<{ messages: any[]; error?: string }>;
}

// Basic Twilio Conversations Service Implementation
export class BasicTwilioConversationsService implements TwilioConversationsService {
  async createConversation(participants: string[]): Promise<{ conversationId: string; error?: string }> {
    try {
      console.log(`[Twilio Conversations] Creating conversation with participants: ${participants.join(', ')}`);
      // Mock implementation - replace with actual Twilio API calls
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return { conversationId };
    } catch (error) {
      console.error('[Twilio Conversations] Error creating conversation:', error);
      return { conversationId: '', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async addParticipant(conversationId: string, participant: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[Twilio Conversations] Adding participant ${participant} to conversation ${conversationId}`);
      // Mock implementation - replace with actual Twilio API calls
      return { success: true };
    } catch (error) {
      console.error('[Twilio Conversations] Error adding participant:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendMessage(conversationId: string, message: string, author: string): Promise<{ messageId: string; error?: string }> {
    try {
      console.log(`[Twilio Conversations] Sending message to conversation ${conversationId} from ${author}: ${message}`);
      // Mock implementation - replace with actual Twilio API calls
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return { messageId };
    } catch (error) {
      console.error('[Twilio Conversations] Error sending message:', error);
      return { messageId: '', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMessages(conversationId: string): Promise<{ messages: any[]; error?: string }> {
    try {
      console.log(`[Twilio Conversations] Getting messages for conversation ${conversationId}`);
      // Mock implementation - replace with actual Twilio API calls
      return { messages: [] };
    } catch (error) {
      console.error('[Twilio Conversations] Error getting messages:', error);
      return { messages: [], error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Twilio Conversations API Handler
export class TwilioConversationsAPI {
  private service: TwilioConversationsService;

  constructor(service: TwilioConversationsService) {
    this.service = service;
  }

  async handleRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    try {
      const { action, ...data } = req.body;

      switch (action) {
        case 'create_conversation':
          await this.handleCreateConversation(req, res, data);
          break;
        case 'add_participant':
          await this.handleAddParticipant(req, res, data);
          break;
        case 'send_message':
          await this.handleSendMessage(req, res, data);
          break;
        case 'get_messages':
          await this.handleGetMessages(req, res, data);
          break;
        default:
          res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error('[Twilio Conversations API] Error:', error);
      res.status(500).json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleCreateConversation(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { participants } = data;
    
    if (!participants || !Array.isArray(participants)) {
      res.status(400).json({ error: 'Participants array is required' });
      return;
    }

    const result = await this.service.createConversation(participants);
    
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      conversationId: result.conversationId,
    });
  }

  private async handleAddParticipant(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { conversationId, participant } = data;
    
    if (!conversationId || !participant) {
      res.status(400).json({ error: 'Conversation ID and participant are required' });
      return;
    }

    const result = await this.service.addParticipant(conversationId, participant);
    
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Participant added successfully',
    });
  }

  private async handleSendMessage(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { conversationId, message, author } = data;
    
    if (!conversationId || !message || !author) {
      res.status(400).json({ error: 'Conversation ID, message, and author are required' });
      return;
    }

    const result = await this.service.sendMessage(conversationId, message, author);
    
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      messageId: result.messageId,
    });
  }

  private async handleGetMessages(_req: VercelRequest, res: VercelResponse, data: any): Promise<void> {
    const { conversationId } = data;
    
    if (!conversationId) {
      res.status(400).json({ error: 'Conversation ID is required' });
      return;
    }

    const result = await this.service.getMessages(conversationId);
    
    if (result.error) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(200).json({
      success: true,
      messages: result.messages,
    });
  }
}

// Factory functions
export function createTwilioConversationsService(): TwilioConversationsService {
  return new BasicTwilioConversationsService();
}

export function createTwilioConversationsAPI(service?: TwilioConversationsService): TwilioConversationsAPI {
  return new TwilioConversationsAPI(service || createTwilioConversationsService());
}
