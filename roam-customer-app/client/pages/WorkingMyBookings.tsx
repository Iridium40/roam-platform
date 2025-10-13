import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  MessageCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import EnhancedConversationChat from "@/components/EnhancedConversationChat";

export default function WorkingMyBookings() {
  const { customer } = useAuth();
  const currentUser = customer;
  
  // State for messaging
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedBookingForMessage, setSelectedBookingForMessage] = useState<any>(null);

  // Mock booking data for testing the messaging functionality
  const mockBookings = [
    {
      id: 'booking-1',
      customer_id: currentUser?.id || 'mock-customer-id',
      business_id: 'mock-business-id',
      service_name: 'Deep Tissue Massage',
      booking_status: 'confirmed',
      booking_date: '2025-10-15',
      start_time: '14:00:00',
      customer_profiles: {
        id: currentUser?.id || 'mock-customer-id',
        first_name: currentUser?.first_name || 'John',
        last_name: currentUser?.last_name || 'Doe',
        email: currentUser?.email || 'john.doe@example.com'
      },
      providers: {
        id: 'provider-1',
        user_id: 'provider-user-1',
        first_name: 'Sarah',
        last_name: 'Smith',
        email: 'sarah.smith@roam.com'
      }
    },
    {
      id: 'booking-2',
      customer_id: currentUser?.id || 'mock-customer-id',
      business_id: 'mock-business-id-2',
      service_name: 'Therapeutic Stretching',
      booking_status: 'confirmed',
      booking_date: '2025-10-20',
      start_time: '10:00:00',
      customer_profiles: {
        id: currentUser?.id || 'mock-customer-id',
        first_name: currentUser?.first_name || 'John',
        last_name: currentUser?.last_name || 'Doe',
        email: currentUser?.email || 'john.doe@example.com'
      },
      providers: {
        id: 'provider-2',
        user_id: 'provider-user-2',
        first_name: 'Mike',
        last_name: 'Johnson',
        email: 'mike.johnson@roam.com'
      }
    }
  ];

  const handleMessage = (booking: any) => {
    setSelectedBookingForMessage(booking);
    setShowMessageModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">My Bookings</h1>
        </div>

        {/* User Info */}
        {currentUser && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              Welcome back, {currentUser.first_name || 'Customer'}! Below are your bookings with Twilio messaging integration.
            </p>
          </div>
        )}

        {/* Bookings List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Your Confirmed Bookings</h2>
          
          {mockBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h3 className="font-medium text-lg">{booking.service_name}</h3>
                    <p className="text-sm text-gray-600">
                      Provider: {booking.providers.first_name} {booking.providers.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      Date: {booking.booking_date} at {booking.start_time}
                    </p>
                    <p className="text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {booking.booking_status.charAt(0).toUpperCase() + booking.booking_status.slice(1)}
                      </span>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleMessage(booking)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message Provider
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Information about the messaging feature */}
        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">✅ Twilio Messaging Ready!</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>• Click "Message Provider" on any confirmed booking to test the Twilio integration</p>
            <p>• Messages are sent via Twilio Conversations API in real-time</p>
            <p>• Each booking gets its own conversation thread</p>
            <p>• Customer and provider are automatically added as participants</p>
          </div>
        </div>
      </div>

      {/* Enhanced Conversation Chat Modal */}
      <EnhancedConversationChat
        isOpen={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        booking={selectedBookingForMessage}
        currentUser={currentUser}
      />
    </div>
  );
}