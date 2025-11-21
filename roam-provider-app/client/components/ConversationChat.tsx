import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { useAuth } from '@/contexts/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  createBookingConversationsClient,
  type BookingConversationParticipant,
  type BookingConversationParticipantData,
  type ConversationMessageWithAuthor,
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
      user_id?: string;
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
  const { provider: providerAuth, customer: customerAuth, userType } = useAuth();
  
  // Get access token from localStorage
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('roam_access_token') : null;
  
  const bookingConversationsClient = useMemo(() => 
    createBookingConversationsClient({ accessToken: accessToken || undefined }), 
    [accessToken]
  );
  
  // Determine user type safely
  const currentUserType = userType || (providerAuth ? 'provider' : 'customer');
  
  // Get the actual provider or customer object
  const provider = providerAuth?.provider;
  const customer = customerAuth?.customer;
  
  // Get the current user data (either provider or customer)
  const currentUser = provider || customer;
  const currentUserId =
    provider?.user_id ??
    provider?.id ??
    customer?.id ??
    '';

  // Debug logging for user identity
  console.log('🔍 ConversationChat User Identity Debug:', {
    currentUserType,
    provider_user_id: provider?.user_id,
    provider_id: provider?.id,
    customer_id: customer?.id,
    currentUserId,
    finalIdentity: `${currentUserType}-${currentUserId}`,
  });

  const getUserIdentity = useCallback(() => {
    if (!currentUserId) return null;
    return `${currentUserType}-${currentUserId}`;
  }, [currentUserId, currentUserType]);

  const buildParticipantPayload = useCallback((): BookingConversationParticipantData[] => {
    if (!booking) return [];
    const payload: BookingConversationParticipantData[] = [];

    // Always add customer using their user_id from customer_profiles
    if (booking.customer_profiles?.user_id) {
      payload.push({
        userId: booking.customer_profiles.user_id,
        userType: 'customer',
        userName: `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim(),
        email: booking.customer_profiles.email ?? null,
      });
    } else if (booking.customer_profiles?.id) {
      // Fallback: if user_id is not available, log error
      console.error('❌ customer_profiles.user_id not found, using id as fallback (will cause FK error)');
      payload.push({
        userId: booking.customer_profiles.id,
        userType: 'customer',
        userName: `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim(),
        email: booking.customer_profiles.email ?? null,
      });
    } else if (booking.customer_id) {
      payload.push({
        userId: booking.customer_id,
        userType: 'customer',
        userName: booking.customer_name || 'Customer',
      });
    }

    // Always add the current logged-in provider user with their actual role
    if (currentUserId && provider) {
      // Use the provider's actual role (owner, dispatcher, or provider)
      const actualRole = provider.provider_role || 'provider';
      
      // Check if current user is already in payload to avoid duplicates
      const isAlreadyIncluded = payload.some(
        (p) => p.userId === currentUserId
      );
      
      if (!isAlreadyIncluded) {
        payload.push({
          userId: currentUserId,
          userType: actualRole as 'owner' | 'dispatcher' | 'provider',
          userName: `${provider.first_name ?? ''} ${provider.last_name ?? ''}`.trim() || 'Provider',
          email: provider?.email ?? null,
        });
      }
    }

    // Also add assigned provider from booking if different from current user
    if (booking.providers?.user_id && booking.providers.user_id !== currentUserId) {
      const isAlreadyIncluded = payload.some(
        (p) => p.userId === booking.providers.user_id && p.userType === 'provider'
      );
      
      if (!isAlreadyIncluded) {
        payload.push({
          userId: booking.providers.user_id,
          userType: 'provider',
          userName: `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim(),
        });
      }
    } else if ((booking as any)?.provider_id && (booking as any).provider_id !== currentUserId) {
      const isAlreadyIncluded = payload.some(
        (p) => p.userId === (booking as any).provider_id && p.userType === 'provider'
      );
      
      if (!isAlreadyIncluded) {
        payload.push({
          userId: (booking as any).provider_id,
          userType: 'provider',
          userName: booking.provider_name || 'Provider',
        });
      }
    }

    return payload;
  }, [booking, currentUserId, currentUserType, provider]);
  
  const [messages, setMessages] = useState<ConversationMessageWithAuthor[]>([]);
  const [participants, setParticipants] = useState<BookingConversationParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeConversationSid, setActiveConversationSid] = useState<string | null>(conversationSid || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      console.log('🔄 loadMessages called:', { conversationId, hasClient: !!bookingConversationsClient });
      
      if (!conversationId || !bookingConversationsClient) {
        console.warn('⚠️ Cannot load messages - missing conversationId or client');
        return;
      }
      
      try {
        console.log('📞 Calling getMessages API...');
        const fetched = await bookingConversationsClient.getMessages(conversationId);
        console.log('✅ Messages fetched:', fetched.length, 'messages');
        setMessages(fetched);
      } catch (err) {
        console.error('❌ Error loading messages:', err);
      }
    },
    [bookingConversationsClient]
  );

  useEffect(() => {
    if (!booking) return;
    const baseParticipants = buildParticipantPayload().map((participant) => ({
      ...participant,
    })) as BookingConversationParticipant[];
    setParticipants(baseParticipants);
  }, [booking, buildParticipantPayload]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Define initializeConversation BEFORE the useEffects that use it
  const initializeConversation = useCallback(async () => {
    console.log('🔄 Initializing conversation...', { 
      hasBooking: !!booking, 
      hasClient: !!bookingConversationsClient 
    });

    if (!booking || !bookingConversationsClient) {
      console.warn('⚠️ Cannot initialize - missing booking or client');
      return;
    }

    setLoading(true);
    setError(null);

    const participantPayload = buildParticipantPayload();
    console.log('👥 Participant payload:', participantPayload);

    try {
      const result = await bookingConversationsClient.getOrCreateConversationForBooking(
        {
          bookingId: booking.id,
          customerId: booking.customer_profiles?.id || booking.customer_id,
          providerId: booking.providers?.user_id || (booking as any)?.provider_id,
          businessId: booking.business_id,
          serviceName: booking.service_name,
          customerName: booking.customer_profiles
            ? `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim()
            : booking.customer_name || 'Customer',
          providerName: booking.providers
            ? `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim()
            : booking.provider_name || 'Provider',
        },
        participantPayload,
      );

      console.log('✅ Conversation initialized:', result);
      setActiveConversationSid(result.conversationId);
      const normalizedParticipants =
        result.participants && result.participants.length
          ? result.participants.map((participant) => ({
              ...participant,
              userId: (participant as any).userId ?? (participant as any).user_id,
              userType: (participant as any).userType ?? (participant as any).user_type,
              userName:
                (participant as any).userName ??
                (participant as any).user_name ??
                (participant as any).identity ??
                undefined,
            }))
          : participantPayload.map((participant) => ({
              ...participant,
            }));

      setParticipants(normalizedParticipants as BookingConversationParticipant[]);
      await loadMessages(result.conversationId);
      
      // TODO: Mark messages as read when conversation is opened
      // This will be implemented once the message_notifications table types are fixed
    } catch (error) {
      console.error('Error initializing conversation:', error);
      setError(error instanceof Error ? error.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [booking, bookingConversationsClient, buildParticipantPayload, loadMessages, currentUserId]);

  // Initialize conversation when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (booking) {
      initializeConversation();
    } else if (conversationSid) {
      setActiveConversationSid(conversationSid);
      loadMessages(conversationSid);
    }
  }, [isOpen, booking, conversationSid, initializeConversation, loadMessages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationSid) {
      loadMessages(activeConversationSid);
    }
  }, [activeConversationSid, loadMessages]);

  // Smart polling for real-time updates with scroll preservation
  useEffect(() => {
    if (!isOpen || !activeConversationSid) return;

    const pollInterval = setInterval(() => {
      loadMessages(activeConversationSid);
    }, 8000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [isOpen, activeConversationSid, loadMessages]);

  const handleSendMessage = async () => {
    console.log('🚀 Send message clicked', {
      hasMessage: !!newMessage.trim(),
      activeConversationSid,
      hasClient: !!bookingConversationsClient,
      currentUserId,
      currentUserType,
    });

    if (!newMessage.trim() || !activeConversationSid || !bookingConversationsClient || !currentUserId) {
      console.warn('❌ Send blocked - missing required data');
      return;
    }

    try {
      setSending(true);
      console.log('📤 Sending message...', { conversationSid: activeConversationSid });
      
      await bookingConversationsClient.sendMessage(
        activeConversationSid,
        newMessage.trim(),
        currentUserId,
        (currentUserType as 'customer' | 'provider' | 'owner' | 'dispatcher'),
        booking?.id
      );
      
      console.log('✅ Message sent successfully');
      setNewMessage('');
      await loadMessages(activeConversationSid);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (dateString?: string | null) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Just now';
    }
  };

  const participantMap = useMemo(() => {
    const map = new Map<string, BookingConversationParticipant>();
    participants.forEach((participant) => {
      if (!participant.userId || !participant.userType) return;
      map.set(`${participant.userType}-${participant.userId}`, participant);
    });
    return map;
  }, [participants]);

  const formatParticipantName = useCallback(
    (participant: BookingConversationParticipant) => {
      if (participant.userName) return participant.userName;
      if (participant.userType === 'customer') {
        return booking?.customer_name || 'Customer';
      }
      if (participant.userType === 'provider') {
        return booking?.provider_name || 'Provider';
      }
      return participant.userType || 'Participant';
    },
    [booking]
  );

  const resolveMessageAuthor = useCallback(
    (message: ConversationMessageWithAuthor) => {
      const attrsRaw = message.attributes;
      let attrs: Record<string, any> = {};
      if (attrsRaw) {
        try {
          attrs = typeof attrsRaw === 'string' ? JSON.parse(attrsRaw) : attrsRaw;
        } catch {
          attrs = {};
        }
      }

      const key =
        attrs.userId && attrs.userType
          ? `${attrs.userType}-${attrs.userId}`
          : undefined;
      const participant = key ? participantMap.get(key) : undefined;

      const displayName =
        attrs.authorName ||
        participant?.userName ||
        message.authorName ||
        message.author ||
        'Participant';

      const rawRole = attrs.role || attrs.userType || participant?.userType || 'participant';
      const roleLabel =
        typeof rawRole === 'string'
          ? rawRole.charAt(0).toUpperCase() + rawRole.slice(1)
          : 'Participant';

      const isCurrentUser = attrs.userId ? attrs.userId === currentUserId : false;

      const initials = displayName
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      // Get avatar URL from attributes or booking data
      let avatarUrl = attrs.imageUrl || null;
      if (!avatarUrl && attrs.userType === 'customer' && booking?.customer_profiles?.image_url) {
        avatarUrl = booking.customer_profiles.image_url;
      } else if (!avatarUrl && isCurrentUser && provider?.image_url) {
        avatarUrl = provider.image_url;
      }

      return {
        displayName,
        roleLabel,
        isCurrentUser,
        initials,
        avatarUrl,
      };
    },
    [participantMap, currentUserId]
  );


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
                  const name = formatParticipantName(participant);
                  const initials = name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const identityKey = `${participant.userType}-${participant.userId}`;
                  const isCurrentUser = getUserIdentity() === identityKey;

                  return (
                    <Badge
                      key={identityKey}
                      variant={isCurrentUser ? "default" : "secondary"}
                      className="flex items-center gap-1"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      {name}
                      {isCurrentUser && " (You)"}
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
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 p-4">
                  {loading ? (
                    <div className="text-center text-gray-500">Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500">No messages yet. Start the conversation!</div>
                  ) : (
                    messages.map((message) => {
                      const author = resolveMessageAuthor(message);
                      const displayName = author?.displayName ?? 'Participant';
                      const initials = author?.initials ?? 'U';
                      const roleLabel = author?.roleLabel;
                      const avatarUrl = author?.avatarUrl;
                      const timestamp = message.timestamp;
                      
                      // Check if message is from a provider-side user (owner, dispatcher, provider)
                      // All provider-side messages go on the right (blue), customer messages on the left (white)
                      const isProviderSide = message.author_type === 'owner' || 
                                            message.author_type === 'dispatcher' || 
                                            message.author_type === 'provider';
                      const isCustomer = message.author_type === 'customer';

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isProviderSide ? 'justify-end' : 'justify-start'} mb-4`}
                        >
                          <div className={`flex items-end gap-3 ${isProviderSide ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className="flex flex-col items-center">
                              <Avatar className="h-8 w-8 border">
                                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                                <AvatarFallback>{initials}</AvatarFallback>
                              </Avatar>
                              <span className="mt-1 text-[11px] text-muted-foreground/80 max-w-[140px] text-center truncate">
                                {displayName}
                              </span>
                            </div>
                            <div
                              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                isProviderSide ? 'bg-roam-blue text-white' : 'bg-white border shadow-sm'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap break-words">
                                {message.content || message.author_name || ''}
                              </p>
                              <div className="flex items-center justify-between mt-1 text-[11px] opacity-80">
                                {!isProviderSide && roleLabel && (
                                  <span className="uppercase tracking-wide">
                                    {roleLabel}
                                  </span>
                                )}
                                <span className={`${isProviderSide ? 'text-white/80' : ''}`}>
                                  {formatMessageTime(timestamp)}
                                </span>
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
