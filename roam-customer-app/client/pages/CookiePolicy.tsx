import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Cookie, Shield, Settings, TrendingUp, Code, Lock, Users, Mail } from "lucide-react";

export default function CookiePolicy() {
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
              <Cookie className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white animate-slide-up">
              Cookie Policy
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm flex-wrap mb-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Effective November 26, 2025</Badge>
            </div>
            <p className="text-base text-white/80 animate-fade-in">
              Learn about our use of cookies and similar technologies
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
              <p className="text-foreground/70 leading-relaxed mb-4">
                This Cookie Policy explains how ROAM 30A LLC ("ROAM," "we," "us," or "our") uses cookies and similar technologies on our website and mobile application (collectively, the "Platform"). By using our Platform, you consent to the use of cookies as described in this policy.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                We are committed to protecting your privacy. We use cookies solely to enhance your experience, improve our Platform's performance, and meet technical requirements. We do not share your information with third parties.
              </p>
            </CardContent>
          </Card>

          {/* What Are Cookies */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Cookie className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">2. What Are Cookies?</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website or use an application. They help the Platform remember your preferences, understand how you use our services, and improve your overall experience.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                Similar technologies include local storage, session storage, and device identifiers, which serve comparable purposes and are covered by this policy.
              </p>
            </CardContent>
          </Card>

          {/* How We Use Cookies */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">3. How We Use Cookies</h2>
              <p className="text-foreground/70 leading-relaxed mb-6">
                We use cookies exclusively for the following purposes:
              </p>

              <div className="space-y-6">
                {/* Essential Cookies */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Lock className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">3.1 Essential Cookies (Strictly Necessary)</h3>
                  </div>
                  <p className="text-foreground/70 leading-relaxed mb-3">
                    These cookies are essential for the Platform to function properly. Without them, certain features would not be available. Essential cookies are used to:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Keep you signed in during your session</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Remember your login credentials securely</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Process bookings and transactions</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Maintain security and prevent fraud</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Enable core functionality such as navigation and access to secure areas</span>
                    </li>
                  </ul>
                </div>

                {/* Functional Cookies */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Settings className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">3.2 Functional Cookies (User Experience)</h3>
                  </div>
                  <p className="text-foreground/70 leading-relaxed mb-3">
                    These cookies enhance your experience by remembering your choices and preferences. Functional cookies help us:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Remember your preferred settings and preferences</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Save your location preferences for service searches</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Store your recently viewed services and providers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Remember items in your booking cart</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Personalize your experience based on past interactions</span>
                    </li>
                  </ul>
                </div>

                {/* Performance Cookies */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">3.3 Performance Cookies (App Performance)</h3>
                  </div>
                  <p className="text-foreground/70 leading-relaxed mb-3">
                    These cookies help us understand how visitors interact with our Platform, allowing us to identify issues and improve performance. Performance cookies enable us to:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Monitor Platform speed and responsiveness</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Identify and fix errors or bugs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Understand which pages and features are most used</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Optimize load times and server performance</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Test new features and improvements</span>
                    </li>
                  </ul>
                </div>

                {/* Technical Cookies */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
                      <Code className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold">3.4 Technical Cookies (Platform Improvement)</h3>
                  </div>
                  <p className="text-foreground/70 leading-relaxed mb-3">
                    These cookies support the technical operation and continuous improvement of our Platform. Technical cookies help us:
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Maintain Platform stability and reliability</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Debug and troubleshoot technical issues</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Ensure compatibility across devices and browsers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Collect anonymous usage data to guide development priorities</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                      <span className="text-foreground/70">Implement security updates and patches</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cookie Categories Summary */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">4. Cookie Categories Summary</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 border border-red-200 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Essential Cookies</h3>
                  </div>
                  <p className="text-sm text-red-800">Required for platform functionality</p>
                </div>
                <div className="p-4 border border-blue-200 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-900">Functional Cookies</h3>
                  </div>
                  <p className="text-sm text-blue-800">Enhance user experience and preferences</p>
                </div>
                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Performance Cookies</h3>
                  </div>
                  <p className="text-sm text-green-800">Monitor and improve app performance</p>
                </div>
                <div className="p-4 border border-purple-200 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Code className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-900">Technical Cookies</h3>
                  </div>
                  <p className="text-sm text-purple-800">Support technical operations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* No Third-Party Sharing - HIGHLIGHTED */}
          <Card className="mb-8 border-2 border-green-500 shadow-xl rounded-2xl bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-md">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-green-900">5. No Third-Party Sharing</h2>
              </div>
              <p className="text-green-900 leading-relaxed mb-4 font-medium">
                We do not share, sell, or transfer your cookie data or any information collected through cookies to third parties. All data collected remains strictly within ROAM and is used solely for the purposes outlined in this policy.
              </p>
              <p className="text-green-800 leading-relaxed">
                We do not use third-party advertising cookies or tracking pixels. We do not participate in advertising networks or allow third parties to collect information about your browsing behavior on our Platform.
              </p>
            </CardContent>
          </Card>

          {/* Managing Cookie Preferences */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">6. Managing Your Cookie Preferences</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-6">
                You have control over cookies stored on your device. You can manage your cookie preferences in the following ways:
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">6.1 Browser Settings</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Most web browsers allow you to control cookies through their settings. You can typically find these options in your browser's "Settings," "Preferences," or "Privacy" menu. You can choose to block all cookies, accept all cookies, or receive a notification when a cookie is set.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">6.2 Mobile Device Settings</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    For mobile devices, you can manage cookies and similar technologies through your device settings. On iOS devices, go to Settings &gt; Safari &gt; Privacy & Security. On Android devices, go to Settings &gt; Privacy &gt; Clear browsing data.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">6.3 Impact of Disabling Cookies</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Please note that disabling certain cookies may impact your experience on our Platform. Essential cookies are required for the Platform to function, and disabling them may prevent you from using certain features, including logging in, making bookings, or accessing your account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Security */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">7. Data Security</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                We implement appropriate technical and organizational measures to protect the information collected through cookies. This includes encryption, secure servers, and regular security assessments. Cookie data is stored securely and accessed only by authorized ROAM personnel for the purposes described in this policy.
              </p>
            </CardContent>
          </Card>

          {/* Children's Privacy */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">8. Children's Privacy</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                Our Platform is not intended for children under the age of 18. We do not knowingly collect cookie data or any personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately.
              </p>
            </CardContent>
          </Card>

          {/* Policy Updates */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4">9. Updates to This Policy</h2>
              <p className="text-foreground/70 leading-relaxed mb-4">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. Any changes will be posted on this page with an updated "Effective Date." We encourage you to review this policy periodically.
              </p>
              <p className="text-foreground/70 leading-relaxed">
                For significant changes that materially affect how we use cookies, we will provide notice through the Platform or via email to registered users.
              </p>
            </CardContent>
          </Card>

          {/* Contact Us */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-roam-light-blue/10 to-roam-blue/10 border-roam-blue/20">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">10. Contact Us</h2>
              </div>
              <p className="text-foreground/70 leading-relaxed mb-4">
                If you have any questions about this Cookie Policy or our use of cookies, please contact us at:
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-roam-blue mt-2.5 flex-shrink-0"></div>
                  <div>
                    <a href="mailto:contactus@roamyourbestlife.com" className="text-roam-blue hover:underline font-medium">
                      contactus@roamyourbestlife.com
                    </a>
                  </div>
                </li>
              </ul>
              <p className="text-foreground/70 leading-relaxed mb-2">
                You may also reach us at:
              </p>
              <ul className="space-y-2 mb-6">
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
