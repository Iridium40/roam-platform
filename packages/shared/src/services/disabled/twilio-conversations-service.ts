import { BaseTwilioService, TwilioConfigHelper } from './twilio';
import type { 
  TwilioService, 
  TwilioResponse, 
  ConversationData, 
  ParticipantData, 
  MessageData,
  BookingParticipant
} from '../types/twilio';
import twilio from 'twilio';

export class TwilioConversationsService extends BaseTwilioService implements TwilioService {
  private conversationsService: any;

  constructor() {
    const config = TwilioConfigHelper.getEnvironmentConfig();
    super(config);
  }

  protected initializeClient(): void {
    this.client = twilio(this.config.accountSid, this.config.authToken);
    this.conversationsService = this.client.conversations.v1.services(this.config.conversationsServiceSid);
  }

  // Conversation Management
  async createConversation(data: ConversationData): Promise<TwilioResponse> {
    try {
      const conversation = await this.conversationsService.conversations.create({
        friendlyName: data.friendlyName,
        attributes: JSON.stringify(data.attributes || {})
      });

      return this.formatSuccessResponse({
        conversationSid: conversation.sid,
        conversation: conversation
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const conversation = await this.conversationsService.conversations(conversationSid).fetch();

      return this.formatSuccessResponse({
        conversation: conversation
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async listConversations(limit: number = 20): Promise<TwilioResponse> {
    try {
      const conversations = await this.conversationsService.conversations.list({ limit });

      return this.formatSuccessResponse({
        conversations: conversations,
        count: conversations.length
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async updateConversation(conversationSid: string, updates: Partial<ConversationData>): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const updateData: any = {};
      if (updates.friendlyName) updateData.friendlyName = updates.friendlyName;
      if (updates.attributes) updateData.attributes = JSON.stringify(updates.attributes);

      const conversation = await this.conversationsService.conversations(conversationSid).update(updateData);

      return this.formatSuccessResponse({
        conversation: conversation
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async deleteConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      await this.conversationsService.conversations(conversationSid).remove();

      return this.formatSuccessResponse(null, 'Conversation deleted successfully');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async closeConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const conversation = await this.conversationsService.conversations(conversationSid).update({
        state: 'closed'
      });

      return this.formatSuccessResponse({
        conversation: conversation
      }, 'Conversation closed successfully');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getConversationStats(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const stats = await this.conversationsService.conversations(conversationSid).fetch();

      return this.formatSuccessResponse({
        stats: {
          participantsCount: stats.participantsCount,
          messagesCount: stats.messagesCount,
          state: stats.state,
          dateCreated: stats.dateCreated,
          dateUpdated: stats.dateUpdated
        }
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async searchConversations(query: string): Promise<TwilioResponse> {
    try {
      const conversations = await this.conversationsService.conversations.list({
        friendlyName: query
      });

      return this.formatSuccessResponse({
        conversations: conversations,
        count: conversations.length
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  // Participant Management
  async addParticipant(conversationSid: string, data: ParticipantData): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const participant = await this.conversationsService.conversations(conversationSid).participants.create({
        identity: data.identity,
        attributes: JSON.stringify(data.attributes || {})
      });

      return this.formatSuccessResponse({
        participantSid: participant.sid,
        participant: participant
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateParticipantSid(participantSid)) {
        return this.formatErrorResponse('Invalid participant SID format');
      }

      const participant = await this.conversationsService.conversations(conversationSid).participants(participantSid).fetch();

      return this.formatSuccessResponse({
        participant: participant
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async listParticipants(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const participants = await this.conversationsService.conversations(conversationSid).participants.list();

      return this.formatSuccessResponse({
        participants: participants,
        count: participants.length
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async updateParticipant(conversationSid: string, participantSid: string, updates: Partial<ParticipantData>): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateParticipantSid(participantSid)) {
        return this.formatErrorResponse('Invalid participant SID format');
      }

      const updateData: any = {};
      if (updates.attributes) updateData.attributes = JSON.stringify(updates.attributes);

      const participant = await this.conversationsService.conversations(conversationSid).participants(participantSid).update(updateData);

      return this.formatSuccessResponse({
        participant: participant
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async removeParticipant(conversationSid: string, participantSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateParticipantSid(participantSid)) {
        return this.formatErrorResponse('Invalid participant SID format');
      }

      await this.conversationsService.conversations(conversationSid).participants(participantSid).remove();

      return this.formatSuccessResponse(null, 'Participant removed successfully');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  // Message Management
  async sendMessage(conversationSid: string, data: MessageData): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const message = await this.conversationsService.conversations(conversationSid).messages.create({
        author: data.author,
        body: data.body,
        attributes: JSON.stringify(data.attributes || {})
      });

      return this.formatSuccessResponse({
        messageSid: message.sid,
        message: message
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateMessageSid(messageSid)) {
        return this.formatErrorResponse('Invalid message SID format');
      }

      const message = await this.conversationsService.conversations(conversationSid).messages(messageSid).fetch();

      return this.formatSuccessResponse({
        message: message
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async listMessages(conversationSid: string, limit: number = 50): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const messages = await this.conversationsService.conversations(conversationSid).messages.list({ limit });

      return this.formatSuccessResponse({
        messages: messages,
        count: messages.length
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async updateMessage(conversationSid: string, messageSid: string, updates: Partial<MessageData>): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateMessageSid(messageSid)) {
        return this.formatErrorResponse('Invalid message SID format');
      }

      const updateData: any = {};
      if (updates.body) updateData.body = updates.body;
      if (updates.attributes) updateData.attributes = JSON.stringify(updates.attributes);

      const message = await this.conversationsService.conversations(conversationSid).messages(messageSid).update(updateData);

      return this.formatSuccessResponse({
        message: message
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async deleteMessage(conversationSid: string, messageSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }
      if (!this.validateMessageSid(messageSid)) {
        return this.formatErrorResponse('Invalid message SID format');
      }

      await this.conversationsService.conversations(conversationSid).messages(messageSid).remove();

      return this.formatSuccessResponse(null, 'Message deleted successfully');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  // Booking-Specific Methods
  async createBookingConversation(bookingId: string, participants: BookingParticipant[]): Promise<TwilioResponse> {
    try {
      // Create conversation with booking attributes
      const conversationData: ConversationData = {
        friendlyName: `Booking ${bookingId}`,
        attributes: this.createConversationAttributes(bookingId, {
          bookingId,
          type: 'booking',
          createdAt: new Date().toISOString()
        })
      };

      const conversationResult = await this.createConversation(conversationData);
      
      if (!conversationResult.success) {
        return conversationResult;
      }

      const conversationSid = conversationResult.data.conversationSid;

      // Add participants
      const participantResults = [];
      for (const participant of participants) {
        const participantData: ParticipantData = {
          identity: this.formatParticipantIdentity(participant.userId, participant.userType),
          attributes: this.createParticipantAttributes(
            participant.userId, 
            participant.userType, 
            participant.userName
          )
        };

        const result = await this.addParticipant(conversationSid, participantData);
        participantResults.push(result);
      }

      return this.formatSuccessResponse({
        conversationSid,
        participants: participantResults,
        bookingId
      }, 'Booking conversation created successfully');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async sendBookingMessage(conversationSid: string, message: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const messageData: MessageData = {
        author: this.formatParticipantIdentity(userId, userType),
        body: message,
        attributes: this.createMessageAttributes(userId, userType)
      };

      return await this.sendMessage(conversationSid, messageData);
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getBookingMessages(conversationSid: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      return await this.listMessages(conversationSid, 100);
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async addBookingParticipant(conversationSid: string, userId: string, userType: 'customer' | 'provider', userName?: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const participantData: ParticipantData = {
        identity: this.formatParticipantIdentity(userId, userType),
        attributes: this.createParticipantAttributes(userId, userType, userName)
      };

      return await this.addParticipant(conversationSid, participantData);
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async removeBookingParticipant(conversationSid: string, userId: string, userType: 'customer' | 'provider'): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      // First, find the participant by identity
      const participantsResult = await this.listParticipants(conversationSid);
      
      if (!participantsResult.success) {
        return participantsResult;
      }

      const identity = this.formatParticipantIdentity(userId, userType);
      const participant = participantsResult.data.participants.find((p: any) => p.identity === identity);

      if (!participant) {
        return this.formatErrorResponse('Participant not found in conversation');
      }

      return await this.removeParticipant(conversationSid, participant.sid);
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getBookingConversation(bookingId: string): Promise<TwilioResponse> {
    try {
      const conversations = await this.conversationsService.conversations.list();
      
      for (const conversation of conversations) {
        try {
          const attributes = JSON.parse(conversation.attributes || '{}');
          if (attributes.bookingId === bookingId) {
            return this.formatSuccessResponse({
              conversation: conversation
            });
          }
        } catch (parseError) {
          // Skip conversations with invalid attributes
          continue;
        }
      }

      return this.formatErrorResponse('Booking conversation not found');
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async closeBookingConversation(bookingId: string): Promise<TwilioResponse> {
    try {
      const conversationResult = await this.getBookingConversation(bookingId);
      
      if (!conversationResult.success) {
        return conversationResult;
      }

      const conversationSid = conversationResult.data.conversation.sid;
      return await this.closeConversation(conversationSid);
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  // Utility Methods
  async getConversationByFriendlyName(friendlyName: string): Promise<TwilioResponse> {
    try {
      const conversations = await this.conversationsService.conversations.list({
        friendlyName: friendlyName
      });

      if (conversations.length === 0) {
        return this.formatErrorResponse('Conversation not found');
      }

      return this.formatSuccessResponse({
        conversation: conversations[0]
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getParticipantByIdentity(conversationSid: string, identity: string): Promise<TwilioResponse> {
    try {
      if (!this.validateConversationSid(conversationSid)) {
        return this.formatErrorResponse('Invalid conversation SID format');
      }

      const participants = await this.conversationsService.conversations(conversationSid).participants.list();
      
      const participant = participants.find((p: any) => p.identity === identity);

      if (!participant) {
        return this.formatErrorResponse('Participant not found');
      }

      return this.formatSuccessResponse({
        participant: participant
      });
    } catch (error) {
      return this.handleTwilioError(error);
    }
  }

  async getConversationParticipants(conversationSid: string): Promise<TwilioResponse> {
    return this.listParticipants(conversationSid);
  }

  async getConversationMessages(conversationSid: string, limit: number = 50): Promise<TwilioResponse> {
    return this.listMessages(conversationSid, limit);
  }
}

// Factory function to create Twilio conversations service
export function createTwilioConversationsService(): TwilioService {
  return new TwilioConversationsService();
}

// Default export
export default TwilioConversationsService;
