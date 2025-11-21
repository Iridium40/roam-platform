import { useState, useEffect } from 'react';
import { useProviderAuth } from '@/contexts/auth/ProviderAuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Hook to fetch unread message counts for multiple bookings
 * @param bookingIds Array of booking IDs to check for unread messages
 * @returns Map of bookingId -> unreadCount
 */
export function useBookingUnreadCounts(bookingIds: string[]) {
  const { provider } = useProviderAuth();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingIds.length || !provider?.user_id) {
      setUnreadCounts({});
      return;
    }

    const fetchUnreadCounts = async () => {
      setLoading(true);
      try {
        // Get conversation metadata for these bookings
        const { data: conversations, error: convError } = await supabase
          .from('conversation_metadata')
          .select('id, booking_id')
          .in('booking_id', bookingIds)
          .eq('is_active', true);

        if (convError) {
          console.error('Error fetching conversations:', convError);
          setUnreadCounts({});
          return;
        }

        if (!conversations || conversations.length === 0) {
          setUnreadCounts({});
          return;
        }

        const conversationIds = conversations.map((c) => c.id);
        const bookingIdMap = new Map(
          conversations.map((c) => [c.id, c.booking_id])
        );

        // Get unread message counts for these conversations
        const { data: notifications, error: notifError } = await supabase
          .from('message_notifications')
          .select('conversation_id, is_read')
          .in('conversation_id', conversationIds)
          .eq('user_id', provider.user_id)
          .eq('is_read', false);

        if (notifError) {
          console.error('Error fetching unread counts:', notifError);
          setUnreadCounts({});
          return;
        }

        // Count unread messages per booking
        const counts: Record<string, number> = {};
        bookingIds.forEach((bookingId) => {
          counts[bookingId] = 0;
        });

        if (notifications) {
          notifications.forEach((notif) => {
            const bookingId = bookingIdMap.get(notif.conversation_id);
            if (bookingId) {
              counts[bookingId] = (counts[bookingId] || 0) + 1;
            }
          });
        }

        setUnreadCounts(counts);
      } catch (error) {
        console.error('Error fetching unread counts:', error);
        setUnreadCounts({});
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchUnreadCounts, 30000);

    return () => clearInterval(interval);
  }, [bookingIds.join(','), provider?.user_id]);

  return { unreadCounts, loading };
}

