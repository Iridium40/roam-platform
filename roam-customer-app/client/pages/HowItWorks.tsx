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
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              Platform Overview
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white flex items-center justify-center gap-4 animate-slide-up">
              How 
              <img
                src="/logo-white-notagline.png"
                alt="ROAM"
                className="h-12 md:h-[3.75rem] w-auto inline-block"
              />
              Works
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed animate-fade-in">
              Connecting customers with trusted local service providers has never been easier. 
              Here's how our platform brings quality services directly to you.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Button asChild size="lg" variant="secondary" className="bg-white text-roam-blue hover:bg-white/90 hover-scale shadow-lg">
                <Link to="/booknow">
                  <Play className="w-5 h-5 mr-2" />
                  Get Started
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold shadow-lg">
                <a href="https://roamprovider.com" target="_blank" rel="noopener noreferrer">
                  <Users className="w-5 h-5 mr-2" />
                  Become a Provider
                </a>
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
                <Card key={index} className="relative overflow-hidden group card-hover border-0 shadow-lg bg-white rounded-2xl">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-base mt-2">{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start text-sm text-foreground/70">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {index < customerSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-roam-blue" />
                      </div>
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
                <Card key={index} className="relative overflow-hidden group card-hover border-0 shadow-lg bg-white rounded-2xl">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-roam-light-blue to-roam-blue rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold">{step.title}</CardTitle>
                    <CardDescription className="text-base mt-2">{step.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start text-sm text-foreground/70">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  {index < providerSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-4 top-1/2 transform -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-roam-light-blue" />
                      </div>
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
                <Card key={index} className="text-center group card-hover border-0 shadow-lg bg-white rounded-2xl">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-md`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-foreground/70 leading-relaxed">{feature.description}</p>
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
              <Card key={index} className="text-center card-hover border-0 shadow-lg bg-white rounded-2xl overflow-hidden group">
                <CardContent className="p-8">
                  <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">{category.icon}</div>
                  <h3 className="text-xl font-bold mb-3">{category.name}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{category.services}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-roam-blue/5 via-white to-roam-light-blue/5 rounded-3xl overflow-hidden">
            <CardContent className="p-12 md:p-16">
              <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-roam-blue/10 text-roam-blue">
                Get Started Today
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Ready to Get Started?</h2>
              <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands of satisfied customers and trusted providers on the ROAM platform today.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale">
                  <Link to="/booknow">
                    <Search className="w-5 h-5 mr-2" />
                    Find Services
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg hover-scale">
                  <a href="https://roamprovider.com" target="_blank" rel="noopener noreferrer">
                    <Users className="w-5 h-5 mr-2" />
                    Become a Provider
                  </a>
                </Button>
              </div>
              <div className="text-center">
                <p className="text-sm text-foreground/60">
                  Questions? <Link to="/contact" className="text-roam-blue hover:underline font-medium transition-all">Contact our support team</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
