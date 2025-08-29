import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageCircle,
  Send,
  Search,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  Users,
  Activity,
  TrendingUp,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface MessagesTabProps {
  providerData: any;
  business: any;
}

export default function MessagesTab({
  providerData,
  business,
}: MessagesTabProps) {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageText, setMessageText] = useState("");

  // Load conversations data
  const loadConversations = async () => {
    if (!providerData) return;

    try {
      setLoading(true);
      const businessId = business?.id || providerData?.business_id;

      // For now, load conversations from bookings (placeholder implementation)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_reference,
          customer:customer_id(
            id,
            first_name,
            last_name,
            email,
            phone
          ),
          created_at,
          booking_status
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      // Convert bookings to conversation format (placeholder)
      const conversationsData = (bookingsData || []).map(booking => ({
        id: booking.id,
        customer_name: `${booking.customer?.first_name || ''} ${booking.customer?.last_name || ''}`.trim() || 'Customer',
        customer_email: booking.customer?.email,
        customer_phone: booking.customer?.phone,
        booking_reference: booking.booking_reference,
        last_message: `Booking ${booking.booking_status}`,
        last_message_time: booking.created_at,
        unread_count: 0, // Placeholder
        messages: [] // Placeholder
      }));

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

  // Message handling functions
  const onSendMessage = async (conversationId: string, message: string) => {
    // Placeholder implementation
    toast({
      title: "Message Sent",
      description: "Message functionality coming soon",
    });
  };

  const onMarkAsRead = async (conversationId: string) => {
    // Placeholder implementation
    console.log('Marking conversation as read:', conversationId);
  };

  // Email functionality
  const handleEmailCustomer = (customerEmail: string, customerName: string, bookingReference?: string) => {
    if (!customerEmail) {
      toast({
        title: "No Email Available",
        description: "This customer doesn't have an email address on file.",
        variant: "destructive",
      });
      return;
    }

    const subject = bookingReference 
      ? `Re: Your booking ${bookingReference}`
      : "Message from your service provider";
    
    const body = `Dear ${customerName},\n\nThank you for choosing our services.\n\nBest regards,\n${providerData?.first_name || 'Your Provider'}`;
    
    const mailtoLink = `mailto:${customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Open default email client
    window.open(mailtoLink, '_blank');
    
    toast({
      title: "Email Client Opened",
      description: `Email client opened for ${customerName}`,
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
