export interface MediaAttachment {
  sid: string;
  contentType: string;
  filename?: string;
  size?: number;
  url?: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id?: string;
  author_id?: string;
  author_type?: string;
  content?: string;
  created_at?: string;
  is_read?: boolean;
  media?: MediaAttachment[];
  // Fields from Twilio API response
  author?: string;
  authorName?: string;
  timestamp?: string;
  attributes?: Record<string, any> | string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  user_type: string;
  joined_at: string;
  is_active: boolean;
  last_read_at: string | null;
}

export interface Conversation {
  id: string;
  booking_id: string;
  twilio_conversation_sid: string;
  created_at: string;
  last_message_at: string | null;
  participant_count: number;
  is_active: boolean;
  conversation_type: string;
  booking?: {
    id: string;
    service_name: string;
    booking_date: string;
    status: string;
    business_profiles?: {
      business_name: string;
    };
    providers?: {
      first_name: string;
      last_name: string;
    };
  };
}

export interface CreateConversationParams {
  bookingId: string;
  participants: Array<{
    identity: string;
    role: string;
    name: string;
    userId: string;
    userType: string;
  }>;
}

export interface SendMessageParams {
  conversationId: string;
  content: string;
  authorId: string;
  authorType: string;
}

export interface AddParticipantParams {
  conversationId: string;
  participant: {
    identity: string;
    role: string;
    name: string;
    userId: string;
    userType: string;
  };
}
