import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, User, Calendar } from 'lucide-react';
import EnhancedConversationChat from './EnhancedConversationChat';

// Mock booking data to test Twilio messaging
const mockBooking = {
  id: 'test-booking-123',
  customer_id: 'test-customer-456',
  business_id: 'test-business-789',
  service_name: 'Test Massage Therapy',
  booking_status: 'confirmed',
  booking_date: '2025-10-15',
  start_time: '14:00:00',
  customer_profiles: {
    id: 'test-customer-456',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com'
  },
  providers: {
    id: 'test-provider-101',
    user_id: 'test-provider-user-102',
    first_name: 'Sarah',
    last_name: 'Smith',
    email: 'sarah.smith@roam.com'
  }
};

const mockCurrentUser = {
  id: 'test-customer-456',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john.doe@example.com'
};

export default function TwilioMessagingTest() {
  const [showMessageModal, setShowMessageModal] = useState(false);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Twilio Messaging Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Mock Booking Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Provider: {mockBooking.providers.first_name} {mockBooking.providers.last_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Service: {mockBooking.service_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Date: {mockBooking.booking_date} at {mockBooking.start_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                  Status: {mockBooking.booking_status}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Button 
              onClick={() => setShowMessageModal(true)}
              className="flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Test Twilio Messaging
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">What This Tests:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Creates or retrieves a Twilio conversation for this booking</li>
              <li>• Adds customer and provider as participants</li>
              <li>• Allows real-time messaging between customer and provider</li>
              <li>• Shows message history and conversation status</li>
              <li>• Handles errors gracefully with user feedback</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Conversation Chat Modal */}
      <EnhancedConversationChat
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        booking={mockBooking}
        currentUser={mockCurrentUser}
      />
    </div>
  );
}