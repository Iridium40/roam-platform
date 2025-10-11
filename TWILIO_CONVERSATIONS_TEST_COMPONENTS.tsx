/**
 * Sample Conversation Components for Testing
 * These components demonstrate the testing scenarios outlined in the checklist
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  createTwilioConversationsWithDBFromEnv,
  type ConversationServiceWithDB,
  type ConversationMetadata,
  type CreateConversationData 
} from '@roam/shared';

// Types for testing
interface Booking {
  id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  service_name: string;
  provider_name: string;
  booking_date: string;
  customer_id: string;
  provider_id: string;
  business_id: string;
}

interface Message {
  sid: string;
  body: string;
  author: string;
  dateCreated: string;
  attributes: Record<string, any>;
}

interface ConversationUIProps {
  conversationId: string;
  booking: Booking;
  currentUserId: string;
  userType: 'customer' | 'provider' | 'owner' | 'dispatcher';
}

// ============================================================================
// CUSTOMER APP COMPONENTS
// ============================================================================

/**
 * Customer Chat Button Component
 * Tests: Chat icon appears on confirmed bookings only
 */
export const CustomerChatButton: React.FC<{ booking: Booking }> = ({ booking }) => {
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);

  // Only show chat button for confirmed bookings
  if (booking.status !== 'confirmed') {
    return null;
  }

  return (
    <>
      <button
        data-testid="chat-icon"
        className={`relative p-2 rounded-full transition-colors ${
          hasUnreadMessages 
            ? 'bg-blue-600 text-white animate-pulse' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        onClick={() => setShowChatModal(true)}
        aria-label="Open chat"
      >
        <MessageCircleIcon className="w-5 h-5" />
        {hasUnreadMessages && (
          <span 
            data-testid="unread-badge"
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
          />
        )}
      </button>

      {showChatModal && (
        <CustomerChatModal
          booking={booking}
          onClose={() => setShowChatModal(false)}
          onUnreadCountChange={setHasUnreadMessages}
        />
      )}
    </>
  );
};

/**
 * Customer Chat Modal Component  
 * Tests: Modal opens with correct booking details, can send/receive messages
 */
export const CustomerChatModal: React.FC<{
  booking: Booking;
  onClose: () => void;
  onUnreadCountChange: (hasUnread: boolean) => void;
}> = ({ booking, onClose, onUnreadCountChange }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationService = useRef<ConversationServiceWithDB | null>(null);

  useEffect(() => {
    // Initialize conversation service
    conversationService.current = createTwilioConversationsWithDBFromEnv();
    loadOrCreateConversation();
    
    // Mark as read when modal opens
    onUnreadCountChange(false);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOrCreateConversation = async () => {
    if (!conversationService.current) return;

    try {
      // Try to find existing conversation for this booking
      const userConversations = await conversationService.current.getConversationsForUser(
        booking.customer_id,
        'customer'
      );

      const existingConv = userConversations.conversations.find(
        conv => conv.booking_id === booking.id
      );

      if (existingConv) {
        setConversationId(existingConv.twilio_conversation_sid);
        await loadMessages(existingConv.twilio_conversation_sid);
      } else {
        // Create new conversation
        const result = await conversationService.current.createConversationWithDB({
          bookingId: booking.id,
          friendlyName: `${booking.service_name} - ${booking.provider_name}`,
          uniqueName: `booking-${booking.id}`,
          attributes: {
            bookingId: booking.id,
            serviceType: booking.service_name,
            customerId: booking.customer_id,
            providerId: booking.provider_id
          }
        });

        if (result.conversationId && !result.error) {
          setConversationId(result.conversationId);
          await loadMessages(result.conversationId);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId: string) => {
    if (!conversationService.current) return;

    const result = await conversationService.current.getMessages(convId, 50);
    if (!result.error) {
      setMessages(result.messages);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !conversationService.current) return;

    try {
      const result = await conversationService.current.sendMessage(conversationId, {
        body: newMessage,
        attributes: {
          senderType: 'customer',
          bookingId: booking.id
        }
      });

      if (result.success) {
        // Optimistic update
        const optimisticMessage: Message = {
          sid: `temp-${Date.now()}`,
          body: newMessage,
          author: booking.customer_id,
          dateCreated: new Date().toISOString(),
          attributes: { senderType: 'customer' }
        };
        setMessages(prev => [...prev, optimisticMessage]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div 
      data-testid="chat-modal"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-lg w-full max-w-md h-96 flex flex-col">
        {/* Header with booking details */}
        <div className="border-b p-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg">{booking.service_name}</h3>
              <p className="text-sm text-gray-600">{booking.provider_name}</p>
              <p className="text-xs text-gray-500">
                {new Date(booking.booking_date).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              data-testid="close-modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-500">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-500">
              Start a conversation with your provider!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.sid}
                className={`flex ${
                  message.author === booking.customer_id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.author === booking.customer_id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.body}</p>
                  <p className="text-xs opacity-75 mt-1">
                    {new Date(message.dateCreated).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              data-testid="message-input"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
              data-testid="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROVIDER APP COMPONENTS
// ============================================================================

/**
 * Provider Messaging Hub Component
 * Tests: Displays only assigned conversations, security controls
 */
export const ProviderMessagingHub: React.FC<{ 
  providerId: string; 
  businessId: string; 
}> = ({ providerId, businessId }) => {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  useEffect(() => {
    loadProviderConversations();
  }, [providerId]);

  const loadProviderConversations = async () => {
    const service = createTwilioConversationsWithDBFromEnv();
    if (!service) return;

    try {
      // Only load conversations where this provider is assigned
      const result = await service.getConversationsForUser(providerId, 'provider');
      if (!result.error) {
        setConversations(result.conversations);
        // Calculate unread count (would need additional API)
        setTotalUnreadCount(result.conversations.length); // Placeholder
      }
    } catch (error) {
      console.error('Error loading provider conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.booking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.twilio_conversation_sid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Conversation list */}
      <div className="w-1/3 border-r">
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            {totalUnreadCount > 0 && (
              <span 
                data-testid="total-unread-badge"
                className="bg-red-500 text-white text-xs px-2 py-1 rounded-full"
              >
                {totalUnreadCount}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
            data-testid="conversation-search"
          />
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <div
                key={conv.id}
                data-testid="conversation-item"
                data-provider-id={providerId}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conv.twilio_conversation_sid ? 'bg-blue-50' : ''
                }`}
                onClick={() => setSelectedConversation(conv.twilio_conversation_sid)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm">Booking #{conv.booking_id.slice(-8)}</p>
                    <p className="text-xs text-gray-500">
                      {conv.last_message_at 
                        ? new Date(conv.last_message_at).toLocaleDateString()
                        : 'No messages yet'
                      }
                    </p>
                  </div>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {conv.participant_count} participants
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conversation view */}
      <div className="flex-1">
        {selectedConversation ? (
          <ProviderConversationView 
            conversationId={selectedConversation}
            providerId={providerId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Provider Conversation View Component
 * Tests: Real-time messaging, message history
 */
export const ProviderConversationView: React.FC<{
  conversationId: string;
  providerId: string;
}> = ({ conversationId, providerId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
    // TODO: Set up real-time listeners
  }, [conversationId]);

  const loadMessages = async () => {
    const service = createTwilioConversationsWithDBFromEnv();
    if (!service) return;

    try {
      const result = await service.getMessages(conversationId, 50);
      if (!result.error) {
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const service = createTwilioConversationsWithDBFromEnv();
    if (!service) return;

    try {
      const result = await service.sendMessage(conversationId, {
        body: newMessage,
        attributes: {
          senderType: 'provider',
          providerId: providerId
        }
      });

      if (result.success) {
        setNewMessage('');
        await loadMessages(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4">
        <h3 className="font-semibold">Conversation {conversationId.slice(-8)}</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500">Loading messages...</div>
        ) : (
          messages.map((message) => (
            <div
              key={message.sid}
              className={`flex ${
                message.author === providerId ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md px-3 py-2 rounded-lg ${
                  message.author === providerId
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                <p className="text-sm">{message.body}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(message.dateCreated).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OWNER/DISPATCHER APP COMPONENTS  
// ============================================================================

/**
 * Owner/Dispatcher Conversation List Component
 * Tests: Can see ALL business conversations, proper role badges
 */
export const OwnerConversationList: React.FC<{ 
  businessId: string;
  userRole: 'owner' | 'dispatcher';
  userId: string;
}> = ({ businessId, userRole, userId }) => {
  const [conversations, setConversations] = useState<ConversationMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllBusinessConversations();
  }, [businessId]);

  const loadAllBusinessConversations = async () => {
    const service = createTwilioConversationsWithDBFromEnv();
    if (!service) return;

    try {
      // Load ALL conversations for the business (owner/dispatcher privilege)
      const result = await service.getConversationsForUser(userId, userRole);
      if (!result.error) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Error loading business conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="owner-conversation-list">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold flex items-center">
          All Conversations
          <span className={`ml-2 text-xs px-2 py-1 rounded ${
            userRole === 'owner' 
              ? 'bg-purple-100 text-purple-800' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {userRole.toUpperCase()}
          </span>
        </h2>
        <p className="text-sm text-gray-600">
          Viewing all conversations for this business
        </p>
      </div>

      <div className="overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No conversations found
          </div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              data-testid="conversation-item"
              className="p-4 border-b hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">
                    Booking #{conv.booking_id.slice(-8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {conv.participant_count} participants
                  </p>
                  {conv.last_message_at && (
                    <p className="text-xs text-gray-400">
                      Last message: {new Date(conv.last_message_at).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex space-x-1">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {userRole === 'owner' ? 'OWNER ACCESS' : 'DISPATCHER ACCESS'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

const MessageCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
    />
  </svg>
);

export default {
  CustomerChatButton,
  CustomerChatModal,
  ProviderMessagingHub,
  ProviderConversationView,
  OwnerConversationList
};