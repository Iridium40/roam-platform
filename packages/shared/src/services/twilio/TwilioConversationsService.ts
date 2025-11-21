import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConversationService } from './ConversationService.js';
import { ParticipantService } from './ParticipantService.js';
import { MessageService } from './MessageService.js';
import type { TwilioConfig } from './types.js';

type ConversationUserProfile = {
  id?: string;
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  image_url?: string | null;
  provider_role?: string | null;
};

export interface ConversationSummaryBooking {
  id: string;
  booking_date?: string | null;
  booking_status?: string | null;
  business_id?: string | null;
  service_name?: string | null;
  customer_profiles?: ConversationUserProfile | null;
  providers?: ConversationUserProfile | null;
}

export interface ConversationSummary {
  metadataId: string;
  bookingId: string;
  twilioConversationSid: string;
  conversationType: 'booking_chat' | 'support_chat' | 'general';
  participantCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage?: {
    body: string | null;
    author: string | null;
    authorName?: string | null;
    timestamp: string | null;
  } | null;
  booking?: ConversationSummaryBooking;
}

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

  getSupabaseClient(): SupabaseClient {
    return this.supabase;
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
    console.log('🔍 getOrCreateConversationForBooking called:', { bookingId, participantCount: participants.length });
    
    // Check if conversation already exists for this booking
    const { data: existingMetadata, error: queryError } = await this.supabase
      .from('conversation_metadata')
      .select('id, twilio_conversation_sid, is_active')
      .eq('booking_id', bookingId)
      .eq('is_active', true)
      .single();

    console.log('📊 Existing conversation query result:', { 
      found: !!existingMetadata, 
      conversationSid: existingMetadata?.twilio_conversation_sid,
      error: queryError?.message 
    });

    let conversationSid: string;
    let conversationMetadataId: string;
    let isNew = false;

    if (existingMetadata) {
      // Use existing conversation
      conversationSid = existingMetadata.twilio_conversation_sid;
      conversationMetadataId = existingMetadata.id;
      console.log('♻️ Reusing existing conversation:', conversationSid);
      
      // Verify conversation still exists in Twilio
      const verifyResult = await this.conversationService.getConversation(conversationSid);
      if (!verifyResult.success) {
        // Conversation was deleted in Twilio, create a new one
        console.log('⚠️ Conversation deleted in Twilio, creating new one');
        isNew = true;
        const result = await this._createNewConversation(bookingId, participants, conversationType);
        conversationSid = result.conversationSid;
        conversationMetadataId = result.conversationMetadataId;
      }
    } else {
      // Create new conversation
      console.log('🆕 Creating new conversation for booking:', bookingId);
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
    console.log('👥 _ensureParticipants called with:', JSON.stringify(participants, null, 2));
    
    for (const participant of participants) {
      console.log('🔍 Processing participant:', { userId: participant.userId, userType: participant.userType, userName: participant.userName });
      const identity = `${participant.userType}-${participant.userId}`;

      // First, check if participant already exists in Twilio
      const existingInTwilioCheck = await this.participantService.getParticipantByIdentity(
        conversationSid,
        identity
      );

      let twilioParticipantSid: string | null = null;

      if (existingInTwilioCheck.success && existingInTwilioCheck.data) {
        // Participant already exists in Twilio
        twilioParticipantSid = existingInTwilioCheck.data.sid;
        console.log(`✅ Participant ${identity} already exists in Twilio with SID: ${twilioParticipantSid}`);
      } else {
        // Add participant to Twilio
        console.log(`➕ Adding participant ${identity} to Twilio...`);
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
          const errorMessage = participantResult.error || 'Unknown error adding participant';

          // This shouldn't happen since we checked above, but handle it anyway
          if (errorMessage.toLowerCase().includes('participant already exists')) {
            console.warn(`⚠️ Participant ${identity} already exists (race condition), fetching SID...`);
            const retryFetch = await this.participantService.getParticipantByIdentity(
              conversationSid,
              identity
            );
            if (retryFetch.success && retryFetch.data) {
              twilioParticipantSid = retryFetch.data.sid;
            } else {
              console.error(`❌ Could not fetch participant ${identity} after duplicate error. Skipping.`);
              continue;
            }
          } else {
            console.error(`❌ Failed to add participant ${identity}:`, errorMessage);
            continue;
          }
        } else {
          twilioParticipantSid = participantResult.data.sid;
          console.log(`✅ Added participant ${identity} to Twilio with SID: ${twilioParticipantSid}`);
        }
      }

      if (!twilioParticipantSid) {
        console.warn(`Unable to resolve Twilio participant SID for ${identity}. Skipping Supabase upsert.`);
        continue;
      }

      // Check if participant already exists in Supabase
      const { data: existingInSupabase } = await this.supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationMetadataId)
        .eq('user_id', participant.userId)
        .eq('user_type', participant.userType)
        .single();

      if (existingInSupabase) {
        console.log(`✅ Participant already exists in Supabase, skipping insert`);
        continue;
      }

      // Store participant in Supabase
      const participantRecord = {
        conversation_id: conversationMetadataId,
        user_id: participant.userId,
        user_type: participant.userType,
        twilio_participant_sid: twilioParticipantSid,
        is_active: true,
        joined_at: new Date().toISOString(),
      };
      
      console.log(`💾 Storing participant in Supabase:`, JSON.stringify(participantRecord, null, 2));
      console.log(`💾 Raw participant object:`, JSON.stringify(participant, null, 2));

      const { error: insertError } = await this.supabase
        .from('conversation_participants')
        .insert(participantRecord);

      if (insertError) {
        console.error(`❌ Error storing participant in Supabase:`, JSON.stringify(insertError, null, 2));
      } else {
        console.log(`✅ Participant stored successfully: ${participant.userType}-${participant.userId}`);
      }
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
      // Try both user_id and id columns (customer_profiles uses 'id' as primary key)
      const { data } = await this.supabase
        .from('customer_profiles')
        .select('first_name, last_name')
        .or(`user_id.eq.${userId},id.eq.${userId}`)
        .single();
      
      console.log('📝 Customer profile lookup:', { userId, found: !!data, data });
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
    console.log('📥 Fetching messages for conversation:', { conversationSid, limit });
    
    const result = await this.messageService.listMessages(conversationSid, limit);
    
    console.log('📥 Message fetch result:', { 
      success: result.success, 
      messageCount: result.data?.length || 0,
      error: result.error 
    });
    
    if (!result.success || !result.data) {
      console.error('❌ Failed to fetch messages:', result.error);
      throw new Error(result.error || 'Failed to fetch messages');
    }

    // Parse attributes for each message
    const messages = result.data.map((msg: any) => {
      // Parse the author identity (format: "userType-userId")
      const authorParts = msg.author?.split('-') || [];
      const author_type = authorParts[0] || undefined;
      const author_id = authorParts.slice(1).join('-') || undefined; // Handle UUIDs with dashes
      
      return {
        id: msg.sid,
        content: msg.body,
        author: msg.author,
        author_type,
        author_id,
        authorName: msg.attributes ? JSON.parse(msg.attributes).authorName : msg.author,
        timestamp: msg.dateCreated?.toISOString() || new Date().toISOString(),
        attributes: msg.attributes ? JSON.parse(msg.attributes) : {},
      };
    });
    
    console.log('✅ Parsed messages:', messages.length);
    return messages;
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
   * Get unread message count for a user within a conversation
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
   * Get enriched conversation summaries for a user
   */
  async getConversationsForUser(
    userId: string,
    userType: 'customer' | 'provider' | 'owner' | 'dispatcher',
    businessId?: string
  ): Promise<ConversationSummary[]> {
    console.log('🔍 getConversationsForUser called:', { userId, userType, businessId });
    
    const { data: participantData, error } = await this.supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        last_read_at,
        conversation_metadata (
          id,
          booking_id,
          twilio_conversation_sid,
          created_at,
          updated_at,
          last_message_at,
          participant_count,
          is_active,
          conversation_type,
          bookings (
            id,
            booking_date,
            booking_status,
            business_id,
            services (
              name
            ),
            customer_profiles (
              id,
              first_name,
              last_name,
              email,
              image_url
            ),
            providers (
              id,
              user_id,
              first_name,
              last_name,
              email,
              provider_role,
              image_url
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_active', true);

    console.log('📊 Query result:', { 
      foundParticipants: participantData?.length || 0, 
      error: error?.message 
    });

    if (error) {
      console.error('❌ Error loading conversations for user:', error);
      throw error;
    }

    if (!participantData?.length) {
      console.log('⚠️ No participants found for this user');
      return [];
    }

    const metadataList = participantData
      .map((item: any) => item.conversation_metadata)
      .filter((meta: any) => Boolean(meta));

    const filteredMetadata = metadataList.filter((meta: any) => {
      if (!businessId) return true;
      return meta?.bookings?.business_id === businessId;
    });

    const conversationIds = filteredMetadata
      .map((meta: any) => meta.id)
      .filter((id: string | null) => Boolean(id));

    const unreadCounts = await this.getUnreadCountsMap(conversationIds, userId);

    const summaries = await Promise.all(
      filteredMetadata.map(async (meta: any) => {
        const latestMessage =
          meta.last_message_at ? await this.fetchLatestMessageSnapshot(meta.twilio_conversation_sid) : null;

        return {
          metadataId: meta.id,
          bookingId: meta.booking_id,
          twilioConversationSid: meta.twilio_conversation_sid,
          conversationType: meta.conversation_type,
          participantCount: meta.participant_count,
          isActive: meta.is_active,
          createdAt: meta.created_at,
          updatedAt: meta.updated_at,
          lastMessageAt: meta.last_message_at,
          unreadCount: unreadCounts[meta.id] || 0,
          lastMessage: latestMessage,
          booking: meta.bookings ? this.mapBooking(meta.bookings) : undefined,
        } as ConversationSummary;
      })
    );

    return summaries.sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  private mapBooking(record: any): ConversationSummaryBooking {
    return {
      id: record.id,
      booking_date: record.booking_date,
      booking_status: record.booking_status,
      business_id: record.business_id,
      service_name: record.service_name || record.services?.name || null,
      customer_profiles: record.customer_profiles || null,
      providers: record.providers || null,
    };
  }

  private async getUnreadCountsMap(conversationIds: string[], userId: string) {
    const counts: Record<string, number> = {};

    if (!conversationIds.length) {
      return counts;
    }

    const { data, error } = await this.supabase
      .from('message_notifications')
      .select('conversation_id')
      .eq('user_id', userId)
      .eq('is_read', false)
      .in('conversation_id', conversationIds);

    if (error) {
      console.error('Error fetching unread counts:', error);
      return counts;
    }

    data?.forEach((row) => {
      counts[row.conversation_id] = (counts[row.conversation_id] || 0) + 1;
    });

    return counts;
  }

  private async fetchLatestMessageSnapshot(conversationSid: string) {
    try {
      const result = await this.messageService.listMessages(conversationSid, 1);
      if (!result.success || !result.data?.length) {
        return null;
      }

      const message = result.data[0];
      let attributes: any = {};
      if (message.attributes) {
        try {
          attributes =
            typeof message.attributes === 'string'
              ? JSON.parse(message.attributes)
              : message.attributes;
        } catch {
          attributes = {};
        }
      }

      const timestamp =
        message.dateCreated instanceof Date
          ? message.dateCreated.toISOString()
          : message.dateCreated || null;

      return {
        body: message.body,
        author: message.author,
        authorName: attributes?.authorName || null,
        timestamp,
      };
    } catch (error) {
      console.error('Failed to fetch latest message snapshot:', error);
      return null;
    }
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

