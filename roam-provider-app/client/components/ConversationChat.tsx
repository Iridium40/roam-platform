import { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
} from 'lucide-react';
import { useConversations, ConversationMessage, Conversation } from '@/hooks/useConversations';
import { useAuth } from '@/contexts/auth/AuthProvider';
import {
  createBookingConversationsClient,
  type BookingConversationParticipant,
  type BookingConversationParticipantData,
} from '@roam/shared';
import { formatDistanceToNow } from 'date-fns';

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
  const { user, customer, userType } = useAuth();
  
  // Get access token from localStorage
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('roam_access_token') : null;
  
  const bookingConversationsClient = useMemo(() => 
    createBookingConversationsClient({ accessToken: accessToken || undefined }), 
    [accessToken]
  );
  
  // Determine user type safely
  const currentUserType = userType || (user ? 'provider' : 'customer');
  
  // Get the current user data (either provider or customer)
  const currentUser = user || customer;
  
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
    loadParticipants,
    getUserIdentity,
    setCurrentConversation,
  } = useConversations();

  const [newMessage, setNewMessage] = useState('');
  const [activeConversationSid, setActiveConversationSid] = useState<string | null>(conversationSid || null);
  const [enrichedParticipants, setEnrichedParticipants] = useState<BookingConversationParticipant[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize conversation when modal opens
  useEffect(() => {
    console.log('ConversationChat useEffect triggered:', {
      isOpen,
      booking: booking?.id,
      conversationSid,
      activeConversationSid,
      user: currentUser?.id,
      userType: currentUserType
    });

    if (isOpen && booking && !activeConversationSid && bookingConversationsClient) {
      console.log('🎯 Triggering initializeBookingConversation...');
      initializeBookingConversation();
    } else if (isOpen && conversationSid) {
      console.log('Setting conversation SID from prop:', conversationSid);
      setActiveConversationSid(conversationSid);
      setCurrentConversation(conversationSid);
    }
  }, [isOpen, booking, conversationSid, bookingConversationsClient, setCurrentConversation]);

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

    console.log('🔄 Starting optimized message polling for conversation:', activeConversationSid);
    
    const pollInterval = setInterval(async () => {
      console.log('🔄 Checking for new messages...');
      
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
            console.log('🔄 New messages found, updating chat');
            await loadMessages(activeConversationSid);
          }
        }
      } catch (error) {
        console.error('Message polling error:', error);
      }
    }, 8000); // Reduced frequency: Poll every 8 seconds instead of 3

    return () => {
      console.log('🔄 Stopping message polling');
      clearInterval(pollInterval);
    };
  }, [isOpen, activeConversationSid, messages.length]);

  const initializeBookingConversation = async () => {
    console.log('🚀 initializeBookingConversation called with:', {
      booking: booking?.id,
      user: currentUser?.id,
      userType: currentUserType,
      bookingData: booking,
      currentUserData: currentUser
    });

    if (!booking || !currentUser || !bookingConversationsClient) {
      console.log('❌ Missing required data:', { 
        booking: !!booking, 
        user: !!currentUser,
        bookingId: booking?.id,
        userId: currentUser?.id,
        hasClient: !!bookingConversationsClient,
      });
      return;
    }

      console.log('📋 Initializing booking conversation for:', booking.id);

      const participants: BookingConversationParticipantData[] = [];

      if (booking.customer_profiles?.id) {
        participants.push({
          userId: booking.customer_profiles.id,
          userType: 'customer',
          userName: `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim(),
          email: booking.customer_profiles.email || null,
        });
      }

      if (booking.providers?.user_id) {
        participants.push({
          userId: booking.providers.user_id,
          userType: 'provider',
          userName: `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim(),
        });
      }

    try {
      const result = await bookingConversationsClient.getOrCreateConversationForBooking(
        {
          bookingId: booking.id,
          customerId: booking.customer_profiles?.id,
          providerId: booking.providers?.user_id,
          businessId: booking.business_id,
          serviceName: booking.service_name,
          customerName: `${booking.customer_profiles?.first_name ?? ''} ${booking.customer_profiles?.last_name ?? ''}`.trim(),
          providerName: `${booking.providers?.first_name ?? ''} ${booking.providers?.last_name ?? ''}`.trim(),
        },
        participants,
      );

      setActiveConversationSid(result.conversationId);
      setCurrentConversation(result.conversationId);
      setEnrichedParticipants(result.participants || []);
      await Promise.all([
        loadMessages(result.conversationId),
        loadParticipants(result.conversationId),
      ]);
    } catch (error) {
      console.error('💥 Error initializing conversation:', error);
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
      console.error('Error sending message:', error);
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

  const getMessageAuthorInfo = (message: ConversationMessage) => {
    const userIdentity = getUserIdentity();
    const attributes = message.attributes || {};
    
    // Enhanced identity matching - check if message author is same user type as current user
    const isCurrentUserType = (
      (userType === 'customer' && message.author.startsWith('customer-')) ||
      (userType === 'provider' && message.author.startsWith('provider-'))
    );
    
    // For now, assume same user type messages are from current user
    const isCurrentUser = isCurrentUserType;
    
    // SMART APPROACH: Find the actual participant from the participants list
    const actualParticipant = participants.find(p => p.identity === message.author);
    
    let participantInfo;
    if (actualParticipant) {
      // Use the actual participant data
      participantInfo = getParticipantInfo(actualParticipant);
    } else {
      // Fallback: create a fake participant object if not found
      const fakeParticipant = {
        identity: message.author,
        attributes: attributes
      };
      participantInfo = getParticipantInfo(fakeParticipant);
    }
    
    return {
      isCurrentUser,
      name: participantInfo.name,
      role: attributes.userRole || 'participant',
      initials: participantInfo.initials
    };
  };

  const getParticipantInfo = (participant: any) => {
    const userIdentity = getUserIdentity();
    
    // Enhanced identity matching - check if participant is same user type as current user
    const isCurrentUserType = (
      (userType === 'customer' && participant.identity.startsWith('customer-')) ||
      (userType === 'provider' && participant.identity.startsWith('provider-'))
    );
    const isCurrentUser = isCurrentUserType;
    
    // Enhanced name resolution logic
    let displayName = participant.attributes?.name || participant.identity;
    
    // Try to get actual names from booking data
    if (participant.identity.startsWith('customer-')) {
      if (userType === 'customer' && currentUser) {
        // Current customer viewing - use their name
        displayName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim();
      } else if (userType === 'provider' && booking?.customer_profiles) {
        // Provider viewing customer - use customer profile name
        displayName = `${booking.customer_profiles.first_name} ${booking.customer_profiles.last_name}`.trim();
      }
    } else if (participant.identity.startsWith('provider-')) {
      if (userType === 'provider' && user) {
        // Current provider viewing - use their name
        displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      } else if (userType === 'customer' && booking?.providers) {
        // Customer viewing provider - use provider profile name
        displayName = `${booking.providers.first_name} ${booking.providers.last_name}`.trim();
      }
    }
    
    // Fallback to clean version of identity if no good name found
    if (!displayName || displayName === participant.identity) {
      displayName = participant.identity.replace(/^(customer-|provider-)/, '').replace(/[_-]/g, ' ') || 'User';
    }
    
    return {
      isCurrentUser,
      name: displayName,
      role: participant.attributes?.role || participant.userType || 'participant',
      imageUrl: participant.attributes?.imageUrl,
      initials: displayName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    };
  };

  const participantMap = useMemo(() => {
    const map = new Map<string, BookingConversationParticipant>();
    [...enrichedParticipants, ...participants.map((p) => ({
      userId: p.user_id,
      userType: (p.user_type as any) || 'unknown',
      userName: p.attributes?.senderName || p.identity,
      email: p.attributes?.email,
      avatarUrl: p.attributes?.avatarUrl,
    }))].forEach((participant) => {
      if (!participant.userId || !participant.userType) return;
      const key = `${participant.userType}-${participant.userId}`;
      if (!map.has(key)) {
        map.set(key, participant as BookingConversationParticipant);
      }
    });
    return map;
  }, [enrichedParticipants, participants]);

  const resolveMessageAuthor = (message: ConversationMessage) => {
    const key = `${message.author_type}-${message.author_id}`;
    return participantMap.get(key) || null;
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
                      key={participant.sid}
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
                      const author = resolveMessageAuthor(message);
                      const isCurrentUser = author?.userId === currentUser?.id;
                      const displayName = author?.userName || message.author_name || 'Participant';
                      const initials = displayName
                        .split(' ')
                        .map((part) => part[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                          <div className={`flex items-end gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="flex flex-col items-center">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={author?.avatarUrl || undefined} alt={displayName} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <span className="mt-1 text-[11px] text-muted-foreground/80 max-w-[140px] text-center truncate">
                                {displayName}
                              </span>
                            </div>
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isCurrentUser ? 'bg-roam-blue text-white' : 'bg-white border shadow-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                              <div className="flex items-center justify-between mt-1 text-[11px] opacity-80">
                                {!isCurrentUser && author?.userType && (
                                  <span className="uppercase tracking-wide">
                                    {author.userType === 'provider' ? 'Provider' : author.userType}
                                  </span>
                                )}
                                <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
                              </div>
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
