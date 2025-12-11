import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  Send,
  MessageCircle,
  Users,
  Hash,
  Calendar,
  X,
} from 'lucide-react';
import { useConversations } from '@roam/shared';
import type { ConversationMessage as DBConversationMessage, Conversation } from '@roam/shared';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/utils/logger';

// Format time as 12-hour with am/pm (e.g., "10:30am")
const formatMessageTime = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  let hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr}${ampm}`;
};

// Format date as MM/DD/YY or "Today"
const formatMessageDate = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  const today = new Date();
  
  // Check if it's today
  if (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  ) {
    return 'Today';
  }
  
  // Format as MM/DD/YY
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const year = dateObj.getFullYear().toString().slice(-2);
  return `${month}/${day}/${year}`;
};

// Get date string for grouping (YYYY-MM-DD)
const getDateKey = (date: Date | string | number): string => {
  const dateObj = new Date(date);
  return dateObj.toISOString().split('T')[0];
};

interface ConversationChatProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: {
    id: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    service_name?: string;
    provider_name?: string;
    business_id?: string;
    customer_id?: string;
    booking_reference?: string;
    booking_date?: string;
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
      image_url?: string;
    };
    providers?: {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
      image_url?: string;
    };
  };
  conversationSid?: string;
}

const ConversationChat = ({ isOpen, onClose, booking, conversationSid }: ConversationChatProps) => {
  const { customer } = useAuth();
  
  // Determine user type safely
  const currentUserType = 'customer';
  
  // Get the current user data (customer only)
  const currentUser = customer;
  
  // Use the main conversations hook for all users to avoid conditional hook issues
  const {
    conversations,
    currentConversation,
    messages,
    participants,
    loading,
    sending,
    sendMessage,
    loadMessages,
    createConversation,
    getUserIdentity,
    getUserType,
    setCurrentConversation
  } = useConversations({
    userId: currentUser?.id || '',
    userType: currentUserType,
    onError: (error) => {
      logger.error('Conversations hook error:', error);
    }
  });

  const [newMessage, setNewMessage] = useState('');
  const [activeConversationSid, setActiveConversationSid] = useState<string | null>(conversationSid || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation when modal opens
  useEffect(() => {
    logger.debug('ConversationChat useEffect triggered:', {
      isOpen,
      booking: booking?.id,
      conversationSid,
      activeConversationSid,
      user: currentUser?.id,
      userType: currentUserType
    });

    if (isOpen && booking && !activeConversationSid) {
      logger.debug('🎯 Triggering initializeBookingConversation...');
      initializeBookingConversation();
    } else if (isOpen && conversationSid) {
      logger.debug('Setting conversation SID from prop:', conversationSid);
      setActiveConversationSid(conversationSid);
      setCurrentConversation(conversationSid);
    }
  }, [isOpen, booking, conversationSid]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationSid) {
      loadMessages(activeConversationSid);
      // Participants are loaded separately via the useConversations hook
    }
  }, [activeConversationSid, loadMessages]);

  // Smart polling for real-time updates with scroll preservation
  useEffect(() => {
    if (!isOpen || !activeConversationSid) return;

    logger.debug('🔄 Starting optimized message polling for conversation:', activeConversationSid);
    
    const pollInterval = setInterval(async () => {
      logger.debug('🔄 Checking for new messages...');
      
      // Get current message count before loading
      const currentMessageCount = messages.length;
      
      try {
        // Load new messages
        const response = await fetch('/api/twilio-conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'get-messages',
            conversationSid: activeConversationSid
          })
        });
        
        const result = await response.json();
        if (result.success && result.messages) {
          // Only update if there are actually new messages
          if (result.messages.length > currentMessageCount) {
            logger.debug('🔄 New messages found, updating chat');
            await loadMessages(activeConversationSid);
          }
        }
      } catch (error) {
        logger.error('Message polling error:', error);
      }
    }, 8000); // Reduced frequency: Poll every 8 seconds instead of 3

    return () => {
      logger.debug('🔄 Stopping message polling');
      clearInterval(pollInterval);
    };
  }, [isOpen, activeConversationSid, messages.length]);

  const initializeBookingConversation = async () => {
    logger.debug('🚀 initializeBookingConversation called with:', {
      booking: booking?.id,
      user: currentUser?.id,
      userType: currentUserType,
      bookingData: booking,
      currentUserData: currentUser
    });

    if (!booking || !currentUser) {
      logger.debug('❌ Missing required data:', { 
        booking: !!booking, 
        user: !!currentUser,
        bookingId: booking?.id,
        userId: currentUser?.id
      });
      return;
    }

    logger.debug('📋 Initializing booking conversation for:', booking.id);

    const userIdentity = getUserIdentity();
    const userType = getUserType();
    logger.debug('👤 User identity and type:', { userIdentity, userType: currentUserType });

    if (!userIdentity || !userType) {
      logger.error('❌ Failed to get user identity or type');
      logger.debug('🔍 Debug info:', {
        currentUser: currentUser,
        userIdentity: userIdentity,
        userType: userType,
        getUserIdentity: getUserIdentity,
        getUserType: getUserType
      });
      return;
    }

    // Create participants for both customer and provider
    const bookingParticipants = [];
    
    // Add current user (customer only)
    let currentUserName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
    let currentUserId = currentUser.id;
    
    bookingParticipants.push({
      identity: userIdentity,
      role: 'customer',
      name: currentUserName,
      userId: currentUserId,
      userType: 'customer'
    });
    
    // Add the other participant (provider) with consistent identity format
    if (booking.providers) {
      // Current user is customer, add assigned provider from booking
      const providerName = `${booking.providers.first_name} ${booking.providers.last_name}`.trim();
      bookingParticipants.push({
        identity: `provider-${booking.providers.user_id}`,
        role: 'provider', 
        name: providerName,
        userId: booking.providers.user_id,
        userType: 'provider'
      });
    }

    // TEST COMMENT - DEBUGGING PARTICIPANT ISSUES
    logger.debug('👥 Enhanced participants logic:');
    logger.debug('  - Current user type: customer');
    logger.debug('  - Current user ID:', currentUser?.id);
    logger.debug('  - Booking assigned provider ID:', booking.providers?.user_id);
    logger.debug('  - Current user is assigned provider:', currentUser?.id === booking.providers?.user_id);
    logger.debug('  - Booking object:', booking);
    logger.debug('  - booking.customer_profiles:', booking.customer_profiles);
    logger.debug('  - booking.providers:', booking.providers);

    logger.debug('👥 Booking participants:', bookingParticipants);

    try {
      logger.debug('📞 Calling createConversation...');
      const convSid = await createConversation({
        bookingId: booking.id,
        participants: bookingParticipants
      });
      logger.debug('✅ Conversation SID returned:', convSid);
      if (convSid) {
        logger.debug('🎯 Setting active conversation SID:', convSid);
        setActiveConversationSid(convSid);
        setCurrentConversation(convSid);
      } else {
        logger.error('❌ Failed to get conversation SID - returned null/undefined');
      }
    } catch (error) {
      logger.error('💥 Error initializing conversation:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversationSid || sending) return;

    try {
      await sendMessage(activeConversationSid, newMessage.trim());
      setNewMessage('');
      
      // Immediately reload messages after sending
      await loadMessages(activeConversationSid);
      
      // Also reload after a short delay to catch any delayed messages
      setTimeout(() => {
        loadMessages(activeConversationSid);
      }, 1000);
    } catch (error) {
      logger.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getParticipantInfo = (participant: any) => {
    const userIdentity = getUserIdentity();
    
    // Enhanced identity matching - check if participant is same user type as current user
    const isCurrentUserType = participant.user_id === currentUser?.id;
    const isCurrentUser = isCurrentUserType;
    
    // Enhanced name resolution logic
    let displayName = participant.user_id;
    
    // Try to get actual names from booking data
    if (participant.user_type === 'customer') {
      if (currentUser) {
        // Current customer viewing - use their name
        displayName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
      }
    } else if (participant.user_type === 'provider') {
      if (booking?.providers) {
        // Customer viewing provider - use provider profile name
        displayName = `${booking.providers.first_name} ${booking.providers.last_name}`.trim();
      }
    }
    
    // Fallback to clean version of identity if no good name found
    if (!displayName || displayName === participant.user_id) {
      displayName = participant.user_id?.replace(/^(customer-|provider-)/, '').replace(/[_-]/g, ' ') || 'User';
    }
    
    return {
      isCurrentUser,
      name: displayName,
      role: participant.user_type || 'participant',
      imageUrl: undefined,
      initials: displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    };
  };

  const getMessageAuthorInfo = (message: any) => {
    const userIdentity = getUserIdentity();
    
    // Enhanced identity matching - check if message author is same user type as current user
    const isCurrentUserType = message.author_id === currentUser?.id;
    
    // For now, assume same user type messages are from current user
    const isCurrentUser = isCurrentUserType;
    
    // SMART APPROACH: Find the actual participant from the participants list
    const actualParticipant = participants.find(p => p.user_id === message.author_id);
    
    let participantInfo;
    if (actualParticipant) {
      // Use the actual participant data
      participantInfo = getParticipantInfo(actualParticipant);
    } else {
      // Fallback: create a fake participant object if not found
      const fakeParticipant = {
        user_id: message.author_id,
        user_type: message.author_type
      };
      participantInfo = getParticipantInfo(fakeParticipant);
    }
    
    // Extract role from message attributes (stored by TwilioConversationsService)
    let messageRole = message.author_type || 'participant';
    if (message.attributes) {
      try {
        const attrs = typeof message.attributes === 'string' 
          ? JSON.parse(message.attributes) 
          : message.attributes;
        // Use 'role' or 'userType' from attributes (both are set in sendMessage)
        messageRole = attrs.role || attrs.userType || message.author_type || 'participant';
      } catch (e) {
        // If parsing fails, use author_type as fallback
        messageRole = message.author_type || 'participant';
      }
    }
    
    // Get author type from attributes
    let authorType = message.author_type;
    try {
      const attrs = typeof message.attributes === 'string' 
        ? JSON.parse(message.attributes) 
        : message.attributes;
      if (attrs?.userType) {
        authorType = attrs.userType;
      } else if (attrs?.role) {
        authorType = attrs.role;
      }
    } catch (e) {
      // Use message.author_type as fallback
    }
    
    return {
      isCurrentUser,
      name: participantInfo.name,
      role: messageRole,
      initials: participantInfo.initials,
      authorType
    };
  };

  // Get service name and provider name for header
  const serviceName = booking?.service_name || 'Service';
  const providerName = booking?.providers 
    ? `${booking.providers.first_name || ''} ${booking.providers.last_name || ''}`.trim()
    : booking?.provider_name || 'Provider';
  const bookingRef = booking?.booking_reference || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Custom Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{serviceName}</h2>
                <p className="text-blue-100 text-sm">with {providerName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Booking Reference & Date */}
          {(bookingRef || booking?.booking_date) && (
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/20">
              {bookingRef && (
                <div className="flex items-center gap-1.5 text-sm text-blue-100">
                  <Hash className="h-4 w-4" />
                  <span className="font-mono font-medium text-white">{bookingRef}</span>
                </div>
              )}
              {booking?.booking_date && (
                <div className="flex items-center gap-1.5 text-sm text-blue-100">
                  <Calendar className="h-4 w-4" />
                  <span>{booking.booking_date}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
          {/* Participants Info - Compact */}
          <div className="px-4 py-3 bg-white border-b">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-xs text-gray-500 font-medium">Participants:</span>
              <div className="flex flex-wrap gap-1.5">
                {participants.map((participant) => {
                  const info = getParticipantInfo(participant);
                  const identityKey = `${participant.user_type}-${participant.user_id}`;

                  return (
                    <Badge
                      key={participant.id || identityKey}
                      variant={info.isCurrentUser ? "default" : "outline"}
                      className={`text-xs py-0.5 ${info.isCurrentUser ? 'bg-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {info.initials} {info.name.split(' ')[0]}
                      {info.isCurrentUser && " (You)"}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {loading ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">Loading messages...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <MessageCircle className="h-8 w-8 text-blue-600" />
                      </div>
                      <p className="text-gray-600 font-medium">No messages yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  (() => {
                    // Group messages by date
                    let lastDateKey: string | null = null;
                    
                    return messages.map((message) => {
                      const authorInfo = getMessageAuthorInfo(message);
                      const timestamp = message.created_at;
                      
                      // Customer messages go on the right (blue), provider messages on the left (white)
                      const isCustomerMessage = authorInfo.authorType === 'customer';
                      const isProviderSide = authorInfo.authorType === 'owner' || 
                                            authorInfo.authorType === 'dispatcher' || 
                                            authorInfo.authorType === 'provider';
                      
                      // Format role label
                      const roleLabel = authorInfo.role 
                        ? authorInfo.role.charAt(0).toUpperCase() + authorInfo.role.slice(1)
                        : 'Participant';

                      // Check if we need to show a date separator
                      const currentDateKey = getDateKey(timestamp);
                      const showDateSeparator = currentDateKey !== lastDateKey;
                      lastDateKey = currentDateKey;

                      return (
                        <div key={message.id}>
                          {/* Date Separator */}
                          {showDateSeparator && (
                            <div className="flex items-center justify-center my-4">
                              <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                                {formatMessageDate(timestamp)}
                              </div>
                            </div>
                          )}
                          
                          {/* Message */}
                          <div className={`flex ${isCustomerMessage ? 'justify-end' : 'justify-start'} mb-3`}>
                            <div className={`flex items-end gap-3 ${isCustomerMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className="flex flex-col items-center">
                                <Avatar className="h-8 w-8 border">
                                  <AvatarImage src="" alt={authorInfo.name} />
                                  <AvatarFallback>{authorInfo.initials}</AvatarFallback>
                                </Avatar>
                                <span className="mt-1 text-[11px] text-muted-foreground/80 max-w-[140px] text-center truncate">
                                  {roleLabel}
                                </span>
                              </div>
                              <div
                                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                  isCustomerMessage ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                                <div className="flex items-center justify-end mt-1 text-[11px] opacity-80">
                                  <span className={isCustomerMessage ? 'text-white/80' : 'text-gray-500'}>
                                    {formatMessageTime(timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-3 items-center">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={sending || !activeConversationSid}
                className="flex-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending || !activeConversationSid}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 rounded-full flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationChat;
