/**
 * Test usage of Twilio Conversations Service
 * This demonstrates how to use the service in a ROAM app
 */

// Import the service from the shared package
import { 
  createTwilioConversationsWithDBFromEnv,
  type ConversationServiceWithDB,
  type CreateConversationData 
} from '@roam/shared';

// Example usage function
async function testTwilioConversations() {
  console.log('Testing Twilio Conversations Service...');

  // Create service instance from environment variables
  const conversationService: ConversationServiceWithDB | null = 
    createTwilioConversationsWithDBFromEnv();

  if (!conversationService) {
    console.error('Failed to create conversation service - check environment variables');
    return;
  }

  console.log('✅ Conversation service created successfully');

  // Example: Create a conversation for a booking
  const conversationData: CreateConversationData = {
    bookingId: 'booking_123',
    friendlyName: 'Hair Styling Appointment',
    uniqueName: 'booking-123-conv',
    attributes: {
      serviceType: 'beauty',
      businessId: 'business_456',
      customerName: 'John Doe'
    }
  };

  try {
    const result = await conversationService.createConversationWithDB(conversationData);
    
    if (result.error) {
      console.error('❌ Failed to create conversation:', result.error);
    } else {
      console.log('✅ Conversation created with ID:', result.conversationId);
      
      // Example: Add participants
      const participantResult = await conversationService.addParticipant(
        result.conversationId,
        {
          identity: 'customer_123',
          attributes: { 
            userType: 'customer',
            displayName: 'John Doe',
            phone: '+1234567890'
          }
        }
      );

      if (participantResult.success) {
        console.log('✅ Participant added with SID:', participantResult.participantSid);
      } else {
        console.error('❌ Failed to add participant:', participantResult.error);
      }

      // Example: Send a message
      const messageResult = await conversationService.sendMessage(
        result.conversationId,
        {
          body: 'Hello! I have a question about my appointment tomorrow.',
          attributes: {
            messageType: 'customer_inquiry',
            priority: 'normal'
          }
        }
      );

      if (messageResult.success) {
        console.log('✅ Message sent with SID:', messageResult.messageSid);
      } else {
        console.error('❌ Failed to send message:', messageResult.error);
      }

      // Example: Retrieve messages
      const messagesResult = await conversationService.getMessages(
        result.conversationId,
        10
      );

      if (messagesResult.error) {
        console.error('❌ Failed to retrieve messages:', messagesResult.error);
      } else {
        console.log('✅ Retrieved messages:', messagesResult.messages.length);
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Example usage in a React component
export function useConversationForBooking(bookingId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createConversation = async () => {
    setLoading(true);
    setError(null);

    const service = createTwilioConversationsWithDBFromEnv();
    if (!service) {
      setError('Conversation service not available');
      setLoading(false);
      return;
    }

    try {
      const result = await service.createConversationWithDB({
        bookingId,
        friendlyName: `Booking ${bookingId}`,
        uniqueName: `booking-${bookingId}`
      });

      if (result.error) {
        setError(result.error);
      } else {
        setConversationId(result.conversationId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return {
    conversationId,
    loading,
    error,
    createConversation
  };
}

// Export the test function for manual testing
export { testTwilioConversations };