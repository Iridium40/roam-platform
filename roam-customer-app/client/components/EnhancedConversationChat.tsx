// Rebuild trigger: API now returns participants
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
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
    image_url?: string;
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
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
  // Get Supabase session token
  useEffect(() => {
    const getSessionToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setAccessToken(session.access_token);
        } else {
          // Fallback to localStorage if session not available
          const storedToken = localStorage.getItem('roam_access_token');
          setAccessToken(storedToken);
        }
      } catch (error) {
        console.error('Error getting session token:', error);
        // Fallback to localStorage
        const storedToken = localStorage.getItem('roam_access_token');
        setAccessToken(storedToken);
      }
    };
    
    if (isOpen) {
      getSessionToken();
    }
  }, [isOpen]);
  
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

  const loadMessages = useCallback(async (convId?: string) => {
    const targetConversationId = convId || conversationId;
    console.log('🔄 loadMessages called:', { 
      convId, 
      conversationId, 
      targetConversationId, 
      hasClient: !!bookingConversationsClient 
    });
    
    if (!targetConversationId || !bookingConversationsClient) {
      console.warn('⚠️ Cannot load messages - missing conversationId or client');
      return;
    }

    try {
      console.log('📞 Calling getMessages API...');
      const fetchedMessages = await bookingConversationsClient.getMessages(targetConversationId);
      console.log('✅ Messages fetched:', fetchedMessages.length, 'messages');
      setMessages(fetchedMessages);
    } catch (err) {
      console.error('❌ Error loading messages:', err);
    }
  }, [bookingConversationsClient, conversationId]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (convId: string) => {
    if (!convId || !customer?.user_id) return;
    
    try {
      console.log('📖 Marking messages as read:', { conversationId: convId, userId: customer.user_id });
      const response = await fetch('/api/mark-messages-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: convId,
          userId: customer.user_id,
        }),
      });

      if (!response.ok) {
        console.error('Failed to mark messages as read:', await response.text());
      } else {
        console.log('✅ Messages marked as read');
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
      // Don't throw - this is a non-critical operation
    }
  }, [customer?.user_id]);

  const initializeConversation = useCallback(async () => {
    if (!booking || !bookingData) {
      setError('Booking details are missing. Please close and retry.');
      setConversationStatus('error');
      return;
    }

    if (!bookingConversationsClient) {
      // Wait for client to initialize (will re-run when dependency changes)
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setConversationStatus('loading');

      const participantData: BookingConversationParticipantData[] = [];

      // Add customer participant - use the authenticated user's ID from customer context
      if (customer?.user_id) {
        participantData.push({
          userId: customer.user_id,
          userType: 'customer',
          userName: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || 'Customer',
          email: customer.email ?? null,
        });
      } else {
        console.error('❌ Customer user_id not found in auth context:', customer);
      }

      // Add provider participant
      if (booking.providers?.user_id) {
        participantData.push({
          userId: booking.providers.user_id,
          userType: 'provider',
          userName: `${booking.providers.first_name ?? ''} ${booking.providers.last_name ?? ''}`.trim(),
          email: booking.providers.email ?? null,
        });
      } else {
        console.error('❌ Provider user_id not found in booking.providers:', booking.providers);
      }

      const result = await bookingConversationsClient.getOrCreateConversationForBooking(
        bookingData,
        participantData,
      );

      if (result.error) {
        setError(result.error);
        setConversationStatus('error');
        return;
      }

      setConversationId(result.conversationId);
      setParticipants(result.participants || []);

      await loadMessages(result.conversationId);

      // Mark all messages in this conversation as read for the current user
      await markConversationAsRead(result.conversationId);

      setConversationStatus('ready');
    } catch (err) {
      console.error('Error initializing conversation:', err);
      setError('Failed to initialize conversation. Please try again.');
      setConversationStatus('error');
    } finally {
      setLoading(false);
    }
  }, [booking, bookingData, bookingConversationsClient, loadMessages]);

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !conversationId || !customer || !bookingData || !bookingConversationsClient) return;

    try {
      setSending(true);
      
      // Use customer.user_id (auth user ID) to match the participant identity
      await bookingConversationsClient.sendMessage(
        conversationId,
        newMessage.trim(),
        customer.user_id,
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
  }, [newMessage, conversationId, customer, bookingData, bookingConversationsClient, loadMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    // Only initialize if modal is open, we have a booking, and no conversation is active yet
    if (isOpen && booking?.id && !conversationId && !loading) {
      initializeConversation();
    }
  }, [isOpen, booking?.id, conversationId, loading, initializeConversation]);

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

  const participantMap = useMemo(() => {
    console.log('🗺️ Building participantMap from participants:', participants);
    const map = new Map<string, BookingConversationParticipant>();
    for (const participant of participants) {
      const key = `${participant.userType}-${participant.userId}`;
      console.log(`  Adding to map: ${key} =>`, participant);
      map.set(key, participant);
    }
    console.log('🗺️ Final participantMap size:', map.size);
    return map;
  }, [participants]);

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

  const resolveAuthor = (message: ConversationMessageWithAuthor) => {
    // Helper function to get avatar from booking data or user context
    const getAvatarFromBooking = (authorType: string) => {
      if (authorType === 'customer') {
        // Try customer context first, then booking customer_profiles
        return customer?.image_url || booking?.customer_profiles?.image_url || null;
      } else if (booking?.providers?.image_url) {
        return booking.providers.image_url;
      }
      return null;
    };

    // First, try to get author info from message attributes (most reliable)
    if (message.attributes) {
      try {
        const attrs = typeof message.attributes === 'string' 
          ? JSON.parse(message.attributes) 
          : message.attributes;
        
        if (attrs.authorName) {
          return {
            userId: message.author_id || '',
            userType: (message.author_type || 'customer') as 'customer' | 'provider' | 'owner' | 'dispatcher',
            userName: attrs.authorName,
            email: attrs.email || null,
            avatarUrl: getAvatarFromBooking(message.author_type || 'customer'),
          };
        }
      } catch (e) {
        console.warn('Failed to parse message attributes:', e);
      }
    }
    
    // Fallback: try participant map
    const identity = `${message.author_type}-${message.author_id}`;
    const participant = participantMap.get(identity);
    if (participant) {
      return {
        ...participant,
        avatarUrl: participant.avatarUrl || getAvatarFromBooking(message.author_type || 'customer'),
      };
    }
    
    // Last resort: return a basic author object with avatar from booking data
    return {
      userId: message.author_id || '',
      userType: (message.author_type || 'customer') as 'customer' | 'provider' | 'owner' | 'dispatcher',
      userName: message.author_type === 'customer' ? 'Customer' : 'Provider',
      email: null,
      avatarUrl: getAvatarFromBooking(message.author_type || 'customer'),
    };
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
        <ScrollArea className="h-[400px] p-4 border rounded-lg bg-gray-50">
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
              (() => {
                // Group messages by date
                let lastDateKey: string | null = null;
                
                return messages.map((message, index) => {
                  const author = resolveAuthor(message);
                  // Check if this message was sent by the current logged-in customer
                  const isCurrentUser = message.author_type === 'customer' && message.author_id === customer?.user_id;
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

                  // Check if we need to show a date separator
                  const currentDateKey = getDateKey(message.timestamp);
                  const showDateSeparator = currentDateKey !== lastDateKey;
                  lastDateKey = currentDateKey;

                  return (
                    <div key={message.id}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="flex items-center justify-center my-4">
                          <div className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full">
                            {formatMessageDate(message.timestamp)}
                          </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} mb-3`}>
                        <div className={`flex items-end gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
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
                              isCurrentUser ? 'bg-roam-blue text-white' : 'bg-white border shadow-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="flex items-center justify-end mt-1 text-[11px] opacity-80">
                              <span className={isCurrentUser ? 'text-white/80' : 'text-gray-500'}>
                                {formatMessageTime(message.timestamp)}
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