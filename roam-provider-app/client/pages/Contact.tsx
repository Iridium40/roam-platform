import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Clock, ShieldCheck, HelpCircle, MessageSquare, Book, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { ServiceIconPattern } from "@/components/ServiceIconPattern";

export default function Contact() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      message: String(fd.get("message") || ""),
    };

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to send");
      toast.success("Thanks! We'll be in touch shortly.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err?.message || "Could not send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-background">
      <Hero />
      <ContactSection onSubmit={onSubmit} loading={loading} />
      <QuickHelp />
      <FAQ />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-roam-blue to-roam-light-blue text-white">
      {/* Service icon pattern overlay */}
      <ServiceIconPattern />
      
      <div className="container py-20 md:py-28 relative">
        <div className="max-w-3xl mx-auto text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-2 text-sm font-medium mb-6">
            <ShieldCheck className="w-4 h-4" />
            Provider Success Team
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Talk to a Provider Success Manager
          </h1>
          <p className="text-lg text-white/90 mb-4">
            Questions, demos, partnerships—send a message and we'll respond within one business day.
          </p>
        </div>
      </div>
    </div>
  );
}

function ContactSection({ onSubmit, loading }: { onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; loading: boolean }) {
  const contactMethods = [
    {
      icon: Mail,
      title: "Email",
      detail: "contactus@roamyourbestlife.com",
      description: "Best for detailed inquiries",
      link: "mailto:contactus@roamyourbestlife.com",
    },
    {
      icon: Clock,
      title: "Hours",
      detail: "7 days/week, 8am–10pm ET",
      description: "We respond within 24 hours",
    },
  ];

  return (
    <div className="container py-20">
      <div className="grid gap-12 lg:grid-cols-5">
        {/* Contact Form */}
          <div className="lg:col-span-3">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
            <div className="border-b bg-gradient-to-r from-roam-blue/10 to-roam-light-blue/10 p-6">
              <h2 className="text-2xl font-bold">Send Us a Message</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll route it to the right person and get back quickly.
              </p>
              </div>
              <form onSubmit={onSubmit} className="grid gap-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                    className="h-11 rounded-lg border bg-background px-4 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-roam-blue"
                    placeholder="John Doe"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                    className="h-11 rounded-lg border bg-background px-4 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-roam-blue"
                    placeholder="john@example.com"
                    />
                  </div>
                </div>
              <div className="grid gap-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                  className="h-11 rounded-lg border bg-background px-4 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-roam-blue"
                  placeholder="(555) 123-4567"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="message" className="text-sm font-medium">
                  How can we help? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={7}
                  className="rounded-lg border bg-background p-4 outline-none ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-roam-blue"
                  placeholder="Tell us about your inquiry..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                  size="lg"
                  className="w-full sm:w-auto bg-roam-blue text-white hover:bg-roam-blue/90 button-shine"
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                <Button type="reset" variant="outline" size="lg" className="w-full sm:w-auto">
                    Clear
                  </Button>
              </div>
                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree to be contacted about your inquiry.
                  </p>
              </form>
            </div>
          </div>

        {/* Contact Info Sidebar */}
          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-6">
            <h3 className="text-xl font-bold">Contact Information</h3>
            
            {contactMethods.map((method, idx) => {
              const Icon = method.icon;
              return (
                <div 
                  key={method.title} 
                  className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white flex-shrink-0">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold mb-1">{method.title}</h4>
                      <p className="text-sm text-foreground font-medium mb-1">{method.detail}</p>
                      <p className="text-xs text-muted-foreground">{method.description}</p>
                      {method.link && (
                        <a 
                          href={method.link}
                          className="inline-flex items-center gap-1 text-xs text-roam-blue hover:underline mt-2"
                >
                          Contact us <Mail className="w-3 h-3" />
                </a>
                      )}
                    </div>
                  </div>
              </div>
              );
            })}

            <div className="rounded-2xl border bg-gradient-to-br from-roam-blue/5 to-roam-light-blue/5 p-6 shadow-lg">
              <h4 className="font-semibold mb-3">Why contact our team?</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-roam-blue flex-shrink-0 mt-0.5" />
                  See how ROAM brings you prepaid bookings
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-roam-blue flex-shrink-0 mt-0.5" />
                  Get help setting up your provider profile
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-roam-blue flex-shrink-0 mt-0.5" />
                  Learn best practices to maximize earnings
                </li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
    </div>
  );
}

function QuickHelp() {
  const helpLinks = [
    {
      icon: Book,
      title: "Provider Guide",
      description: "Learn how to get started and manage your business on ROAM",
      link: "/how-it-works",
    },
    {
      icon: MessageSquare,
      title: "FAQ",
      description: "Find answers to common questions about being a provider",
      link: "#faq",
    },
    {
      icon: HelpCircle,
      title: "About ROAM",
      description: "Discover our mission and how we support providers",
      link: "/about",
    },
  ];

  return (
    <div className="bg-gradient-to-b from-roam-light-blue/10 to-transparent py-20">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Quick Help</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Browse our resources for instant answers
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {helpLinks.map((link, idx) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.title}
                to={link.link}
                className="group rounded-2xl border bg-card p-6 shadow-lg card-hover"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-roam-blue to-roam-light-blue text-white mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 group-hover:text-roam-blue transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FAQ() {
  const faqs = [
    {
      question: "How do I get paid?",
      answer: "Payments are automatically transferred to your linked bank account once a week on Thursday. No invoicing required!",
    },
    {
      question: "What does ROAM charge?",
      answer: "ROAM charges a 20% platform fee on each booking. This covers payment processing, marketing, customer support, and all platform features.",
    },
    {
      question: "Can I set my own prices?",
      answer: "Yes! You have complete control over your service pricing, add-ons, and travel fees. Update them anytime from your dashboard.",
    },
    {
      question: "How do I handle cancellations?",
      answer: "Our straightforward cancellation policy is easy to understand for both providers and customers. Cancellations made more than 24 hours in advance receive a 100% refund of service fees (platform fees are not refunded). Cancellations within 24 hours receive no refund.",
    },
    {
      question: "Do I need insurance?",
      answer: "Yes, all providers must maintain current liability insurance and provide proof during onboarding. This protects you, your customers, and the ROAM platform.",
    },
    {
      question: "How does scheduling work?",
      answer: "You control your availability through the provider dashboard. Customers can only book times you've marked as available, and you can accept or decline any booking request.",
    },
  ];

  return (
    <div className="container py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Common questions from providers like you
        </p>
      </div>
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
        {faqs.map((faq, idx) => (
          <div 
            key={faq.question} 
            className="rounded-2xl border bg-card p-6 shadow-lg card-hover"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-roam-blue to-roam-light-blue text-white flex-shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg">{faq.question}</h3>
            </div>
            <p className="text-sm text-muted-foreground pl-11">{faq.answer}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-muted-foreground mb-4">Still have questions?</p>
        <Button asChild size="lg" className="bg-roam-blue text-white hover:bg-roam-blue/90 button-shine">
          <a href="mailto:contactus@roamyourbestlife.com">Email Our Team</a>
        </Button>
      </div>
    </div>
  );
}
