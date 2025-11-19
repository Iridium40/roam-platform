import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConversationService } from './ConversationService.js';
import { ParticipantService } from './ParticipantService.js';
import { MessageService } from './MessageService.js';
import type { TwilioConfig } from './types.js';

/**
 * Unified Twilio Conversations Service with Supabase Integration
 * 
 * This service combines Twilio Conversations API with Supabase database operations
 * to provide a complete messaging solution for the ROAM platform.
 */
export class TwilioConversationsService {
  private conversationService: ConversationService;
  private participantService: ParticipantService;
  private messageService: MessageService;
  private supabase: SupabaseClient;

  constructor(
    twilioConfig: TwilioConfig,
    supabaseUrl: string,
    supabaseKey: string
  ) {
    this.conversationService = new ConversationService(twilioConfig);
    this.participantService = new ParticipantService(twilioConfig);
    this.messageService = new MessageService(twilioConfig);
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a conversation for a booking with participants
   * This creates both the Twilio conversation and stores metadata in Supabase
   */
  async createBookingConversation(
    bookingId: string,
    participants: Array<{
      userId: string;
      userType: 'customer' | 'provider' | 'owner' | 'dispatcher';
      userName?: string;
    }>,
    conversationType: 'booking_chat' | 'support_chat' | 'general' = 'booking_chat'
  ): Promise<{ conversationSid: string; conversationMetadataId: string; isNew: boolean }> {
    // Check if conversation already exists for this booking
    const { data: existingMetadata } = await this.supabase
      .from('conversation_metadata')
      .select('id, twilio_conversation_sid, is_active')
      .eq('booking_id', bookingId)
      .eq('is_active', true)
      .single();

    let conversationSid: string;
    let conversationMetadataId: string;
    let isNew = false;

    if (existingMetadata) {
      // Use existing conversation
      conversationSid = existingMetadata.twilio_conversation_sid;
      conversationMetadataId = existingMetadata.id;
      
      // Verify conversation still exists in Twilio
      const verifyResult = await this.conversationService.getConversation(conversationSid);
      if (!verifyResult.success) {
        // Conversation was deleted in Twilio, create a new one
        isNew = true;
        const result = await this._createNewConversation(bookingId, participants, conversationType);
        conversationSid = result.conversationSid;
        conversationMetadataId = result.conversationMetadataId;
      }
    } else {
      // Create new conversation
      isNew = true;
      const result = await this._createNewConversation(bookingId, participants, conversationType);
      conversationSid = result.conversationSid;
      conversationMetadataId = result.conversationMetadataId;
    }

    // Ensure all participants are added
    await this._ensureParticipants(conversationSid, conversationMetadataId, participants);

    return { conversationSid, conversationMetadataId, isNew };
  }

  /**
   * Internal method to create a new conversation
   */
  private async _createNewConversation(
    bookingId: string,
    participants: Array<{ userId: string; userType: string; userName?: string }>,
    conversationType: string
  ): Promise<{ conversationSid: string; conversationMetadataId: string }> {
    // Create Twilio conversation
    const friendlyName = `booking-${bookingId}-${Date.now()}`;
    const twilioResult = await this.conversationService.createConversation({
      friendlyName,
      attributes: {
        bookingId,
        createdAt: new Date().toISOString(),
        type: conversationType,
      },
    });

    if (!twilioResult.success || !twilioResult.data) {
      throw new Error(twilioResult.error || 'Failed to create Twilio conversation');
    }

    const conversationSid = twilioResult.data.sid;

    // Store metadata in Supabase
    const { data: metadataData, error: metadataError } = await this.supabase
      .from('conversation_metadata')
      .insert({
        booking_id: bookingId,
        twilio_conversation_sid: conversationSid,
        conversation_type: conversationType,
        participant_count: participants.length,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (metadataError || !metadataData) {
      // Clean up Twilio conversation if database insert fails
      await this.conversationService.deleteConversation(conversationSid);
      throw new Error(metadataError?.message || 'Failed to store conversation metadata');
    }

    return {
      conversationSid,
      conversationMetadataId: metadataData.id,
    };
  }

  /**
   * Ensure all participants are added to the conversation
   */
  private async _ensureParticipants(
    conversationSid: string,
    conversationMetadataId: string,
    participants: Array<{ userId: string; userType: string; userName?: string }>
  ): Promise<void> {
    for (const participant of participants) {
      const identity = `${participant.userType}-${participant.userId}`;

      // Check if participant already exists in database
      const { data: existingParticipant } = await this.supabase
        .from('conversation_participants')
        .select('id, twilio_participant_sid')
        .eq('conversation_id', conversationMetadataId)
        .eq('user_id', participant.userId)
        .eq('user_type', participant.userType)
        .eq('is_active', true)
        .single();

      if (existingParticipant) {
        // Verify participant exists in Twilio
        const verifyResult = await this.participantService.getParticipantByIdentity(
          conversationSid,
          identity
        );
        if (verifyResult.success) {
          continue; // Participant already exists
        }
      }

      // Add participant to Twilio
      const participantResult = await this.participantService.addParticipant(conversationSid, {
        identity,
        attributes: {
          role: participant.userType,
          name: participant.userName || `${participant.userType}-${participant.userId}`,
          userId: participant.userId,
          userType: participant.userType,
        },
      });

      if (!participantResult.success || !participantResult.data) {
        console.error(`Failed to add participant ${identity}:`, participantResult.error);
        continue;
      }

      // Store participant in Supabase
      await this.supabase
        .from('conversation_participants')
        .upsert({
          conversation_id: conversationMetadataId,
          user_id: participant.userId,
          user_type: participant.userType,
          twilio_participant_sid: participantResult.data.sid,
          is_active: true,
          joined_at: new Date().toISOString(),
        }, {
          onConflict: 'conversation_id,user_id,user_type',
        });
    }
  }

  /**
   * Send a message to a conversation
   * Stores message notification in Supabase and updates last_message_at
   */
  async sendMessage(
    conversationSid: string,
    message: string,
    userId: string,
    userType: 'customer' | 'provider' | 'owner' | 'dispatcher',
    _bookingId?: string
  ): Promise<{ messageSid: string }> {
    // Get user details for the message
    let userDetails: { first_name?: string; last_name?: string } | null = null;
    let actualRole: string = userType; // Default to provided userType
    
    // For provider-side users, fetch the actual provider_role from the database
    if (userType === 'provider' || userType === 'owner' || userType === 'dispatcher') {
      const { data } = await this.supabase
        .from('providers')
        .select('first_name, last_name, provider_role')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        userDetails = data;
        // Use the actual provider_role from database (provider, owner, or dispatcher)
        actualRole = data.provider_role || userType;
      }
    } else if (userType === 'customer') {
      const { data } = await this.supabase
        .from('customer_profiles')
        .select('first_name, last_name')
        .eq('user_id', userId)
        .single();
      userDetails = data;
      actualRole = 'customer'; // Always 'customer' for customer profiles
    }

    const identity = `${actualRole}-${userId}`;
    const authorName = userDetails 
      ? `${userDetails.first_name || ''} ${userDetails.last_name || ''}`.trim()
      : identity;

    // Send message to Twilio with actual role from database
    const messageResult = await this.messageService.sendMessage(conversationSid, {
      body: message,
      attributes: {
        userId,
        userType: actualRole, // Store the actual role from database
        role: actualRole, // Also include as 'role' for clarity
        authorName,
        timestamp: new Date().toISOString(),
      },
    }, identity);

    if (!messageResult.success || !messageResult.data) {
      throw new Error(messageResult.error || 'Failed to send message');
    }

    const messageSid = messageResult.data.sid;

    // Get conversation metadata ID
    const { data: metadata } = await this.supabase
      .from('conversation_metadata')
      .select('id')
      .eq('twilio_conversation_sid', conversationSid)
      .single();

    if (metadata) {
      // Update last_message_at
      await this.supabase
        .from('conversation_metadata')
        .update({ 
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', metadata.id);

      // Create message notifications for all participants except sender
      const { data: participants } = await this.supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', metadata.id)
        .eq('is_active', true)
        .neq('user_id', userId);

      if (participants && participants.length > 0) {
        const notifications = participants.map(p => ({
          conversation_id: metadata.id,
          user_id: p.user_id,
          message_sid: messageSid,
          notification_type: 'message',
          is_read: false,
          created_at: new Date().toISOString(),
        }));

        await this.supabase
          .from('message_notifications')
          .insert(notifications);
      }
    }

    return { messageSid };
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationSid: string, limit: number = 50): Promise<any[]> {
    const result = await this.messageService.listMessages(conversationSid, limit);
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch messages');
    }

    // Parse attributes for each message
    return result.data.map((msg: any) => ({
      id: msg.sid,
      content: msg.body,
      author: msg.author,
      authorName: msg.attributes ? JSON.parse(msg.attributes).authorName : msg.author,
      timestamp: msg.dateCreated?.toISOString() || new Date().toISOString(),
      attributes: msg.attributes ? JSON.parse(msg.attributes) : {},
    }));
  }

  /**
   * Get conversation metadata by booking ID
   */
  async getConversationByBookingId(bookingId: string): Promise<{
    conversationSid: string;
    conversationMetadataId: string;
  } | null> {
    const { data } = await this.supabase
      .from('conversation_metadata')
      .select('id, twilio_conversation_sid')
      .eq('booking_id', bookingId)
      .eq('is_active', true)
      .single();

    if (!data) return null;

    return {
      conversationSid: data.twilio_conversation_sid,
      conversationMetadataId: data.id,
    };
  }

  /**
   * Mark messages as read for a user in a conversation
   */
  async markAsRead(conversationMetadataId: string, userId: string): Promise<void> {
    await this.supabase
      .from('message_notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('conversation_id', conversationMetadataId)
      .eq('user_id', userId)
      .eq('is_read', false);

    // Update last_read_at in conversation_participants
    await this.supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationMetadataId)
      .eq('user_id', userId);
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(conversationMetadataId: string, userId: string): Promise<number> {
    const { count } = await this.supabase
      .from('message_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationMetadataId)
      .eq('user_id', userId)
      .eq('is_read', false);

    return count || 0;
  }

  /**
   * Get conversations for a user
   */
  async getConversationsForUser(
    userId: string,
    userType: 'customer' | 'provider' | 'owner' | 'dispatcher'
  ): Promise<any[]> {
    const { data: participantData } = await this.supabase
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

    if (!participantData) return [];

    return participantData
      .filter((item: any) => item.conversation_metadata)
      .map((item: any) => ({
        id: item.conversation_metadata.id,
        booking_id: item.conversation_metadata.booking_id,
        twilio_conversation_sid: item.conversation_metadata.twilio_conversation_sid,
        created_at: item.conversation_metadata.created_at,
        last_message_at: item.conversation_metadata.last_message_at,
        participant_count: item.conversation_metadata.participant_count,
        is_active: item.conversation_metadata.is_active,
        conversation_type: item.conversation_metadata.conversation_type,
        booking: item.conversation_metadata.bookings,
      }));
  }
}

/**
 * Factory function to create TwilioConversationsService from environment variables
 */
export function createTwilioConversationsService(
  supabaseUrl?: string,
  supabaseKey?: string
): TwilioConversationsService | null {
  const envSource = typeof window !== 'undefined' 
    ? (import.meta as any).env 
    : process.env;

  const twilioConfig: TwilioConfig = {
    accountSid: envSource.VITE_TWILIO_ACCOUNT_SID || envSource.TWILIO_ACCOUNT_SID || '',
    authToken: envSource.VITE_TWILIO_AUTH_TOKEN || envSource.TWILIO_AUTH_TOKEN || '',
    conversationsServiceSid: envSource.VITE_TWILIO_CONVERSATIONS_SERVICE_SID || envSource.TWILIO_CONVERSATIONS_SERVICE_SID || '',
  };

  const finalSupabaseUrl = supabaseUrl || envSource.VITE_PUBLIC_SUPABASE_URL || envSource.SUPABASE_URL;
  const finalSupabaseKey = supabaseKey || envSource.SUPABASE_SERVICE_ROLE_KEY || envSource.VITE_PUBLIC_SUPABASE_ANON_KEY;

  if (!twilioConfig.accountSid || !twilioConfig.authToken || !twilioConfig.conversationsServiceSid) {
    console.warn('Missing Twilio configuration');
    return null;
  }

  if (!finalSupabaseUrl || !finalSupabaseKey) {
    console.warn('Missing Supabase configuration');
    return null;
  }

  return new TwilioConversationsService(twilioConfig, finalSupabaseUrl, finalSupabaseKey);
}

