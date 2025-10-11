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
      // Load conversations with booking details
      let query = supabase
        .from('twilio_conversations')
        .select(`
          id,
          booking_id,
          conversation_sid,
          last_message,
          last_message_at,
          unread_count,
          participants,
          bookings!inner (
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
              email
            ),
            providers (
              id,
              user_id,
              first_name,
              last_name
            )
          )
        `)
        .eq('bookings.business_id', business.id)
        .order('last_message_at', { ascending: false });

      // Filter by provider assignment if not owner/dispatcher
      if (!canSeeAllConversations) {
        query = query.eq('bookings.provider_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data to match our interface
      const conversationsData = data?.map((conv: any) => ({
        ...conv,
        booking: conv.bookings
      })).filter((conv: any) => conv.booking) || [];

      setConversations(conversationsData);
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
                      <AvatarImage src="" />
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
                          {new Date(conversation.booking.booking_date).toLocaleDateString()}
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
      )}
    </div>
  );
}
    });
  };

  useEffect(() => {
    loadConversations();
  }, [providerData, business]);

  // Filter conversations based on search
  const filteredConversations = useMemo(() => {
    if (!searchQuery) return conversations;

    return conversations.filter(conversation =>
      conversation.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.booking_reference?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  // Calculate message stats
  const messageStats = useMemo(() => {
    const totalConversations = conversations.length;
    const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
    const activeConversations = conversations.filter(conv => {
      const lastMessageTime = new Date(conv.last_message_time || 0);
      const daysSinceLastMessage = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastMessage <= 7; // Active if message within last 7 days
    }).length;

    // Placeholder response rate calculation
    const responseRate = totalConversations > 0 ? 85 : 0; // Placeholder percentage

    // Recent activity (conversations with activity in last 24 hours)
    const recentActivity = conversations.filter(conv => {
      const lastMessageTime = new Date(conv.last_message_time || 0);
      const hoursSinceLastMessage = (Date.now() - lastMessageTime.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastMessage <= 24;
    }).length;

    return {
      totalConversations,
      unreadCount,
      activeConversations,
      responseRate,
      recentActivity,
      readConversations: totalConversations - unreadCount,
    };
  }, [conversations]);

  const handleSendMessage = () => {
    if (!selectedConversation || !messageText.trim()) return;
    
    onSendMessage(selectedConversation.id, messageText);
    setMessageText("");
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-sm text-gray-600">Loading conversations...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-2">
            <Card className="h-full">
              <div className="animate-pulse p-6">
                <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-4 bg-gray-200 rounded"></div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-600">Communicate with your customers</p>
      </div>

      {/* Message Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Conversations</p>
              <p className="text-3xl font-bold text-gray-900">{messageStats.totalConversations}</p>
              <p className="text-sm text-gray-500 mt-1">
                {messageStats.activeConversations} active this week
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread Messages</p>
              <p className="text-3xl font-bold text-gray-900">{messageStats.unreadCount}</p>
              <p className="text-sm text-gray-500 mt-1">
                {messageStats.readConversations} read conversations
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Inbox className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Rate</p>
              <p className="text-3xl font-bold text-gray-900">{messageStats.responseRate}%</p>
              <p className="text-sm text-gray-500 mt-1">
                Average response time
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Activity</p>
              <p className="text-3xl font-bold text-gray-900">{messageStats.recentActivity}</p>
              <p className="text-sm text-gray-500 mt-1">
                Last 24 hours
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">All</p>
          <p className="text-2xl font-bold text-blue-600">{messageStats.totalConversations}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Unread</p>
          <p className="text-2xl font-bold text-orange-600">{messageStats.unreadCount}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold text-green-600">{messageStats.activeConversations}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-sm text-gray-600">Recent</p>
          <p className="text-2xl font-bold text-purple-600">{messageStats.recentActivity}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conversations</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {conversations.filter(c => c.unread_count > 0).length} unread
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1 max-h-[500px] overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`p-3 cursor-pointer border-l-4 transition-colors ${
                        selectedConversation?.id === conversation.id
                          ? 'bg-blue-50 border-blue-500'
                          : 'border-transparent hover:bg-gray-50'
                      } ${conversation.unread_count > 0 ? 'bg-orange-50' : ''}`}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        if (conversation.unread_count > 0) {
                          onMarkAsRead(conversation.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-sm truncate">
                              {conversation.customer_name || "Customer"}
                            </p>
                            {conversation.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                {conversation.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 truncate">
                            {conversation.last_message || "No messages yet"}
                          </p>
                          {conversation.booking_reference && (
                            <p className="text-xs text-blue-600">
                              Booking: {conversation.booking_reference}
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {conversation.last_message_time && formatTime(conversation.last_message_time)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col">
            {selectedConversation ? (
              <>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedConversation.customer_name || "Customer"}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {selectedConversation.customer_email || "No email"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {selectedConversation.customer_phone && (
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                      )}
                      {selectedConversation.customer_email && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEmailCustomer(
                            selectedConversation.customer_email,
                            selectedConversation.customer_name,
                            selectedConversation.booking_reference
                          )}
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          Email
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 p-0">
                  <div className="h-full flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      {selectedConversation.messages?.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No messages yet</p>
                          <p className="text-sm">Start the conversation!</p>
                        </div>
                      ) : (
                        selectedConversation.messages?.map((message: any, index: number) => (
                          <div
                            key={index}
                            className={`flex ${message.sender_type === 'customer' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.sender_type === 'customer'
                                  ? 'bg-gray-100 text-gray-900'
                                  : 'bg-blue-600 text-white'
                              }`}
                            >
                              <p className="text-sm">{message.content}</p>
                              <p className={`text-xs mt-1 ${
                                message.sender_type === 'customer' ? 'text-gray-500' : 'text-blue-100'
                              }`}>
                                {formatTime(message.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="border-t p-4">
                      <div className="flex space-x-2">
                        <Textarea
                          placeholder="Type your message..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="flex-1 resize-none"
                          rows={2}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!messageText.trim()}
                          className="self-end"
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold mb-2">Select a Conversation</h3>
                  <p>Choose a conversation from the list to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
