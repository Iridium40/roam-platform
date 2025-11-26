import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Eye, Shield, CheckCircle, AlertCircle, Mail, Code } from "lucide-react";

export default function Accessibility() {
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
              <Eye className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white animate-slide-up">
              Accessibility Statement
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm flex-wrap mb-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Effective January 2025</Badge>
            </div>
            <p className="text-base text-white/80 animate-fade-in">
              Our commitment to making ROAM accessible to everyone
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Our Commitment */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Our Commitment</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                ROAM is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards to ensure our platform is usable by all.
              </p>
            </CardContent>
          </Card>

          {/* Conformance Status */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Conformance Status</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                We strive to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standards. These guidelines help make web content more accessible to people with disabilities, including those with visual, auditory, motor, and cognitive impairments.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                We are actively working toward full compliance and regularly audit our platform to identify and address accessibility issues.
              </p>
            </CardContent>
          </Card>

          {/* Accessibility Features */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Accessibility Features</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                Our platform includes the following accessibility features:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Keyboard navigation:</strong> All interactive elements are accessible via keyboard</span>
                </div>
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Screen reader compatibility:</strong> ARIA labels and semantic HTML for assistive technologies</span>
                </div>
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Alternative text:</strong> Descriptive text for all meaningful images</span>
                </div>
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Color contrast:</strong> Sufficient contrast ratios for text and interactive elements</span>
                </div>
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Responsive design:</strong> Mobile-friendly and adaptable to different screen sizes</span>
                </div>
                <div className="flex items-start gap-3 bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70"><strong>Clear navigation:</strong> Consistent and logical page structure</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Known Limitations */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-sm">
                  <AlertCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Known Limitations</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                While we strive for full accessibility, we acknowledge that some areas may not yet meet all accessibility standards. We are actively working to address these limitations:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Some third-party integrations may have limited accessibility features</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">We are continuously improving mobile app accessibility</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <span className="text-foreground/70">Certain complex interactive features are being enhanced for better accessibility</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Feedback & Contact */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Feedback & Contact</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-6">
                We welcome your feedback on the accessibility of ROAM. If you encounter accessibility barriers or have suggestions for improvement, please contact us at:
              </p>

              <div className="p-6 bg-roam-light-blue/10 rounded-xl border border-roam-light-blue/20">
                <p className="text-sm text-foreground/70 mb-3">
                  <strong>Email:</strong>{" "}
                  <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline font-medium">
                    contactus@roamyourbestlife.com
                  </a>
                </p>
                <p className="text-sm text-foreground/70">
                  Please include "Accessibility" in your subject line. We aim to respond to accessibility feedback within 3-5 business days.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Technical Specifications */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-sm">
                  <Code className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">Technical Specifications</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                The accessibility of ROAM relies on the following technologies to work with your web browser and assistive technologies:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20 text-center">
                  <p className="font-semibold text-foreground">HTML5</p>
                </div>
                <div className="bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20 text-center">
                  <p className="font-semibold text-foreground">WAI-ARIA</p>
                </div>
                <div className="bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20 text-center">
                  <p className="font-semibold text-foreground">CSS3</p>
                </div>
                <div className="bg-roam-blue/5 p-4 rounded-xl border border-roam-blue/20 text-center">
                  <p className="font-semibold text-foreground">JavaScript</p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

