import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Calendar, 
  CreditCard, 
  Star, 
  Shield, 
  CheckCircle, 
  Users, 
  FileText, 
  DollarSign,
  MapPin,
  Phone,
  MessageCircle,
  ArrowRight,
  Play
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

export default function HowItWorks() {
  const customerSteps = [
    {
      icon: Search,
      title: "1. Browse & Search",
      description: "Explore our verified providers and services in your area. Filter by category, location, price, and ratings.",
      details: ["Search by service type", "View provider profiles", "Read reviews and ratings", "Check availability"]
    },
    {
      icon: Calendar,
      title: "2. Book Your Service",
      description: "Select your preferred provider, choose a time slot, and book instantly with secure payment.",
      details: ["Choose date and time", "Select service options", "Add special requests", "Confirm details"]
    },
    {
      icon: CreditCard,
      title: "3. Secure Payment",
      description: "Pay securely through our platform. Your money is protected until the service is completed.",
      details: ["Multiple payment options", "Secure encryption", "Payment protection", "No hidden fees"]
    },
    {
      icon: Star,
      title: "4. Enjoy & Review",
      description: "Receive your service and share your experience to help other customers make informed decisions.",
      details: ["Service delivery", "Quality assurance", "Leave feedback", "Rate your experience"]
    }
  ];

  const providerSteps = [
    {
      icon: FileText,
      title: "1. Apply & Verify",
      description: "Submit your application with credentials. We verify your background, licenses, and qualifications.",
      details: ["Complete application", "Background check", "License verification", "Professional review"]
    },
    {
      icon: Users,
      title: "2. Create Your Profile",
      description: "Build your professional profile, set your services, pricing, and availability.",
      details: ["Upload photos", "Set service menu", "Define pricing", "Manage calendar"]
    },
    {
      icon: DollarSign,
      title: "3. Receive Bookings",
      description: "Get notified of new bookings, manage your schedule, and communicate with customers.",
      details: ["Real-time notifications", "Schedule management", "Customer messaging", "Service preparation"]
    },
    {
      icon: CheckCircle,
      title: "4. Get Paid",
      description: "Complete services and receive secure payments. Track your earnings and grow your business.",
      details: ["Automatic payments", "Weekly payouts", "Performance analytics", "Business growth tools"]
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "Safety First",
      description: "All providers undergo comprehensive background checks and verification",
      color: "bg-green-500"
    },
    {
      icon: Star,
      title: "Quality Assurance",
      description: "Rated providers with verified reviews from real customers",
      color: "bg-blue-500"
    },
    {
      icon: CreditCard,
      title: "Secure Payments",
      description: "Protected transactions with money-back guarantees",
      color: "bg-purple-500"
    },
    {
      icon: Phone,
      title: "24/7 Support",
      description: "Customer support available whenever you need assistance",
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-roam-blue to-roam-light-blue text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-6">
              How ROAM Works
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Connecting customers with trusted local service providers has never been easier. 
              Here's how our platform brings quality services directly to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" variant="secondary" className="bg-white text-roam-blue hover:bg-white/90">
                <Link to="/">
                  <Play className="w-5 h-5 mr-2" />
                  Get Started
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <Link to="/become-a-provider">
                  <Users className="w-5 h-5 mr-2" />
                  Become a Provider
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* For Customers Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-lg px-6 py-2">
              For Customers
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Book Services in <span className="text-roam-blue">4 Easy Steps</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
              From discovery to completion, our streamlined process makes booking professional services simple and secure.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {customerSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-roam-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-roam-blue/20 transition-colors">
                      <Icon className="w-8 h-8 text-roam-blue" />
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <CardDescription className="text-base">{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center text-sm text-foreground/70">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {index < customerSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-8 h-8 text-roam-blue/30" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* For Providers Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-lg px-6 py-2 bg-roam-light-blue text-white">
              For Providers
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Grow Your Business with <span className="text-roam-light-blue">ROAM</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
              Join our network of verified professionals and expand your reach to more customers than ever before.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {providerSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-roam-light-blue/10 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-roam-light-blue/20 transition-colors">
                      <Icon className="w-8 h-8 text-roam-light-blue" />
                    </div>
                    <CardTitle className="text-xl">{step.title}</CardTitle>
                    <CardDescription className="text-base">{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-center text-sm text-foreground/70">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {index < providerSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-8 h-8 text-roam-light-blue/30" />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

        {/* Features Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Why Choose <span className="text-roam-blue">ROAM</span>?
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
              We're committed to providing a safe, reliable, and high-quality experience for both customers and providers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="text-center group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 ${feature.color} rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                    <p className="text-foreground/70">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Service Categories */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Services We <span className="text-roam-blue">Offer</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
              From beauty and wellness to fitness and healthcare, find the perfect service provider for your needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Beauty", icon: "💄", services: "Hair, Nails, Skincare, Makeup" },
              { name: "Fitness", icon: "🏃‍♀️", services: "Personal Training, Yoga, Exercise" },
              { name: "Wellness", icon: "🧘", services: "Massage, Spa, Relaxation" },
              { name: "Healthcare", icon: "🏥", services: "Physical Therapy, Nutrition, Mental Health" }
            ].map((category, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all hover:scale-105">
                <CardContent className="p-8">
                  <div className="text-5xl mb-4">{category.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{category.name}</h3>
                  <p className="text-sm text-foreground/70">{category.services}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="bg-gradient-to-r from-roam-blue/5 to-roam-light-blue/5 border-roam-blue/20">
            <CardContent className="p-12">
              <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
                Join thousands of satisfied customers and trusted providers on the ROAM platform today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90">
                  <Link to="/">
                    <Search className="w-5 h-5 mr-2" />
                    Find Services
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/become-a-provider">
                    <Users className="w-5 h-5 mr-2" />
                    Become a Provider
                  </Link>
                </Button>
              </div>
              <div className="mt-8 text-center">
                <p className="text-sm text-foreground/60">
                  Questions? <Link to="/contact" className="text-roam-blue hover:underline">Contact our support team</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
