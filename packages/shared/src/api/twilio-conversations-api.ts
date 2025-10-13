import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ConversationServiceWithDB } from '../services/twilio-conversations';
import type {
  BookingConversationParticipantData,
  ConversationMessageWithAuthor,
  BookingConversationParticipant,
  BookingParticipantRole,
} from '../types/booking-conversations';

export interface TwilioConversationsAPIOptions {
  service: ConversationServiceWithDB;
}

type ParticipantProfileRecord = {
  userId: string;
  profileId?: string | null;
  businessId?: string | null;
  role?: string | null;
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type ResolvedParticipant = {
  userId: string;
  profileId?: string | null;
  businessId?: string | null;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

type BookingContext = {
  bookingId: string;
  businessId: string | null;
  customerId: string | null;
  providerId: string | null;
};

type CreateConversationAction = {
  action: 'create-conversation';
  bookingId: string;
  participants: BookingConversationParticipantData[];
};

type GetMessagesAction = {
  action: 'get-messages';
  conversationSid: string;
};

type SendMessageAction = {
  action: 'send-message';
  conversationSid: string;
  message: string;
  userId: string;
  userType: BookingParticipantRole;
  bookingId?: string;
};

type RequestAction = CreateConversationAction | GetMessagesAction | SendMessageAction;

export class TwilioConversationsAPI {
  constructor(private readonly options: TwilioConversationsAPIOptions) {}

  async handleRequest(req: VercelRequest, res: VercelResponse) {
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
      const service = this.options.service;
      const body = (req.body ?? {}) as Partial<RequestAction>;
      const action = body.action;

      switch (action) {
        case 'create-conversation':
          return this.handleCreateConversation(service, body as CreateConversationAction, res);
        case 'get-messages':
          return this.handleGetMessages(service, body as GetMessagesAction, res);
        case 'send-message':
          return this.handleSendMessage(service, body as SendMessageAction, res);
        default:
          return res.status(400).json({ error: `Unknown action: ${action}` });
      }
    } catch (error) {
      console.error('Twilio conversations API error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private async handleCreateConversation(
    service: ConversationServiceWithDB,
    body: CreateConversationAction,
    res: VercelResponse,
  ) {
    const { bookingId, participants } = body;

    if (!bookingId || !participants?.length) {
      return res.status(400).json({ error: 'bookingId and participants are required' });
    }

    const bookingContext = await this.resolveBookingContext(service, bookingId);

    if (!bookingContext) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const twilioResult = await service.createConversationWithDB({ bookingId });

    if (twilioResult.error || !twilioResult.conversationId || !twilioResult.metadataId) {
      return res.status(500).json({ error: twilioResult.error || 'Failed to create conversation' });
    }

    const conversationId = twilioResult.conversationId;
    const metadataId = twilioResult.metadataId;

    const enrichedParticipants: BookingConversationParticipant[] = [];

    for (const participant of participants) {
      try {
      const identity = `${participant.userType}_${participant.userId}`;
        const participantDetails = await this.fetchAndValidateParticipant(service, participant, bookingContext);

        if (!participantDetails) {
          console.warn('Skipping participant due to missing profile or validation failure', participant);
          continue;
        }

        const { userId: participantUserId, profileId, businessId, name, email, avatarUrl } = participantDetails;
        const result = await service.addParticipant(conversationId, {
          identity,
          attributes: {
            userId: participantUserId,
            userType: participant.userType,
            senderName: name,
            email,
            avatarUrl,
            profileId,
            businessId,
          },
        });

        if (result.error) {
          console.error('Failed to add participant', participant, result.error);
        } else if (result.participantSid) {
          await service
            .getDatabaseClient()
            .from('conversation_participants')
            .insert({
              conversation_id: metadataId,
              user_id: participantUserId,
              user_type: participant.userType,
              twilio_participant_sid: result.participantSid,
            } as any);

          enrichedParticipants.push({
            userId: participantUserId,
            userType: participant.userType,
            userName: name,
            email: email,
            avatarUrl: avatarUrl,
            twilioParticipantSid: result.participantSid,
            conversationMetadataId: metadataId,
            businessId: businessId ?? null,
            profileId: profileId ?? null,
          });
        }
      } catch (error) {
        console.error('Error adding participant to conversation', participant, error);
      }
    }

    return res.status(200).json({
      success: true,
      conversationSid: conversationId,
      conversationMetadataId: metadataId,
      isNew: true,
      participants: enrichedParticipants,
    });
  }

  private async handleGetMessages(
    service: ConversationServiceWithDB,
    body: GetMessagesAction,
    res: VercelResponse,
  ) {
    if (!body.conversationSid) {
      return res.status(400).json({ error: 'conversationSid is required' });
    }

    const result = await service.getMessages(body.conversationSid, 50);

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    const messages: ConversationMessageWithAuthor[] = result.messages.map((message) => ({
      ...message,
      author_name: message.author_name || message.author_id,
    }));

    return res.status(200).json({ success: true, messages });
  }

  private async handleSendMessage(
    service: ConversationServiceWithDB,
    body: SendMessageAction,
    res: VercelResponse,
  ) {
    const { conversationSid, message, userId, userType } = body;

    if (!conversationSid || !message || !userId || !userType) {
      return res.status(400).json({ error: 'conversationSid, message, userId, and userType are required' });
    }

    const bookingContext = await this.resolveBookingContext(service, body.bookingId ?? conversationSid);

    if (!bookingContext) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const participantDetails = await this.fetchAndValidateParticipant(service, { userId, userType }, bookingContext);
    if (!participantDetails) {
      return res.status(404).json({ error: 'Sender profile not found' });
    }

    const result = await service.sendMessage(conversationSid, {
      body: message,
      attributes: {
        userId: participantDetails.userId,
        senderType: userType,
        senderName: participantDetails.name,
        email: participantDetails.email,
        avatarUrl: participantDetails.avatarUrl,
      },
    });

    if (result.error) {
      return res.status(500).json({ error: result.error });
    }

    return res.status(200).json({ success: true });
  }

  private async resolveBookingContext(
    service: ConversationServiceWithDB,
    bookingIdOrConversationId: string,
  ): Promise<BookingContext | null> {
    const client = service.getDatabaseClient();

    let bookingId = bookingIdOrConversationId;

    if (bookingIdOrConversationId.startsWith('CH')) {
      const { data } = await client
        .from('conversation_metadata')
        .select('booking_id')
        .eq('twilio_conversation_sid', bookingIdOrConversationId)
        .maybeSingle<{ booking_id: string }>();

      if (!data?.booking_id) {
        return null;
      }

      bookingId = data.booking_id;
    }

    const { data } = await client
      .from('bookings')
      .select('id, business_id, customer_id, provider_id')
      .eq('id', bookingId)
      .maybeSingle<{ id: string; business_id: string | null; customer_id: string | null; provider_id: string | null }>();

    if (!data) {
      return null;
    }

    return {
      bookingId: data.id,
      businessId: data.business_id,
      customerId: data.customer_id,
      providerId: data.provider_id,
    };
  }

  private async fetchAndValidateParticipant(
    service: ConversationServiceWithDB,
    participant: Pick<BookingConversationParticipantData, 'userId' | 'userType' | 'userName' | 'email' | 'avatarUrl'>,
    bookingContext: BookingContext,
  ): Promise<ResolvedParticipant | null> {
    const client = service.getDatabaseClient();

    const profileRecord = await this.fetchParticipantProfile(client, participant);
    if (!profileRecord) return null;

    const isAllowed = await this.verifyParticipantAccess(client, participant.userType, profileRecord, bookingContext);
    if (!isAllowed) return null;

    const name = profileRecord.fullName || participant.userName || null;
    const email = profileRecord.email ?? participant.email ?? null;
    const avatarUrl = profileRecord.avatarUrl ?? participant.avatarUrl ?? null;

    return {
      userId: profileRecord.userId,
      profileId: profileRecord.profileId ?? undefined,
      businessId: profileRecord.businessId ?? undefined,
      name,
      email,
      avatarUrl,
    };
  }

  private async fetchParticipantProfile(
    client: ReturnType<typeof this.options.service.getDatabaseClient>,
    participant: Pick<BookingConversationParticipantData, 'userId' | 'userType'>,
  ): Promise<ParticipantProfileRecord | null> {
    if (participant.userType === 'customer') {
      const { data } = await client
        .from('customer_profiles')
        .select('id, user_id, first_name, last_name, email, image_url')
        .eq('user_id', participant.userId)
        .maybeSingle<{ id: string; user_id: string; first_name: string | null; last_name: string | null; email: string | null; image_url: string | null }>();

      if (!data) return null;

      return {
        userId: data.user_id,
        profileId: data.id,
        businessId: null as string | null,
        role: null as string | null,
        fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
        email: data.email,
        avatarUrl: data.image_url,
      };
    }

    if (participant.userType === 'provider') {
      const { data } = await client
        .from('providers')
        .select('id, user_id, first_name, last_name, email, image_url, business_id')
        .eq('user_id', participant.userId)
        .maybeSingle<{ id: string; user_id: string; first_name: string | null; last_name: string | null; email: string | null; image_url: string | null; business_id: string | null }>();

      if (!data) return null;

      return {
        userId: data.user_id,
        profileId: data.id,
        businessId: data.business_id,
        role: null as string | null,
        fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
        email: data.email,
        avatarUrl: data.image_url,
      };
    }

    if (participant.userType === 'owner' || participant.userType === 'dispatcher') {
      const { data } = await client
        .from('business_staff')
        .select('id, user_id, first_name, last_name, email, avatar_url, business_id, role')
        .eq('user_id', participant.userId)
        .maybeSingle<{ id: string; user_id: string; first_name: string | null; last_name: string | null; email: string | null; avatar_url: string | null; business_id: string | null; role: string }>();

      if (!data) return null;

      return {
        userId: data.user_id,
        profileId: data.id,
        businessId: data.business_id,
        role: data.role,
        fullName: `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim(),
        email: data.email,
        avatarUrl: data.avatar_url,
      };
    }

    return null;
  }

  private async verifyParticipantAccess(
    _client: ReturnType<typeof this.options.service.getDatabaseClient>,
    userType: BookingParticipantRole,
    profile: ParticipantProfileRecord,
    bookingContext: BookingContext,
  ) {
    if (userType === 'customer') {
      return (
        bookingContext.customerId === profile.profileId ||
        bookingContext.customerId === profile.userId
      );
    }

    if (userType === 'provider') {
      return bookingContext.providerId === profile.profileId;
    }

    if (userType === 'owner' || userType === 'dispatcher') {
      if (userType === 'owner' && profile.role !== 'owner') return false;
      if (userType === 'dispatcher' && profile.role !== 'dispatcher') return false;

      return bookingContext.businessId === profile.businessId;
    }

    return false;
  }
}

export const createTwilioConversationsAPI = (service: ConversationServiceWithDB) =>
  new TwilioConversationsAPI({ service });

