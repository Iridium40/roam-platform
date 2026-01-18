import { format } from "date-fns";
import { Calendar as CalendarIcon, ChevronDown, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TimeSlot {
  value: string;
  label: string;
}

interface DateTimeStepProps {
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  selectedTime: string;
  setSelectedTime: (time: string) => void;
  timeSlots: TimeSlot[];
  groupedTimeSlots: Record<string, TimeSlot[]>;
}

export const DateTimeStep = ({
  selectedDate,
  setSelectedDate,
  selectedTime,
  setSelectedTime,
  timeSlots,
  groupedTimeSlots,
}: DateTimeStepProps) => {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6 flex items-center">
        <CalendarIcon className="w-6 h-6 mr-2" />
        Select Date & Time
      </h2>
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Enhanced Calendar Selector */}
        <div>
          <label className="block text-sm font-medium mb-3">Choose your preferred date</label>
          <div className="space-y-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const oneYearFromToday = new Date();
                    oneYearFromToday.setFullYear(oneYearFromToday.getFullYear() + 1);
                    oneYearFromToday.setHours(23, 59, 59, 999);
                    
                    return date < today || date > oneYearFromToday;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {selectedDate && (
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <CalendarIcon className="w-4 h-4 inline mr-2" />
                You selected: {format(selectedDate, "EEEE, MMMM do, yyyy")}
              </div>
            )}
          </div>
        </div>

        {/* Compact Time Selector */}
        <div>
          <label className="block text-sm font-medium mb-3">Choose your preferred time</label>
          <div className="space-y-3">
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger className="w-full h-12">
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(groupedTimeSlots).map(([period, slots]) => (
                  <SelectGroup key={period}>
                    <SelectLabel className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {period}
                    </SelectLabel>
                    {slots.map((slot) => (
                      <SelectItem key={slot.value} value={slot.value}>
                        {slot.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            {selectedTime && (
              <div className="text-sm text-gray-600 bg-green-50 p-3 rounded-lg">
                <Clock className="w-4 h-4 inline mr-2" />
                You selected: {timeSlots.find(slot => slot.value === selectedTime)?.label}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DateTimeStep;
