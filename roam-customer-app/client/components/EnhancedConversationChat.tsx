import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';

// Import the new booking conversations service from shared
import {
  createBookingConversationsClient,
  type BookingConversationData,
  type BookingConversationParticipant,
  type BookingConversationParticipantData,
  type ConversationMessageWithAuthor,
} from '@roam/shared';

interface BookingSummary {
  id: string;
  customer_id?: string;
  service_id?: string;
  business_id?: string;
  service_name?: string;
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
    email?: string;
  };
  customer_name?: string;
  provider_name?: string;
}

interface EnhancedConversationChatProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: BookingSummary | null;
  currentUser?: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
}

export default function EnhancedConversationChat({
  isOpen, 
  onClose, 
  booking,
  currentUser
}: EnhancedConversationChatProps) {
  const { customer } = useAuth();
  
  // Get access token from localStorage
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('roam_access_token') : null;
  
  const bookingConversationsClient = useMemo(() => 
    createBookingConversationsClient({ accessToken: accessToken || undefined }), 
    [accessToken]
  );
  const [messages, setMessages] = useState<ConversationMessageWithAuthor[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<BookingConversationParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const bookingData = useMemo<BookingConversationData | null>(() => {
    if (!booking) {
      return null;
    }

    const customerId =
      booking.customer_id || booking.customer_profiles?.id || currentUser?.id || customer?.id || '';

    const providerId =
      booking.providers?.user_id || booking.providers?.id || '';

    return {
      bookingId: booking.id,
      customerId,
      providerId,
      businessId: booking.business_id || '',
      serviceName: booking.service_name || 'Service',
      customerName: booking.customer_profiles
        ? `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim()
        : booking.customer_name || currentUser?.first_name || customer?.first_name || 'Customer',
      providerName: booking.providers
        ? `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim()
        : booking.provider_name || 'Provider',
    };
  }, [booking, currentUser?.first_name, currentUser?.id, customer?.first_name, customer?.id]);

  const initializeConversation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setConversationStatus('loading');

      if (!booking || !bookingData) {
        setError('Booking details are missing. Please close and retry.');
        setConversationStatus('error');
        return;
      }

      // Check if messaging is available
      // Get or create conversation for this booking
      const participants: BookingConversationParticipantData[] = [];

      if (booking.customer_profiles) {
        participants.push({
          userId: booking.customer_profiles.id,
          userType: 'customer',
          userName: `${booking.customer_profiles.first_name ?? ''} ${booking.customer_profiles.last_name ?? ''}`.trim(),
          email: booking.customer_profiles.email ?? null,
        });
      }

      if (booking.providers) {
        participants.push({
          userId: booking.providers.user_id,
          userType: 'provider',
          userName: `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim(),
          email: booking.providers.email ?? null,
        });
      }

      const result = await bookingConversationsClient.getOrCreateConversationForBooking(
        bookingData,
        participants,
      );

      if (result.error) {
        setError(result.error);
        setConversationStatus('error');
        return;
      }

      setConversationId(result.conversationId);
      setParticipants(result.participants || []);
      
      // Load existing messages
      await loadMessages(result.conversationId);
      
      setConversationStatus('ready');
    } catch (err) {
      console.error('Error initializing conversation:', err);
      setError('Failed to initialize conversation. Please try again.');
      setConversationStatus('error');
    } finally {
      setLoading(false);
    }
  }, [booking, bookingData]);

  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    if (!targetConversationId) return;

    try {
      const fetchedMessages = await bookingConversationsClient.getMessages(targetConversationId);
      setMessages(fetchedMessages);
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }, [conversationId]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !conversationId || !customer || !bookingData) return;

    try {
      setSending(true);
      
      await bookingConversationsClient.sendMessage(
        conversationId,
        newMessage.trim(),
        customer.id,
        'customer',
        bookingData.bookingId,
      );

      // Clear input and refresh messages
      setNewMessage('');
      await loadMessages();
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  }, [newMessage, conversationId, customer, bookingData, loadMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen && booking?.id) {
      initializeConversation();
    }
  }, [isOpen, booking?.id, initializeConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && conversationId) {
      const interval = setInterval(() => {
        loadMessages();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [isOpen, conversationId, loadMessages]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const retryInitialization = () => {
    initializeConversation();
  };

  // Loading state
  if (loading || conversationStatus === 'loading') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Loading Conversation...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
            <span className="ml-3 text-lg">Setting up your conversation...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (conversationStatus === 'error') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Conversation Unavailable</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-8">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Conversation</h3>
            <p className="text-gray-600 mb-6 text-center">{error}</p>
            <div className="space-y-3">
              <Button onClick={retryInitialization} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const participantMap = useMemo(() => {
    const map = new Map<string, BookingConversationParticipant>();
    for (const participant of participants) {
      const key = `${participant.userType}-${participant.userId}`;
      map.set(key, participant);
    }
    return map;
  }, [participants]);

  const resolveAuthor = (message: ConversationMessageWithAuthor) => {
    const identity = `${message.author_type}-${message.author_id}`;
    return participantMap.get(identity) || null;
  };

  if (!booking || !bookingData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Conversation Unavailable</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-gray-600">
              We couldn&apos;t load the booking details for this conversation. Please close this window and try again.
            </p>
            <Button onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-roam-blue" />
            Conversation - {bookingData.serviceName}
          </DialogTitle>
          <div className="text-sm text-gray-600">
            With {bookingData.providerName} • Booking #{booking.id.slice(-6)}
          </div>
        </DialogHeader>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setError(null)}
                className="ml-auto p-1 h-auto"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 min-h-0 p-4 border rounded-lg bg-gray-50">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">No messages yet</p>
                <p className="text-sm text-gray-400">
                  Start the conversation by sending a message below
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const author = resolveAuthor(message);
                const isCustomer = message.author_type === 'customer';
                const displayName = author?.userName || (isCustomer ? bookingData.customerName : bookingData.providerName);
                const initials = displayName
                  ?.split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                // Extract role from message attributes (set by TwilioConversationsService.sendMessage)
                let displayRole = isCustomer ? 'Customer' : 'Provider';
                if (message.attributes) {
                  try {
                    const attrs = typeof message.attributes === 'string' 
                      ? JSON.parse(message.attributes) 
                      : message.attributes;
                    const role = attrs.role || attrs.userType || message.author_type;
                    // Capitalize the role for display
                    displayRole = role.charAt(0).toUpperCase() + role.slice(1);
                  } catch (e) {
                    // Use default displayRole if parsing fails
                  }
                }

                return (
                  <div
                    key={message.id}
                    className={`flex ${isCustomer ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-3 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex flex-col items-center">
                        <Avatar className="h-8 w-8 border">
                          <AvatarImage src={author?.avatarUrl || undefined} alt={displayName || undefined} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <span className="mt-1 text-[11px] text-muted-foreground/80 max-w-[140px] text-center truncate">
                          {displayName}
                        </span>
                      </div>
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          isCustomer ? 'bg-roam-blue text-white' : 'bg-white border shadow-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        <div className="flex items-center justify-between mt-1 text-[11px] opacity-80 gap-2">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                            {displayRole}
                          </Badge>
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

        {/* Message Input */}
        <div className="flex-shrink-0 border-t pt-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={sending || conversationStatus !== 'ready'}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending || conversationStatus !== 'ready'}
              className="px-4"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              {conversationStatus === 'ready' ? (
                <>
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3 text-yellow-500" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
            <span>Press Enter to send</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}