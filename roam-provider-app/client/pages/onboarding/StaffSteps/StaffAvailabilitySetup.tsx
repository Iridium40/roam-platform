import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, ArrowRight, Info, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface InvitationData {
  businessId: string;
}

interface DaySchedule {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface AvailabilityData {
  availability: Record<string, DaySchedule>;
}

interface StaffAvailabilitySetupProps {
  invitationData: InvitationData;
  initialData: Partial<AvailabilityData>;
  onComplete: (data: AvailabilityData) => void;
  onBack: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

export default function StaffAvailabilitySetup({
  invitationData,
  initialData,
  onComplete,
  onBack,
}: StaffAvailabilitySetupProps) {
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>({});

  useEffect(() => {
    loadBusinessHours();
  }, []);

  const loadBusinessHours = async () => {
    try {
      setLoading(true);
      
      // Fetch business hours to use as defaults
      const { data: businessData, error } = await supabase
        .from('business_profiles')
        .select('business_hours')
        .eq('id', invitationData.businessId)
        .single();

      if (error) throw error;

      const businessHours = businessData?.business_hours || {};
      
      // Initialize schedule with business hours or defaults
      const initialSchedule: Record<string, DaySchedule> = {};
      DAYS_OF_WEEK.forEach(day => {
        const businessDay = businessHours[day.key];
        initialSchedule[day.key] = {
          isOpen: businessDay?.isOpen ?? true,
          openTime: businessDay?.openTime ?? '09:00',
          closeTime: businessDay?.closeTime ?? '17:00',
        };
      });

      setSchedule(initialSchedule);
    } catch (error) {
      console.error('Error loading business hours:', error);
      
      // Fallback to default schedule
      const defaultSchedule: Record<string, DaySchedule> = {};
      DAYS_OF_WEEK.forEach(day => {
        defaultSchedule[day.key] = {
          isOpen: day.key !== 'sunday',
          openTime: '09:00',
          closeTime: '17:00',
        };
      });
      setSchedule(defaultSchedule);
    } finally {
      setLoading(false);
    }
  };

  const handleDayToggle = (day: string, isOpen: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], isOpen },
    }));
  };

  const handleTimeChange = (day: string, field: 'openTime' | 'closeTime', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ availability: schedule });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
            <Clock className="w-6 h-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl text-orange-600">
              Set Your Availability
            </CardTitle>
            <p className="text-foreground/70">
              Configure your work schedule
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              We've pre-filled your schedule with the business hours. You can customize it to match your availability.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {DAYS_OF_WEEK.map(day => (
              <div
                key={day.key}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  schedule[day.key]?.isOpen ? 'bg-white' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3 w-32">
                  <Switch
                    checked={schedule[day.key]?.isOpen ?? false}
                    onCheckedChange={(checked) => handleDayToggle(day.key, checked)}
                  />
                  <Label className={schedule[day.key]?.isOpen ? 'font-medium' : 'text-foreground/60'}>
                    {day.label}
                  </Label>
                </div>

                {schedule[day.key]?.isOpen ? (
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-foreground/60">From</Label>
                      <Input
                        type="time"
                        value={schedule[day.key].openTime}
                        onChange={(e) => handleTimeChange(day.key, 'openTime', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <span className="text-foreground/60">—</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-foreground/60">To</Label>
                      <Input
                        type="time"
                        value={schedule[day.key].closeTime}
                        onChange={(e) => handleTimeChange(day.key, 'closeTime', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-foreground/60 flex-1">Unavailable</span>
                )}
              </div>
            ))}
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              Note: You can update your availability anytime from your dashboard settings.
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
            >
              Back
            </Button>
            
            <Button
              type="submit"
              className="bg-roam-blue hover:bg-roam-blue/90"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

