import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Save, Loader2 } from "lucide-react";

interface BusinessHoursSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  hasChanges: boolean;
  loading: boolean;
  onSave: () => void;
}

interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

type BusinessHours = {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
};

export default function BusinessHoursSection({
  businessData,
  setBusinessData,
  hasChanges,
  loading,
  onSave,
}: BusinessHoursSectionProps) {
  
  const defaultHours: BusinessHours = {
    monday: { open: "09:00", close: "17:00", closed: false },
    tuesday: { open: "09:00", close: "17:00", closed: false },
    wednesday: { open: "09:00", close: "17:00", closed: false },
    thursday: { open: "09:00", close: "17:00", closed: false },
    friday: { open: "09:00", close: "17:00", closed: false },
    saturday: { open: "09:00", close: "17:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: true },
  };

  const businessHours = businessData.business_hours || defaultHours;

  const updateDayHours = (day: keyof BusinessHours, updates: Partial<DayHours>) => {
    const newHours = {
      ...businessHours,
      [day]: {
        ...businessHours[day],
        ...updates,
      },
    };
    setBusinessData({ ...businessData, business_hours: newHours });
  };

  const formatDayName = (day: string) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

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
          {Object.entries(businessHours).map(([day, hours]: [string, DayHours]) => (
            <div key={day} className="flex items-center justify-between space-x-4 py-2">
              <div className="flex items-center space-x-4 flex-1">
                <div className="w-28">
                  <Label className="text-sm font-medium">{formatDayName(day)}</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={!hours.closed}
                    onChange={(e) => {
                      updateDayHours(day as keyof BusinessHours, {
                        closed: !e.target.checked,
                      });
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600 w-12">Open</span>
                </div>

                {!hours.closed ? (
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={hours.open || "09:00"}
                      onChange={(e) => {
                        updateDayHours(day as keyof BusinessHours, {
                          open: e.target.value,
                        });
                      }}
                      className="w-28"
                    />
                    <span className="text-sm text-gray-600">to</span>
                    <Input
                      type="time"
                      value={hours.close || "17:00"}
                      onChange={(e) => {
                        updateDayHours(day as keyof BusinessHours, {
                          close: e.target.value,
                        });
                      }}
                      className="w-28"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-64">
                    <span className="text-sm text-gray-500 italic">Closed</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> Set your business hours to help customers know when you're available. 
              You can always update these hours later or set special hours for holidays.
            </p>
          </div>

          {/* Save Button */}
          <Button
            onClick={onSave}
            disabled={loading || !hasChanges}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}