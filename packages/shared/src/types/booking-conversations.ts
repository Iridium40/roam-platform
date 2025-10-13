import type { ConversationMessage } from './conversations';

export type BookingParticipantRole = 'customer' | 'provider' | 'owner' | 'dispatcher';

export interface BookingConversationParticipantData {
  userId: string;
  userType: BookingParticipantRole;
  userName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  businessId?: string | null;
}

export interface BookingConversationData {
  bookingId: string;
  customerId?: string | null;
  providerId?: string | null;
  ownerId?: string | null;
  dispatcherId?: string | null;
  businessId?: string | null;
  serviceName?: string | null;
  customerName?: string | null;
  providerName?: string | null;
  ownerName?: string | null;
  dispatcherName?: string | null;
}

export interface GetOrCreateConversationResult {
  conversationId: string;
  conversationMetadataId?: string;
  isNew: boolean;
  error?: string;
  participants?: BookingConversationParticipant[];
  businessId?: string | null;
}

export interface ConversationMessageWithAuthor extends ConversationMessage {
  author_name?: string;
  author_role?: BookingParticipantRole | 'unknown';
}

export interface BookingConversationParticipant extends BookingConversationParticipantData {
  twilioParticipantSid?: string;
  conversationMetadataId?: string;
  profileId?: string | null;
}

