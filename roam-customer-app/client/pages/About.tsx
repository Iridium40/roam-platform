import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Scissors, 
  Dumbbell, 
  Hand, 
  Stethoscope,
  Smartphone,
  Shield,
  Home,
  Star,
  Users,
  TrendingUp,
  Heart,
  Lightbulb,
  Award,
  MapPin,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";

export default function About() {
  const serviceCategories = [
    {
      icon: Scissors,
      title: "Beauty & Wellness",
      count: "150+ providers",
      description: "From rejuvenating skincare treatments to professional hair styling, our beauty professionals bring salon and spa quality services to your preferred location.",
      color: "from-pink-500 to-rose-500"
    },
    {
      icon: Dumbbell,
      title: "Fitness & Personal Training",
      count: "80+ trainers",
      description: "Stay active and achieve your fitness goals with our network of certified personal trainers and fitness coaches—no gym membership required.",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: Hand,
      title: "Therapy & Bodywork",
      count: "120+ therapists",
      description: "Relieve stress, manage pain, and restore balance with our licensed massage therapists and bodywork specialists.",
      color: "from-green-500 to-emerald-500"
    },
    {
      icon: Stethoscope,
      title: "Healthcare Services",
      count: "90+ specialists",
      description: "Access essential healthcare services through our network of medical professionals and health specialists.",
      color: "from-blue-500 to-cyan-500"
    }
  ];

  const differentiators = [
    {
      icon: Smartphone,
      title: "Technology-First Approach",
      features: [
        "AI-powered matching connects you with the perfect provider",
        "Real-time booking with instant confirmations",
        "Smart scheduling that adapts to your calendar",
        "Secure payments with transparent pricing"
      ]
    },
    {
      icon: Shield,
      title: "Trust & Safety",
      features: [
        "Comprehensive background checks for all providers",
        "License verification and ongoing compliance monitoring",
        "Insurance protection for both customers and providers",
        "Real-time tracking and communication during services"
      ]
    },
    {
      icon: Home,
      title: "Convenience Redefined",
      features: [
        "Mobile services delivered to your preferred location",
        "Flexible scheduling including evenings and weekends",
        "Multiple locations supported for busy lifestyles",
        "Business partnerships bringing wellness to workplaces"
      ]
    },
    {
      icon: Award,
      title: "Quality Assurance",
      features: [
        "Rigorous provider vetting ensures professional expertise",
        "Continuous quality monitoring through reviews",
        "Professional development programs for providers",
        "Customer satisfaction guarantee on every service"
      ]
    }
  ];

  const impactStats = [
    { number: "10,000+", label: "Customers Served" },
    { number: "400+", label: "Wellness Professionals" },
    { number: "50,000+", label: "Appointments Facilitated" },
    { number: "4.8⭐", label: "Average Rating" }
  ];

  const values = [
    {
      icon: Users,
      title: "Accessibility",
      description: "Wellness services should be available to everyone, regardless of schedule, location, or circumstance."
    },
    {
      icon: Star,
      title: "Excellence",
      description: "We set high standards for service quality and continuously work to exceed expectations."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "We embrace technology and creative solutions to solve real-world problems."
    },
    {
      icon: Shield,
      title: "Integrity",
      description: "We operate with transparency, honesty, and ethical business practices."
    },
    {
      icon: TrendingUp,
      title: "Growth",
      description: "We support the professional and personal growth of our customers, providers, and team members."
    },
    {
      icon: Heart,
      title: "Community",
      description: "We're building a community where wellness professionals thrive and customers feel supported."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              Our Story
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 flex items-center justify-center gap-4 animate-slide-up">
              About 
              <img
                src="/logo-white-notagline.png"
                alt="ROAM"
                className="h-[2.7rem] md:h-[3.375rem] w-auto inline-block"
              />
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-white/90 mb-8 animate-fade-in">
              Transforming Wellness Services, One Appointment at a Time
            </h2>
            <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed animate-scale-in">
              At ROAM, we believe that accessing quality wellness services should be as simple as tapping your phone. 
              Founded on the principle that wellness is not a luxury but a necessity, we've created Florida's premier 
              on-demand wellness platform that brings professional services directly to you—wherever you are, whenever you need them.
            </p>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12">
              Our <span className="text-roam-blue">Story</span>
            </h2>
            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed">
              <p className="text-xl mb-6">
                ROAM was born from a simple observation: in our fast-paced world, finding time for self-care and wellness 
                often falls to the bottom of our priority list. Between work commitments, family responsibilities, and the 
                endless demands of daily life, scheduling and traveling to wellness appointments becomes another source of 
                stress rather than relief.
              </p>
              <div className="bg-gradient-to-r from-roam-blue/10 to-roam-light-blue/10 p-8 rounded-2xl my-8">
                <p className="text-2xl font-semibold text-roam-blue text-center italic">
                  "What if wellness came to you instead?"
                </p>
              </div>
              <p className="text-xl">
                This question sparked the creation of ROAM—a comprehensive platform that eliminates the barriers between 
                you and the wellness services you need. Whether it's a therapeutic massage after a stressful week, a personal 
                training session in your home gym, or a beauty treatment for a special occasion, ROAM makes professional 
                wellness services accessible, convenient, and personalized.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What We <span className="text-roam-blue">Do</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              ROAM is Florida's leading on-demand wellness marketplace, connecting customers with verified, 
              licensed professionals across four core service categories:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {serviceCategories.map((category, index) => (
              <Card key={index} className="group card-hover border-0 shadow-lg bg-white overflow-hidden rounded-2xl">
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                      <category.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{category.title}</h3>
                        <Badge variant="secondary" className="bg-roam-blue/10 text-roam-blue border-0">
                          {category.count}
                        </Badge>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{category.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5 rounded-2xl card-hover">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                      <Heart className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Our Mission</h3>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed text-center">
                    To democratize access to wellness services by creating a seamless platform that prioritizes 
                    convenience, quality, and affordability—making self-care an achievable part of everyone's routine.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-roam-yellow/5 to-roam-light-blue/5 rounded-2xl card-hover">
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-roam-yellow to-roam-light-blue rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                      <TrendingUp className="w-8 h-8 text-gray-800" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900">Our Vision</h3>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed text-center">
                    To become the leading wellness ecosystem that empowers both service providers and customers, 
                    fostering healthier communities through innovative technology and exceptional service delivery.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* What Makes ROAM Different */}
      <section className="py-16 bg-background/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What Makes ROAM <span className="text-roam-blue">Different</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {differentiators.map((item, index) => (
              <Card key={index} className="border-0 shadow-lg bg-white rounded-2xl card-hover">
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-md">
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{item.title}</h3>
                  </div>
                  <ul className="space-y-3">
                    {item.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3 text-gray-600">
                        <div className="w-2 h-2 bg-roam-blue rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Statistics */}
      <section className="py-16 bg-gradient-to-r from-roam-blue to-roam-light-blue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Our Impact</h2>
            <p className="text-xl text-white/90">Since our launch, ROAM has made a significant difference:</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {impactStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl lg:text-5xl font-bold text-white mb-2">{stat.number}</div>
                <div className="text-white/90 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 max-w-2xl mx-auto">
            <p className="text-white/90 text-lg">
              We've saved customers an average of <span className="font-bold text-white">2 hours</span> per appointment 
              by eliminating travel time, while maintaining a <span className="font-bold text-white">4.8-star</span> average 
              rating across all services.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our <span className="text-roam-blue">Values</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {values.map((value, index) => (
              <Card key={index} className="border-0 shadow-lg bg-white rounded-2xl card-hover group">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-md">
                    <value.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">{value.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Join the ROAM <span className="text-roam-blue">Revolution</span>
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Whether you're seeking convenient wellness services or looking to grow your wellness business, 
              ROAM is here to support you. We're not just changing how wellness services are delivered—we're 
              creating a movement toward healthier, more balanced lives.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <Card className="border-0 shadow-lg bg-white rounded-2xl card-hover">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-roam-blue/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-6 h-6 text-roam-blue" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">For Customers</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Discover how easy it is to prioritize your wellness. Your first massage, personal training session, 
                    or beauty treatment is just a few taps away.
                  </p>
                  <Button asChild className="w-full bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-md">
                    <Link to="/booknow">
                      <Star className="w-4 h-4 mr-2" />
                      Browse Services
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white rounded-2xl card-hover">
                <CardContent className="p-8 text-center">
                  <div className="w-12 h-12 bg-roam-light-blue/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Award className="w-6 h-6 text-roam-light-blue" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">For Providers</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Join our community of wellness professionals and grow your business with the support of 
                    cutting-edge technology and a dedicated customer base.
                  </p>
                  <Button asChild variant={undefined} className="w-full border-2 border-roam-blue bg-background !text-roam-blue hover:!bg-roam-blue hover:!text-white shadow-md [&>*]:!text-inherit [&:hover>*]:!text-white">
                    <a href="https://www.roamprovider.com" target="_blank" rel="noopener noreferrer" className="flex items-center !text-inherit hover:!text-white">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      <span className="!text-inherit">Become a Provider</span>
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-br from-roam-blue/10 via-white to-roam-light-blue/10 p-10 rounded-2xl shadow-lg border border-roam-blue/10">
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-center">
                Ready to experience the future of wellness?
              </h3>
              <p className="text-lg text-gray-600 mb-8 text-center leading-relaxed">
                Join thousands of satisfied customers who have made ROAM their trusted wellness partner.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Visit www.roamyourbestlife.com
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
