import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from '@/utils/logger';
import {
  Calendar,
  Clock,
  MapPin,
  Smartphone,
  Building,
  Video,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  User,
  Phone,
  Mail,
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  duration: string;
  price: number;
  description: string;
  deliveryTypes: string[];
  preselectedDeliveryType?: string;
}

interface Provider {
  id: string;
  name: string;
  businessAddress: string;
  serviceArea: string;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
  provider: Provider;
}

type BookingStep =
  | "delivery"
  | "datetime"
  | "location"
  | "details"
  | "confirmation";

export default function BookingModal({
  isOpen,
  onClose,
  service,
  provider,
}: BookingModalProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>("delivery");
  const [selectedDeliveryType, setSelectedDeliveryType] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [customerLocation, setCustomerLocation] = useState({
    address: "",
    city: "",
    state: "",
    zipCode: "",
    notes: "",
  });
  const [customerDetails, setCustomerDetails] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: "",
  });

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && service) {
      // If service has a preselected delivery type, skip delivery step
      if (service.preselectedDeliveryType) {
        setCurrentStep("datetime");
        setSelectedDeliveryType(service.preselectedDeliveryType);
      } else {
        setCurrentStep("delivery");
        setSelectedDeliveryType("");
      }
      setSelectedDate("");
      setSelectedTime("");
      setCustomerLocation({
        address: "",
        city: "",
        state: "",
        zipCode: "",
        notes: "",
      });
      setCustomerDetails({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        specialRequests: "",
      });
    }
  }, [isOpen, service]);

  if (!service) return null;

  // Mock available times - in real app would come from provider's calendar
  const availableTimes = [
    "9:00 AM",
    "10:00 AM",
    "11:00 AM",
    "1:00 PM",
    "2:00 PM",
    "3:00 PM",
    "4:00 PM",
    "5:00 PM",
  ];

  // Generate next 14 days for calendar
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        date: date.toISOString().split("T")[0],
        display: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      });
    }
    return dates;
  };

  const dates = generateDates();

  const handleNext = () => {
    switch (currentStep) {
      case "delivery":
        setCurrentStep("datetime");
        break;
      case "datetime":
        setCurrentStep(
          selectedDeliveryType === "customer_location" ? "location" : "details",
        );
        break;
      case "location":
        setCurrentStep("details");
        break;
      case "details":
        setCurrentStep("confirmation");
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "datetime":
        // Only go back to delivery if service doesn't have preselected delivery type
        if (service?.preselectedDeliveryType) {
          onClose(); // Close modal instead of going back to delivery step
        } else {
          setCurrentStep("delivery");
        }
        break;
      case "location":
        setCurrentStep("datetime");
        break;
      case "details":
        setCurrentStep(
          selectedDeliveryType === "customer_location"
            ? "location"
            : "datetime",
        );
        break;
      case "confirmation":
        setCurrentStep("details");
        break;
    }
  };

  const handleBooking = () => {
    // In real app, this would submit the booking to the API
    logger.debug("Booking submitted:", {
      service,
      provider,
      deliveryType: selectedDeliveryType,
      date: selectedDate,
      time: selectedTime,
      location:
        selectedDeliveryType === "customer_location"
          ? customerLocation
          : provider.businessAddress,
      customer: customerDetails,
    });

    alert(
      "Booking request submitted! You will receive a confirmation email shortly.",
    );
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case "delivery":
        return selectedDeliveryType !== "";
      case "datetime":
        return selectedDate !== "" && selectedTime !== "";
      case "location":
        return customerLocation.address !== "" && customerLocation.city !== "";
      case "details":
        return (
          customerDetails.firstName !== "" &&
          customerDetails.lastName !== "" &&
          customerDetails.email !== "" &&
          customerDetails.phone !== ""
        );
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "delivery":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Choose Service Type</h3>
            <div className="grid grid-cols-1 gap-3">
              {service.deliveryTypes.map((type) => (
                <Card
                  key={type}
                  className={`cursor-pointer transition-all ${
                    selectedDeliveryType === type
                      ? "ring-2 ring-roam-blue bg-roam-blue/5"
                      : "hover:shadow-md"
                  }`}
                  onClick={() => setSelectedDeliveryType(type)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    {type === "customer_location" ? (
                      <Smartphone className="w-8 h-8 text-roam-blue" />
                    ) : type === "virtual" ? (
                      <Video className="w-8 h-8 text-roam-blue" />
                    ) : (
                      <Building className="w-8 h-8 text-roam-blue" />
                    )}
                    <div>
                      <h4 className="font-semibold">
                        {type === "customer_location"
                          ? "Mobile Service"
                          : type === "virtual"
                            ? "Virtual Service"
                            : "Business"}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {type === "customer_location"
                          ? "Service provided at your location"
                          : type === "virtual"
                            ? "Service provided online via video call"
                            : `Service at ${provider.businessAddress}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case "datetime":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Select Date & Time</h3>

            <div>
              <Label className="text-sm font-medium mb-3 block">
                Choose Date
              </Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {dates.map((dateOption) => (
                  <Button
                    key={dateOption.date}
                    variant={
                      selectedDate === dateOption.date ? "default" : "outline"
                    }
                    className={`justify-start ${
                      selectedDate === dateOption.date
                        ? "bg-roam-blue hover:bg-roam-blue/90"
                        : ""
                    }`}
                    onClick={() => setSelectedDate(dateOption.date)}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {dateOption.display}
                  </Button>
                ))}
              </div>
            </div>

            {selectedDate && (
              <div>
                <Label className="text-sm font-medium mb-3 block">
                  Choose Time
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableTimes.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={`justify-start ${
                        selectedTime === time
                          ? "bg-roam-blue hover:bg-roam-blue/90"
                          : ""
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      {time}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "location":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Service Location</h3>
            <p className="text-sm text-gray-600">
              Please provide the address where you'd like the service performed.
            </p>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="address">Street Address *</Label>
                <Input
                  id="address"
                  value={customerLocation.address}
                  onChange={(e) =>
                    setCustomerLocation({
                      ...customerLocation,
                      address: e.target.value,
                    })
                  }
                  placeholder="123 Main Street, Apt 2B"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={customerLocation.city}
                    onChange={(e) =>
                      setCustomerLocation({
                        ...customerLocation,
                        city: e.target.value,
                      })
                    }
                    placeholder="Miami"
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={customerLocation.state}
                    onChange={(e) =>
                      setCustomerLocation({
                        ...customerLocation,
                        state: e.target.value,
                      })
                    }
                    placeholder="FL"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="zipCode">Zip Code</Label>
                <Input
                  id="zipCode"
                  value={customerLocation.zipCode}
                  onChange={(e) =>
                    setCustomerLocation({
                      ...customerLocation,
                      zipCode: e.target.value,
                    })
                  }
                  placeholder="33101"
                />
              </div>

              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={customerLocation.notes}
                  onChange={(e) =>
                    setCustomerLocation({
                      ...customerLocation,
                      notes: e.target.value,
                    })
                  }
                  placeholder="Parking instructions, building access codes, etc."
                  rows={3}
                />
              </div>
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={customerDetails.firstName}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      firstName: e.target.value,
                    })
                  }
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={customerDetails.lastName}
                  onChange={(e) =>
                    setCustomerDetails({
                      ...customerDetails,
                      lastName: e.target.value,
                    })
                  }
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={customerDetails.email}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    email: e.target.value,
                  })
                }
                placeholder="john@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={customerDetails.phone}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    phone: e.target.value,
                  })
                }
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={customerDetails.specialRequests}
                onChange={(e) =>
                  setCustomerDetails({
                    ...customerDetails,
                    specialRequests: e.target.value,
                  })
                }
                placeholder="Any specific requirements or preferences..."
                rows={3}
              />
            </div>
          </div>
        );

      case "confirmation":
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Booking Summary</h3>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Service</span>
                  <span>{service.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Provider</span>
                  <span>{provider.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Type</span>
                  <Badge variant="secondary">
                    {selectedDeliveryType === "customer_location" ? (
                      <>
                        <Smartphone className="w-3 h-3 mr-1" />
                        Mobile Service
                      </>
                    ) : selectedDeliveryType === "virtual" ? (
                      <>
                        <Video className="w-3 h-3 mr-1" />
                        Virtual Service
                      </>
                    ) : (
                      <>
                        <Building className="w-3 h-3 mr-1" />
                        Business
                      </>
                    )}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Date & Time</span>
                  <span>
                    {new Date(selectedDate).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    at {selectedTime}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="font-semibold">Location</span>
                  <div className="text-right max-w-xs">
                    {selectedDeliveryType === "customer_location" ? (
                      <div className="text-sm">
                        <div>{customerLocation.address}</div>
                        <div>
                          {customerLocation.city}, {customerLocation.state}{" "}
                          {customerLocation.zipCode}
                        </div>
                      </div>
                    ) : selectedDeliveryType === "virtual" ? (
                      <div className="text-sm">Online video call</div>
                    ) : (
                      <div className="text-sm">{provider.businessAddress}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-semibold">Duration</span>
                  <span>{service.duration}</span>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-roam-blue">
                      ${service.price}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <p>
                <strong>What happens next?</strong>
              </p>
              <p>• Your booking request will be sent to {provider.name}</p>
              <p>• You'll receive a confirmation email within 15 minutes</p>
              <p>• The provider will contact you to confirm details</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book {service.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {renderStepContent()}

          <div className="flex justify-between pt-4 border-t">
            {currentStep !== "delivery" &&
              !(
                currentStep === "datetime" && service?.preselectedDeliveryType
              ) && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

            <div className="ml-auto">
              {currentStep === "confirmation" ? (
                <Button
                  onClick={handleBooking}
                  className="bg-roam-blue hover:bg-roam-blue/90"
                >
                  Confirm Booking
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="bg-roam-blue hover:bg-roam-blue/90"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
