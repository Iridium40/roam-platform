import type { 
  TwilioConfig, 
  ConversationData, 
  ParticipantData, 
  MessageData,
  TwilioResponse,
  ConversationParticipant,
  ConversationMessage,
  ConversationDetails,
  TwilioError,
  WebhookEventType,
  ParticipantRole,
  DeliveryStatus,
  ConversationState
} from '../types/twilio';

// Twilio service interface
export interface TwilioService {
  // Conversation management
  createConversation(data: ConversationData): Promise<TwilioResponse>;
  getConversation(conversationSid: string): Promise<TwilioResponse>;
  listConversations(limit?: number): Promise<TwilioResponse>;
  updateConversation(conversationSid: string, updates: Partial<ConversationData>): Promise<TwilioResponse>;
  deleteConversation(conversationSid: string): Promise<TwilioResponse>;
  closeConversation(conversationSid: string): Promise<TwilioResponse>;
  getConversationStats(conversationSid: string): Promise<TwilioResponse>;
  searchConversations(query: string): Promise<TwilioResponse>;

  // Participant management
  addParticipant(conversationSid: string, participantData: ParticipantData): Promise<TwilioResponse>;
  removeParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse>;
  getParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse>;
  listParticipants(conversationSid: string): Promise<TwilioResponse>;
  updateParticipant(conversationSid: string, participantSid: string, updates: Partial<ParticipantData>): Promise<TwilioResponse>;
  getParticipantByIdentity(conversationSid: string, identity: string): Promise<TwilioResponse>;
  participantExists(conversationSid: string, identity: string): Promise<TwilioResponse>;
  getParticipantCount(conversationSid: string): Promise<TwilioResponse>;
  getParticipantsByRole(conversationSid: string, role: ParticipantRole): Promise<TwilioResponse>;

  // Message management
  sendMessage(conversationSid: string, messageData: MessageData, author: string): Promise<TwilioResponse>;
  getMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  listMessages(conversationSid: string, limit?: number): Promise<TwilioResponse>;
  updateMessage(conversationSid: string, messageSid: string, updates: Partial<MessageData>): Promise<TwilioResponse>;
  deleteMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  getMessageDeliveryStatus(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  getMessagesByAuthor(conversationSid: string, author: string, limit?: number): Promise<TwilioResponse>;
  searchMessages(conversationSid: string, query: string, limit?: number): Promise<TwilioResponse>;
  getMessageCount(conversationSid: string): Promise<TwilioResponse>;
  getRecentMessages(conversationSid: string, hours: number): Promise<TwilioResponse>;

  // Booking-specific methods
  createBookingConversation(bookingId: string, participants: BookingParticipant[]): Promise<TwilioResponse>;
  sendBookingMessage(conversationSid: string, message: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse>;
  getBookingMessages(conversationSid: string): Promise<TwilioResponse>;
  addBookingParticipant(conversationSid: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse>;
}

// Booking-specific types
export interface BookingParticipant {
  userId: string;
  userType: 'customer' | 'provider';
  userName?: string;
  userEmail?: string;
}

export interface BookingMessage {
  id: string;
  content: string;
  author: string;
  authorName: string;
  timestamp: string;
  userId: string;
  userType: 'customer' | 'provider';
}

// Twilio service implementation base class
export abstract class BaseTwilioService implements TwilioService {
  protected config: TwilioConfig;
  protected client: any; // Twilio client instance

  constructor(config: TwilioConfig) {
    this.config = config;
    this.initializeClient();
  }

  protected abstract initializeClient(): void;

  // Conversation management implementations
  abstract createConversation(data: ConversationData): Promise<TwilioResponse>;
  abstract getConversation(conversationSid: string): Promise<TwilioResponse>;
  abstract listConversations(limit?: number): Promise<TwilioResponse>;
  abstract updateConversation(conversationSid: string, updates: Partial<ConversationData>): Promise<TwilioResponse>;
  abstract deleteConversation(conversationSid: string): Promise<TwilioResponse>;
  abstract closeConversation(conversationSid: string): Promise<TwilioResponse>;
  abstract getConversationStats(conversationSid: string): Promise<TwilioResponse>;
  abstract searchConversations(query: string): Promise<TwilioResponse>;

  // Participant management implementations
  abstract addParticipant(conversationSid: string, participantData: ParticipantData): Promise<TwilioResponse>;
  abstract removeParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse>;
  abstract getParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse>;
  abstract listParticipants(conversationSid: string): Promise<TwilioResponse>;
  abstract updateParticipant(conversationSid: string, participantSid: string, updates: Partial<ParticipantData>): Promise<TwilioResponse>;
  abstract getParticipantByIdentity(conversationSid: string, identity: string): Promise<TwilioResponse>;
  abstract participantExists(conversationSid: string, identity: string): Promise<TwilioResponse>;
  abstract getParticipantCount(conversationSid: string): Promise<TwilioResponse>;
  abstract getParticipantsByRole(conversationSid: string, role: ParticipantRole): Promise<TwilioResponse>;

  // Message management implementations
  abstract sendMessage(conversationSid: string, messageData: MessageData, author: string): Promise<TwilioResponse>;
  abstract getMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  abstract listMessages(conversationSid: string, limit?: number): Promise<TwilioResponse>;
  abstract updateMessage(conversationSid: string, messageSid: string, updates: Partial<MessageData>): Promise<TwilioResponse>;
  abstract deleteMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  abstract getMessageDeliveryStatus(conversationSid: string, messageSid: string): Promise<TwilioResponse>;
  abstract getMessagesByAuthor(conversationSid: string, author: string, limit?: number): Promise<TwilioResponse>;
  abstract searchMessages(conversationSid: string, query: string, limit?: number): Promise<TwilioResponse>;
  abstract getMessageCount(conversationSid: string): Promise<TwilioResponse>;
  abstract getRecentMessages(conversationSid: string, hours: number): Promise<TwilioResponse>;

  // Booking-specific implementations
  abstract createBookingConversation(bookingId: string, participants: BookingParticipant[]): Promise<TwilioResponse>;
  abstract sendBookingMessage(conversationSid: string, message: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse>;
  abstract getBookingMessages(conversationSid: string): Promise<TwilioResponse>;
  abstract addBookingParticipant(conversationSid: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse>;

  // Helper methods
  protected formatSuccessResponse(data?: any, message?: string): TwilioResponse {
    return {
      success: true,
      data,
      message
    };
  }

  protected formatErrorResponse(error: string, details?: any): TwilioResponse {
    return {
      success: false,
      error,
      data: details
    };
  }

  protected handleTwilioError(error: any): TwilioResponse {
    console.error('Twilio API error:', error);
    
    if (error.code) {
      return this.formatErrorResponse(`Twilio API Error: ${error.message}`, {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      });
    }

    return this.formatErrorResponse('Twilio API Error', {
      message: error.message || 'Unknown error',
      stack: error.stack
    });
  }

  protected validateConversationSid(conversationSid: string): boolean {
    return Boolean(conversationSid && conversationSid.startsWith('CH'));
  }

  protected validateParticipantSid(participantSid: string): boolean {
    return Boolean(participantSid && participantSid.startsWith('MB'));
  }

  protected validateMessageSid(messageSid: string): boolean {
    return Boolean(messageSid && messageSid.startsWith('IM'));
  }

  protected formatParticipantIdentity(userId: string, userType: 'customer' | 'provider'): string {
    return `${userType}-${userId}`;
  }

  protected parseParticipantIdentity(identity: string): { userId: string; userType: 'customer' | 'provider' } | null {
    const parts = identity.split('-');
    if (parts.length >= 2) {
      const userType = parts[0] as 'customer' | 'provider';
      const userId = parts.slice(1).join('-');
      return { userId, userType };
    }
    return null;
  }

  protected createConversationAttributes(bookingId: string, additionalAttributes?: Record<string, any>): Record<string, any> {
    return {
      bookingId,
      createdAt: new Date().toISOString(),
      type: 'booking-chat',
      ...additionalAttributes
    };
  }

  protected createParticipantAttributes(userId: string, userType: 'customer' | 'provider', userName?: string): Record<string, any> {
    return {
      role: userType,
      name: userName || `${userType}-${userId}`,
      userId,
      userType,
      joinedAt: new Date().toISOString()
    };
  }

  protected createMessageAttributes(userId: string, userType: 'customer' | 'provider', authorName?: string): Record<string, any> {
    return {
      userId,
      userType,
      authorName: authorName || `${userType}-${userId}`,
      timestamp: new Date().toISOString()
    };
  }
}

// Twilio configuration helper
import { env } from '../config/environment';

export class TwilioConfigHelper {
  static validateConfig(config: TwilioConfig): boolean {
    return !!(config.accountSid && config.authToken && config.conversationsServiceSid);
  }

  static fromEnvironment(): TwilioConfig {
    const accountSid = env.twilio.accountSid;
    const authToken = env.twilio.authToken;
    const conversationsServiceSid = env.twilio.conversationsServiceSid;

    if (!accountSid || !authToken || !conversationsServiceSid) {
      throw new Error('Missing required Twilio environment variables');
    }

    return {
      accountSid,
      authToken,
      conversationsServiceSid
    };
  }

  static getEnvironmentConfig(): TwilioConfig {
    try {
      return this.fromEnvironment();
    } catch (error) {
      console.error('Failed to load Twilio configuration:', error);
      throw error;
    }
  }
}

// Twilio action handler
export class TwilioActionHandler {
  private service: TwilioService;

  constructor(service: TwilioService) {
    this.service = service;
  }

  async handleAction(action: string, data: any): Promise<TwilioResponse> {
    try {
      switch (action) {
        case 'create_conversation':
          return await this.service.createConversation(data);

        case 'get_conversation':
          return await this.service.getConversation(data.conversationSid);

        case 'list_conversations':
          return await this.service.listConversations(data.limit);

        case 'update_conversation':
          return await this.service.updateConversation(data.conversationSid, data.updates);

        case 'delete_conversation':
          return await this.service.deleteConversation(data.conversationSid);

        case 'close_conversation':
          return await this.service.closeConversation(data.conversationSid);

        case 'get_conversation_stats':
          return await this.service.getConversationStats(data.conversationSid);

        case 'search_conversations':
          return await this.service.searchConversations(data.query);

        case 'add_participant':
          return await this.service.addParticipant(data.conversationSid, data.participantData);

        case 'remove_participant':
          return await this.service.removeParticipant(data.conversationSid, data.participantSid);

        case 'get_participant':
          return await this.service.getParticipant(data.conversationSid, data.participantSid);

        case 'list_participants':
          return await this.service.listParticipants(data.conversationSid);

        case 'update_participant':
          return await this.service.updateParticipant(data.conversationSid, data.participantSid, data.updates);

        case 'get_participant_by_identity':
          return await this.service.getParticipantByIdentity(data.conversationSid, data.identity);

        case 'participant_exists':
          return await this.service.participantExists(data.conversationSid, data.identity);

        case 'get_participant_count':
          return await this.service.getParticipantCount(data.conversationSid);

        case 'get_participants_by_role':
          return await this.service.getParticipantsByRole(data.conversationSid, data.role);

        case 'send_message':
          return await this.service.sendMessage(data.conversationSid, data.messageData, data.author);

        case 'get_message':
          return await this.service.getMessage(data.conversationSid, data.messageSid);

        case 'list_messages':
          return await this.service.listMessages(data.conversationSid, data.limit);

        case 'update_message':
          return await this.service.updateMessage(data.conversationSid, data.messageSid, data.updates);

        case 'delete_message':
          return await this.service.deleteMessage(data.conversationSid, data.messageSid);

        case 'get_message_delivery_status':
          return await this.service.getMessageDeliveryStatus(data.conversationSid, data.messageSid);

        case 'get_messages_by_author':
          return await this.service.getMessagesByAuthor(data.conversationSid, data.author, data.limit);

        case 'search_messages':
          return await this.service.searchMessages(data.conversationSid, data.query, data.limit);

        case 'get_message_count':
          return await this.service.getMessageCount(data.conversationSid);

        case 'get_recent_messages':
          return await this.service.getRecentMessages(data.conversationSid, data.hours);

        // Booking-specific actions
        case 'create_booking_conversation':
          return await this.service.createBookingConversation(data.bookingId, data.participants);

        case 'send_booking_message':
          return await this.service.sendBookingMessage(data.conversationSid, data.message, data.userId, data.userType);

        case 'get_booking_messages':
          return await this.service.getBookingMessages(data.conversationSid);

        case 'add_booking_participant':
          return await this.service.addBookingParticipant(data.conversationSid, data.userId, data.userType);

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`
          };
      }
    } catch (error) {
      console.error(`Error handling action ${action}:`, error);
      return {
        success: false,
        error: 'Internal server error',
        data: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}
