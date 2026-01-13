import type { VercelRequest, VercelResponse } from "@vercel/node";
// Import server-side Twilio services directly (these contain Node.js dependencies)
import { createTwilioConversationsService } from "../services/twilio/TwilioConversationsService.js";
import { ConversationService } from "../services/twilio/ConversationService.js";
import { ParticipantService } from "../services/twilio/ParticipantService.js";
import { MessageService } from "../services/twilio/MessageService.js";
import type { TwilioConfig, TwilioAction } from "../services/twilio/types.js";

/**
 * Unified Twilio Conversations API Handler
 * 
 * This handler can be used by both customer and provider apps.
 * It supports both the booking-specific actions and general Twilio actions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Twilio Conversations API called with action:', req.body?.action);
    
    const body = req.body;
    const action = body.action;

    // Get Twilio configuration
    const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.VITE_TWILIO_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
    const conversationsServiceSid = process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID || process.env.TWILIO_CONVERSATIONS_SERVICE_SID;

    if (!accountSid || !authToken || !conversationsServiceSid) {
      console.error('Missing Twilio credentials');
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    const twilioConfig: TwilioConfig = {
      accountSid,
      authToken,
      conversationsServiceSid,
    };

    // Get Supabase configuration
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    // Server-side API routes MUST use the service role key (RLS bypass) for conversation metadata writes.
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      const missing: string[] = [];
      if (!supabaseUrl) missing.push('VITE_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
      if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
      console.error('Missing Supabase credentials:', missing.join(', '));
      return res.status(500).json({ error: 'Supabase credentials not configured', details: `Missing: ${missing.join(', ')}` });
    }

    // Initialize the unified service
    const conversationsService = createTwilioConversationsService(supabaseUrl, supabaseKey);
    
    if (!conversationsService) {
      return res.status(500).json({ error: 'Failed to initialize conversations service' });
    }

    // Handle booking-specific actions (legacy support)
    if (action === 'create-conversation') {
      const { bookingId, participants } = body;
      
      if (!bookingId || !participants || !Array.isArray(participants)) {
        return res.status(400).json({ error: 'Booking ID and participants array are required' });
      }

      try {
        const result = await conversationsService.createBookingConversation(
          bookingId,
          participants,
          body.conversationType || 'booking_chat'
        );

        return res.status(200).json({
          success: true,
          conversationSid: result.conversationSid,
          conversationMetadataId: result.conversationMetadataId,
          isNew: result.isNew,
          participants: participants, // Return the participants that were passed in
        });
      } catch (error: any) {
        console.error('Error creating conversation:', error);
        return res.status(500).json({ 
          error: 'Failed to create conversation',
          details: error.message 
        });
      }
    }

    if (action === 'send-message') {
      const { conversationSid, message, userId, userType, bookingId, mediaSid } = body;
      
      // Message text is optional if mediaSid is provided
      if (!conversationSid || (!message && !mediaSid) || !userId || !userType) {
        return res.status(400).json({ error: 'Conversation SID, (message or mediaSid), user ID, and user type are required' });
      }

      try {
        const result = await conversationsService.sendMessage(
          conversationSid,
          message,
          userId,
          userType,
          bookingId,
          mediaSid
        );

        return res.status(200).json({
          success: true,
          messageSid: result.messageSid,
        });
      } catch (error: any) {
        console.error('Error sending message:', error);
        return res.status(500).json({ 
          error: 'Failed to send message',
          details: error.message 
        });
      }
    }

    if (action === 'upload-media') {
      const { fileData, contentType, filename } = body;
      
      if (!fileData || !contentType) {
        return res.status(400).json({ error: 'File data (base64) and content type are required' });
      }

      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(fileData, 'base64');
        
        const result = await conversationsService.uploadMedia(
          buffer,
          contentType,
          filename
        );

        return res.status(200).json({
          success: true,
          mediaSid: result.mediaSid,
        });
      } catch (error: any) {
        console.error('Error uploading media:', error);
        return res.status(500).json({ 
          error: 'Failed to upload media',
          details: error.message 
        });
      }
    }

    if (action === 'get-messages') {
      const { conversationSid, limit } = body;
      
      if (!conversationSid) {
        return res.status(400).json({ error: 'Conversation SID is required' });
      }

      try {
        const messages = await conversationsService.getMessages(conversationSid, limit || 50);

        return res.status(200).json({
          success: true,
          messages,
        });
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch messages',
          details: error.message 
        });
      }
    }

    if (action === 'mark-as-read') {
      const { conversationMetadataId, userId } = body;
      
      if (!conversationMetadataId || !userId) {
        return res.status(400).json({ error: 'Conversation metadata ID and user ID are required' });
      }

      try {
        await conversationsService.markAsRead(conversationMetadataId, userId);

        return res.status(200).json({
          success: true,
          message: 'Messages marked as read successfully',
        });
      } catch (error: any) {
        console.error('Error marking as read:', error);
        return res.status(500).json({ 
          error: 'Failed to mark messages as read',
          details: error.message 
        });
      }
    }

    // Handle general Twilio actions (for provider app compatibility)
    const twilioAction = body as TwilioAction;
    
    // Initialize individual services for general actions
    const conversationService = new ConversationService(twilioConfig);
    const participantService = new ParticipantService(twilioConfig);
    const messageService = new MessageService(twilioConfig);

    let result;

    switch (twilioAction.action) {
      case 'create_conversation':
        result = await conversationService.createConversation({
          friendlyName: twilioAction.friendlyName,
          uniqueName: twilioAction.uniqueName,
          attributes: twilioAction.attributes
        });
        break;

      case 'get_conversation':
        result = await conversationService.getConversation(twilioAction.conversationSid);
        break;

      case 'list_conversations':
        result = await conversationService.listConversations(twilioAction.limit);
        break;

      case 'update_conversation':
        result = await conversationService.updateConversation(twilioAction.conversationSid, twilioAction.updates);
        break;

      case 'delete_conversation':
        result = await conversationService.deleteConversation(twilioAction.conversationSid);
        break;

      case 'close_conversation':
        result = await conversationService.closeConversation(twilioAction.conversationSid);
        break;

      case 'get_conversation_stats':
        result = await conversationService.getConversationStats(twilioAction.conversationSid);
        break;

      case 'search_conversations':
        result = await conversationService.searchConversations(twilioAction.query);
        break;

      case 'add_participant':
        result = await participantService.addParticipant(twilioAction.conversationSid, twilioAction.participantData);
        break;

      case 'remove_participant':
        result = await participantService.removeParticipant(twilioAction.conversationSid, twilioAction.participantSid);
        break;

      case 'get_participant':
        result = await participantService.getParticipant(twilioAction.conversationSid, twilioAction.participantSid);
        break;

      case 'list_participants':
        result = await participantService.listParticipants(twilioAction.conversationSid);
        break;

      case 'update_participant':
        result = await participantService.updateParticipant(twilioAction.conversationSid, twilioAction.participantSid, twilioAction.updates);
        break;

      case 'get_participant_by_identity':
        result = await participantService.getParticipantByIdentity(twilioAction.conversationSid, twilioAction.identity);
        break;

      case 'participant_exists':
        result = await participantService.participantExists(twilioAction.conversationSid, twilioAction.identity);
        break;

      case 'get_participant_count':
        result = await participantService.getParticipantCount(twilioAction.conversationSid);
        break;

      case 'get_participants_by_role':
        result = await participantService.getParticipantsByRole(twilioAction.conversationSid, twilioAction.role);
        break;

      case 'send_message':
        result = await messageService.sendMessage(twilioAction.conversationSid, twilioAction.messageData, twilioAction.author);
        break;

      case 'get_message':
        result = await messageService.getMessage(twilioAction.conversationSid, twilioAction.messageSid);
        break;

      case 'list_messages':
        result = await messageService.listMessages(twilioAction.conversationSid, twilioAction.limit);
        break;

      case 'update_message':
        result = await messageService.updateMessage(twilioAction.conversationSid, twilioAction.messageSid, twilioAction.updates);
        break;

      case 'delete_message':
        result = await messageService.deleteMessage(twilioAction.conversationSid, twilioAction.messageSid);
        break;

      case 'get_message_delivery_status':
        result = await messageService.getMessageDeliveryStatus(twilioAction.conversationSid, twilioAction.messageSid);
        break;

      case 'get_messages_by_author':
        result = await messageService.getMessagesByAuthor(twilioAction.conversationSid, twilioAction.author, twilioAction.limit);
        break;

      case 'search_messages':
        result = await messageService.searchMessages(twilioAction.conversationSid, twilioAction.query, twilioAction.limit);
        break;

      case 'get_message_count':
        result = await messageService.getMessageCount(twilioAction.conversationSid);
        break;

      case 'get_recent_messages':
        result = await messageService.getRecentMessages(twilioAction.conversationSid, twilioAction.hours);
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          message: `Unknown action: ${action}` 
        });
    }

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }

  } catch (error) {
    console.error('Twilio Conversations API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

