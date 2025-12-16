export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  conversationsServiceSid: string;
}

// Separate interfaces for create vs update operations
export interface CreateConversationData {
  friendlyName?: string;
  uniqueName?: string;
  attributes?: Record<string, any>;
}

export interface ConversationData extends CreateConversationData {
  conversationSid: string;
}

export interface ParticipantData {
  identity: string;
  attributes?: Record<string, any>;
  roleSid?: string;
}

export interface MessageData {
  body?: string;
  attributes?: Record<string, any>;
  mediaSid?: string;
}

// Media attachment types
export interface MediaAttachment {
  sid: string;
  contentType: string;
  filename?: string;
  size?: number;
  url?: string;
}

export interface UploadMediaOptions {
  file: Buffer;
  contentType: string;
  filename?: string;
}

export interface MessageWithMedia {
  sid: string;
  body?: string;
  author: string;
  attributes: Record<string, any>;
  dateCreated: string;
  media?: MediaAttachment[];
}

export interface WebhookData {
  conversationSid: string;
  participantIdentity: string;
  messageBody?: string;
  eventType: string;
  timestamp: string;
}

// Discriminated union for all Twilio actions
export type TwilioAction = 
  | { action: 'create_conversation'; friendlyName?: string; uniqueName?: string; attributes?: Record<string, any> }
  | { action: 'get_conversation'; conversationSid: string }
  | { action: 'list_conversations'; limit?: number }
  | { action: 'update_conversation'; conversationSid: string; updates: Partial<CreateConversationData> }
  | { action: 'delete_conversation'; conversationSid: string }
  | { action: 'close_conversation'; conversationSid: string }
  | { action: 'get_conversation_stats'; conversationSid: string }
  | { action: 'search_conversations'; query: string }
  | { action: 'add_participant'; conversationSid: string; participantData: ParticipantData }
  | { action: 'remove_participant'; conversationSid: string; participantSid: string }
  | { action: 'get_participant'; conversationSid: string; participantSid: string }
  | { action: 'list_participants'; conversationSid: string }
  | { action: 'update_participant'; conversationSid: string; participantSid: string; updates: Partial<ParticipantData> }
  | { action: 'get_participant_by_identity'; conversationSid: string; identity: string }
  | { action: 'participant_exists'; conversationSid: string; identity: string }
  | { action: 'get_participant_count'; conversationSid: string }
  | { action: 'get_participants_by_role'; conversationSid: string; role: ParticipantRole }
  | { action: 'send_message'; conversationSid: string; messageData: MessageData; author: string }
  | { action: 'get_message'; conversationSid: string; messageSid: string }
  | { action: 'list_messages'; conversationSid: string; limit?: number }
  | { action: 'update_message'; conversationSid: string; messageSid: string; updates: Partial<MessageData> }
  | { action: 'delete_message'; conversationSid: string; messageSid: string }
  | { action: 'get_message_delivery_status'; conversationSid: string; messageSid: string }
  | { action: 'get_messages_by_author'; conversationSid: string; author: string; limit?: number }
  | { action: 'search_messages'; conversationSid: string; query: string; limit?: number }
  | { action: 'get_message_count'; conversationSid: string }
  | { action: 'get_recent_messages'; conversationSid: string; hours?: number };

export interface TwilioResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface ConversationParticipant {
  sid: string;
  identity: string;
  attributes: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  roleSid: string;
  messagingBinding?: {
    address: string;
    proxyAddress: string;
  };
}

export interface ConversationMessage {
  sid: string;
  accountSid: string;
  conversationSid: string;
  body?: string;
  author: string;
  attributes: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  index: number;
  delivery?: {
    delivered: string;
    read: string;
    undelivered: string;
    failed: string;
  };
  media?: MediaAttachment[];
}

export interface ConversationDetails {
  sid: string;
  accountSid: string;
  friendlyName?: string;
  uniqueName?: string;
  attributes: Record<string, any>;
  dateCreated: string;
  dateUpdated: string;
  state: 'active' | 'inactive' | 'closed';
  timers?: {
    dateInactive?: string;
    dateClosed?: string;
  };
  url: string;
  links: {
    participants: string;
    messages: string;
    webhooks: string;
  };
}

// Error types
export interface TwilioError {
  code: number;
  message: string;
  moreInfo?: string;
  status?: number;
}

// Webhook event types
export type WebhookEventType = 
  | 'onConversationAdd'
  | 'onConversationUpdate'
  | 'onConversationDelete'
  | 'onParticipantAdd'
  | 'onParticipantUpdate'
  | 'onParticipantDelete'
  | 'onMessageAdd'
  | 'onMessageUpdate'
  | 'onMessageDelete'
  | 'onDeliveryUpdated'
  | 'onMessageRead';

// Role types
export type ParticipantRole = 'owner' | 'admin' | 'user' | 'agent';

// Message delivery status
export type DeliveryStatus = 'delivered' | 'read' | 'undelivered' | 'failed' | 'sent';

// Conversation state
export type ConversationState = 'active' | 'inactive' | 'closed';

// Configuration for different environments
export interface EnvironmentConfig {
  development: TwilioConfig;
  staging: TwilioConfig;
  production: TwilioConfig;
}

