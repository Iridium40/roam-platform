import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { DollarSign, Clock, AlertCircle, RefreshCw, Shield } from "lucide-react";

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              Legal
            </Badge>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white animate-slide-up">
              Refund & Cancellation Policy
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm flex-wrap mb-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Effective November 26, 2025</Badge>
            </div>
            <p className="text-base text-white/80 animate-fade-in">
              Understand our cancellation and refund terms
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Introduction */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">1. Introduction</h2>
              <p className="text-foreground/70 leading-relaxed">
                This Refund and Cancellation Policy outlines the terms governing booking cancellations and refunds for all services booked through the ROAM platform. ROAM operates as a wellness services marketplace connecting customers with vetted wellness professionals across Florida's 30A coastal region.
              </p>
              <p className="text-foreground/70 leading-relaxed mt-4">
                By using our platform, you agree to the terms outlined in this policy. We encourage all users to read this policy carefully before making a booking.
              </p>
            </CardContent>
          </Card>

          {/* Payment Structure */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">2. Payment Structure</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                When you book a service through ROAM, your total payment consists of two components:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <div>
                    <strong className="text-foreground">Service Amount:</strong>
                    <span className="text-foreground/70"> The fee charged by the service provider for the wellness service. This amount is paid directly to the provider or business.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <div>
                    <strong className="text-foreground">Platform Service Fee:</strong>
                    <span className="text-foreground/70"> A fee charged by ROAM (12-15% of the service amount) for platform services including booking management, payment processing, customer support, provider vetting, and quality assurance.</span>
                  </div>
                </li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">2.1 When You Are Charged</h3>
              <p className="text-foreground/70 leading-relaxed mb-4">
                You are not charged when you submit a booking request. Payment is only processed after the business accepts your booking. Once accepted, both the Service Amount and Platform Service Fee are charged to your payment method.
              </p>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-amber-900 leading-relaxed mb-2">
                  <strong>Important:</strong> Tips and "Add More Service" charges are processed <strong>immediately</strong> at the time you submit them and are <strong>non-refundable</strong> under all circumstances.
                </p>
                <ul className="space-y-1 text-amber-800 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
                    <span><strong>Tips:</strong> Charged immediately upon submission and go directly to the provider</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-amber-600 mt-2 flex-shrink-0"></div>
                    <span><strong>Add More Service:</strong> Additional service fees are charged immediately when added to your booking</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Refund Policy */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">3. Refund Policy</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">3.1 Non-Refundable Items</h3>
                  <p className="text-foreground/70 leading-relaxed mb-3">
                    The following charges are <strong>non-refundable</strong> under all circumstances:
                  </p>
                  <ul className="space-y-2 mb-3">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <div>
                        <strong className="text-foreground">Platform Service Fee:</strong>
                        <span className="text-foreground/70"> Non-refundable once the business has accepted your booking. This fee covers administrative costs, provider coordination, and platform services.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <div>
                        <strong className="text-foreground">Tips:</strong>
                        <span className="text-foreground/70"> All gratuities are charged immediately and go directly to providers. Tips are never refundable.</span>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <div>
                        <strong className="text-foreground">"Add More Service" Charges:</strong>
                        <span className="text-foreground/70"> Any additional services added to your booking are charged immediately and are non-refundable.</span>
                      </div>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <h3 className="text-lg font-semibold mb-3 text-green-900">3.2 Service Amount — Cancellations More Than 24 Hours Before Appointment</h3>
                  <p className="text-green-800 leading-relaxed">
                    If you cancel your booking <strong>more than 24 hours</strong> before your scheduled appointment time, you will receive a <strong>100% refund</strong> of the Service Amount. The Platform Service Fee remains non-refundable.
                  </p>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <h3 className="text-lg font-semibold mb-3 text-red-900">3.3 Service Amount — Cancellations Within 24 Hours of Appointment</h3>
                  <p className="text-red-800 leading-relaxed">
                    If you cancel your booking <strong>within 24 hours</strong> of your scheduled appointment time, the Service Amount is <strong>non-refundable</strong>. This policy protects our service providers who have reserved their time and may have declined other appointments.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rescheduling Option */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">4. Rescheduling Option</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                If you need to change your appointment time but are within the 24-hour window, you have the option to reschedule with the same provider instead of canceling. This allows you to retain the value of your booking without losing your payment.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-3">
                Rescheduling is subject to:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Provider availability</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Must be with the same provider from your original booking</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">New appointment must be scheduled within 30 days of the original date</span>
                </li>
              </ul>
              <p className="text-foreground/70 leading-relaxed">
                To reschedule, please use the ROAM app or contact the provider directly through the platform messaging system.
              </p>
            </CardContent>
          </Card>

          {/* Provider or Business Cancellations */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">5. Provider or Business Cancellations</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                If a provider or business cancels your confirmed booking, you will receive a <strong>full refund</strong> of both the Service Amount and the Platform Service Fee. We will process this refund within 5-10 business days to your original payment method.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                In the event of a provider cancellation, our team will also assist you in finding an alternative provider if desired.
              </p>
            </CardContent>
          </Card>

          {/* No-Shows */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">6. No-Shows</h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">6.1 Customer No-Shows</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    If you fail to show up for your scheduled appointment without canceling in advance, <strong>no refund</strong> will be issued for either the Service Amount or the Platform Service Fee. Providers wait a minimum of 15 minutes past your appointment time before marking the booking as a no-show.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">6.2 Provider No-Shows</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    If a provider fails to show up for your scheduled appointment, you will receive a <strong>full refund</strong> of both the Service Amount and the Platform Service Fee. Please report provider no-shows within 24 hours of the scheduled appointment time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disputes and Special Circumstances */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">7. Disputes and Special Circumstances</h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                We understand that special circumstances may arise. If you believe you have a valid reason for a refund that falls outside the standard policy terms, or if you have a dispute regarding your booking, please contact us at:
              </p>
              <p className="text-foreground/70 leading-relaxed mb-4">
                <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline font-medium">
                  contactus@roamyourbestlife.com
                </a>
              </p>
              <p className="text-foreground/70 leading-relaxed mb-4">
                Our customer service team will review your case and respond within 2-3 business days. We evaluate each dispute on a case-by-case basis and strive to reach a fair resolution for all parties involved.
              </p>
              <p className="text-foreground/70 leading-relaxed mb-3">
                When contacting us about a dispute, please include:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Your booking confirmation number</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">The date and time of your scheduled appointment</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">A detailed description of the issue</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Any supporting documentation or screenshots</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Refund Processing */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">8. Refund Processing</h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                Approved refunds are processed within 5-10 business days. The time for the refund to appear in your account depends on your financial institution and payment method:
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Credit Cards: 5-10 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Debit Cards: 5-10 business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Bank Transfers: 7-14 business days</span>
                </li>
              </ul>
              <p className="text-foreground/70 leading-relaxed">
                Refunds are issued to the original payment method used for the booking. We are unable to issue refunds to alternative payment methods or accounts.
              </p>
            </CardContent>
          </Card>

          {/* Policy Updates */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">9. Policy Updates</h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                ROAM reserves the right to modify this Refund and Cancellation Policy at any time. Any changes will be effective immediately upon posting the updated policy on our platform. We encourage you to review this policy periodically. Continued use of the platform after changes constitutes acceptance of the updated policy.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                For significant policy changes, we will notify registered users via email at least 7 days before the changes take effect.
              </p>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-roam-light-blue/10 to-roam-blue/10 border-roam-blue/20">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">10. Contact Information</h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                For questions about this policy or your specific booking, please contact us:
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <div>
                    <strong className="text-foreground">Email:</strong>{" "}
                    <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline">
                      contactus@roamyourbestlife.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <div>
                    <strong className="text-foreground">Website:</strong>{" "}
                    <a href="https://www.roamyourbestlife.com" className="text-roam-blue hover:underline" target="_blank" rel="noopener noreferrer">
                      www.roamyourbestlife.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong className="text-foreground">In-App Support:</strong> Available through the ROAM mobile app</span>
                </li>
              </ul>
              <div className="border-t border-roam-blue/20 pt-6 text-center">
                <p className="font-semibold text-lg text-foreground mb-1">ROAM 30A LLC</p>
                <p className="text-foreground/70 mb-1">Florida's Premier Wellness Services Marketplace</p>
                <p className="text-roam-blue font-medium">Your Best Life. Everywhere.</p>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
