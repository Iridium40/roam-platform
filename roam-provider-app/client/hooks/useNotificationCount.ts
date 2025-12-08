import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api/endpoints';

interface NotificationCount {
  unreadMessages: number;
  unacceptedBookings: number;
  total: number;
}

/**
 * Hook to calculate notification counts for the provider dashboard
 * - Unread messages: Messages in conversations related to bookings
 * - Unaccepted bookings: Bookings with pending or unconfirmed status
 */
export function useNotificationCount(businessId: string | null | undefined) {
  const { provider } = useAuth();
  const [count, setCount] = useState<NotificationCount>({
    unreadMessages: 0,
    unacceptedBookings: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const providerUserId = provider?.provider?.user_id || provider?.provider?.id;
    if (!businessId || !providerUserId) {
      setCount({ unreadMessages: 0, unacceptedBookings: 0, total: 0 });
      setLoading(false);
      return;
    }

    const fetchNotificationCount = async () => {
      try {
        setLoading(true);

        // Fetch bookings once for both unaccepted bookings and unread messages
        let unacceptedBookings = 0;
        let unreadMessages = 0;
        
        try {
          const bookingsResponse = await api.bookings.getBookings({
            business_id: businessId,
            limit: 100, // Get recent bookings
          });

          if (bookingsResponse.data && typeof bookingsResponse.data === 'object' && 'bookings' in bookingsResponse.data) {
            const bookings = (bookingsResponse.data as { bookings: any[] }).bookings || [];
            
            // Count bookings that are pending or unconfirmed (not accepted)
            unacceptedBookings = bookings.filter(
              (booking: any) => 
                booking.booking_status === 'pending' || 
                booking.booking_status === 'unconfirmed'
            ).length;

            // Get booking IDs for unread message check
            const bookingIds = bookings.map((b: any) => b.id);

            if (bookingIds.length > 0) {
              // Get conversations for these bookings
              const { data: conversations, error: convError } = await supabase
                .from('conversation_metadata')
                .select('id, booking_id')
                .in('booking_id', bookingIds)
                .eq('is_active', true);

              if (convError) {
                console.error('Error fetching conversations:', convError);
              } else if (conversations && conversations.length > 0) {
                // Get conversation IDs
                const conversationIds = conversations.map(c => c.id);
                
                // Get unread message notifications for this provider
                const { data: notifications, error: notifError } = await supabase
                  .from('message_notifications')
                  .select('conversation_id')
                  .in('conversation_id', conversationIds)
                  .eq('user_id', providerUserId)
                  .eq('is_read', false);

                if (notifError) {
                  console.error('Error fetching unread notifications:', notifError);
                } else if (notifications) {
                  unreadMessages = notifications.length;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching notification count data:', error);
        }

        const total = unreadMessages + unacceptedBookings;
        setCount({
          unreadMessages,
          unacceptedBookings,
          total,
        });
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setCount({ unreadMessages: 0, unacceptedBookings: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchNotificationCount();

    // Poll for updates every 30 seconds
    const interval = setInterval(fetchNotificationCount, 30000);

    return () => clearInterval(interval);
  }, [businessId, provider?.provider?.user_id, provider?.provider?.id]);

  return { count, loading };
}
