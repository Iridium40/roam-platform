import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Search,
  MessageSquare,
  Users,
  Calendar,
} from "lucide-react";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import ConversationChat from "@/components/ConversationChat";
import { formatDistanceToNow } from "date-fns";

interface Conversation {
  id: string;
  booking_id: string;
  conversation_sid: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  participants: any[];
  booking: {
    id: string;
    booking_date: string;
    start_time: string;
    booking_status: string;
    services?: {
      name: string;
    };
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
}

interface MessagesTabProps {
  providerData: any;
  business: any;
}

export default function MessagesTab({ providerData, business }: MessagesTabProps) {
  const { provider: user, isOwner, isDispatcher } = useProviderAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Check if current user can see all conversations (owners and dispatchers)
  const canSeeAllConversations = isOwner || isDispatcher;

  useEffect(() => {
    loadConversations();
  }, [business?.id, user?.id]);

  useEffect(() => {
    filterConversations();
  }, [conversations, searchQuery]);

  const loadConversations = async () => {
    if (!business?.id || !user?.id) return;

    setLoading(true);
    try {
      // For now, we'll create mock conversation data since the twilio_conversations table may not exist yet
      // In production, this would query the actual conversations table
      
      // Load bookings to create mock conversations
      let query = supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          start_time,
          booking_status,
          business_id,
          provider_id,
          services (name),
          customer_profiles (
            id,
            first_name,
            last_name,
            email,
            image_url
          ),
          providers (
            id,
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('business_id', business.id)
        .order('created_at', { ascending: false });

      // Filter by provider assignment if not owner/dispatcher
      if (!canSeeAllConversations) {
        query = query.eq('provider_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform bookings to mock conversations
      const mockConversations = data?.map((booking: any) => ({
        id: `conv-${booking.id}`,
        booking_id: booking.id,
        conversation_sid: `CH${Math.random().toString(36).substr(2, 9)}`,
        last_message: `Booking for ${booking.services?.name || 'service'} is ${booking.booking_status}`,
        last_message_at: booking.booking_date,
        unread_count: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
        participants: [],
        booking: booking
      })) || [];

      setConversations(mockConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = conversations.filter(conv => {
        const customerName = conv.booking.customer_profiles
          ? `${conv.booking.customer_profiles.first_name} ${conv.booking.customer_profiles.last_name}`.toLowerCase()
          : '';
        const serviceName = conv.booking.services?.name?.toLowerCase() || '';
        const lastMessage = conv.last_message?.toLowerCase() || '';
        
        return customerName.includes(query) || 
               serviceName.includes(query) || 
               lastMessage.includes(query);
      });
    }

    setFilteredConversations(filtered);
  };

  const handleConversationClick = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getCustomerInitials = (customer?: { first_name: string; last_name: string }) => {
    if (!customer) return 'C';
    return `${customer.first_name?.[0] || ''}${customer.last_name?.[0] || ''}`.toUpperCase();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-2 h-64 bg-gray-200 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Messages</h2>
          <p className="text-gray-600">
            {canSeeAllConversations 
              ? `All business conversations (${conversations.length})` 
              : `Your assigned conversations (${conversations.length})`
            }
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <MessageSquare className="h-4 w-4" />
          {filteredConversations.filter(c => c.unread_count > 0).length} unread
        </Badge>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </h3>
              <p className="text-gray-600">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : canSeeAllConversations 
                    ? 'Conversations will appear here when customers start chatting'
                    : 'You will see conversations for bookings assigned to you'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    onClick={() => handleConversationClick(conversation)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.booking.customer_profiles?.image_url || ""} />
                      <AvatarFallback>
                        {getCustomerInitials(conversation.booking.customer_profiles)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.booking.customer_profiles
                            ? `${conversation.booking.customer_profiles.first_name} ${conversation.booking.customer_profiles.last_name}`
                            : 'Unknown Customer'
                          }
                        </h4>
                        <div className="flex items-center gap-2">
                          {conversation.unread_count > 0 && (
                            <Badge variant="default" className="h-5 px-2 text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(conversation.last_message_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600 truncate">
                          {conversation.booking.services?.name || 'Service'}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">
                          {conversation.booking.booking_date}
                        </span>
                      </div>
                      
                      {conversation.last_message && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conversation.last_message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Chat Modal */}
      {selectedConversation && (
        <ConversationChat
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            // Reload conversations to update unread counts
            setTimeout(() => loadConversations(), 1000);
          }}
          booking={selectedConversation.booking}
          conversationSid={selectedConversation.conversation_sid}
        />
      )}
    </div>
  );
}