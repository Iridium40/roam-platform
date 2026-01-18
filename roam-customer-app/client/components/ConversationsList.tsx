import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageCircle, Search, Clock, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";

interface ConversationsListProps {
  isOpen: boolean;
  onClose: () => void;
}

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

const ConversationsList = ({ isOpen, onClose }: ConversationsListProps) => {
  const { customer } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadConversations = useCallback(async () => {
    if (!customer?.user_id) return;
    setLoading(true);

    try {
      const response = await fetch("/api/twilio-conversations/list-conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: customer.user_id,
          userType: "customer",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load conversations (${response.status})`);
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (error) {
      logger.error("Error loading conversations:", error);
      toast({
        title: "Error",
        description: "Unable to load conversations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [customer?.user_id, toast]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations;
    const query = searchTerm.toLowerCase();
    return conversations.filter((conversation) => {
      const providerName = conversation.booking?.providers
        ? `${conversation.booking.providers.first_name || ""} ${conversation.booking.providers.last_name || ""}`.trim().toLowerCase()
        : "";
      const serviceName = conversation.booking?.service_name?.toLowerCase() || "";
      const lastMessage = conversation.lastMessage?.body?.toLowerCase() || "";

      return (
        providerName.includes(query) ||
        serviceName.includes(query) ||
        lastMessage.includes(query)
      );
    });
  }, [conversations, searchTerm]);

  const formatLastMessageTime = (timestamp?: string | null) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "";
    }
  };

  const getProviderInitials = (provider?: ConversationUserProfile | null) => {
    if (!provider) return "P";
    return `${provider.first_name?.[0] || ""}${provider.last_name?.[0] || ""}`
      .toUpperCase()
      .substring(0, 2);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Conversations
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={loadConversations} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by provider, service, or message..."
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading && conversations.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
                Loading conversations...
              </div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-500 text-center px-8">
              <div>
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="font-medium">
                  {searchTerm ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-sm text-gray-400">
                  {searchTerm
                    ? "Try a different search term"
                    : "Conversations will appear here after you start chatting with providers"}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredConversations.map((conversation) => (
                <Card
                  key={conversation.metadataId}
                  className="cursor-pointer hover:shadow-md transition-shadow border"
                  onClick={() => logger.debug("Conversation clicked:", conversation.twilioConversationSid)}
                >
                  <CardContent className="p-4 flex gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback>
                        {getProviderInitials(conversation.booking?.providers)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm truncate">
                            {conversation.booking?.providers
                              ? `${conversation.booking.providers.first_name || ""} ${conversation.booking.providers.last_name || ""}`.trim() ||
                                "Your provider"
                              : "Your provider"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {conversation.booking?.service_name || "Service booking"}
                          </p>
                        </div>
                        <div className="text-right">
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs px-2">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {formatLastMessageTime(conversation.lastMessage?.timestamp || conversation.lastMessageAt)}
                          </p>
                        </div>
                      </div>
                      {conversation.lastMessage?.body ? (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.body}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-1">No messages yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ConversationsList;
