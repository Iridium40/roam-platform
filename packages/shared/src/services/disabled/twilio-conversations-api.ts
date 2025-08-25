import type { VercelRequest, VercelResponse } from "@vercel/node";
import { TwilioActionHandler, TwilioConfigHelper } from './twilio';
import type { TwilioService, TwilioResponse } from './twilio';

// This will be implemented by the specific Twilio service implementation
export interface TwilioConversationsAPI {
  handleRequest(req: VercelRequest, res: VercelResponse): Promise<void>;
}

// Shared API handler that can be used by both customer and provider apps
export class SharedTwilioConversationsAPI implements TwilioConversationsAPI {
  private actionHandler: TwilioActionHandler;

  constructor(twilioService: TwilioService) {
    this.actionHandler = new TwilioActionHandler(twilioService);
  }

  async handleRequest(req: VercelRequest, res: VercelResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
      console.log('Twilio Conversations API called with action:', req.body?.action);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const { action, ...data } = req.body;

      if (!action) {
        return res.status(400).json({ 
          error: 'Missing action', 
          message: 'Action is required in request body' 
        });
      }

      // Handle the action using the action handler
      const result = await this.actionHandler.handleAction(action, data);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }

    } catch (error) {
      console.error('Twilio Conversations API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

// Factory function to create the API handler with proper configuration
export function createTwilioConversationsAPI(twilioService: TwilioService): TwilioConversationsAPI {
  return new SharedTwilioConversationsAPI(twilioService);
}

// Default export for easy importing
export default SharedTwilioConversationsAPI;

// Utility function to validate Twilio configuration
export function validateTwilioConfig(): boolean {
  try {
    TwilioConfigHelper.getEnvironmentConfig();
    return true;
  } catch (error) {
    console.error('Twilio configuration validation failed:', error);
    return false;
  }
}

// Utility function to get Twilio configuration
export function getTwilioConfig() {
  return TwilioConfigHelper.getEnvironmentConfig();
}

// Predefined actions for easy use
export const TWILIO_ACTIONS = {
  // Conversation actions
  CREATE_CONVERSATION: 'create_conversation',
  GET_CONVERSATION: 'get_conversation',
  LIST_CONVERSATIONS: 'list_conversations',
  UPDATE_CONVERSATION: 'update_conversation',
  DELETE_CONVERSATION: 'delete_conversation',
  CLOSE_CONVERSATION: 'close_conversation',
  GET_CONVERSATION_STATS: 'get_conversation_stats',
  SEARCH_CONVERSATIONS: 'search_conversations',

  // Participant actions
  ADD_PARTICIPANT: 'add_participant',
  REMOVE_PARTICIPANT: 'remove_participant',
  GET_PARTICIPANT: 'get_participant',
  LIST_PARTICIPANTS: 'list_participants',
  UPDATE_PARTICIPANT: 'update_participant',
  GET_PARTICIPANT_BY_IDENTITY: 'get_participant_by_identity',
  PARTICIPANT_EXISTS: 'participant_exists',
  GET_PARTICIPANT_COUNT: 'get_participant_count',
  GET_PARTICIPANTS_BY_ROLE: 'get_participants_by_role',

  // Message actions
  SEND_MESSAGE: 'send_message',
  GET_MESSAGE: 'get_message',
  LIST_MESSAGES: 'list_messages',
  UPDATE_MESSAGE: 'update_message',
  DELETE_MESSAGE: 'delete_message',
  GET_MESSAGE_DELIVERY_STATUS: 'get_message_delivery_status',
  GET_MESSAGES_BY_AUTHOR: 'get_messages_by_author',
  SEARCH_MESSAGES: 'search_messages',
  GET_MESSAGE_COUNT: 'get_message_count',
  GET_RECENT_MESSAGES: 'get_recent_messages',

  // Booking-specific actions
  CREATE_BOOKING_CONVERSATION: 'create_booking_conversation',
  SEND_BOOKING_MESSAGE: 'send_booking_message',
  GET_BOOKING_MESSAGES: 'get_booking_messages',
  ADD_BOOKING_PARTICIPANT: 'add_booking_participant',
} as const;
