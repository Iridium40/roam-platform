import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ConversationService } from "./twilio/services/conversationService";
import { ParticipantService } from "./twilio/services/participantService";
import { MessageService } from "./twilio/services/messageService";
import type { TwilioConfig, TwilioAction } from "./twilio/types/twilioTypes";

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
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const body = req.body as TwilioAction;

    const accountSid = process.env.VITE_TWILIO_ACCOUNT_SID;
    const authToken = process.env.VITE_TWILIO_AUTH_TOKEN;
    const conversationsServiceSid = process.env.VITE_TWILIO_CONVERSATIONS_SERVICE_SID;

    console.log('Environment variables check:', {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasServiceSid: !!conversationsServiceSid,
      accountSidLength: accountSid?.length,
      authTokenLength: authToken?.length,
      serviceSidLength: conversationsServiceSid?.length
    });

    if (!accountSid || !authToken || !conversationsServiceSid) {
      console.error('Missing Twilio credentials:', {
        accountSid: !!accountSid,
        authToken: !!authToken,
        conversationsServiceSid: !!conversationsServiceSid
      });
      return res.status(500).json({ error: 'Twilio credentials not configured' });
    }

    const config: TwilioConfig = {
      accountSid,
      authToken,
      conversationsServiceSid,
    };

    // Initialize services
    const conversationService = new ConversationService(config);
    const participantService = new ParticipantService(config);
    const messageService = new MessageService(config);

    let result;

    switch (body.action) {
      case 'create_conversation':
        result = await conversationService.createConversation({
          friendlyName: body.friendlyName,
          uniqueName: body.uniqueName,
          attributes: body.attributes
        });
        break;

      case 'get_conversation':
        result = await conversationService.getConversation(body.conversationSid);
        break;

      case 'list_conversations':
        result = await conversationService.listConversations(body.limit);
        break;

      case 'update_conversation':
        result = await conversationService.updateConversation(body.conversationSid, body.updates);
        break;

      case 'delete_conversation':
        result = await conversationService.deleteConversation(body.conversationSid);
        break;

      case 'close_conversation':
        result = await conversationService.closeConversation(body.conversationSid);
        break;

      case 'get_conversation_stats':
        result = await conversationService.getConversationStats(body.conversationSid);
        break;

      case 'search_conversations':
        result = await conversationService.searchConversations(body.query);
        break;

      case 'add_participant':
        result = await participantService.addParticipant(body.conversationSid, body.participantData);
        break;

      case 'remove_participant':
        result = await participantService.removeParticipant(body.conversationSid, body.participantSid);
        break;

      case 'get_participant':
        result = await participantService.getParticipant(body.conversationSid, body.participantSid);
        break;

      case 'list_participants':
        result = await participantService.listParticipants(body.conversationSid);
        break;

      case 'update_participant':
        result = await participantService.updateParticipant(body.conversationSid, body.participantSid, body.updates);
        break;

      case 'get_participant_by_identity':
        result = await participantService.getParticipantByIdentity(body.conversationSid, body.identity);
        break;

      case 'participant_exists':
        result = await participantService.participantExists(body.conversationSid, body.identity);
        break;

      case 'get_participant_count':
        result = await participantService.getParticipantCount(body.conversationSid);
        break;

      case 'get_participants_by_role':
        result = await participantService.getParticipantsByRole(body.conversationSid, body.role);
        break;

      case 'send_message':
        result = await messageService.sendMessage(body.conversationSid, body.messageData, body.author);
        break;

      case 'get_message':
        result = await messageService.getMessage(body.conversationSid, body.messageSid);
        break;

      case 'list_messages':
        result = await messageService.listMessages(body.conversationSid, body.limit);
        break;

      case 'update_message':
        result = await messageService.updateMessage(body.conversationSid, body.messageSid, body.updates);
        break;

      case 'delete_message':
        result = await messageService.deleteMessage(body.conversationSid, body.messageSid);
        break;

      case 'get_message_delivery_status':
        result = await messageService.getMessageDeliveryStatus(body.conversationSid, body.messageSid);
        break;

      case 'get_messages_by_author':
        result = await messageService.getMessagesByAuthor(body.conversationSid, body.author, body.limit);
        break;

      case 'search_messages':
        result = await messageService.searchMessages(body.conversationSid, body.query, body.limit);
        break;

      case 'get_message_count':
        result = await messageService.getMessageCount(body.conversationSid);
        break;

      case 'get_recent_messages':
        result = await messageService.getRecentMessages(body.conversationSid, body.hours);
        break;

      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          message: `Unknown action: ${(body as any).action}` 
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
