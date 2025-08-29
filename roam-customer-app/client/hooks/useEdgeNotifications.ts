import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

interface Notification {
  id: string;
  type: string;
  userId: string;
  userType: string;
  bookingId?: string;
  message: string;
  timestamp: string;
  read: boolean;
  data?: any;
}

interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  inApp: boolean;
}

export function useEdgeNotifications() {
  const { customer } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    push: true,
    sms: true,
    inApp: true
  });
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentUser = customer;

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (!currentUser?.id) return;

    // In development, skip SSE connection and use mock data
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Development mode: Using mock notifications instead of SSE');
      setIsConnected(true);
      
      // Add some mock notifications for development
      const mockNotifications = [
        {
          id: 'mock-1',
          type: 'booking_status_update',
          userId: currentUser.id,
          userType: 'customer',
          message: 'Your booking with Beauty Salon has been confirmed',
          timestamp: new Date().toISOString(),
          read: false,
          data: {
            serviceName: 'Hair Styling',
            newStatus: 'confirmed',
            bookingId: 'mock-booking-1'
          }
        },
        {
          id: 'mock-2',
          type: 'new_message',
          userId: currentUser.id,
          userType: 'customer',
          message: 'New message from your service provider',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          read: false,
          bookingId: 'mock-booking-1'
        }
      ];
      
      setNotifications(mockNotifications);
      return;
    }

    try {
      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create new SSE connection
      const eventSource = new EventSource(
        `/api/notifications/edge?userId=${currentUser.id}&userType=customer`
      );

      eventSource.onopen = () => {
        setIsConnected(true);
        logger.debug('Connected to notification stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle different notification types
          switch (data.type) {
            case 'connected':
              logger.debug('SSE connection established');
              break;
              
            case 'heartbeat':
              // Heartbeat message to keep connection alive, no action needed
              logger.debug('SSE heartbeat received');
              break;
              
            case 'booking_status_update':
              handleBookingStatusUpdate(data);
              break;
              
            case 'new_message':
              handleNewMessage(data);
              break;
              
            case 'booking_reminder':
              handleBookingReminder(data);
              break;
              
            case 'error':
              logger.error('SSE error message:', data.message);
              break;
              
            default:
              // Treat as generic notification if it has a message
              if (data.message) {
                handleGenericNotification(data);
                // Add to notifications list
                setNotifications(prev => [data, ...prev.slice(0, 49)]); // Keep last 50
              }
          }
        } catch (error) {
          logger.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = (error) => {
        logger.error('SSE connection error:', error);
        setIsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (currentUser?.id) {
            connect();
          }
        }, 5000);
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      logger.error('Error connecting to notification stream:', error);
      setIsConnected(false);
    }
  }, [currentUser?.id]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setIsConnected(false);
  }, []);

  // Handle booking status updates
  const handleBookingStatusUpdate = (notification: Notification) => {
    const { data } = notification;
    
    toast({
      title: 'Booking Status Updated',
      description: `${data.serviceName} - ${data.newStatus}`,
      action: data.bookingId ? {
        label: 'View Booking',
        onClick: () => {
          // Navigate to booking details
          window.location.href = `/my-bookings?booking=${data.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle new messages
  const handleNewMessage = (notification: Notification) => {
    toast({
      title: 'New Message',
      description: notification.message,
      action: notification.bookingId ? {
        label: 'Open Chat',
        onClick: () => {
          // Open messaging modal
          window.location.href = `/my-bookings?chat=${notification.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle booking reminders
  const handleBookingReminder = (notification: Notification) => {
    toast({
      title: 'Booking Reminder',
      description: notification.message,
      action: notification.bookingId ? {
        label: 'View Details',
        onClick: () => {
          window.location.href = `/my-bookings?booking=${notification.bookingId}`;
        }
      } : undefined
    });
  };

  // Handle generic notifications
  const handleGenericNotification = (notification: Notification) => {
    toast({
      title: 'Notification',
      description: notification.message
    });
  };

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // In development, just update local state
      if (process.env.NODE_ENV === 'development') {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        return;
      }

      const response = await fetch('/api/notifications/edge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId, read: true })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      logger.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/edge', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.id, 
          markAllRead: true 
        })
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
    }
  }, [currentUser?.id]);

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          preferences: { ...preferences, ...newPreferences }
        })
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, ...newPreferences }));
      }
    } catch (error) {
      logger.error('Error updating notification preferences:', error);
    }
  }, [currentUser?.id, preferences]);

  // Get unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Connect on mount and user change
  useEffect(() => {
    if (currentUser?.id) {
      connect();
    }

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUser?.id && !isConnected) {
        // Reconnect when page becomes visible
        connect();
      } else if (document.visibilityState === 'hidden') {
        // Optionally disconnect when page is hidden to save resources
        // disconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnect();
    };
  }, [currentUser?.id, connect, disconnect, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    notifications,
    isConnected,
    preferences,
    unreadCount,
    markAsRead,
    markAllAsRead,
    updatePreferences,
    connect,
    disconnect
  };
}
