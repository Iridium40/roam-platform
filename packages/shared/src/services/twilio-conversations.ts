import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import type { 
  TwilioConfig, 
  MessageData, 
  ParticipantData
} from './twilio/types';

// Database types matching the schema
export interface ConversationMetadata {
  id: string;
  booking_id: string;
  twilio_conversation_sid: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  participant_count: number;
}

export interface DatabaseConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user_type: 'customer' | 'provider' | 'owner' | 'dispatcher';
  twilio_participant_sid: string;
  created_at: string;
}

export interface CreateConversationData {
  bookingId: string;
  friendlyName?: string;
  uniqueName?: string;
  attributes?: Record<string, any>;
}

// Service interfaces
export interface ConversationService {
  createConversation(data: CreateConversationData): Promise<{ conversationId: string; error?: string }>;
  addParticipant(conversationId: string, participant: ParticipantData): Promise<{ success: boolean; participantSid?: string; error?: string }>;
  sendMessage(conversationId: string, message: MessageData): Promise<{ success: boolean; messageSid?: string; error?: string }>;
  getMessages(conversationId: string, limit?: number): Promise<{ messages: any[]; error?: string }>;
}

export interface ConversationServiceWithDB extends ConversationService {
  getConversationsForUser(userId: string, userType: DatabaseConversationParticipant['user_type']): Promise<{ conversations: ConversationMetadata[]; error?: string }>;
  createConversationWithDB(data: CreateConversationData): Promise<{ conversationId: string; metadataId?: string; error?: string }>;
  getDatabaseClient(): ReturnType<typeof createClient>;
}

// Implementation
export class TwilioConversationsServiceImpl implements ConversationServiceWithDB {
  private twilioClient: twilio.Twilio;
  private supabase: ReturnType<typeof createClient>;

  constructor(
    config: TwilioConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.twilioClient = twilio(config.accountSid, config.authToken);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  getDatabaseClient() {
    return this.supabase;
  }

  async createConversation(data: CreateConversationData): Promise<{ conversationId: string; error?: string }> {
    try {
      const conversation = await this.twilioClient.conversations.v1.conversations.create({
        friendlyName: data.friendlyName,
        uniqueName: data.uniqueName,
        attributes: JSON.stringify(data.attributes || {}),
      });

      return { conversationId: conversation.sid };
    } catch (error) {
      console.error('Error creating conversation:', error);
      return { 
        conversationId: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createConversationWithDB(data: CreateConversationData): Promise<{ conversationId: string; metadataId?: string; error?: string }> {
    try {
      // 1. Create Twilio conversation
      const twilioResult = await this.createConversation(data);

      if (twilioResult.error) {
        return twilioResult;
      }

      // 2. Store in database
      const { data: metadataData, error: dbError } = await this.supabase
        .from('conversation_metadata')
        .insert({
          booking_id: data.bookingId,
          twilio_conversation_sid: twilioResult.conversationId,
          participant_count: 0
        } as any)
        .select('id')
        .single<{ id: string }>();

      if (dbError) {
        console.error('Database error:', dbError);
        return { conversationId: '', error: 'Failed to store conversation in database' };
      }

      return { conversationId: twilioResult.conversationId, metadataId: metadataData?.id };
    } catch (error) {
      console.error('Error creating conversation with DB:', error);
      return { 
        conversationId: '', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getConversationsForUser(userId: string, userType: DatabaseConversationParticipant['user_type']): Promise<{ conversations: ConversationMetadata[]; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversation_metadata (*)
        `)
        .eq('user_id', userId)
        .eq('user_type', userType);

      if (error) {
        console.error('Database error fetching conversations:', error);
        return { conversations: [], error: error.message };
      }

      const conversations = data
        ?.map((item: any) => item.conversation_metadata)
        .filter(Boolean) || [];

      return { conversations };
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return { 
        conversations: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async addParticipant(conversationId: string, participant: ParticipantData): Promise<{ success: boolean; participantSid?: string; error?: string }> {
    try {
      const twilioParticipant = await this.twilioClient
        .conversations.v1.conversations(conversationId)
        .participants
        .create({
          identity: participant.identity,
          attributes: JSON.stringify(participant.attributes || {}),
          roleSid: participant.roleSid,
        });

      return { success: true, participantSid: twilioParticipant.sid };
    } catch (error) {
      console.error('Error adding participant:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendMessage(conversationId: string, message: MessageData): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    try {
      const twilioMessage = await this.twilioClient
        .conversations.v1.conversations(conversationId)
        .messages
        .create({
          body: message.body,
          attributes: JSON.stringify(message.attributes || {}),
          mediaSid: message.mediaSid,
        });

      return { success: true, messageSid: twilioMessage.sid };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getMessages(conversationId: string, limit: number = 50): Promise<{ messages: any[]; error?: string }> {
    try {
      const messages = await this.twilioClient
        .conversations.v1.conversations(conversationId)
        .messages
        .list({ limit });

      return { messages: messages.map((msg: any) => ({
        sid: msg.sid,
        body: msg.body,
        author: msg.author,
        dateCreated: msg.dateCreated,
        attributes: msg.attributes ? JSON.parse(msg.attributes) : {},
        media: msg.media
      })) };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return { 
        messages: [], 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Factory functions
export function createTwilioConversationsServiceWithDB(
  config: TwilioConfig,
  supabaseUrl: string,
  supabaseKey: string
): ConversationServiceWithDB {
  return new TwilioConversationsServiceImpl(config, supabaseUrl, supabaseKey);
}

// Environment-based factory function
export function createTwilioConversationsWithDBFromEnv(): ConversationServiceWithDB | null {
  let supabaseUrl: string;
  let supabaseKey: string;
  let twilioConfig: TwilioConfig;

  if (typeof window !== 'undefined') {
    // Client-side
    const envSource = (import.meta as any).env;
    supabaseUrl = envSource.VITE_PUBLIC_SUPABASE_URL;
    supabaseKey = envSource.VITE_PUBLIC_SUPABASE_ANON_KEY;
    
    twilioConfig = {
      accountSid: envSource.VITE_TWILIO_ACCOUNT_SID,
      authToken: envSource.VITE_TWILIO_AUTH_TOKEN,
      conversationsServiceSid: envSource.VITE_TWILIO_CONVERSATIONS_SERVICE_SID
    };
  } else {
    // Server-side
    supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL!;
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Use service role for server
    
    twilioConfig = {
      accountSid: process.env.VITE_TWILIO_ACCOUNT_SID!,
      authToken: process.env.VITE_TWILIO_AUTH_TOKEN!,
      conversationsServiceSid: process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID!
    };
  }

  if (!supabaseUrl || !supabaseKey || !twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.conversationsServiceSid) {
    console.warn('Missing environment variables for Twilio Conversations with DB');
    return null;
  }

  return new TwilioConversationsServiceImpl(twilioConfig, supabaseUrl, supabaseKey);
}
