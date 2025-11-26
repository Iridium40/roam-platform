import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Shield, Calendar, DollarSign, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";

export default function TermsAndConditions() {
  const sections = [
    { icon: DollarSign, title: "Booking & Payment", id: "booking" },
    { icon: Calendar, title: "Cancellation Policy", id: "cancellation" },
    { icon: Shield, title: "Disputes & Contact", id: "disputes" },
    { icon: FileText, title: "General Terms", id: "general" }
  ];

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
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white animate-slide-up">
              Terms and Conditions
            </h1>
            <p className="text-lg text-white/90 mb-2 animate-fade-in">
              Last updated: January 2025
            </p>
            <p className="text-base text-white/80 animate-fade-in">
              Please read these terms carefully before using ROAM's services
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          
          {/* Quick Navigation */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-roam-blue" />
                Quick Navigation
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 hover:border-roam-blue hover:bg-roam-blue/5 transition-all group"
                    >
                      <Icon className="w-4 h-4 text-roam-blue" />
                      <span className="text-sm font-medium group-hover:text-roam-blue">{section.title}</span>
                    </a>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card className="border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8 md:p-12">
              <div className="prose prose-lg max-w-none">
                <section id="booking" className="mb-12 scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-md">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-0">1. Booking and Payment Terms</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-roam-blue/5 p-6 rounded-xl border border-roam-blue/20">
                      <h3 className="text-xl font-bold mb-3">1.1 Payment Authorization</h3>
                      <p className="text-foreground/80 leading-relaxed">
                        By submitting a booking request, you agree to our terms and conditions. Upon booking acceptance by the business, both service fees (platform fees) and business service fees will be charged immediately.
                      </p>
                    </div>

                    <div className="bg-roam-blue/5 p-6 rounded-xl border border-roam-blue/20">
                      <h3 className="text-xl font-bold mb-3">1.2 Service Fees</h3>
                      <p className="text-foreground/80 leading-relaxed">
                        Both service fees (platform fees) and business service fees are charged immediately upon booking acceptance. Service fees (platform fees) are <strong className="text-roam-blue">non-refundable</strong> and will be charged upon acceptance of your booking, regardless of any subsequent cancellations or changes. Business service fees are refundable if you cancel your booking 24 hours or more before the scheduled booking date and time.
                      </p>
                    </div>
                  </div>
                </section>

                <section id="cancellation" className="mb-12 scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-md">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-0">2. Cancellation Policy</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                      <h3 className="text-xl font-bold mb-3 text-green-800">2.1 Cancellation Prior to 24 Hours</h3>
                      <p className="text-foreground/80 leading-relaxed mb-4">
                        If you cancel your booking 24 hours or more before the scheduled booking date and time:
                      </p>
                      <ul className="space-y-2 ml-6 text-foreground/80">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>The <strong>service fee (platform fee) is non-refundable</strong> and will be retained by ROAM.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span><strong>Business service fees will be refunded</strong> to you in full.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          <span>The service amount will be refunded in full.</span>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                      <h3 className="text-xl font-bold mb-3 text-red-800">2.2 Cancellation Within 24 Hours</h3>
                      <p className="text-foreground/80 leading-relaxed mb-4">
                        If you cancel your booking within 24 hours of the scheduled booking date and time, you will incur a <strong className="text-red-600">100% loss</strong> with no refund provided. This includes both the service fee and the full service amount. No refunds will be issued for cancellations made within 24 hours of the scheduled booking time.
                      </p>
                      <div className="bg-white p-4 rounded-lg border border-red-300">
                        <p className="text-sm font-semibold text-foreground/90">
                          <strong>💡 Rescheduling Option:</strong> To prevent loss of funds, you may reschedule your booking instead of cancelling. Rescheduling allows you to move your booking to a different date and time without losing your payment.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section id="disputes" className="mb-12 scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-0">3. Disputes and Contact</h2>
                  </div>
                  
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                    <p className="text-foreground/80 leading-relaxed mb-4">
                      If you have any questions, concerns, or wish to dispute a charge, please contact ROAM at:
                    </p>
                    <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                      <p className="text-sm font-semibold mb-1">Email Support:</p>
                      <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline font-medium">
                        contactus@roamyourbestlife.com
                      </a>
                    </div>
                    <p className="text-foreground/80 leading-relaxed">
                      We will review your dispute and respond within <strong>5-7 business days</strong>.
                    </p>
                  </div>
                </section>

                <section id="general" className="mb-8 scroll-mt-24">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-0">4. General Terms</h2>
                  </div>
                  
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                    <p className="text-foreground/80 leading-relaxed">
                      By using ROAM's services, you agree to comply with all applicable laws and regulations. ROAM reserves the right to modify these terms and conditions at any time. Continued use of our services after changes constitutes acceptance of the modified terms.
                    </p>
                  </div>
                </section>

                <div className="mt-12 pt-6 border-t-2 border-gray-200">
                  <div className="bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5 p-6 rounded-xl">
                    <p className="text-sm text-foreground/70 text-center leading-relaxed">
                      If you have any questions about these terms and conditions, please contact us at{" "}
                      <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline font-medium">
                        contactus@roamyourbestlife.com
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

