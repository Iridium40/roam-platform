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
  RefreshCw,
  Hash,
  Calendar,
  Paperclip,
  FileIcon,
  ImageIcon,
  Download,
  Smile,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
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
  type MediaAttachment,
} from '@roam/shared';

interface BookingSummary {
  id: string;
  customer_id?: string;
  service_id?: string;
  business_id?: string;
  service_name?: string;
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
        logger.error('Error getting session token:', error);
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
  const [uploading, setUploading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<BookingConversationParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [conversationStatus, setConversationStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Allowed file types for attachments
  const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    logger.debug('loadMessages called:', { 
      convId, 
      conversationId, 
      targetConversationId, 
      hasClient: !!bookingConversationsClient 
    });
    
    if (!targetConversationId || !bookingConversationsClient) {
      logger.warn('Cannot load messages - missing conversationId or client');
      return;
    }

    try {
      logger.debug('Calling getMessages API...');
      const fetchedMessages = await bookingConversationsClient.getMessages(targetConversationId);
      logger.debug('Messages fetched:', fetchedMessages.length, 'messages');
      setMessages(fetchedMessages);
    } catch (err) {
      logger.error('Error loading messages:', err);
    }
  }, [bookingConversationsClient, conversationId]);

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (convId: string) => {
    if (!convId || !customer?.user_id) return;
    
    try {
      logger.debug('Marking messages as read:', { conversationId: convId, userId: customer.user_id });
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
        logger.error('Failed to mark messages as read:', await response.text());
      } else {
        logger.debug('Messages marked as read');
      }
    } catch (error) {
      logger.error('Error marking messages as read:', error);
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
        logger.error('Customer user_id not found in auth context:', customer);
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
        logger.error('Provider user_id not found in booking.providers:', booking.providers);
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
      logger.error('Error initializing conversation:', err);
      setError('Failed to initialize conversation. Please try again.');
      setConversationStatus('error');
    } finally {
      setLoading(false);
    }
  }, [booking, bookingData, bookingConversationsClient, loadMessages]);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    // Focus back on input after emoji selection
    inputRef.current?.focus();
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('File type not supported. Please upload an image or PDF.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File is too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const handleRemoveFile = useCallback(() => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const sendMessage = useCallback(async () => {
    const hasContent = newMessage.trim() || selectedFile;
    if (!hasContent || !conversationId || !customer || !bookingData || !bookingConversationsClient) return;

    try {
      setSending(true);
      
      if (selectedFile) {
        // Send message with attachment
        logger.debug('Sending message with attachment...', { 
          conversationId,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        });
        
        setUploading(true);
        await bookingConversationsClient.sendMessageWithAttachment(
          conversationId,
          customer.user_id,
          'customer',
          selectedFile,
          newMessage.trim() || undefined,
          bookingData.bookingId
        );
        setUploading(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Send text-only message
        await bookingConversationsClient.sendMessage(
          conversationId,
          newMessage.trim(),
          customer.user_id,
          'customer',
          bookingData.bookingId,
        );
      }

      // Clear input and refresh messages
      setNewMessage('');
      await loadMessages();
      
      // Clear any previous errors
      setError(null);
    } catch (err) {
      logger.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      setUploading(false);
    } finally {
      setSending(false);
    }
  }, [newMessage, conversationId, customer, bookingData, bookingConversationsClient, loadMessages, selectedFile]);

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
    logger.debug('Building participantMap from participants:', participants);
    const map = new Map<string, BookingConversationParticipant>();
    for (const participant of participants) {
      const key = `${participant.userType}-${participant.userId}`;
      logger.debug(`Adding to map: ${key} =>`, participant);
      map.set(key, participant);
    }
    logger.debug('Final participantMap size:', map.size);
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
        logger.warn('Failed to parse message attributes:', e);
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

  // Helper to render media attachments
  const renderMediaAttachment = (media: MediaAttachment) => {
    const isImage = media.contentType?.startsWith('image/');
    
    if (isImage && media.url) {
      return (
        <div key={media.sid} className="mt-2">
          <a href={media.url} target="_blank" rel="noopener noreferrer">
            <img 
              src={media.url} 
              alt={media.filename || 'Attachment'} 
              className="max-w-[200px] max-h-[200px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
            />
          </a>
        </div>
      );
    }
    
    // Non-image file (PDF, doc, etc.)
    // If no URL is available, show a disabled state
    if (!media.url) {
      return (
        <div key={media.sid} className="mt-2">
          <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg opacity-60 cursor-not-allowed">
            <FileIcon className="h-5 w-5" />
            <span className="text-sm truncate max-w-[150px]">{media.filename || 'Attachment'}</span>
            <span className="text-xs text-gray-400 ml-auto">Unavailable</span>
          </div>
        </div>
      );
    }
    
    return (
      <div key={media.sid} className="mt-2">
        <a 
          href={media.url}
          download={media.filename || 'attachment'}
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <FileIcon className="h-5 w-5" />
          <span className="text-sm truncate max-w-[150px]">{media.filename || 'Attachment'}</span>
          <Download className="h-4 w-4 ml-auto" />
        </a>
      </div>
    );
  };

  // Get provider name for display
  const providerName = booking?.providers 
    ? `${booking.providers.first_name || ''} ${booking.providers.last_name || ''}`.trim()
    : booking?.provider_name || 'Provider';
  const bookingRef = booking?.booking_reference || '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0 overflow-hidden" hideCloseButton>
        {/* Custom Header with gradient background */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-5 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{bookingData.serviceName}</h2>
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
                  const name = participant.userName || (participant.userType === 'customer' ? bookingData.customerName : bookingData.providerName);
                  const initials = name
                    ?.split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();
                  const identityKey = `${participant.userType}-${participant.userId}`;
                  const isCurrentUser = participant.userId === customer?.user_id;

                  return (
                    <Badge
                      key={identityKey}
                      variant={isCurrentUser ? "default" : "outline"}
                      className={`text-xs py-0.5 ${isCurrentUser ? 'bg-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {initials} {name?.split(' ')[0]}
                      {isCurrentUser && " (You)"}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
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
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {messages.length === 0 ? (
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
                                  {displayRole}
                                </span>
                              </div>
                                <div
                                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                    isCurrentUser ? 'bg-blue-600 text-white' : 'bg-white border shadow-sm'
                                  }`}
                                >
                                  {message.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                  )}
                                  {/* Render media attachments */}
                                  {(message as any).media?.map((media: MediaAttachment) => renderMediaAttachment(media))}
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
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="p-4 bg-white border-t">
            {/* Selected file preview */}
            {selectedFile && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center gap-2">
                {selectedFile.type.startsWith('image/') ? (
                  <ImageIcon className="h-5 w-5 text-blue-600" />
                ) : (
                  <FileIcon className="h-5 w-5 text-blue-600" />
                )}
                <span className="text-sm text-gray-700 truncate flex-1">{selectedFile.name}</span>
                <span className="text-xs text-gray-400">
                  {(selectedFile.size / 1024).toFixed(1)}KB
                </span>
                <button
                  onClick={handleRemoveFile}
                  className="p-1 hover:bg-gray-200 rounded-full"
                  disabled={sending}
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            )}
            
            <div className="flex gap-2 items-center relative">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept={ALLOWED_FILE_TYPES.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Attachment button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={sending || conversationStatus !== 'ready'}
                className="h-10 w-10 flex-shrink-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {/* Emoji button */}
              <div className="relative" ref={emojiPickerRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={sending || conversationStatus !== 'ready'}
                  className="h-10 w-10 flex-shrink-0 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Smile className="h-5 w-5" />
                </Button>
                
                {/* Emoji Picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-50">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme={Theme.LIGHT}
                      width={320}
                      height={400}
                      searchPlaceholder="Search emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>
              
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={sending || conversationStatus !== 'ready'}
                className="flex-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              />
              <Button
                onClick={sendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || sending || conversationStatus !== 'ready'}
                size="icon"
                className="bg-blue-600 hover:bg-blue-700 h-10 w-10 rounded-full flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}