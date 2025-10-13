import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function MinimalMyBookings() {
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
          <h1 className="text-2xl font-bold">My Bookings - Minimal Test</h1>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Debugging MyBookings Page</h2>
          <p className="text-gray-600 mb-4">
            This minimal version tests if the basic MyBookings page structure works without hooks or complex components.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm"><strong>Test Status:</strong> ✅ Basic routing and layout working</p>
            <p className="text-sm"><strong>Next Step:</strong> Add back components one by one</p>
          </div>
        </div>
      </div>
    </div>
  );
}