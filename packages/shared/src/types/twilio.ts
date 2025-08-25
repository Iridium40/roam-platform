export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  conversationsServiceSid: string;
}

export interface ConversationData {
  conversationSid: string;
  friendlyName?: string;
  uniqueName?: string;
  attributes?: Record<string, any>;
}

export interface ParticipantData {
  identity: string;
  attributes?: Record<string, any>;
  roleSid?: string;
}

export interface MessageData {
  body: string;
  attributes?: Record<string, any>;
  mediaSid?: string;
}

export interface WebhookData {
  conversationSid: string;
  participantIdentity: string;
  messageBody?: string;
  eventType: string;
  timestamp: string;
}

export interface TwilioAction {
  action: 
    | 'create_conversation'
    | 'add_participant'
    | 'remove_participant'
    | 'send_message'
    | 'get_conversation'
    | 'list_conversations'
    | 'list_participants'
    | 'list_messages'
    | 'update_conversation'
    | 'delete_conversation';
  data?: any;
}

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
  body: string;
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
export interface TwilioEnvironmentConfig {
  development: TwilioConfig;
  staging: TwilioConfig;
  production: TwilioConfig;
}
