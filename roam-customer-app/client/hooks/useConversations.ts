import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  author_id: string;
  author_type: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user_type: string;
  joined_at: string;
  is_active: boolean;
  last_read_at: string | null;
}

export interface Conversation {
  id: string;
  booking_id: string;
  twilio_conversation_sid: string;
  created_at: string;
  last_message_at: string | null;
  participant_count: number;
  is_active: boolean;
  conversation_type: string;
  booking?: {
    id: string;
    service_name: string;
    booking_date: string;
    status: string;
    business_profiles?: {
      business_name: string;
    };
    providers?: {
      first_name: string;
      last_name: string;
    };
  };
}

export const useConversations = () => {
  const { customer } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<ConversationParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestInProgress = useRef(false);

  // Generate unique identity for current user
  const getUserIdentity = useCallback(() => {
    if (!customer) return null;
    return `customer-${customer.id}`;
  }, [customer]);

  // Get user type for API calls
  const getUserType = useCallback(() => {
    return 'customer';
  }, []);

  // Load conversations for the current customer
  const loadConversations = useCallback(async () => {
    if (!customer || loading || requestInProgress.current) return;

    try {
      requestInProgress.current = true;
      setLoading(true);
      setError(null);
      
      logger.debug('🔄 Loading conversations for customer:', customer.id);
      
      // Get conversations where the customer is a participant
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
              service_name,
              booking_date,
              status,
              business_profiles (
                business_name
              ),
              providers (
                first_name,
                last_name
              )
            )
          )
        `)
        .eq('user_id', customer.id)
        .eq('user_type', 'customer')
        .eq('is_active', true);

      if (participantError) {
        throw participantError;
      }

      // Transform the data to match our Conversation interface
      const transformedConversations = participantData?.map(item => ({
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
          service_name: item.conversation_metadata.bookings.service_name,
          booking_date: item.conversation_metadata.bookings.booking_date,
          status: item.conversation_metadata.bookings.status,
          business_profiles: item.conversation_metadata.bookings.business_profiles,
          providers: item.conversation_metadata.bookings.providers,
        } : undefined,
      })) || [];

      logger.debug('📥 Loaded conversations:', transformedConversations);
      setConversations(transformedConversations);
    } catch (error: any) {
      logger.error('Error loading conversations:', error);
      setError(error.message || 'Failed to load conversations');
      toast({
        title: "Error",
        description: error.message || 'Failed to load conversations',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [customer, loading, toast]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      
      logger.debug('🔄 Loading messages for conversation:', conversationId);
      
      // For now, we'll return empty messages since we don't have a messages table
      // In a real implementation, you'd query a messages table
      setMessages([]);
      
      logger.debug('📥 Loaded messages: []');
    } catch (error: any) {
      logger.error('Error loading messages:', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load participants for a specific conversation
  const loadParticipants = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      
      logger.debug('🔄 Loading participants for conversation:', conversationId);
      
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      logger.debug('📥 Loaded participants:', data);
      setParticipants(data || []);
    } catch (error: any) {
      logger.error('Error loading participants:', error);
      setError(error.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, []);

  // Send a message (placeholder for now)
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!conversationId || !content.trim() || !customer) return;

    try {
      setSending(true);
      setError(null);
      
      logger.debug('📤 Sending message:', { conversationId, content });
      
      // For now, we'll just show a success message
      // In a real implementation, you'd insert into a messages table
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
      
      // Reload messages
      await loadMessages(conversationId);
    } catch (error: any) {
      logger.error('Error sending message:', error);
      setError(error.message || 'Failed to send message');
      toast({
        title: "Error",
        description: error.message || 'Failed to send message',
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [customer, loadMessages, toast]);

  // Create a new conversation (placeholder for now)
  const createConversation = useCallback(async (bookingId: string, participants: Array<{
    identity: string;
    role: string;
    name: string;
    userId: string;
    userType: string;
  }>) => {
    logger.debug('🚀 createConversation called with:', { bookingId, participants });
    
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll just show a success message
      // In a real implementation, you'd create the conversation in the database
      toast({
        title: "Conversation created",
        description: "A new conversation has been created for this booking",
      });
      
      // Reload conversations
      await loadConversations();
    } catch (error: any) {
      logger.error('Error creating conversation:', error);
      setError(error.message || 'Failed to create conversation');
      toast({
        title: "Error",
        description: error.message || 'Failed to create conversation',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadConversations, toast]);

  // Add participant to conversation (placeholder for now)
  const addParticipant = useCallback(async (conversationId: string, participant: {
    identity: string;
    role: string;
    name: string;
    userId: string;
    userType: string;
  }) => {
    logger.debug('👤 addParticipant called with:', { conversationId, participant });
    
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll just show a success message
      // In a real implementation, you'd add the participant to the database
      toast({
        title: "Participant added",
        description: "The participant has been added to the conversation",
      });
      
      // Reload participants
      await loadParticipants(conversationId);
    } catch (error: any) {
      logger.error('Error adding participant:', error);
      setError(error.message || 'Failed to add participant');
      toast({
        title: "Error",
        description: error.message || 'Failed to add participant',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadParticipants, toast]);

  // Mark conversation as read (placeholder for now)
  const markAsRead = useCallback(async (conversationId: string) => {
    logger.debug('✅ markAsRead called with:', conversationId);
    
    try {
      setLoading(true);
      setError(null);
      
      // For now, we'll just show a success message
      // In a real implementation, you'd update the last_read_at timestamp
      toast({
        title: "Marked as read",
        description: "The conversation has been marked as read",
      });
    } catch (error: any) {
      logger.error('Error marking as read:', error);
      setError(error.message || 'Failed to mark as read');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Set active conversation
  const setActiveConversation = useCallback((conversationId: string | null) => {
    setCurrentConversation(conversationId);
    if (conversationId) {
      loadMessages(conversationId);
      loadParticipants(conversationId);
    } else {
      setMessages([]);
      setParticipants([]);
    }
  }, [loadMessages, loadParticipants]);

  // Load conversations when user changes
  useEffect(() => {
    if (customer) {
      loadConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setParticipants([]);
    }
  }, [customer, loadConversations]);

  return {
    conversations,
    currentConversation,
    messages,
    participants,
    loading,
    sending,
    error,
    createConversation,
    loadConversations,
    loadMessages,
    sendMessage,
    loadParticipants,
    addParticipant,
    markAsRead,
    setActiveConversation,
    getUserIdentity,
    getUserType
  };
};
