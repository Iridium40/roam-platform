import type {
  BookingConversationData,
  BookingConversationParticipant,
  BookingConversationParticipantData,
  BookingParticipantRole,
  ConversationMessageWithAuthor,
  GetOrCreateConversationResult,
} from '../types/booking-conversations';

interface BookingConversationClientOptions {
  /** relative or absolute base URL for twilio-conversations API */
  baseUrl?: string;
  /** optional function to provide extra headers per request */
  getHeaders?: () => Record<string, string | undefined> | Promise<Record<string, string | undefined>>;
  /** access token for authentication */
  accessToken?: string;
}

type CreateConversationPayload = {
  action: 'create-conversation';
  bookingId: string;
  participants: BookingConversationParticipantData[];
};

type SendMessagePayload = {
  action: 'send-message';
  conversationSid: string;
  message: string;
  userId: string;
  userType: BookingParticipantRole;
  bookingId?: string;
};

type GetMessagesPayload = {
  action: 'get-messages';
  conversationSid: string;
};

type ApiPayload = CreateConversationPayload | SendMessagePayload | GetMessagesPayload;

interface ApiResponseBase {
  success?: boolean;
  error?: string;
  [key: string]: unknown;
}

const DEFAULT_BASE_URL = '/api/twilio-conversations';

async function postJson<TResponse>(baseUrl: string, payload: ApiPayload, extraHeaders?: Record<string, string | undefined>): Promise<TResponse> {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(extraHeaders ?? {}),
    },
    body: JSON.stringify(payload),
    credentials: 'include',
  });

  const data = (await response.json()) as ApiResponseBase & TResponse;
  if (!response.ok || data.error) {
    throw new Error(data.error || `Twilio conversations API request failed: ${response.status}`);
  }
  return data;
}

export class BookingConversationsClient {
  private baseUrl: string;
  private getHeaders?: BookingConversationClientOptions['getHeaders'];
  private accessToken?: string;

  constructor(options?: BookingConversationClientOptions) {
    this.baseUrl = options?.baseUrl || DEFAULT_BASE_URL;
    this.getHeaders = options?.getHeaders;
    this.accessToken = options?.accessToken;
  }

  private async request<TResponse>(payload: ApiPayload) {
    const headers: Record<string, string | undefined> = {};
    
    // Add authentication header if access token is available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    // Add any additional headers from getHeaders function
    if (this.getHeaders) {
      const additionalHeaders = await this.getHeaders();
      Object.assign(headers, additionalHeaders);
    }
    
    return postJson<TResponse>(this.baseUrl, payload, headers);
  }

  async getOrCreateConversationForBooking(
    booking: BookingConversationData,
    participants: BookingConversationParticipantData[],
  ): Promise<GetOrCreateConversationResult> {
    if (!booking.bookingId) {
      throw new Error('booking.bookingId is required');
    }

    const payload: CreateConversationPayload = {
      action: 'create-conversation',
      bookingId: booking.bookingId,
      participants,
    };

    const response = await this.request<{
      conversationSid: string;
      conversationMetadataId?: string;
      isNew?: boolean;
      participants?: BookingConversationParticipant[];
    }>(payload);

    return {
      conversationId: response.conversationSid,
      conversationMetadataId: typeof response.conversationMetadataId === 'string' ? response.conversationMetadataId : undefined,
      isNew: Boolean(response.isNew),
      participants: Array.isArray(response.participants) ? response.participants : undefined,
    };
  }

  async getMessages(conversationId: string): Promise<ConversationMessageWithAuthor[]> {
    if (!conversationId) {
      throw new Error('conversationId is required');
    }

    const payload: GetMessagesPayload = {
      action: 'get-messages',
      conversationSid: conversationId,
    };

    const response = await this.request<{ messages?: ConversationMessageWithAuthor[] }>(payload);
    return response.messages || [];
  }

  async sendMessage(
    conversationId: string,
    message: string,
    userId: string,
    userType: BookingParticipantRole,
    bookingId?: string,
  ): Promise<void> {
    if (!conversationId || !message || !userId || !userType) {
      throw new Error('conversationId, message, userId, and userType are required');
    }

    const payload: SendMessagePayload = {
      action: 'send-message',
      conversationSid: conversationId,
      message,
      userId,
      userType,
      bookingId,
    };

    await this.request(payload);
  }
}

export const createBookingConversationsClient = (options?: BookingConversationClientOptions) =>
  new BookingConversationsClient(options);

