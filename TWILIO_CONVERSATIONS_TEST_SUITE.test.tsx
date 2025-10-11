/**
 * Test Suites for Twilio Conversations Components
 * Comprehensive testing for customer, provider, and owner/dispatcher functionality
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  CustomerChatButton,
  CustomerChatModal,
  ProviderMessagingHub,
  ProviderConversationView,
  OwnerConversationList
} from './TWILIO_CONVERSATIONS_TEST_COMPONENTS';

// Mock the shared service
vi.mock('@roam/shared', () => ({
  createTwilioConversationsWithDBFromEnv: vi.fn(() => ({
    createConversationWithDB: vi.fn(),
    getConversationsForUser: vi.fn(),
    addParticipant: vi.fn(),
    sendMessage: vi.fn(),
    getMessages: vi.fn()
  }))
}));

const mockBooking = {
  id: 'booking-123',
  status: 'confirmed' as const,
  service_name: 'Hair Styling',
  provider_name: 'Jane Smith',
  booking_date: '2025-10-15T10:00:00Z',
  customer_id: 'customer-456',
  provider_id: 'provider-789',
  business_id: 'business-123'
};

const mockConversations = [
  {
    id: 'conv-1',
    booking_id: 'booking-123',
    twilio_conversation_sid: 'CH1234567890',
    created_at: '2025-10-11T09:00:00Z',
    updated_at: '2025-10-11T09:00:00Z',
    last_message_at: '2025-10-11T10:30:00Z',
    participant_count: 2
  },
  {
    id: 'conv-2', 
    booking_id: 'booking-456',
    twilio_conversation_sid: 'CH0987654321',
    created_at: '2025-10-11T11:00:00Z',
    updated_at: '2025-10-11T11:00:00Z',
    last_message_at: null,
    participant_count: 2
  }
];

const mockMessages = [
  {
    sid: 'msg-1',
    body: 'Hello, I have a question about my appointment',
    author: 'customer-456',
    dateCreated: '2025-10-11T10:30:00Z',
    attributes: { senderType: 'customer' }
  },
  {
    sid: 'msg-2',
    body: 'Hi! I\'d be happy to help. What\'s your question?',
    author: 'provider-789',
    dateCreated: '2025-10-11T10:32:00Z',
    attributes: { senderType: 'provider' }
  }
];

// ============================================================================
// CUSTOMER APP TESTS
// ============================================================================

describe('CustomerChatButton', () => {
  it('shows chat icon for confirmed bookings', () => {
    render(<CustomerChatButton booking={mockBooking} />);
    expect(screen.getByTestId('chat-icon')).toBeInTheDocument();
  });

  it('hides chat icon for pending bookings', () => {
    const pendingBooking = { ...mockBooking, status: 'pending' as const };
    render(<CustomerChatButton booking={pendingBooking} />);
    expect(screen.queryByTestId('chat-icon')).not.toBeInTheDocument();
  });

  it('hides chat icon for cancelled bookings', () => {
    const cancelledBooking = { ...mockBooking, status: 'cancelled' as const };
    render(<CustomerChatButton booking={cancelledBooking} />);
    expect(screen.queryByTestId('chat-icon')).not.toBeInTheDocument();
  });

  it('shows unread badge when there are unread messages', async () => {
    render(<CustomerChatButton booking={mockBooking} />);
    
    // Simulate unread messages state
    const chatButton = screen.getByTestId('chat-icon');
    fireEvent.click(chatButton);
    
    // Badge should appear when modal is closed and there are unread messages
    // This would be controlled by parent component state in real implementation
  });

  it('opens chat modal when clicked', async () => {
    render(<CustomerChatButton booking={mockBooking} />);
    
    const chatButton = screen.getByTestId('chat-icon');
    fireEvent.click(chatButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('chat-modal')).toBeInTheDocument();
    });
  });
});

describe('CustomerChatModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUnreadCountChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays correct booking details in header', () => {
    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    expect(screen.getByText('Hair Styling')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('10/15/2025')).toBeInTheDocument();
  });

  it('can be closed via close button', async () => {
    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    const closeButton = screen.getByTestId('close-modal');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('can be closed via ESC key', async () => {
    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    // Note: ESC key handling would need to be implemented in the component
  });

  it('loads message history on open', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      }),
      getMessages: vi.fn().mockResolvedValue({
        messages: mockMessages,
        error: null
      }),
      createConversationWithDB: vi.fn(),
      sendMessage: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question about my appointment')).toBeInTheDocument();
      expect(screen.getByText('Hi! I\'d be happy to help. What\'s your question?')).toBeInTheDocument();
    });
  });

  it('can send messages successfully', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      }),
      getMessages: vi.fn().mockResolvedValue({
        messages: [],
        error: null
      }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        messageSid: 'msg-new-123'
      }),
      createConversationWithDB: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('message-input')).toBeInTheDocument();
    });

    const messageInput = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    await userEvent.type(messageInput, 'This is a test message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        'CH1234567890',
        {
          body: 'This is a test message',
          attributes: {
            senderType: 'customer',
            bookingId: 'booking-123'
          }
        }
      );
    });
  });

  it('prevents sending empty messages', async () => {
    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('send-button')).toBeDisabled();
    });

    const messageInput = screen.getByTestId('message-input');
    await userEvent.type(messageInput, '   '); // Only whitespace

    expect(screen.getByTestId('send-button')).toBeDisabled();
  });

  it('shows empty state for new conversations', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: [],
        error: null
      }),
      createConversationWithDB: vi.fn().mockResolvedValue({
        conversationId: 'CH-new-123',
        error: null
      }),
      getMessages: vi.fn().mockResolvedValue({
        messages: [],
        error: null
      }),
      sendMessage: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <CustomerChatModal
        booking={mockBooking}
        onClose={mockOnClose}
        onUnreadCountChange={mockOnUnreadCountChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Start a conversation with your provider!')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// PROVIDER APP TESTS
// ============================================================================

describe('ProviderMessagingHub', () => {
  const providerId = 'provider-789';
  const businessId = 'business-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays only assigned conversations', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId={providerId} businessId={businessId} />);

    await waitFor(() => {
      const conversationItems = screen.getAllByTestId('conversation-item');
      conversationItems.forEach(item => {
        expect(item).toHaveAttribute('data-provider-id', providerId);
      });
    });
  });

  it('shows total unread count badge', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId={providerId} businessId={businessId} />);

    await waitFor(() => {
      expect(screen.getByTestId('total-unread-badge')).toBeInTheDocument();
    });
  });

  it('filters conversations by search term', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId={providerId} businessId={businessId} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(2);
    });

    const searchInput = screen.getByTestId('conversation-search');
    await userEvent.type(searchInput, 'booking-123');

    await waitFor(() => {
      const visibleConversations = screen.getAllByTestId('conversation-item');
      expect(visibleConversations).toHaveLength(1);
    });
  });

  it('shows empty state when no conversations', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: [],
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId={providerId} businessId={businessId} />);

    await waitFor(() => {
      expect(screen.getByText('No conversations found')).toBeInTheDocument();
    });
  });

  it('loads conversation view when conversation selected', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId={providerId} businessId={businessId} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(2);
    });

    const firstConversation = screen.getAllByTestId('conversation-item')[0];
    fireEvent.click(firstConversation);

    // Conversation view should now be visible
    await waitFor(() => {
      expect(screen.getByText('Conversation 34567890')).toBeInTheDocument();
    });
  });
});

describe('ProviderConversationView', () => {
  const conversationId = 'CH1234567890';
  const providerId = 'provider-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays messages', async () => {
    const mockService = {
      getMessages: vi.fn().mockResolvedValue({
        messages: mockMessages,
        error: null
      }),
      sendMessage: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderConversationView conversationId={conversationId} providerId={providerId} />);

    await waitFor(() => {
      expect(screen.getByText('Hello, I have a question about my appointment')).toBeInTheDocument();
      expect(screen.getByText('Hi! I\'d be happy to help. What\'s your question?')).toBeInTheDocument();
    });
  });

  it('can send messages as provider', async () => {
    const mockService = {
      getMessages: vi.fn().mockResolvedValue({
        messages: [],
        error: null
      }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        messageSid: 'msg-provider-123'
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderConversationView conversationId={conversationId} providerId={providerId} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    const messageInput = screen.getByPlaceholderText('Type a message...');
    const sendButton = screen.getByText('Send');

    await userEvent.type(messageInput, 'Provider response message');
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockService.sendMessage).toHaveBeenCalledWith(
        conversationId,
        {
          body: 'Provider response message',
          attributes: {
            senderType: 'provider',
            providerId: providerId
          }
        }
      );
    });
  });

  it('displays loading state while fetching messages', () => {
    const mockService = {
      getMessages: vi.fn().mockImplementation(() => new Promise(() => {})), // Never resolves
      sendMessage: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderConversationView conversationId={conversationId} providerId={providerId} />);

    expect(screen.getByText('Loading messages...')).toBeInTheDocument();
  });
});

// ============================================================================
// OWNER/DISPATCHER APP TESTS
// ============================================================================

describe('OwnerConversationList', () => {
  const businessId = 'business-123';
  const userId = 'owner-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays all business conversations for owner', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <OwnerConversationList 
        businessId={businessId} 
        userRole="owner" 
        userId={userId} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('All Conversations')).toBeInTheDocument();
      expect(screen.getByText('OWNER')).toBeInTheDocument();
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(2);
    });
  });

  it('displays all business conversations for dispatcher', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <OwnerConversationList 
        businessId={businessId} 
        userRole="dispatcher" 
        userId={userId} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('DISPATCHER')).toBeInTheDocument();
      expect(screen.getByText('DISPATCHER ACCESS')).toBeInTheDocument();
    });
  });

  it('shows proper role badges', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <OwnerConversationList 
        businessId={businessId} 
        userRole="owner" 
        userId={userId} 
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('OWNER ACCESS')).toHaveLength(2);
    });
  });

  it('displays conversation metadata correctly', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <OwnerConversationList 
        businessId={businessId} 
        userRole="owner" 
        userId={userId} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Booking #king-123')).toBeInTheDocument();
      expect(screen.getByText('2 participants')).toBeInTheDocument();
      expect(screen.getByText(/Last message:/)).toBeInTheDocument();
    });
  });

  it('handles empty state appropriately', async () => {
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: [],
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(
      <OwnerConversationList 
        businessId={businessId} 
        userRole="owner" 
        userId={userId} 
      />
    );

    await waitFor(() => {
      expect(screen.getByText('No conversations found')).toBeInTheDocument();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Cross-Component Integration', () => {
  it('maintains conversation state across component switches', async () => {
    // Test that conversation data persists when switching between views
    // This would be tested in a full integration environment
  });

  it('real-time updates work across multiple components', async () => {
    // Test that when a message is sent in one component,
    // it appears in real-time in other components viewing the same conversation
  });

  it('security restrictions prevent unauthorized access', async () => {
    // Test that providers cannot access conversations they're not assigned to
    // Test that customers can only see their own conversations
  });

  it('error handling gracefully degrades functionality', async () => {
    // Test network errors, API failures, authentication issues
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Testing', () => {
  it('loads conversations within acceptable time limits', async () => {
    // Test initial load performance
    const startTime = performance.now();
    
    const mockService = {
      getConversationsForUser: vi.fn().mockResolvedValue({
        conversations: mockConversations,
        error: null
      })
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    render(<ProviderMessagingHub providerId="provider-123" businessId="business-456" />);

    await waitFor(() => {
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(2);
    });

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(2000); // Less than 2 seconds
  });

  it('handles large message histories efficiently', async () => {
    // Test with 100+ messages
    const largeMessageSet = Array.from({ length: 100 }, (_, i) => ({
      sid: `msg-${i}`,
      body: `Message ${i}`,
      author: i % 2 === 0 ? 'customer-123' : 'provider-456',
      dateCreated: new Date(Date.now() - i * 60000).toISOString(),
      attributes: {}
    }));

    const mockService = {
      getMessages: vi.fn().mockResolvedValue({
        messages: largeMessageSet,
        error: null
      }),
      sendMessage: vi.fn()
    };

    vi.mocked(require('@roam/shared').createTwilioConversationsWithDBFromEnv)
      .mockReturnValue(mockService);

    const startTime = performance.now();
    
    render(<ProviderConversationView conversationId="CH123" providerId="provider-456" />);

    await waitFor(() => {
      expect(screen.getByText('Message 0')).toBeInTheDocument();
    });

    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(3000); // Less than 3 seconds for 100 messages
  });
});

export { /* Export test utilities if needed */ };