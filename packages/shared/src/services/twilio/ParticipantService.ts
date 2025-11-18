import twilio from "twilio";
import type { 
  TwilioConfig, 
  ParticipantData, 
  TwilioResponse, 
  ParticipantRole 
} from "./types";

export class ParticipantService {
  private client: twilio.Twilio;
  // See conversationService.ts for rationale: loosen type to any to avoid relying on
  // non-exported Conversations namespace typings in twilio v5.
  private conversationsService: any;

  constructor(config: TwilioConfig) {
    this.client = twilio(config.accountSid, config.authToken);
    this.conversationsService = this.client.conversations.v1.services(config.conversationsServiceSid);
  }

  /**
   * Add participant to conversation
   */
  async addParticipant(
    conversationSid: string, 
    participantData: ParticipantData
  ): Promise<TwilioResponse> {
    try {
      console.log('Adding participant to conversation:', conversationSid, 'participant:', participantData.identity);

      const participant = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .create({
          identity: participantData.identity,
          attributes: JSON.stringify(participantData.attributes || {}),
          roleSid: participantData.roleSid,
        });

      console.log('Participant added successfully:', participant.sid);

      return {
        success: true,
        data: {
          sid: participant.sid,
          identity: participant.identity,
          attributes: participant.attributes,
          roleSid: participant.roleSid,
          dateCreated: participant.dateCreated,
        },
        message: 'Participant added successfully',
      };
    } catch (error) {
      console.error('Failed to add participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add participant',
      };
    }
  }

  /**
   * Remove participant from conversation
   */
  async removeParticipant(
    conversationSid: string, 
    participantSid: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Removing participant from conversation:', conversationSid, 'participant:', participantSid);

      await this.conversationsService
        .conversations(conversationSid)
        .participants(participantSid)
        .remove();

      return {
        success: true,
        message: 'Participant removed successfully',
      };
    } catch (error) {
      console.error('Failed to remove participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove participant',
      };
    }
  }

  /**
   * Get participant details
   */
  async getParticipant(
    conversationSid: string, 
    participantSid: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting participant details:', conversationSid, 'participant:', participantSid);

      const participant = await this.conversationsService
        .conversations(conversationSid)
        .participants(participantSid)
        .fetch();

      return {
        success: true,
        data: {
          sid: participant.sid,
          identity: participant.identity,
          attributes: participant.attributes,
          roleSid: participant.roleSid,
          dateCreated: participant.dateCreated,
          dateUpdated: participant.dateUpdated,
          messagingBinding: participant.messagingBinding,
        },
        message: 'Participant details retrieved successfully',
      };
    } catch (error) {
      console.error('Failed to get participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get participant',
      };
    }
  }

  /**
   * List participants in conversation
   */
  async listParticipants(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Listing participants for conversation:', conversationSid);

      const participants = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .list();

      const participantList = participants.map((participant: any) => ({
        sid: participant.sid,
        identity: participant.identity,
        attributes: participant.attributes,
        roleSid: participant.roleSid,
        dateCreated: participant.dateCreated,
        dateUpdated: participant.dateUpdated,
        messagingBinding: participant.messagingBinding,
      }));

      return {
        success: true,
        data: participantList,
        message: `Retrieved ${participantList.length} participants`,
      };
    } catch (error) {
      console.error('Failed to list participants:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list participants',
      };
    }
  }

  /**
   * Update participant
   */
  async updateParticipant(
    conversationSid: string,
    participantSid: string,
    updates: Partial<ParticipantData>
  ): Promise<TwilioResponse> {
    try {
      console.log('Updating participant:', conversationSid, 'participant:', participantSid, 'updates:', updates);

      const updateData: any = {};
      if (updates.attributes !== undefined) updateData.attributes = JSON.stringify(updates.attributes);
      if (updates.roleSid !== undefined) updateData.roleSid = updates.roleSid;

      const participant = await this.conversationsService
        .conversations(conversationSid)
        .participants(participantSid)
        .update(updateData);

      return {
        success: true,
        data: {
          sid: participant.sid,
          identity: participant.identity,
          attributes: participant.attributes,
          roleSid: participant.roleSid,
          dateUpdated: participant.dateUpdated,
        },
        message: 'Participant updated successfully',
      };
    } catch (error) {
      console.error('Failed to update participant:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update participant',
      };
    }
  }

  /**
   * Get participant by identity
   */
  async getParticipantByIdentity(
    conversationSid: string, 
    identity: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting participant by identity:', conversationSid, 'identity:', identity);

      const participants = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .list();

      const participant = participants.find((p: any) => p.identity === identity);

      if (!participant) {
        return {
          success: false,
          error: 'Participant not found',
        };
      }

      return {
        success: true,
        data: {
          sid: participant.sid,
          identity: participant.identity,
          attributes: participant.attributes,
          roleSid: participant.roleSid,
          dateCreated: participant.dateCreated,
          dateUpdated: participant.dateUpdated,
          messagingBinding: participant.messagingBinding,
        },
        message: 'Participant found successfully',
      };
    } catch (error) {
      console.error('Failed to get participant by identity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get participant by identity',
      };
    }
  }

  /**
   * Check if participant exists
   */
  async participantExists(
    conversationSid: string, 
    identity: string
  ): Promise<TwilioResponse> {
    try {
      console.log('Checking if participant exists:', conversationSid, 'identity:', identity);

      const participants = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .list();

      const exists = participants.some((p: any) => p.identity === identity);

      return {
        success: true,
        data: { exists },
        message: exists ? 'Participant exists' : 'Participant does not exist',
      };
    } catch (error) {
      console.error('Failed to check participant existence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check participant existence',
      };
    }
  }

  /**
   * Get participant count
   */
  async getParticipantCount(conversationSid: string): Promise<TwilioResponse> {
    try {
      console.log('Getting participant count for conversation:', conversationSid);

      const participants = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .list();

      return {
        success: true,
        data: { count: participants.length },
        message: `Conversation has ${participants.length} participants`,
      };
    } catch (error) {
      console.error('Failed to get participant count:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get participant count',
      };
    }
  }

  /**
   * Get participants by role
   */
  async getParticipantsByRole(
    conversationSid: string, 
    role: ParticipantRole
  ): Promise<TwilioResponse> {
    try {
      console.log('Getting participants by role:', conversationSid, 'role:', role);

      const participants = await this.conversationsService
        .conversations(conversationSid)
        .participants
        .list();

      const filteredParticipants = participants.filter((p: any) => p.roleSid === role);

      const participantList = filteredParticipants.map((participant: any) => ({
        sid: participant.sid,
        identity: participant.identity,
        attributes: participant.attributes,
        roleSid: participant.roleSid,
        dateCreated: participant.dateCreated,
        dateUpdated: participant.dateUpdated,
      }));

      return {
        success: true,
        data: participantList,
        message: `Found ${participantList.length} participants with role ${role}`,
      };
    } catch (error) {
      console.error('Failed to get participants by role:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get participants by role',
      };
    }
  }
}

