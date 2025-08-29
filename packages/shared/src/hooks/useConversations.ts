import { useState, useEffect, useCallback, useRef } from 'react';
import { ConversationsService } from '../services/conversations';
import { 
  Conversation, 
  ConversationMessage, 
  ConversationParticipant,
  CreateConversationParams,
  SendMessageParams,
  AddParticipantParams
} from '../types/conversations';

export interface UseConversationsOptions {
  userId: string;
  userType: string;
  onError?: (error: string) => void;
}

export const useConversations = (options: UseConversationsOptions) => {
  const { userId, userType, onError } = options;
  
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
    if (!userId) return null;
    return `${userType}-${userId}`;
  }, [userId, userType]);

  // Get user type for API calls
  const getUserType = useCallback(() => {
    return userType;
  }, [userType]);

  // Load conversations for the current user
  const loadConversations = useCallback(async () => {
    if (!userId || loading || requestInProgress.current) return;

    try {
      requestInProgress.current = true;
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading conversations for user:', userId, userType);
      
      const conversations = await ConversationsService.loadConversations(userId, userType);
      
      console.log('📥 Loaded conversations:', conversations);
      setConversations(conversations);
    } catch (error: any) {
      console.error('Error loading conversations:', error);
      const errorMessage = error.message || 'Failed to load conversations';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [userId, userType, loading, onError]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading messages for conversation:', conversationId);
      
      const messages = await ConversationsService.loadMessages(conversationId);
      
      console.log('📥 Loaded messages:', messages);
      setMessages(messages);
    } catch (error: any) {
      console.error('Error loading messages:', error);
      const errorMessage = error.message || 'Failed to load messages';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Load participants for a specific conversation
  const loadParticipants = useCallback(async (conversationId: string) => {
    if (!conversationId) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading participants for conversation:', conversationId);
      
      const participants = await ConversationsService.loadParticipants(conversationId);
      
      console.log('📥 Loaded participants:', participants);
      setParticipants(participants);
    } catch (error: any) {
      console.error('Error loading participants:', error);
      const errorMessage = error.message || 'Failed to load participants';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [onError]);

  // Send a message to a conversation
  const sendMessage = useCallback(async (conversationId: string, message: string) => {
    if (!conversationId || !message.trim() || sending) return;

    try {
      setSending(true);
      setError(null);
      
      console.log('📤 Sending message to conversation:', conversationId);
      
      const params: SendMessageParams = {
        conversationId,
        content: message,
        authorId: userId,
        authorType: userType,
      };
      
      await ConversationsService.sendMessage(params);
      
      // Reload messages
      await loadMessages(conversationId);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setSending(false);
    }
  }, [userId, userType, loadMessages, onError]);

  // Create a new conversation
  const createConversation = useCallback(async (params: CreateConversationParams) => {
    console.log('🚀 createConversation called with:', params);
    
    try {
      setLoading(true);
      setError(null);
      
      const conversationId = await ConversationsService.createConversation(params);
      
      // Reload conversations
      await loadConversations();
      
      return conversationId;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      const errorMessage = error.message || 'Failed to create conversation';
      setError(errorMessage);
      onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadConversations, onError]);

  // Add participant to conversation
  const addParticipant = useCallback(async (params: AddParticipantParams) => {
    console.log('👤 addParticipant called with:', params);
    
    try {
      setLoading(true);
      setError(null);
      
      const participantId = await ConversationsService.addParticipant(params);
      
      // Reload participants
      await loadParticipants(params.conversationId);
      
      return participantId;
    } catch (error: any) {
      console.error('Error adding participant:', error);
      const errorMessage = error.message || 'Failed to add participant';
      setError(errorMessage);
      onError?.(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadParticipants, onError]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    console.log('✅ markAsRead called with:', conversationId);
    
    try {
      setError(null);
      
      await ConversationsService.markAsRead(conversationId, userId);
      
      // Update local state to mark as read
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, last_read_at: new Date().toISOString() }
            : conv
        )
      );
    } catch (error: any) {
      console.error('Error marking conversation as read:', error);
      const errorMessage = error.message || 'Failed to mark conversation as read';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Load initial data
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, loadConversations]);

  return {
    // State
    conversations,
    currentConversation,
    messages,
    participants,
    loading,
    sending,
    error,
    
    // Actions
    loadConversations,
    loadMessages,
    loadParticipants,
    sendMessage,
    createConversation,
    addParticipant,
    markAsRead,
    setCurrentConversation,
    
    // Utilities
    getUserIdentity,
    getUserType,
  };
};
