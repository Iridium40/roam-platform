import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function Contact() {
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
              Contact Us
            </h1>
            <p className="text-foreground/60">
              Get in touch with the ROAM team
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-semibold mb-4">
                Get in Touch
              </h2>
              <p className="text-gray-600 mb-6">
                Have questions about ROAM? We're here to help! Contact us through any of the methods below.
              </p>
              
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Customer Support</h3>
                  <p className="text-gray-600 mb-2">Email: support@roamyourbestlife.com</p>
                  <p className="text-gray-600 mb-2">Phone: (555) 123-4567</p>
                  <p className="text-gray-600">Hours: Mon-Fri 9AM-6PM EST</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold mb-3">Business Inquiries</h3>
                  <p className="text-gray-600 mb-2">Email: business@roamyourbestlife.com</p>
                  <p className="text-gray-600 mb-2">Phone: (555) 987-6543</p>
                  <p className="text-gray-600">Hours: Mon-Fri 8AM-7PM EST</p>
                </div>
              </div>

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
