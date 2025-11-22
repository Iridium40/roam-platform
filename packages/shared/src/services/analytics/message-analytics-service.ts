import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service for updating message analytics
 * This runs in the background and does not block message sending
 * 
 * Note: Messages are stored in Twilio, so we get the count from message_notifications
 * which tracks each message sent. This is an approximation but avoids expensive Twilio API calls.
 */
export class MessageAnalyticsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Update analytics for a conversation after a message is sent
   * This is non-blocking and failures are logged but not thrown
   */
  async updateConversationAnalytics(
    conversationMetadataId: string,
    bookingId: string
  ): Promise<void> {
    try {
      // Get message count from message_notifications (each notification = 1 message)
      // This avoids expensive Twilio API calls
      const { data: notifications, error: notificationsError } = await this.supabase
        .from('message_notifications')
        .select('created_at, message_sid')
        .eq('conversation_id', conversationMetadataId)
        .order('created_at', { ascending: true });

      if (notificationsError) {
        console.error('📊 Analytics: Failed to fetch notifications:', notificationsError);
        return;
      }

      if (!notifications || notifications.length === 0) {
        console.log('📊 Analytics: No notifications found, skipping analytics update');
        return;
      }

      // Message count is based on unique message_sids
      const uniqueMessageSids = new Set(notifications.map(n => n.message_sid));
      const messageCount = uniqueMessageSids.size;

      // Get unique participants count
      const { data: participants, error: participantsError } = await this.supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationMetadataId);

      if (participantsError) {
        console.error('📊 Analytics: Failed to fetch participants:', participantsError);
      }

      const participantCount = participants?.length || 0;
      
      // Get first and last message timestamps from notifications
      const firstMessageAt = notifications[0].created_at;
      const lastMessageAt = notifications[notifications.length - 1].created_at;

      // Calculate average response time between messages
      // This is a simplified metric: average time between consecutive messages
      let totalTimeBetweenMessages = 0;
      let intervals = 0;

      for (let i = 0; i < notifications.length - 1; i++) {
        const currentMsg = notifications[i];
        const nextMsg = notifications[i + 1];

        const timeDiff =
          new Date(nextMsg.created_at).getTime() -
          new Date(currentMsg.created_at).getTime();
        
        // Only count if messages are within 24 hours (ignore long gaps)
        if (timeDiff < 24 * 60 * 60 * 1000) {
          totalTimeBetweenMessages += timeDiff;
          intervals++;
        }
      }

      const averageResponseTimeMinutes =
        intervals > 0
          ? Math.round((totalTimeBetweenMessages / intervals / 1000 / 60) * 100) / 100
          : null;

      // Calculate total conversation duration
      const durationMs =
        new Date(lastMessageAt).getTime() - new Date(firstMessageAt).getTime();
      const totalConversationDurationMinutes = Math.round(durationMs / 1000 / 60);

      // Upsert analytics record
      const analyticsData = {
        conversation_id: conversationMetadataId,
        booking_id: bookingId,
        message_count: messageCount,
        participant_count: participantCount,
        first_message_at: firstMessageAt,
        last_message_at: lastMessageAt,
        average_response_time_minutes: averageResponseTimeMinutes,
        total_conversation_duration_minutes: totalConversationDurationMinutes,
        updated_at: new Date().toISOString(),
      };

      // Check if analytics record exists
      const { data: existing } = await this.supabase
        .from('message_analytics')
        .select('id')
        .eq('conversation_id', conversationMetadataId)
        .single();

      if (existing) {
        // Update existing record
        const { error: updateError } = await this.supabase
          .from('message_analytics')
          .update(analyticsData)
          .eq('conversation_id', conversationMetadataId);

        if (updateError) {
          console.error('📊 Analytics: Failed to update analytics:', updateError);
        } else {
          console.log('📊 Analytics: Updated successfully', {
            conversationId: conversationMetadataId,
            messageCount,
            avgResponseTime: averageResponseTimeMinutes,
          });
        }
      } else {
        // Insert new record
        const { error: insertError } = await this.supabase
          .from('message_analytics')
          .insert({
            ...analyticsData,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('📊 Analytics: Failed to insert analytics:', insertError);
        } else {
          console.log('📊 Analytics: Created successfully', {
            conversationId: conversationMetadataId,
            messageCount,
            avgResponseTime: averageResponseTimeMinutes,
          });
        }
      }
    } catch (error) {
      // Catch all errors to ensure analytics never breaks messaging
      console.error('📊 Analytics: Unexpected error updating analytics:', error);
    }
  }

  /**
   * Get analytics for a specific conversation
   */
  async getConversationAnalytics(conversationMetadataId: string) {
    try {
      const { data, error } = await this.supabase
        .from('message_analytics')
        .select('*')
        .eq('conversation_id', conversationMetadataId)
        .single();

      if (error) {
        console.error('📊 Analytics: Failed to fetch analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('📊 Analytics: Error fetching analytics:', error);
      return null;
    }
  }

  /**
   * Get analytics for a specific booking
   */
  async getBookingAnalytics(bookingId: string) {
    try {
      const { data, error } = await this.supabase
        .from('message_analytics')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (error) {
        console.error('📊 Analytics: Failed to fetch booking analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('📊 Analytics: Error fetching booking analytics:', error);
      return null;
    }
  }
}

