import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsAndConditions() {
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
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl font-bold">Terms and Conditions</CardTitle>
              <p className="text-sm text-gray-500 mt-2">Last updated: January 2025</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <div className="space-y-6">
                <section>
                  <h2 className="text-2xl font-semibold mb-4">1. Booking and Payment Terms</h2>
                  
                  <h3 className="text-xl font-semibold mb-3">1.1 Payment Authorization</h3>
                  <p className="mb-4">
                    By submitting a booking request, you agree to our terms and conditions. You will not be charged unless your booking is accepted by the business.
                  </p>

                  <h3 className="text-xl font-semibold mb-3">1.2 Service Fees</h3>
                  <p className="mb-4">
                    Upon booking acceptance by the business, only the service fees (platform fees) will be charged immediately. These service fees are <strong>non-refundable</strong> and will be charged upon acceptance of your booking, regardless of any subsequent cancellations or changes.
                  </p>

                  <h3 className="text-xl font-semibold mb-3">1.3 Service Amount Payment</h3>
                  <p className="mb-4">
                    The service amount (remaining balance) will be charged automatically:
                  </p>
                  <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
                    <li>If your booking is more than 24 hours away: The payment will be authorized immediately and captured automatically 24 hours prior to your scheduled booking date and time.</li>
                    <li>If your booking is 24 hours or less away: The full service amount will be charged immediately upon booking acceptance.</li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">2. Cancellation Policy</h2>
                  
                  <h3 className="text-xl font-semibold mb-3">2.1 Cancellation Prior to 24 Hours</h3>
                  <p className="mb-4">
                    If you cancel your booking more than 24 hours before the scheduled booking date and time:
                  </p>
                  <ul className="list-disc list-inside mb-4 space-y-2 ml-4">
                    <li>The <strong>service fee is non-refundable</strong> and will be retained by ROAM.</li>
                    <li>If the service amount has been authorized but not yet captured, the authorization will be cancelled and you will not be charged for the service amount.</li>
                    <li>If the service amount has already been charged, you will receive a refund of the service amount only (the service fee remains non-refundable).</li>
                  </ul>

                  <h3 className="text-xl font-semibold mb-3">2.2 Cancellation Within 24 Hours</h3>
                  <p className="mb-4">
                    If you cancel your booking within 24 hours of the scheduled booking date and time, you will incur a <strong>100% loss</strong> with no refund provided. This includes both the service fee and the full service amount. No refunds will be issued for cancellations made within 24 hours of the scheduled booking time.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">3. Disputes and Contact</h2>
                  <p className="mb-4">
                    If you have any questions, concerns, or wish to dispute a charge, please contact ROAM at:
                  </p>
                  <p className="mb-4">
                    <strong>Email:</strong> <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline">contactus@roamyourbestlife.com</a>
                  </p>
                  <p className="mb-4">
                    We will review your dispute and respond within 5-7 business days.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-semibold mb-4">4. General Terms</h2>
                  <p className="mb-4">
                    By using ROAM's services, you agree to comply with all applicable laws and regulations. ROAM reserves the right to modify these terms and conditions at any time. Continued use of our services after changes constitutes acceptance of the modified terms.
                  </p>
                </section>

                <div className="mt-8 pt-6 border-t">
                  <p className="text-sm text-gray-500">
                    If you have any questions about these terms and conditions, please contact us at{" "}
                    <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline">
                      contactus@roamyourbestlife.com
                    </a>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

