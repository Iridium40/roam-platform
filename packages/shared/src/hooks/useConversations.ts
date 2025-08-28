import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
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
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      requestInProgress.current = false;
    }
  }, [userId, userType, loading, toast, onError]);

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

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!conversationId || !content.trim() || !userId) return;

    try {
      setSending(true);
      setError(null);
      
      console.log('📤 Sending message:', { conversationId, content });
      
      const params: SendMessageParams = {
        conversationId,
        content,
        authorId: userId,
        authorType: userType
      };
      
      await ConversationsService.sendMessage(params);
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
      
      // Reload messages
      await loadMessages(conversationId);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error.message || 'Failed to send message';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [userId, userType, loadMessages, toast, onError]);

  // Create a new conversation
  const createConversation = useCallback(async (params: CreateConversationParams) => {
    console.log('🚀 createConversation called with:', params);
    
    try {
      setLoading(true);
      setError(null);
      
      const conversationId = await ConversationsService.createConversation(params);
      
      toast({
        title: "Conversation created",
        description: "A new conversation has been created for this booking",
      });
      
      // Reload conversations
      await loadConversations();
      
      return conversationId;
    } catch (error: any) {
      console.error('Error creating conversation:', error);
      const errorMessage = error.message || 'Failed to create conversation';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadConversations, toast, onError]);

  // Add participant to conversation
  const addParticipant = useCallback(async (params: AddParticipantParams) => {
    console.log('👤 addParticipant called with:', params);
    
    try {
      setLoading(true);
      setError(null);
      
      const participantId = await ConversationsService.addParticipant(params);
      
      toast({
        title: "Participant added",
        description: "The participant has been added to the conversation",
      });
      
      // Reload participants
      await loadParticipants(params.conversationId);
      
      return participantId;
    } catch (error: any) {
      console.error('Error adding participant:', error);
      const errorMessage = error.message || 'Failed to add participant';
      setError(errorMessage);
      onError?.(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadParticipants, toast, onError]);

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    console.log('✅ markAsRead called with:', conversationId);
    
    try {
      setLoading(true);
      setError(null);
      
      await ConversationsService.markAsRead(conversationId, userId);
      
      toast({
        title: "Marked as read",
        description: "The conversation has been marked as read",
      });
    } catch (error: any) {
      console.error('Error marking as read:', error);
      const errorMessage = error.message || 'Failed to mark as read';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [userId, toast, onError]);

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
    if (userId) {
      loadConversations();
    } else {
      setConversations([]);
      setMessages([]);
      setParticipants([]);
    }
  }, [userId, loadConversations]);

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
