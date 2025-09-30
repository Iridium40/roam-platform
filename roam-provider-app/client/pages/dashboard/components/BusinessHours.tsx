import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

interface BusinessHoursProps {
  businessHours: BusinessHours;
  onBusinessHoursChange: (newHours: BusinessHours) => void;
  isEditing: boolean;
}

export default function BusinessHours({
  businessHours,
  onBusinessHoursChange,
  isEditing
}: BusinessHoursProps) {
  const handleDayToggle = (day: string, isOpen: boolean) => {
    const newHours = { ...businessHours };
    newHours[day] = {
      ...businessHours[day],
      closed: !isOpen
    };
    onBusinessHoursChange(newHours);
  };

  const handleTimeChange = (day: string, timeType: 'open' | 'close', value: string) => {
    const newHours = { ...businessHours };
    newHours[day] = {
      ...businessHours[day],
      [timeType]: value
    };
    onBusinessHoursChange(newHours);
  };

  const daysOfWeek = [
    'monday',
    'tuesday', 
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="w-5 h-5 mr-2" />
          Business Hours
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {daysOfWeek.map((day) => {
            const hours = businessHours[day];
            if (!hours) return null;
            
            return (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <Label className="text-sm font-medium capitalize">{day}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => handleDayToggle(day, e.target.checked)}
                    disabled={!isEditing}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Open</span>
                </div>
                {!hours.closed && (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={hours.open}
                      onChange={(e) => handleTimeChange(day, 'open', e.target.value)}
                      disabled={!isEditing}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">to</span>
                    <Input
                      type="time"
                      value={hours.close}
                      onChange={(e) => handleTimeChange(day, 'close', e.target.value)}
                      disabled={!isEditing}
                      className="w-24"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}