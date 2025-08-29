import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function About() {
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
              About ROAM
            </h1>
            <p className="text-foreground/60">
              Your Best Life. Everywhere.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold mb-4">
                About ROAM
              </h2>
              <p className="text-gray-600 mb-6">
                ROAM is Florida's premier on-demand services marketplace, connecting customers with verified professionals for premium services delivered anywhere.
              </p>
              
              <h3 className="text-xl font-semibold mb-3">Our Mission</h3>
              <p className="text-gray-600 mb-6">
                We believe everyone deserves access to high-quality, reliable services wherever they are. Whether you're at home, at work, or on the go, ROAM brings the services you need right to your doorstep.
              </p>

              <h3 className="text-xl font-semibold mb-3">What We Offer</h3>
              <ul className="text-gray-600 mb-6 list-disc pl-6">
                <li>Verified professional service providers</li>
                <li>Wide range of service categories</li>
                <li>Convenient booking and scheduling</li>
                <li>Secure payment processing</li>
                <li>Real-time service tracking</li>
                <li>Customer reviews and ratings</li>
              </ul>

              <div className="text-center mt-8">
                <Button asChild>
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
  );
}
