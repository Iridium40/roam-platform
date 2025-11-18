import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  MessageCircle,
  Users,
  Clock,
  User,
  X
} from 'lucide-react';
import { useConversations } from '@roam/shared';
import type { ConversationMessage as DBConversationMessage, Conversation } from '@roam/shared';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

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
    customer_profiles?: {
      id: string;
      first_name: string;
      last_name: string;
      email?: string;
    };
    providers?: {
      id: string;
      user_id: string;
      first_name: string;
      last_name: string;
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

  const formatMessageTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
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
    
    return {
      isCurrentUser,
      name: participantInfo.name,
      role: messageRole, // Use the role from message attributes
      initials: participantInfo.initials
    };
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
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    };
  };



  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {booking ? `Chat - ${booking.service_name || 'Booking'}` : 'Conversation'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Participants Info */}
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => {
                  const info = getParticipantInfo(participant);
                  return (
                    <Badge
                      key={participant.id}
                      variant={info.isCurrentUser ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={info.imageUrl} />
                        <AvatarFallback className="text-xs">
                          {info.initials}
                        </AvatarFallback>
                      </Avatar>
                      {info.name}
                      {info.isCurrentUser && " (You)"}
                    </Badge>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Messages */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Messages</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                  {loading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((message) => {
                      const authorInfo = getMessageAuthorInfo(message);
                      logger.debug('🔍 Message debug:', {
                        messageId: message.id,
                        author_id: message.author_id,
                        content: message.content,
                        authorInfo: authorInfo,
                        currentUserIdentity: getUserIdentity(),
                        currentUserType: currentUserType,
                        currentUser: currentUser,
                        booking: booking
                      });
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            authorInfo.isCurrentUser ? 'flex-row-reverse' : 'flex-row'
                          }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src="" />
                            <AvatarFallback className="text-xs">
                              {authorInfo.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`flex flex-col max-w-[70%] ${
                              authorInfo.isCurrentUser ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">
                                {authorInfo.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {authorInfo.role}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {formatMessageTime(message.created_at)}
                              </span>
                            </div>
                            <div
                              className={`rounded-lg px-3 py-2 text-sm ${
                                authorInfo.isCurrentUser
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-100 text-gray-900'
                              }`}
                            >
                              {message.content}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Input */}
          <Card className="mt-4">
            <CardContent className="pt-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={sending || !activeConversationSid}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending || !activeConversationSid}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationChat;
