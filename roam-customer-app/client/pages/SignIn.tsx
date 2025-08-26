import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function SignIn() {
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
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-4">
              Sign In
            </h1>
            <p className="text-foreground/60">
              Welcome back to ROAM
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-4">
                Customer Sign In Coming Soon
              </h2>
              <p className="text-gray-600 mb-6">
                The customer sign-in page is currently under development. You can sign in through the main app for now.
              </p>
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
  );
}
