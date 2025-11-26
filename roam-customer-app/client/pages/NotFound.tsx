import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Home, HelpCircle, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function NotFound() {
  const quickLinks = [
    { to: "/booknow", label: "Browse Services", icon: Search },
    { to: "/my-bookings", label: "My Bookings", icon: MapPin },
    { to: "/contact", label: "Get Help", icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />

      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
              <CardContent className="p-12 md:p-16">
                {/* 404 Icon */}
                <div className="relative mb-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-3xl flex items-center justify-center mx-auto shadow-lg animate-bounce-subtle">
                    <span className="text-6xl font-bold text-white">404</span>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-roam-yellow rounded-2xl flex items-center justify-center shadow-md">
                    <HelpCircle className="w-8 h-8 text-gray-800" />
                  </div>
                </div>

                <Badge variant="secondary" className="mb-4 text-sm px-4 py-2 bg-roam-blue/10 text-roam-blue">
                  Page Not Found
                </Badge>

                <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text">
                  Oops! This Page Got Lost
                </h1>

                <p className="text-xl text-foreground/70 mb-8 leading-relaxed">
                  The page you're looking for doesn't exist or may have been moved. 
                  Don't worry, let's get you back on track!
                </p>

                {/* Quick Navigation */}
                <div className="bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5 rounded-2xl p-6 mb-8 border border-roam-blue/20">
                  <p className="text-sm font-semibold text-foreground mb-4 flex items-center justify-center gap-2">
                    <MapPin className="w-4 h-4 text-roam-blue" />
                    Popular Destinations
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {quickLinks.map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white hover:bg-roam-blue/10 border border-gray-200 hover:border-roam-blue transition-all group"
                        >
                          <Icon className="w-4 h-4 text-roam-blue group-hover:scale-110 transition-transform" />
                          <span className="text-sm font-medium group-hover:text-roam-blue">{link.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>

                {/* Primary Actions */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                  <Button
                    asChild
                    size="lg"
                    className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale"
                  >
                    <Link to="/">
                      <Home className="w-5 h-5 mr-2" />
                      Return Home
                    </Link>
                  </Button>

                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-2 border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white shadow-lg hover-scale"
                  >
                    <Link to="/booknow">
                      <Search className="w-5 h-5 mr-2" />
                      Browse Services
                    </Link>
                  </Button>
                </div>

                {/* Help Text */}
                <div className="text-center">
                  <p className="text-sm text-foreground/60">
                    Need assistance? <Link to="/contact" className="text-roam-blue hover:underline font-medium">Contact our support team</Link>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
