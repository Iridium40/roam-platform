import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Mail, 
  Clock, 
  Phone, 
  MapPin, 
  MessageCircle, 
  Send,
  Users,
  Building,
  HelpCircle,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import ChatBot from "@/components/ChatBot";
import { toast } from "@/hooks/use-toast";

export default function Contact() {
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    category: "general"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Message Sent Successfully!",
        description: "We'll get back to you within 24 hours.",
      });
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "general"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactMethods = [
    {
      icon: Mail,
      title: "Email Support",
      description: "Get help via email",
      details: "contactus@roamyourbestlife.com",
      action: "mailto:contactus@roamyourbestlife.com"
    },
    {
      icon: Clock,
      title: "Business Hours",
      description: "When we're available",
      details: "Mon-Fri 8AM-5PM CST",
      action: null
    },
    {
      icon: Phone,
      title: "Phone Support",
      description: "Speak with our team",
      details: "(855) ROAM-HELP",
      action: "tel:8557626-4357"
    },
    {
      icon: MessageCircle,
      title: "Live Chat",
      description: "Chat with our AI assistant",
      details: "Available 24/7",
      action: () => setChatBotOpen(true)
    }
  ];

  const faqs = [
    {
      question: "How do I book a service?",
      answer: "Browse our services, select a provider, choose your preferred time, and complete the booking with secure payment."
    },
    {
      question: "How do I become a provider?",
      answer: "Apply through our 'Become a Provider' page. We welcome verified professionals in beauty, fitness, wellness, and healthcare."
    },
    {
      question: "What if I need to cancel my booking?",
      answer: "Cancellation policies vary by provider. Most allow cancellations up to 24 hours before your appointment."
    },
    {
      question: "How does payment work?",
      answer: "We use secure payment processing. You'll see exact pricing before booking with no hidden fees."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-roam-blue to-roam-light-blue text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl font-bold mb-4">
              Get in Touch with ROAM
            </h1>
            <p className="text-xl text-white/90 mb-6">
              We're here to help you with any questions about our platform, services, or becoming a provider.
            </p>
            <Button
              onClick={() => setChatBotOpen(true)}
              size="lg"
              variant="secondary"
              className="bg-white text-roam-blue hover:bg-white/90"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Start Live Chat
            </Button>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Contact Methods */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold mb-6">Contact Information</h2>
              <div className="space-y-4">
                {contactMethods.map((method, index) => {
                  const Icon = method.icon;
                  const isClickable = method.action && typeof method.action === 'string';
                  const isButton = method.action && typeof method.action === 'function';
                  
                  const content = (
                    <Card className={`${isClickable || isButton ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-roam-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Icon className="w-5 h-5 text-roam-blue" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{method.title}</h3>
                            <p className="text-sm text-foreground/60 mb-1">{method.description}</p>
                            <p className="text-sm font-medium text-roam-blue">{method.details}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );

                  if (isButton) {
                    return (
                      <div key={index} onClick={method.action as () => void}>
                        {content}
                      </div>
                    );
                  } else if (isClickable) {
                    return (
                      <a key={index} href={method.action as string}>
                        {content}
                      </a>
                    );
                  } else {
                    return <div key={index}>{content}</div>;
                  }
                })}
              </div>

              {/* Quick Links */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-roam-blue" />
                    Quick Help
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/my-bookings">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Manage My Bookings
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/become-a-provider">
                      <Users className="w-4 h-4 mr-2" />
                      Become a Provider
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link to="/about">
                      <Building className="w-4 h-4 mr-2" />
                      About ROAM
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Send us a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 24 hours.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="John Doe"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full p-2 border border-input bg-background rounded-md text-sm"
                      >
                        <option value="general">General Inquiry</option>
                        <option value="booking">Booking Support</option>
                        <option value="provider">Provider Questions</option>
                        <option value="technical">Technical Issues</option>
                        <option value="billing">Billing & Payments</option>
                        <option value="feedback">Feedback & Suggestions</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        name="subject"
                        placeholder="How can we help you?"
                        value={formData.subject}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Please provide details about your inquiry..."
                        rows={5}
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                        disabled={isSubmitting}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full bg-roam-blue hover:bg-roam-blue/90"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Send className="w-4 h-4 mr-2 animate-pulse" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="mt-16">
            <h2 className="text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {faqs.map((faq, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <h3 className="font-semibold text-lg mb-3 text-roam-blue">
                      {faq.question}
                    </h3>
                    <p className="text-foreground/70 leading-relaxed">
                      {faq.answer}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Additional Support */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-r from-roam-blue/5 to-roam-light-blue/5 border-roam-blue/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Need Immediate Help?</h3>
                <p className="text-foreground/70 mb-6 max-w-2xl mx-auto">
                  Our AI-powered chat assistant is available 24/7 to help answer your questions instantly. 
                  For complex issues, our support team is available during business hours.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setChatBotOpen(true)}
                    size="lg"
                    className="bg-roam-blue hover:bg-roam-blue/90"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat with AI Assistant
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href="mailto:contactus@roamyourbestlife.com">
                      <Mail className="w-5 h-5 mr-2" />
                      Email Support
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ChatBot Component */}
      <ChatBot isOpen={chatBotOpen} onClose={() => setChatBotOpen(false)} />
    </div>
  );
}
