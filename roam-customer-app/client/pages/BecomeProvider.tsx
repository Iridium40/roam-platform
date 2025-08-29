import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function BecomeProvider() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-foreground hover:text-roam-blue"
              >
                <Link to="/">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Become a Provider
            </h1>
            <p className="text-foreground/60">
              Join ROAM as a service provider
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold mb-4">
                Join Our Network of Professionals
              </h2>
              <p className="text-gray-600 mb-6">
                Ready to grow your business and reach more customers? Join ROAM as a service provider and start offering your services to customers across Florida.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Why Join ROAM?</h3>
                  <ul className="text-gray-600 list-disc pl-6">
                    <li>Reach more customers</li>
                    <li>Flexible scheduling</li>
                    <li>Secure payments</li>
                    <li>Professional support</li>
                    <li>Marketing tools</li>
                    <li>Customer reviews</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-3">How to Get Started</h3>
                  <ol className="text-gray-600 list-decimal pl-6">
                    <li>Complete your profile</li>
                    <li>Verify your credentials</li>
                    <li>Set your services and rates</li>
                    <li>Start accepting bookings</li>
                  </ol>
                </div>
              </div>

              <div className="text-center mt-8">
                <Button asChild className="bg-roam-blue hover:bg-roam-blue/90">
                  <a href="http://localhost:5173/provider-portal" target="_blank" rel="noopener noreferrer">
                    Go to Provider Portal
                  </a>
                </Button>
                <div className="mt-4">
                  <Button asChild variant="outline">
                    <Link to="/">
                      Return to Home
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
