import { createClient } from '@supabase/supabase-js';

// Create Supabase client for shared package
const isBrowser = typeof window !== 'undefined';
const envSource = isBrowser ? (import.meta as any).env : process.env;

// Validate required environment variables
function validateEnvironment() {
  const supabaseUrl = envSource.VITE_PUBLIC_SUPABASE_URL || envSource.SUPABASE_URL;
  const supabaseAnonKey = envSource.VITE_PUBLIC_SUPABASE_ANON_KEY || envSource.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase environment variables. ' +
      'Please ensure VITE_PUBLIC_SUPABASE_URL and VITE_PUBLIC_SUPABASE_ANON_KEY are set.'
    );
  }
  
  return { supabaseUrl, supabaseAnonKey };
}

const { supabaseUrl, supabaseAnonKey } = validateEnvironment();
const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { 
  Conversation, 
  ConversationMessage, 
  ConversationParticipant,
  CreateConversationParams,
  SendMessageParams,
  AddParticipantParams
} from '../types/conversations';

export class ConversationsService {
  /**
   * Load conversations for a user
   */
  static async loadConversations(userId: string, userType: string): Promise<Conversation[]> {
    try {
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversation_metadata (
            id,
            booking_id,
            twilio_conversation_sid,
            created_at,
            last_message_at,
            participant_count,
            is_active,
            conversation_type,
            bookings (
              id,
              service_id,
              booking_date,
              booking_status,
              business_id,
              providers (
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('user_id', userId)
        .eq('user_type', userType)
        .eq('is_active', true);

      if (participantError) {
        throw participantError;
      }

      // Transform the data to match our Conversation interface
      const transformedConversations = participantData?.map((item: any) => ({
        id: item.conversation_metadata.id,
        booking_id: item.conversation_metadata.booking_id,
        twilio_conversation_sid: item.conversation_metadata.twilio_conversation_sid,
        created_at: item.conversation_metadata.created_at,
        last_message_at: item.conversation_metadata.last_message_at,
        participant_count: item.conversation_metadata.participant_count,
        is_active: item.conversation_metadata.is_active,
        conversation_type: item.conversation_metadata.conversation_type,
        booking: item.conversation_metadata.bookings ? {
          id: item.conversation_metadata.bookings.id,
          service_name: `Service ${item.conversation_metadata.bookings.service_id}`, // Placeholder - would need to join with services table
          booking_date: item.conversation_metadata.bookings.booking_date,
          status: item.conversation_metadata.bookings.booking_status,
          business_profiles: undefined, // Would need to join with business_profiles table
          providers: item.conversation_metadata.bookings.providers,
        } : undefined,
      })) || [];

      return transformedConversations;
    } catch (error) {
      console.error('Error loading conversations:', error);
      throw error;
    }
  }

  /**
   * Load participants for a conversation
   */
  static async loadParticipants(conversationId: string): Promise<ConversationParticipant[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error loading participants:', error);
      throw error;
    }
  }

  /**
   * Create a new conversation
   */
  static async createConversation(_params: CreateConversationParams): Promise<string> {
    try {
      // For now, this is a placeholder implementation
      // In a real implementation, you would:
      // 1. Create the conversation in conversation_metadata
      // 2. Add participants to conversation_participants
      // 3. Return the conversation ID
      
      // Placeholder: return a mock conversation ID
      return `conv_${Date.now()}`;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(_params: SendMessageParams): Promise<string> {
    try {
      // For now, this is a placeholder implementation
      // In a real implementation, you would:
      // 1. Insert the message into a messages table
      // 2. Update the last_message_at in conversation_metadata
      // 3. Return the message ID
      
      // Placeholder: return a mock message ID
      return `msg_${Date.now()}`;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Add a participant to a conversation
   */
  static async addParticipant(_params: AddParticipantParams): Promise<string> {
    try {
      // For now, this is a placeholder implementation
      // In a real implementation, you would:
      // 1. Insert the participant into conversation_participants
      // 2. Update the participant_count in conversation_metadata
      // 3. Return the participant ID
      
      // Placeholder: return a mock participant ID
      return `part_${Date.now()}`;
    } catch (error) {
      console.error('Error adding participant:', error);
      throw error;
    }
  }

  /**
   * Mark conversation as read
   */
  static async markAsRead(conversationId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }

  /**
   * Load messages for a conversation
   */
  static async loadMessages(_conversationId: string): Promise<ConversationMessage[]> {
    try {
      // For now, we'll return empty messages since we don't have a messages table
      // In a real implementation, you'd query a messages table
      return [];
    } catch (error) {
      console.error('Error loading messages:', error);
      throw error;
    }
  }
}
