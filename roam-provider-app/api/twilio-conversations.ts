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
    
    const { action, ...data } = req.body as TwilioAction;

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

    switch (action) {
      case 'create_conversation':
        result = await conversationService.createConversation(data);
        break;

      case 'get_conversation':
        result = await conversationService.getConversation(data.conversationSid);
        break;

      case 'list_conversations':
        result = await conversationService.listConversations(data.limit);
        break;

      case 'update_conversation':
        result = await conversationService.updateConversation(data.conversationSid, data.updates);
        break;

      case 'delete_conversation':
        result = await conversationService.deleteConversation(data.conversationSid);
        break;

      case 'close_conversation':
        result = await conversationService.closeConversation(data.conversationSid);
        break;

      case 'get_conversation_stats':
        result = await conversationService.getConversationStats(data.conversationSid);
        break;

      case 'search_conversations':
        result = await conversationService.searchConversations(data.query);
        break;

      case 'add_participant':
        result = await participantService.addParticipant(data.conversationSid, data.participantData);
        break;

      case 'remove_participant':
        result = await participantService.removeParticipant(data.conversationSid, data.participantSid);
        break;

      case 'get_participant':
        result = await participantService.getParticipant(data.conversationSid, data.participantSid);
        break;

      case 'list_participants':
        result = await participantService.listParticipants(data.conversationSid);
        break;

      case 'update_participant':
        result = await participantService.updateParticipant(data.conversationSid, data.participantSid, data.updates);
        break;

      case 'get_participant_by_identity':
        result = await participantService.getParticipantByIdentity(data.conversationSid, data.identity);
        break;

      case 'participant_exists':
        result = await participantService.participantExists(data.conversationSid, data.identity);
        break;

      case 'get_participant_count':
        result = await participantService.getParticipantCount(data.conversationSid);
        break;

      case 'get_participants_by_role':
        result = await participantService.getParticipantsByRole(data.conversationSid, data.role);
        break;

      case 'send_message':
        result = await messageService.sendMessage(data.conversationSid, data.messageData, data.author);
        break;

      case 'get_message':
        result = await messageService.getMessage(data.conversationSid, data.messageSid);
        break;

      case 'list_messages':
        result = await messageService.listMessages(data.conversationSid, data.limit);
        break;

      case 'update_message':
        result = await messageService.updateMessage(data.conversationSid, data.messageSid, data.updates);
        break;

      case 'delete_message':
        result = await messageService.deleteMessage(data.conversationSid, data.messageSid);
        break;

      case 'get_message_delivery_status':
        result = await messageService.getMessageDeliveryStatus(data.conversationSid, data.messageSid);
        break;

      case 'get_messages_by_author':
        result = await messageService.getMessagesByAuthor(data.conversationSid, data.author, data.limit);
        break;

      case 'search_messages':
        result = await messageService.searchMessages(data.conversationSid, data.query, data.limit);
        break;

      case 'get_message_count':
        result = await messageService.getMessageCount(data.conversationSid);
        break;

      case 'get_recent_messages':
        result = await messageService.getRecentMessages(data.conversationSid, data.hours);
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
