import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, MessageSquare, Search, RefreshCw } from "lucide-react";
import { useProviderAuth } from "@/contexts/auth/ProviderAuthContext";
import { useToast } from "@/hooks/use-toast";
import ConversationChat from "@/components/ConversationChat";
import { formatDistanceToNow } from "date-fns";

// Polling interval for new messages (15 seconds)
const MESSAGE_POLL_INTERVAL = 15000;

interface ConversationUserProfile {
  id?: string;
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  image_url?: string | null;
}

interface ConversationBooking {
  id: string;
  booking_date?: string | null;
  booking_status?: string | null;
  service_name?: string | null;
  business_id?: string | null;
  customer_profiles?: ConversationUserProfile | null;
  providers?: ConversationUserProfile | null;
}

interface ConversationSummary {
  metadataId: string;
  bookingId: string;
  twilioConversationSid: string;
  lastMessageAt: string | null;
  unreadCount: number;
  lastMessage?: {
    body: string | null;
    author?: string | null;
    authorName?: string | null;
    timestamp: string | null;
  } | null;
  booking?: ConversationBooking;
}

interface MessagesTabProps {
  providerData: any;
  business: any;
}

export default function MessagesTab({ providerData, business }: MessagesTabProps) {
  const { provider: user } = useProviderAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Props currently unused but reserved for future enhancements
  void providerData;

  const providerRole = user?.provider_role || "provider";
  const canSeeAllConversations = providerRole === "owner" || providerRole === "dispatcher";
  const isPollingRef = useRef(false);

  // Load conversations (with optional silent mode for polling)
  const loadConversations = useCallback(async (silent: boolean = false) => {
    if (!user?.user_id) return;
    
    // Prevent overlapping requests
    if (isPollingRef.current && silent) return;
    
    if (!silent) {
      setLoading(true);
    }
    isPollingRef.current = true;

    try {
      const response = await fetch("/api/twilio-conversations/list-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.user_id,
          userType: providerRole,
          businessId: canSeeAllConversations ? business?.id : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversations (${response.status})`);
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      console.error("Error loading conversations:", error);
      if (!silent) {
        toast({
          title: "Error",
          description: "Failed to load conversations",
          variant: "destructive",
        });
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isPollingRef.current = false;
    }
  }, [user?.user_id, providerRole, canSeeAllConversations, business?.id, toast]);

  // Initial load and polling for new messages
  useEffect(() => {
    loadConversations();

    // Poll for new messages every 15 seconds
    const pollInterval = setInterval(() => {
      loadConversations(true); // Silent polling (no loading state)
    }, MESSAGE_POLL_INTERVAL);

    return () => clearInterval(pollInterval);
  }, [loadConversations]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;

    // Filter by unread status
    if (showUnreadOnly) {
      filtered = filtered.filter((conv) => conv.unreadCount > 0);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((conv) => {
        const customerName = conv.booking?.customer_profiles
          ? `${conv.booking.customer_profiles.first_name || ""} ${conv.booking.customer_profiles.last_name || ""}`
              .trim()
              .toLowerCase()
          : "";
        const serviceName = conv.booking?.service_name?.toLowerCase() || "";
        const lastMessage = conv.lastMessage?.body?.toLowerCase() || "";

        return (
          customerName.includes(query) ||
          serviceName.includes(query) ||
          lastMessage.includes(query)
        );
      });
    }

    return filtered;
  }, [conversations, searchQuery, showUnreadOnly]);

  const handleConversationClick = (conversation: ConversationSummary) => {
    setSelectedConversation(conversation);
    setIsChatOpen(true);
  };

  const formatTimeAgo = (dateString?: string | null) => {
    if (!dateString) return "";
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const getCustomerInitials = (customer?: ConversationUserProfile | null) => {
    if (!customer) return "C";
    return `${customer.first_name?.[0] || ""}${customer.last_name?.[0] || ""}`
      .toUpperCase()
      .substring(0, 2);
  };

  const hasUnread = filteredConversations.filter((c) => c.unreadCount > 0).length;

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Messages</h2>
          <p className="text-gray-600">{`Conversations (${conversations.length})`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadConversations()}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Badge variant="outline" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            {hasUnread} unread
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showUnreadOnly ? "default" : "outline"}
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              Unread Only
              {showUnreadOnly && hasUnread > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {hasUnread}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

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
                {showUnreadOnly
                  ? "No unread conversations"
                  : searchQuery
                  ? "No matching conversations"
                  : "No conversations yet"}
              </h3>
              <p className="text-gray-600">
                {showUnreadOnly
                  ? "All conversations have been read"
                  : searchQuery
                  ? "Try adjusting your search terms"
                  : "Conversations will appear here when customers start chatting"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {filteredConversations.map((conversation) => (
                  <div
                    key={conversation.metadataId}
                    onClick={() => handleConversationClick(conversation)}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.booking?.customer_profiles?.image_url || ""} />
                      <AvatarFallback>
                        {getCustomerInitials(conversation.booking?.customer_profiles)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {conversation.booking?.customer_profiles
                            ? `${conversation.booking.customer_profiles.first_name || ""} ${conversation.booking.customer_profiles.last_name || ""}`.trim() ||
                              "Unknown Customer"
                            : "Unknown Customer"}
                        </h4>
                        <div className="flex items-center gap-2">
                          {conversation.unreadCount > 0 && (
                            <Badge variant="default" className="h-5 px-2 text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(
                              conversation.lastMessage?.timestamp || conversation.lastMessageAt
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-600 truncate">
                          {conversation.booking?.service_name || "Service"}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-400">
                          {conversation.booking?.booking_date || ""}
                        </span>
                      </div>

                      {conversation.lastMessage?.body && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conversation.lastMessage.body}
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

      {selectedConversation && (
        <ConversationChat
          isOpen={isChatOpen}
          onClose={() => {
            setIsChatOpen(false);
            setTimeout(() => loadConversations(), 500);
          }}
          booking={selectedConversation.booking as any}
          conversationSid={selectedConversation.twilioConversationSid}
        />
      )}
    </div>
  );
}

