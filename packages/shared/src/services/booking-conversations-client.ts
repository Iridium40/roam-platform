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
  message?: string;
  userId: string;
  userType: BookingParticipantRole;
  bookingId?: string;
  mediaSid?: string;
};

type GetMessagesPayload = {
  action: 'get-messages';
  conversationSid: string;
};

type UploadMediaPayload = {
  action: 'upload-media';
  fileData: string; // base64 encoded file data
  contentType: string;
  filename?: string;
};

type ApiPayload = CreateConversationPayload | SendMessagePayload | GetMessagesPayload | UploadMediaPayload;

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
    message: string | undefined,
    userId: string,
    userType: BookingParticipantRole,
    bookingId?: string,
    mediaSid?: string,
  ): Promise<void> {
    if (!conversationId || (!message && !mediaSid) || !userId || !userType) {
      throw new Error('conversationId, (message or mediaSid), userId, and userType are required');
    }

    const payload: SendMessagePayload = {
      action: 'send-message',
      conversationSid: conversationId,
      message,
      userId,
      userType,
      bookingId,
      mediaSid,
    };

    await this.request(payload);
  }

  /**
   * Upload media to Twilio for use in messages
   * @param file - The file to upload
   * @returns The mediaSid that can be used when sending a message
   */
  async uploadMedia(file: File): Promise<{ mediaSid: string }> {
    // Convert file to base64
    const fileData = await this.fileToBase64(file);
    
    const payload: UploadMediaPayload = {
      action: 'upload-media',
      fileData,
      contentType: file.type,
      filename: file.name,
    };

    const response = await this.request<{ mediaSid: string }>(payload);
    return { mediaSid: response.mediaSid };
  }

  /**
   * Send a message with an attachment
   * Convenience method that uploads the file and sends the message in one call
   */
  async sendMessageWithAttachment(
    conversationId: string,
    userId: string,
    userType: BookingParticipantRole,
    file: File,
    message?: string,
    bookingId?: string,
  ): Promise<void> {
    // First upload the media
    const { mediaSid } = await this.uploadMedia(file);
    
    // Then send the message with the media
    await this.sendMessage(conversationId, message, userId, userType, bookingId, mediaSid);
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const createBookingConversationsClient = (options?: BookingConversationClientOptions) =>
  new BookingConversationsClient(options);

