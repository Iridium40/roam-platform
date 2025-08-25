import twilio from "twilio";
import type { 
  TwilioConfig, 
  ConversationData, 
  TwilioResponse, 
  ConversationDetails,
  ConversationState 
} from "../types/twilioTypes";

export class ConversationService {
  private client: twilio.Twilio;
  private conversationsService: twilio.Conversations.ConversationsServiceInstance;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.conversationsService = this.client.conversations.v1.services(config.conversationsServiceSid);
  }

  /**
   * Create a new conversation
   */
  async createConversation(data: ConversationData): Promise<TwilioResponse> {
    try {
      console.log('Creating conversation with data:', data);

      const conversation = await this.conversationsService.conversations.create({
        friendlyName: data.friendlyName,
        uniqueName: data.uniqueName,
        attributes: JSON.stringify(data.attributes || {}),
      });

      console.log('Conversation created successfully:', conversation.sid);

      return {
        success: true,
        data: {
          sid: conversation.sid,
          friendlyName: conversation.friendlyName,
          uniqueName: conversation.uniqueName,
          state: conversation.state,
          dateCreated: conversation.dateCreated,
        },
        message: 'Conversation created successfully',
      };
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversation',
      };
    }
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Fetching conversation:', conversationSid);

      const conversation = await this.conversationsService.conversations(conversationSid).fetch();

      return {
        success: true,
        data: {
          sid: conversation.sid,
          friendlyName: conversation.friendlyName,
          uniqueName: conversation.uniqueName,
          state: conversation.state,
          attributes: conversation.attributes,
          dateCreated: conversation.dateCreated,
          dateUpdated: conversation.dateUpdated,
        },
        message: 'Conversation retrieved successfully',
      };
    } catch (error) {
      console.error('Failed to get conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation',
      };
    }
  }

  /**
   * List conversations
   */
  async listConversations(limit: number = 20): Promise<TwilioResponse> {
    try {
      console.log('Listing conversations, limit:', limit);

      const conversations = await this.conversationsService.conversations.list({ limit });

      const conversationList = conversations.map(conv => ({
        sid: conv.sid,
        friendlyName: conv.friendlyName,
        uniqueName: conv.uniqueName,
        state: conv.state,
        dateCreated: conv.dateCreated,
        dateUpdated: conv.dateUpdated,
      }));

      return {
        success: true,
        data: conversationList,
        message: `Retrieved ${conversationList.length} conversations`,
      };
    } catch (error) {
      console.error('Failed to list conversations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list conversations',
      };
    }
  }

  /**
   * Update conversation
   */
  async updateConversation(
    conversationSid: string, 
    updates: Partial<ConversationData>
  ): Promise<TwilioResponse> {
    try {
      console.log('Updating conversation:', conversationSid, 'with updates:', updates);

      const updateData: any = {};
      if (updates.friendlyName !== undefined) updateData.friendlyName = updates.friendlyName;
      if (updates.uniqueName !== undefined) updateData.uniqueName = updates.uniqueName;
      if (updates.attributes !== undefined) updateData.attributes = JSON.stringify(updates.attributes);

      const conversation = await this.conversationsService.conversations(conversationSid).update(updateData);

      return {
        success: true,
        data: {
          sid: conversation.sid,
          friendlyName: conversation.friendlyName,
          uniqueName: conversation.uniqueName,
          state: conversation.state,
          dateUpdated: conversation.dateUpdated,
        },
        message: 'Conversation updated successfully',
      };
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update conversation',
      };
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Deleting conversation:', conversationSid);

      await this.conversationsService.conversations(conversationSid).remove();

      return {
        success: true,
        message: 'Conversation deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      };
    }
  }

  /**
   * Close conversation
   */
  async closeConversation(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Closing conversation:', conversationSid);

      const conversation = await this.conversationsService.conversations(conversationSid).update({
        state: 'closed' as ConversationState,
      });

      return {
        success: true,
        data: {
          sid: conversation.sid,
          state: conversation.state,
          dateUpdated: conversation.dateUpdated,
        },
        message: 'Conversation closed successfully',
      };
    } catch (error) {
      console.error('Failed to close conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to close conversation',
      };
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Getting conversation stats:', conversationSid);

      // Get participants count
      const participants = await this.conversationsService.conversations(conversationSid).participants.list();
      
      // Get messages count
      const messages = await this.conversationsService.conversations(conversationSid).messages.list();
      
      // Get conversation details
      const conversation = await this.conversationsService.conversations(conversationSid).fetch();

      const stats = {
        sid: conversation.sid,
        friendlyName: conversation.friendlyName,
        state: conversation.state,
        participantCount: participants.length,
        messageCount: messages.length,
        dateCreated: conversation.dateCreated,
        dateUpdated: conversation.dateUpdated,
      };

      return {
        success: true,
        data: stats,
        message: 'Conversation statistics retrieved successfully',
      };
    } catch (error) {
      console.error('Failed to get conversation stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get conversation stats',
      };
    }
  }

  /**
   * Search conversations
   */
  async searchConversations(query: string): Promise<TwilioResponse> {
    try {
      console.log('Searching conversations with query:', query);

      const conversations = await this.conversationsService.conversations.list();

      // Filter conversations based on query
      const filteredConversations = conversations.filter(conv => 
        conv.friendlyName?.toLowerCase().includes(query.toLowerCase()) ||
        conv.uniqueName?.toLowerCase().includes(query.toLowerCase())
      );

      const searchResults = filteredConversations.map(conv => ({
        sid: conv.sid,
        friendlyName: conv.friendlyName,
        uniqueName: conv.uniqueName,
        state: conv.state,
        dateCreated: conv.dateCreated,
      }));

      return {
        success: true,
        data: searchResults,
        message: `Found ${searchResults.length} conversations matching "${query}"`,
      };
    } catch (error) {
      console.error('Failed to search conversations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search conversations',
      };
    }
  }
}
