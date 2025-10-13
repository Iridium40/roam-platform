import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SimpleMyBookings() {
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

        {/* Simple Content */}
        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Test Page</h2>
          <p className="text-gray-600 mb-4">
            This is a simplified version of the MyBookings page to test if the basic routing and components work.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Test Booking 1</h3>
              <p className="text-sm text-gray-500">Service: Test Massage</p>
              <p className="text-sm text-gray-500">Date: 2025-10-15</p>
              <p className="text-sm text-gray-500">Status: Confirmed</p>
              <Button className="mt-2" size="sm">
                Test Message Button
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium">Test Booking 2</h3>
              <p className="text-sm text-gray-500">Service: Test Therapy</p>
              <p className="text-sm text-gray-500">Date: 2025-10-20</p>
              <p className="text-sm text-gray-500">Status: Pending</p>
              <Button className="mt-2" size="sm" variant="outline">
                Test Message Button
              </Button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Next Steps:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. If this page loads, the basic routing works</li>
              <li>2. We can then add back the authentication check</li>
              <li>3. Then add back the booking data fetching</li>
              <li>4. Finally add back the Twilio messaging integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}