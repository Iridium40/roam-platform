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
  Hash,
  Calendar,
  X,
  Paperclip,
  Loader2,
  FileIcon,
  ImageIcon,
  Download,
  Smile,
} from 'lucide-react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import {
  createBookingConversationsClient,
  type BookingConversationParticipant,
  type BookingConversationParticipantData,
  type ConversationMessageWithAuthor,
  type MediaAttachment,
} from '@roam/shared';

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
    services?: {
      name: string;
    };
    customer_profiles?: {
      id: string;
      user_id?: string;
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
  const { provider: providerAuth, customer: customerAuth, userType } = useAuth();
  
  // Get access token from localStorage
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('roam_access_token') : null;
  
  const bookingConversationsClient = useMemo(() => 
    createBookingConversationsClient({ accessToken: accessToken || undefined }), 
    [accessToken]
  );
  
  // Get the actual provider or customer object
  const provider = providerAuth?.provider;
  const customer = customerAuth?.customer;
  
  // In provider app, use the provider's actual role (owner, dispatcher, or provider)
  // Provider role takes precedence over any userType detection
  const currentUserType = provider?.provider_role || userType || 'provider';
  
  // Get the current user data (should always be provider in provider app)
  const currentUser = provider || customer;
  const currentUserId = provider?.user_id || provider?.id || customer?.id || '';

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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeConversationSid, setActiveConversationSid] = useState<string | null>(conversationSid || null);
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

  // Mark all messages in a conversation as read
  const markConversationAsRead = useCallback(async (convId: string) => {
    if (!convId || !currentUserId) return;
    
    try {
      console.log('📖 Marking messages as read:', { conversationId: convId, userId: currentUserId });
      const response = await fetch('/api/mark-messages-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: convId,
          userId: currentUserId,
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
  }, [currentUserId]);

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
      
      // Mark all messages in this conversation as read for the current user
      await markConversationAsRead(result.conversationId);
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
      // Mark messages as read when opening via conversationSid
      markConversationAsRead(conversationSid);
    }
  }, [isOpen, booking, conversationSid, initializeConversation, loadMessages, markConversationAsRead]);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    console.log('🚀 Send message clicked', {
      hasMessage: !!newMessage.trim(),
      hasFile: !!selectedFile,
      activeConversationSid,
      hasClient: !!bookingConversationsClient,
      currentUserId,
      currentUserType,
    });

    const hasContent = newMessage.trim() || selectedFile;
    if (!hasContent || !activeConversationSid || !bookingConversationsClient || !currentUserId) {
      console.warn('❌ Send blocked - missing required data');
      return;
    }

    try {
      setSending(true);
      
      if (selectedFile) {
        // Send message with attachment
        console.log('📤 Sending message with attachment...', { 
          conversationSid: activeConversationSid,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        });
        
        setUploading(true);
        await bookingConversationsClient.sendMessageWithAttachment(
          activeConversationSid,
          currentUserId,
          (currentUserType as 'customer' | 'provider' | 'owner' | 'dispatcher'),
          selectedFile,
          newMessage.trim() || undefined,
          booking?.id
        );
        setUploading(false);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Send text-only message
        console.log('📤 Sending message...', { conversationSid: activeConversationSid });
        
        await bookingConversationsClient.sendMessage(
          activeConversationSid,
          newMessage.trim(),
          currentUserId,
          (currentUserType as 'customer' | 'provider' | 'owner' | 'dispatcher'),
          booking?.id
        );
      }
      
      console.log('✅ Message sent successfully');
      setNewMessage('');
      await loadMessages(activeConversationSid);
    } catch (error) {
      console.error('❌ Error sending message:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message');
      setUploading(false);
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

      // Determine the user's role/type from attributes or participant data
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

      // Get avatar URL from booking data (imageUrl no longer in attributes to save payload size)
      let avatarUrl = null;
      if (attrs.userType === 'customer' && booking?.customer_profiles?.image_url) {
        avatarUrl = booking.customer_profiles.image_url;
      } else if (isCurrentUser && provider?.image_url) {
        avatarUrl = provider.image_url;
      } else if ((attrs.userType === 'provider' || attrs.userType === 'owner' || attrs.userType === 'dispatcher') && booking?.providers?.image_url) {
        avatarUrl = booking.providers.image_url;
      }

      return {
        displayName,
        roleLabel,
        isCurrentUser,
        initials,
        avatarUrl,
        userType: rawRole, // Include the raw user type
      };
    },
    [participantMap, currentUserId, provider, booking]
  );


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
    return (
      <div key={media.sid} className="mt-2">
        <a 
          href={media.url || '#'} 
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

  // Get service name from either services.name or service_name
  const serviceName = booking?.services?.name || booking?.service_name || 'Service';
  const bookingRef = booking?.booking_reference || '';
  const customerName = booking?.customer_profiles 
    ? `${booking.customer_profiles.first_name || ''} ${booking.customer_profiles.last_name || ''}`.trim()
    : booking?.customer_name || 'Customer';

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
                <h2 className="text-lg font-semibold">{serviceName}</h2>
                <p className="text-blue-100 text-sm">with {customerName}</p>
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
                      variant={isCurrentUser ? "default" : "outline"}
                      className={`text-xs py-0.5 ${isCurrentUser ? 'bg-blue-600' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                    >
                      {initials} {name.split(' ')[0]}
                      {isCurrentUser && " (You)"}
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
                      
                      return messages.map((message, index) => {
                        const author = resolveMessageAuthor(message);
                        const displayName = author?.displayName ?? 'Participant';
                        const initials = author?.initials ?? 'U';
                        const roleLabel = author?.roleLabel;
                        const avatarUrl = author?.avatarUrl;
                        const isCurrentUser = author?.isCurrentUser;
                        const timestamp = message.timestamp;
                        
                        // Get author type from attributes first, then fall back to message.author_type
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
                        
                        // Check if message is from a provider-side user (owner, dispatcher, provider)
                        // All provider-side messages go on the right (blue), customer messages on the left (white)
                        const isProviderSide = authorType === 'owner' || 
                                              authorType === 'dispatcher' || 
                                              authorType === 'provider';
                        const isCustomer = authorType === 'customer';
                        
                        // Create display label: show role, or name if role is not available
                        const avatarLabel = roleLabel || displayName;

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
                            <div className={`flex ${isProviderSide ? 'justify-end' : 'justify-start'} mb-3`}>
                              <div className={`flex items-end gap-3 ${isProviderSide ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className="flex flex-col items-center">
                                  <Avatar className="h-8 w-8 border">
                                    <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                                    <AvatarFallback>{initials}</AvatarFallback>
                                  </Avatar>
                                  <span className="mt-1 text-[11px] text-muted-foreground/80 max-w-[140px] text-center truncate">
                                    {avatarLabel}
                                  </span>
                                </div>
                                <div
                                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                                    isProviderSide ? 'bg-roam-blue text-white' : 'bg-white border shadow-sm'
                                  }`}
                                >
                                  {message.content && (
                                    <p className="text-sm whitespace-pre-wrap break-words">
                                      {message.content}
                                    </p>
                                  )}
                                  {/* Render media attachments */}
                                  {(message as any).media?.map((media: MediaAttachment) => renderMediaAttachment(media))}
                                  <div className="flex items-center justify-end mt-1 text-[11px] opacity-80">
                                    <span className={isProviderSide ? 'text-white/80' : 'text-gray-500'}>
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
                disabled={sending || !activeConversationSid}
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
                  disabled={sending || !activeConversationSid}
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
                disabled={sending || !activeConversationSid}
                className="flex-1 border-gray-200 focus:border-blue-400 focus:ring-blue-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !selectedFile) || sending || !activeConversationSid}
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
            
            {/* Error display */}
            {error && (
              <div className="mt-2 p-2 bg-red-50 text-red-600 text-sm rounded-lg flex items-center justify-between">
                <span>{error}</span>
                <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationChat;
