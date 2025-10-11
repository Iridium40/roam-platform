/**
 * Manual Testing Script for Twilio Conversations
 * Run this in the browser console to test conversation functionality
 */

// ============================================================================
// BROWSER CONSOLE TESTING SCRIPT
// ============================================================================

window.twilioConversationsTestSuite = {
  
  // Test service availability
  async testServiceAvailability() {
    console.log('🧪 Testing Twilio Conversations Service Availability...');
    
    try {
      // This would be imported in real app
      const service = window.createTwilioConversationsWithDBFromEnv?.();
      
      if (service) {
        console.log('✅ Service created successfully');
        return true;
      } else {
        console.log('❌ Service creation failed - check environment variables');
        return false;
      }
    } catch (error) {
      console.log('❌ Service creation error:', error);
      return false;
    }
  },

  // Test environment variables
  testEnvironmentVariables() {
    console.log('🧪 Testing Environment Variables...');
    
    const requiredVars = [
      'VITE_TWILIO_ACCOUNT_SID',
      'VITE_TWILIO_AUTH_TOKEN', 
      'VITE_TWILIO_CONVERSATIONS_SERVICE_SID',
      'VITE_PUBLIC_SUPABASE_URL',
      'VITE_PUBLIC_SUPABASE_ANON_KEY'
    ];

    const missingVars = [];
    
    requiredVars.forEach(varName => {
      const value = import.meta.env[varName];
      if (!value) {
        missingVars.push(varName);
      } else {
        console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
      }
    });

    if (missingVars.length > 0) {
      console.log('❌ Missing environment variables:', missingVars);
      return false;
    }

    console.log('✅ All environment variables present');
    return true;
  },

  // Test conversation creation
  async testConversationCreation(bookingId = 'test-booking-123') {
    console.log('🧪 Testing Conversation Creation...');
    
    const service = window.createTwilioConversationsWithDBFromEnv?.();
    if (!service) {
      console.log('❌ Service not available');
      return false;
    }

    try {
      const result = await service.createConversationWithDB({
        bookingId: bookingId,
        friendlyName: `Test Booking ${bookingId}`,
        uniqueName: `test-${bookingId}-${Date.now()}`,
        attributes: {
          testConversation: true,
          createdAt: new Date().toISOString()
        }
      });

      if (result.error) {
        console.log('❌ Conversation creation failed:', result.error);
        return false;
      } else {
        console.log('✅ Conversation created:', result.conversationId);
        return result.conversationId;
      }
    } catch (error) {
      console.log('❌ Conversation creation error:', error);
      return false;
    }
  },

  // Test message sending
  async testMessageSending(conversationId, messageText = 'Test message from browser console') {
    console.log('🧪 Testing Message Sending...');
    
    const service = window.createTwilioConversationsWithDBFromEnv?.();
    if (!service) {
      console.log('❌ Service not available');
      return false;
    }

    try {
      const result = await service.sendMessage(conversationId, {
        body: messageText,
        attributes: {
          testMessage: true,
          sentAt: new Date().toISOString()
        }
      });

      if (result.success) {
        console.log('✅ Message sent successfully:', result.messageSid);
        return true;
      } else {
        console.log('❌ Message sending failed:', result.error);
        return false;
      }
    } catch (error) {
      console.log('❌ Message sending error:', error);
      return false;
    }
  },

  // Test message retrieval  
  async testMessageRetrieval(conversationId) {
    console.log('🧪 Testing Message Retrieval...');
    
    const service = window.createTwilioConversationsWithDBFromEnv?.();
    if (!service) {
      console.log('❌ Service not available');
      return false;
    }

    try {
      const result = await service.getMessages(conversationId, 10);

      if (result.error) {
        console.log('❌ Message retrieval failed:', result.error);
        return false;
      } else {
        console.log('✅ Messages retrieved:', result.messages.length);
        result.messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.author}]: ${msg.body}`);
        });
        return result.messages;
      }
    } catch (error) {
      console.log('❌ Message retrieval error:', error);
      return false;
    }
  },

  // Test user conversations
  async testUserConversations(userId = 'test-user-123', userType = 'customer') {
    console.log('🧪 Testing User Conversations Retrieval...');
    
    const service = window.createTwilioConversationsWithDBFromEnv?.();
    if (!service) {
      console.log('❌ Service not available');
      return false;
    }

    try {
      const result = await service.getConversationsForUser(userId, userType);

      if (result.error) {
        console.log('❌ User conversations retrieval failed:', result.error);
        return false;
      } else {
        console.log('✅ User conversations retrieved:', result.conversations.length);
        result.conversations.forEach((conv, index) => {
          console.log(`   ${index + 1}. Booking: ${conv.booking_id}, Participants: ${conv.participant_count}`);
        });
        return result.conversations;
      }
    } catch (error) {
      console.log('❌ User conversations retrieval error:', error);
      return false;
    }
  },

  // Run full test suite
  async runFullTestSuite() {
    console.log('🚀 Running Full Twilio Conversations Test Suite...');
    console.log('============================================');

    const results = {
      environmentVariables: false,
      serviceAvailability: false,
      conversationCreation: false,
      messageSending: false,
      messageRetrieval: false,
      userConversations: false
    };

    // Test 1: Environment Variables
    results.environmentVariables = this.testEnvironmentVariables();
    
    // Test 2: Service Availability
    results.serviceAvailability = await this.testServiceAvailability();
    
    if (!results.serviceAvailability) {
      console.log('❌ Cannot continue tests - service unavailable');
      return results;
    }

    // Test 3: Conversation Creation
    const conversationId = await this.testConversationCreation();
    results.conversationCreation = !!conversationId;

    if (conversationId) {
      // Test 4: Message Sending
      results.messageSending = await this.testMessageSending(conversationId);

      // Test 5: Message Retrieval
      results.messageRetrieval = await this.testMessageRetrieval(conversationId);
    }

    // Test 6: User Conversations
    results.userConversations = await this.testUserConversations();

    // Summary
    console.log('============================================');
    console.log('📊 Test Results Summary:');
    Object.entries(results).forEach(([test, passed]) => {
      console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
      console.log('🎉 All tests passed! Twilio Conversations is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Check configuration and implementation.');
    }

    return results;
  },

  // Performance testing
  async testPerformance() {
    console.log('🧪 Testing Performance...');
    
    const service = window.createTwilioConversationsWithDBFromEnv?.();
    if (!service) {
      console.log('❌ Service not available');
      return false;
    }

    // Test conversation creation time
    const startTime = performance.now();
    const conversationId = await this.testConversationCreation();
    const creationTime = performance.now() - startTime;

    console.log(`⏱️  Conversation creation time: ${creationTime.toFixed(2)}ms`);

    if (conversationId) {
      // Test message sending time
      const messageStartTime = performance.now();
      await this.testMessageSending(conversationId, 'Performance test message');
      const messageSendTime = performance.now() - messageStartTime;

      console.log(`⏱️  Message sending time: ${messageSendTime.toFixed(2)}ms`);

      // Test message retrieval time
      const retrievalStartTime = performance.now();
      await this.testMessageRetrieval(conversationId);
      const retrievalTime = performance.now() - retrievalStartTime;

      console.log(`⏱️  Message retrieval time: ${retrievalTime.toFixed(2)}ms`);

      // Performance benchmarks
      const benchmarks = {
        conversationCreation: creationTime < 3000, // 3 seconds
        messageSending: messageSendTime < 1000,    // 1 second
        messageRetrieval: retrievalTime < 2000     // 2 seconds
      };

      console.log('📊 Performance Benchmarks:');
      Object.entries(benchmarks).forEach(([test, passed]) => {
        console.log(`   ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
      });

      return benchmarks;
    }

    return false;
  }
};

// ============================================================================
// QUICK START COMMANDS
// ============================================================================

console.log(`
🔧 Twilio Conversations Testing Commands:

// Basic test suite
await twilioConversationsTestSuite.runFullTestSuite()

// Individual tests
await twilioConversationsTestSuite.testServiceAvailability()
await twilioConversationsTestSuite.testConversationCreation()
await twilioConversationsTestSuite.testPerformance()

// Environment check
twilioConversationsTestSuite.testEnvironmentVariables()

// Create test conversation
const convId = await twilioConversationsTestSuite.testConversationCreation('my-booking-123')

// Send test message
await twilioConversationsTestSuite.testMessageSending(convId, 'Hello from console!')

// Get messages
await twilioConversationsTestSuite.testMessageRetrieval(convId)
`);

// Auto-run basic tests if in development mode
if (window.location.hostname === 'localhost') {
  console.log('🔧 Development mode detected - running basic tests...');
  
  setTimeout(() => {
    twilioConversationsTestSuite.testEnvironmentVariables();
    twilioConversationsTestSuite.testServiceAvailability();
  }, 1000);
}

export default window.twilioConversationsTestSuite;