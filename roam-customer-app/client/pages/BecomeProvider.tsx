import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Calendar,
  Shield,
  Star,
  Award,
  CheckCircle,
  FileText,
  Smartphone,
  BarChart,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

export default function BecomeProvider() {
  const benefits = [
    {
      icon: TrendingUp,
      title: "Grow Your Business",
      description: "Reach thousands of potential customers actively searching for your services across Florida.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: DollarSign,
      title: "Secure Payments",
      description: "Get paid quickly and securely. Automated weekly payouts directly to your bank account.",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: Calendar,
      title: "Flexible Scheduling",
      description: "You control your availability. Set your own hours and manage bookings on your terms.",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: "Professional Support",
      description: "Dedicated support team and resources to help you succeed on the platform.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Star,
      title: "Build Your Reputation",
      description: "Showcase your expertise with verified reviews and ratings from real customers.",
      color: "from-yellow-500 to-orange-500"
    },
    {
      icon: BarChart,
      title: "Marketing Tools",
      description: "Access powerful marketing and analytics tools to optimize your business performance.",
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const steps = [
    {
      icon: FileText,
      title: "Apply & Verify",
      description: "Submit your application with credentials. We verify your background, licenses, and qualifications.",
      number: "1"
    },
    {
      icon: Users,
      title: "Create Your Profile",
      description: "Build your professional profile, set your services, pricing, and availability.",
      number: "2"
    },
    {
      icon: Smartphone,
      title: "Start Accepting Bookings",
      description: "Get notified of new bookings, manage your schedule, and communicate with customers.",
      number: "3"
    },
    {
      icon: Award,
      title: "Grow & Earn",
      description: "Complete services, receive payments, and build your reputation on the platform.",
      number: "4"
    }
  ];

  const stats = [
    { number: "10,000+", label: "Active Customers" },
    { number: "400+", label: "Service Providers" },
    { number: "50,000+", label: "Bookings Completed" },
    { number: "$2M+", label: "Paid to Providers" }
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
              Join Our Network
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white animate-slide-up">
              Become a ROAM Provider
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed animate-fade-in">
              Ready to grow your business and reach more customers? Join ROAM as a service provider 
              and start offering your services to customers across Florida.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Button asChild size="lg" className="bg-white text-roam-blue hover:bg-white/90 button-shine shadow-lg hover-scale">
                <a href="https://www.roamprovider.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-5 h-5 mr-2" />
                  Go to Provider Portal
                </a>
              </Button>
              <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold shadow-lg">
                <Link to="/contact">
                  Contact Our Team
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        {/* Stats Section */}
        <section className="mb-20">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-0 shadow-lg bg-white rounded-2xl card-hover">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-roam-blue mb-2">{stat.number}</div>
                  <div className="text-sm text-foreground/70 font-medium">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">
              Why Join <span className="text-roam-blue">ROAM</span>?
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
              Join hundreds of successful service providers who have grown their business with ROAM.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="border-0 shadow-lg bg-white rounded-2xl card-hover">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 bg-gradient-to-br ${benefit.color} rounded-2xl flex items-center justify-center mb-6 shadow-md`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                    <p className="text-foreground/70 leading-relaxed">{benefit.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How to Get Started Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-lg px-6 py-2 bg-roam-light-blue text-white">
              Getting Started
            </Badge>
            <h2 className="text-4xl font-bold mb-4">
              Start Earning in <span className="text-roam-light-blue">4 Easy Steps</span>
              </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
              Our streamlined onboarding process makes it easy to join and start accepting bookings.
            </p>
                </div>
                
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="relative overflow-hidden border-0 shadow-lg bg-white rounded-2xl card-hover">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-roam-light-blue to-roam-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute top-4 right-4 w-10 h-10 bg-roam-blue/10 rounded-full flex items-center justify-center">
                      <span className="text-lg font-bold text-roam-blue">{step.number}</span>
                </div>
                    <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
              </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-roam-blue/5 via-white to-roam-light-blue/5 rounded-3xl overflow-hidden">
            <CardContent className="p-12 md:p-16">
              <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-roam-blue/10 text-roam-blue">
                Ready to Join?
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Start Your Journey with ROAM</h2>
              <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                Join our community of wellness professionals and grow your business with the support of 
                cutting-edge technology and a dedicated customer base.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale">
                  <a href="https://www.roamprovider.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-5 h-5 mr-2" />
                    Apply Now
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg hover-scale">
                  <Link to="/contact">
                    Questions? Contact Us
                    </Link>
                  </Button>
                </div>
              <div className="text-center">
                <p className="text-sm text-foreground/60">
                  Already a provider? <a href="https://www.roamprovider.com" className="text-roam-blue hover:underline font-medium transition-all">Sign in to your account</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
