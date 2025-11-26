import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Star, 
  Clock, 
  DollarSign,
  CheckCircle,
  Search,
  Calendar,
  ThumbsUp,
  Lock,
  Award,
  Heart,
  Sparkles,
  Users,
  TrendingUp,
  MapPin,
  Phone,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

export default function WhyRoam() {
  const benefits = [
    {
      icon: Shield,
      title: "Safe & Secure",
      description: "All providers are thoroughly vetted with background checks, license verification, and ongoing quality monitoring.",
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      icon: Clock,
      title: "Save Time",
      description: "Book services in minutes, not hours. No more endless phone calls or waiting for callbacks.",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      icon: DollarSign,
      title: "Transparent Pricing",
      description: "See exact prices upfront. No hidden fees, no surprises. Pay securely through our platform.",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      icon: Star,
      title: "Quality Guaranteed",
      description: "Read verified reviews from real customers. Only the best providers make it to our platform.",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      icon: MapPin,
      title: "Your Choice of Location",
      description: "Services at your home, business location, or virtually. You choose what works best for you.",
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    },
    {
      icon: Phone,
      title: "24/7 Support",
      description: "Our customer support team is always available to help with any questions or concerns.",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    }
  ];

  const howItWorks = [
    {
      step: "1",
      title: "Search",
      description: "Browse verified providers in your area",
      icon: Search
    },
    {
      step: "2",
      title: "Book",
      description: "Choose your time and service details",
      icon: Calendar
    },
    {
      step: "3",
      title: "Enjoy",
      description: "Receive quality service and leave a review",
      icon: ThumbsUp
    }
  ];

  const stats = [
    { number: "10,000+", label: "Happy Customers" },
    { number: "500+", label: "Verified Providers" },
    { number: "50,000+", label: "Services Completed" },
    { number: "4.8/5", label: "Average Rating" }
  ];

  const safetyFeatures = [
    {
      icon: Lock,
      title: "Secure Payments",
      description: "Your payment information is encrypted and protected with industry-leading security."
    },
    {
      icon: Award,
      title: "Background Checks",
      description: "Every provider undergoes comprehensive background screening and credential verification."
    },
    {
      icon: Shield,
      title: "Insurance Coverage",
      description: "All providers carry liability insurance for your peace of mind."
    },
    {
      icon: Star,
      title: "Verified Reviews",
      description: "Only real customers can leave reviews, ensuring authentic feedback."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      {/* Hero Section with Beach Theme */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Your Best Life. Everywhere.
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-white animate-slide-up">
              Services That Travel <span className="text-roam-yellow">With You</span>
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed animate-fade-in">
              Whether you're at the beach, exploring a new city, or relaxing at home — book quality beauty, fitness, wellness, and healthcare services anywhere, anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-scale-in">
              <Button asChild size="lg" className="bg-white text-roam-blue hover:bg-white/90 button-shine shadow-lg hover-scale">
                <Link to="/booknow">
                  <Search className="w-5 h-5 mr-2" />
                  Browse Services
                </Link>
              </Button>
              <Button asChild size="lg" className="bg-roam-yellow text-roam-blue hover:bg-roam-yellow/90 font-semibold shadow-lg">
                <Link to="/how-it-works">
                  Learn More
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-0 shadow-lg bg-gradient-to-br from-white to-roam-blue/5 rounded-2xl card-hover">
                <CardContent className="p-6">
                  <div className="text-4xl md:text-5xl font-bold text-roam-blue mb-2">
                    {stat.number}
                  </div>
                  <div className="text-sm md:text-base text-foreground/70 font-medium">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Lifestyle Image Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="order-2 md:order-1">
              <Badge className="mb-4 text-base px-4 py-2">Vacation Ready</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Relax & Recharge <span className="text-roam-blue">Anywhere</span>
              </h2>
              <p className="text-xl text-foreground/70 mb-6 leading-relaxed">
                From beachside massages to poolside fitness sessions, ROAM brings professional wellness services to your vacation destination.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Services at Your Hotel or Rental</h3>
                    <p className="text-foreground/70">Book providers who come directly to your vacation accommodation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Local Verified Providers</h3>
                    <p className="text-foreground/70">Access trusted professionals in every destination you visit</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Last-Minute Bookings</h3>
                    <p className="text-foreground/70">Find and book services even during your vacation</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=2070&auto=format&fit=crop"
                  alt="Spa wellness massage at beach resort"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                  <p className="text-white text-lg font-medium">Wellness services in paradise</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Simple, Safe, and <span className="text-roam-blue">Reliable</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
              We've built ROAM to make booking professional services as easy and secure as possible.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              const gradientColors = [
                "from-green-500 to-emerald-500",
                "from-blue-500 to-cyan-500",
                "from-purple-500 to-pink-500",
                "from-yellow-500 to-orange-500",
                "from-red-500 to-pink-500",
                "from-orange-500 to-red-500"
              ];
              return (
                <Card key={index} className="group border-0 shadow-lg bg-white rounded-2xl card-hover">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 bg-gradient-to-br ${gradientColors[index]} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-md`}>
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

        {/* How It Works Section */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-sm px-4 py-2 bg-roam-light-blue text-white">Simple Process</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Book in <span className="text-roam-blue">3 Easy Steps</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
              From search to service completion, we've streamlined everything.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {howItWorks.map((item, index) => {
              const Icon = item.icon;
              return (
                <div key={index} className="relative">
                  <Card className="text-center group border-0 shadow-lg bg-white rounded-2xl card-hover">
                    <CardContent className="p-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-roam-blue to-roam-light-blue text-white rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold group-hover:scale-110 transition-transform shadow-md">
                        {item.step}
                      </div>
                      <Icon className="w-12 h-12 text-roam-blue mx-auto mb-4" />
                      <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                      <p className="text-foreground/70 leading-relaxed">{item.description}</p>
                    </CardContent>
                  </Card>
                  {index < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <div className="w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
                        <ArrowRight className="w-5 h-5 text-roam-blue" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Second Lifestyle Image Section */}
        <section className="mb-20">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=2070&auto=format&fit=crop"
                  alt="Beachside fitness and yoga"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-8">
                  <p className="text-white text-lg font-medium">Fitness & wellness wherever you are</p>
                </div>
              </div>
            </div>
            <div>
              <Badge className="mb-4 text-base px-4 py-2">Stay Active</Badge>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Never Skip <span className="text-roam-blue">Your Routine</span>
              </h2>
              <p className="text-xl text-foreground/70 mb-6 leading-relaxed">
                Keep up with your fitness goals and wellness routine even while traveling. Find personal trainers, yoga instructors, and massage therapists in any location.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Beach Workouts & Yoga</h3>
                    <p className="text-foreground/70">Train with ocean views and fresh air</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Heart className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Recovery & Relaxation</h3>
                    <p className="text-foreground/70">Massage therapy and spa treatments on demand</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-6 h-6 text-roam-blue flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-1">Beauty On-Demand</h3>
                    <p className="text-foreground/70">Look your best for every vacation moment</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Safety Section */}
        <section className="mb-20">
          <div className="bg-gradient-to-br from-green-50 via-white to-blue-50 rounded-3xl p-12 md:p-16 border border-green-200/50 shadow-lg">
            <div className="text-center mb-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl mb-6 shadow-md">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Your Safety is Our <span className="text-green-600">Priority</span>
              </h2>
              <p className="text-xl text-foreground/70 max-w-3xl mx-auto leading-relaxed">
                We take extensive measures to ensure every interaction on our platform is safe and secure.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {safetyFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Card key={index} className="border-0 shadow-md bg-white rounded-2xl card-hover">
                    <CardContent className="p-6 flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                        <p className="text-foreground/70 text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Services Section with Imagery */}
        <section className="mb-20">
          <div className="text-center mb-12">
            <Badge className="mb-4 text-base px-4 py-2">Full Service Menu</Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Services for Your <span className="text-roam-blue">Every Need</span>
            </h2>
            <p className="text-xl text-foreground/70 max-w-3xl mx-auto">
              From beachside beauty treatments to poolside fitness — we bring professional services to your vacation paradise.
            </p>
          </div>

          {/* Image Grid showcasing services */}
          <div className="grid md:grid-cols-4 gap-4 mb-12">
            <div className="relative rounded-2xl overflow-hidden h-64 group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop"
                alt="Beauty services"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-3xl mb-2">💄</div>
                  <h3 className="font-semibold text-lg">Beauty</h3>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden h-64 group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=2020&auto=format&fit=crop"
                alt="Fitness training"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-3xl mb-2">🏃‍♀️</div>
                  <h3 className="font-semibold text-lg">Fitness</h3>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden h-64 group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop"
                alt="Wellness and spa"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-3xl mb-2">🧘</div>
                  <h3 className="font-semibold text-lg">Wellness</h3>
                </div>
              </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden h-64 group cursor-pointer">
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop"
                alt="Healthcare services"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="text-3xl mb-2">🏥</div>
                  <h3 className="font-semibold text-lg">Healthcare</h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonial Section with Beach Theme */}
        <section className="mb-20">
          <div className="relative rounded-3xl overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0">
              <img 
                src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop"
                alt="Beautiful beach sunset"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/90 to-roam-light-blue/90"></div>
            </div>
            
            <div className="relative z-10 p-12 md:p-16">
              <div className="max-w-4xl mx-auto text-center text-white">
                <div className="flex justify-center mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <blockquote className="text-2xl md:text-3xl font-medium mb-8 leading-relaxed">
                  "I was on vacation in Miami and wanted a massage on the beach. ROAM made it so easy! Within an hour, I had a verified therapist at my hotel. It was perfect!"
                </blockquote>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/50">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Sarah Johnson</div>
                    <div className="text-white/80">Vacationer from New York</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-br from-roam-blue/5 via-white to-roam-light-blue/5 rounded-3xl overflow-hidden">
            <CardContent className="p-12 md:p-16">
              <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-roam-blue/10 text-roam-blue">
                Get Started
              </Badge>
              <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">
                Ready to Experience the ROAM Difference?
              </h2>
              <p className="text-xl text-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                Join thousands of satisfied customers who trust ROAM for their service needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button asChild size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale">
                  <Link to="/booknow">
                    <Search className="w-5 h-5 mr-2" />
                    Get Started Now
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg hover-scale">
                  <Link to="/contact">
                    Contact Us
                  </Link>
                </Button>
              </div>
              <p className="text-sm text-foreground/60">
                No credit card required • Cancel anytime • 100% satisfaction guaranteed
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

const User = ({ className }: { className?: string }) => (
  <Users className={className} />
);
