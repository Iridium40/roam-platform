import twilio from "twilio";
import type { 
  TwilioConfig, 
  MessageData, 
  TwilioResponse,
  UploadMediaOptions,
  MediaAttachment
} from "./types";

export class MessageService {
  private client: twilio.Twilio;
  // Loosen type; Twilio Conversations namespace types not exported in v5 layout used here.
  private conversationsService: any;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.conversationsService = this.client.conversations.v1.services(config.conversationsServiceSid);
  }

  /**
   * Upload media to Twilio Media Content Service (MCS)
   * Returns a mediaSid that can be used when sending a message
   */
  async uploadMedia(options: UploadMediaOptions): Promise<TwilioResponse> {
    try {
      console.log('📤 Uploading media to Twilio MCS:', {
        contentType: options.contentType,
        filename: options.filename,
        size: options.file.length
      });

      // Use the Twilio SDK to upload media
      const media = await this.conversationsService
        .media
        .create({
          media: options.file,
          contentType: options.contentType,
        });

      console.log('✅ Media uploaded successfully:', media.sid);

      return {
        success: true,
        data: {
          sid: media.sid,
          contentType: media.contentType,
          filename: options.filename,
          size: options.file.length,
        },
        message: 'Media uploaded successfully',
      };
    } catch (error) {
      console.error('❌ Failed to upload media:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload media',
      };
    }
  }

  /**
   * Get temporary URL for media content
   */
  async getMediaUrl(messageSid: string, conversationSid: string, mediaSid: string): Promise<string | null> {
    try {
      const media = await this.conversationsService
        .conversations(conversationSid)
        .messages(messageSid)
        .media(mediaSid)
        .fetch();

      return media.contentTemporaryUrl || null;
    } catch (error) {
      console.error('❌ Failed to get media URL:', error);
      return null;
    }
  }

  /**
   * Send message to conversation (supports text and/or media)
   */
  async sendMessage(
    conversationSid: string, 
    messageData: MessageData,
    author: string
  ): Promise<TwilioResponse> {
    try {
      const attributesString = JSON.stringify(messageData.attributes || {});
      const bodyLength = messageData.body?.length || 0;
      const attributesLength = attributesString.length;
      
      console.log('📨 Sending message to conversation:', {
        conversationSid,
        author,
        bodyLength,
        attributesLength,
        hasMedia: !!messageData.mediaSid,
        totalPayloadSize: bodyLength + attributesLength,
        attributes: messageData.attributes
      });

      // Twilio has a 16KB limit on attributes
      if (attributesLength > 16000) {
        console.error('❌ Attributes too large:', attributesLength, 'bytes');
        throw new Error(`Message attributes exceed Twilio's 16KB limit: ${attributesLength} bytes`);
      }

      // Build the message payload - body is optional if media is present
      const createPayload: any = {
        author: author,
        attributes: attributesString,
      };

      // Add body if provided
      if (messageData.body) {
        createPayload.body = messageData.body;
      }

      // Add mediaSid if provided
      if (messageData.mediaSid) {
        createPayload.mediaSid = messageData.mediaSid;
      }

      const message = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .create(createPayload);

      console.log('Message sent successfully:', message.sid);

      return {
        success: true,
        data: {
          sid: message.sid,
          body: message.body,
          author: message.author,
          attributes: message.attributes,
          dateCreated: message.dateCreated,
          index: message.index,
          media: message.media,
        },
        message: 'Message sent successfully',
      };
    } catch (error) {
      console.error('Failed to send message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message',
      };
    }
  }

  /**
   * Get message details
   */
  async getMessage(
    conversationSid: string, 
    messageSid: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting message details:', conversationSid, 'message:', messageSid);

      const message = await this.conversationsService
        .conversations(conversationSid)
        .messages(messageSid)
        .fetch();

      return {
        success: true,
        data: {
          sid: message.sid,
          body: message.body,
          author: message.author,
          attributes: message.attributes,
          dateCreated: message.dateCreated,
          dateUpdated: message.dateUpdated,
          index: message.index,
          delivery: message.delivery,
        },
        message: 'Message details retrieved successfully',
      };
    } catch (error) {
      console.error('Failed to get message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get message',
      };
    }
  }

  /**
   * List messages in conversation (with media info)
   */
  async listMessages(
    conversationSid: string, 
    limit: number = 50
  ): Promise<TwilioResponse> {
    try {
      console.log('Listing messages for conversation:', conversationSid, 'limit:', limit);

      const messages = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .list({ limit });

      // Fetch media details for messages that have media
      const messageList = await Promise.all(messages.map(async (message: any) => {
        let media: MediaAttachment[] = [];
        
        // Check if message has media attached
        if (message.media && message.media.length > 0) {
          try {
            // Fetch media details for each media item
            const mediaItems = await this.conversationsService
              .conversations(conversationSid)
              .messages(message.sid)
              .media
              .list();
            
            media = await Promise.all(mediaItems.map(async (mediaItem: any) => {
              return {
                sid: mediaItem.sid,
                contentType: mediaItem.contentType,
                filename: mediaItem.filename,
                size: mediaItem.size,
                url: mediaItem.contentTemporaryUrl || null,
              };
            }));
          } catch (mediaError) {
            console.warn('Could not fetch media for message:', message.sid, mediaError);
          }
        }

        return {
          sid: message.sid,
          body: message.body,
          author: message.author,
          attributes: message.attributes,
          dateCreated: message.dateCreated,
          dateUpdated: message.dateUpdated,
          index: message.index,
          delivery: message.delivery,
          media: media.length > 0 ? media : undefined,
        };
      }));

      return {
        success: true,
        data: messageList,
        message: `Retrieved ${messageList.length} messages`,
      };
    } catch (error) {
      console.error('Failed to list messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list messages',
      };
    }
  }

  /**
   * Update message
   */
  async updateMessage(
    conversationSid: string,
    messageSid: string,
    updates: Partial<MessageData>
  ): Promise<TwilioResponse> {
    try {
      console.log('Updating message:', conversationSid, 'message:', messageSid, 'updates:', updates);

      const updateData: any = {};
      if (updates.body !== undefined) updateData.body = updates.body;
      if (updates.attributes !== undefined) updateData.attributes = JSON.stringify(updates.attributes);

      const message = await this.conversationsService
        .conversations(conversationSid)
        .messages(messageSid)
        .update(updateData);

      return {
        success: true,
        data: {
          sid: message.sid,
          body: message.body,
          author: message.author,
          attributes: message.attributes,
          dateUpdated: message.dateUpdated,
          index: message.index,
        },
        message: 'Message updated successfully',
      };
    } catch (error) {
      console.error('Failed to update message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update message',
      };
    }
  }

  /**
   * Delete message
   */
  async deleteMessage(
    conversationSid: string, 
    messageSid: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Deleting message:', conversationSid, 'message:', messageSid);

      await this.conversationsService
        .conversations(conversationSid)
        .messages(messageSid)
        .remove();

      return {
        success: true,
        message: 'Message deleted successfully',
      };
    } catch (error) {
      console.error('Failed to delete message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete message',
      };
    }
  }

  /**
   * Get message delivery status
   */
  async getMessageDeliveryStatus(
    conversationSid: string, 
    messageSid: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting message delivery status:', conversationSid, 'message:', messageSid);

      const message = await this.conversationsService
        .conversations(conversationSid)
        .messages(messageSid)
        .fetch();

      const deliveryStatus = {
        sid: message.sid,
        delivery: message.delivery,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
      };

      return {
        success: true,
        data: deliveryStatus,
        message: 'Message delivery status retrieved successfully',
      };
    } catch (error) {
      console.error('Failed to get message delivery status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get message delivery status',
      };
    }
  }

  /**
   * Get messages by author
   */
  async getMessagesByAuthor(
    conversationSid: string, 
    author: string,
    limit: number = 50
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting messages by author:', conversationSid, 'author:', author);

      const messages = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .list({ limit });

      const filteredMessages = messages.filter((message: any) => message.author === author);

      const messageList = filteredMessages.map((message: any) => ({
        sid: message.sid,
        body: message.body,
        author: message.author,
        attributes: message.attributes,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        index: message.index,
        delivery: message.delivery,
      }));

      return {
        success: true,
        data: messageList,
        message: `Found ${messageList.length} messages by ${author}`,
      };
    } catch (error) {
      console.error('Failed to get messages by author:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get messages by author',
      };
    }
  }

  /**
   * Search messages
   */
  async searchMessages(
    conversationSid: string, 
    query: string,
    limit: number = 50
  ): Promise<TwilioResponse> {
    try {
      console.log('Searching messages:', conversationSid, 'query:', query);

      const messages = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .list({ limit });

      const filteredMessages = messages.filter((message: any) => 
        message.body?.toLowerCase().includes(query.toLowerCase())
      );

      const messageList = filteredMessages.map((message: any) => ({
        sid: message.sid,
        body: message.body,
        author: message.author,
        attributes: message.attributes,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        index: message.index,
        delivery: message.delivery,
      }));

      return {
        success: true,
        data: messageList,
        message: `Found ${messageList.length} messages matching "${query}"`,
      };
    } catch (error) {
      console.error('Failed to search messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search messages',
      };
    }
  }

  /**
   * Get message count
   */
  async getMessageCount(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Getting message count for conversation:', conversationSid);

      const messages = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .list();

      return {
        success: true,
        data: { count: messages.length },
        message: `Conversation has ${messages.length} messages`,
      };
    } catch (error) {
      console.error('Failed to get message count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get message count',
      };
    }
  }

  /**
   * Get recent messages
   */
  async getRecentMessages(
    conversationSid: string, 
    hours: number = 24
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting recent messages:', conversationSid, 'hours:', hours);

      const messages = await this.conversationsService
        .conversations(conversationSid)
        .messages
        .list();

      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const recentMessages = messages.filter((message: any) => 
        new Date(message.dateCreated) > cutoffTime
      );

      const messageList = recentMessages.map((message: any) => ({
        sid: message.sid,
        body: message.body,
        author: message.author,
        attributes: message.attributes,
        dateCreated: message.dateCreated,
        dateUpdated: message.dateUpdated,
        index: message.index,
        delivery: message.delivery,
      }));

      return {
        success: true,
        data: messageList,
        message: `Found ${messageList.length} messages in the last ${hours} hours`,
      };
    } catch (error) {
      console.error('Failed to get recent messages:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get recent messages',
      };
    }
  }
}

