import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Mail, 
  Clock, 
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
      const response = await fetch('/api/contact/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      // Check response status first before reading body
      if (!response.ok) {
        let errorMessage = 'Failed to submit contact form';
        try {
          const errorResult = await response.json();
          errorMessage = errorResult.error || errorMessage;
        } catch {
          // If we can't parse the error response, use the default message
        }
        throw new Error(errorMessage);
      }

      // Only read the body if response is ok
      const result = await response.json();

      toast({
        title: "Message Sent Successfully!",
        description: result.message || "We'll get back to you within 24 hours.",
      });

      // Reset form
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
        category: "general"
      });
    } catch (error: any) {
      console.error('Contact form submission error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
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
      answer: "Browse our services, choose your preferred time, select a provider, choose your location and complete the booking with secure payment."
    },
    {
      question: "How do I become a provider?",
      answer: "Apply through our 'Become a Provider' page. We welcome verified professionals in beauty, fitness, wellness, and healthcare to name a few."
    },
    {
      question: "What if I need to cancel my booking?",
      answer: "You may cancel from your My Bookings page. Cancellations are allowed up to 24 hours before your appointment."
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
      <section className="relative py-20 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              Support
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 text-white flex items-center justify-center gap-4 animate-slide-up">
              Get in Touch with 
              <img
                src="/logo-white-notagline.png"
                alt="ROAM"
                className="h-[2.7rem] md:h-[3.375rem] w-auto inline-block"
              />
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 leading-relaxed animate-fade-in">
              We're here to help you with any questions about our platform, services, or becoming a provider.
            </p>
            <Button
              onClick={() => setChatBotOpen(true)}
              size="lg"
              className="bg-white text-roam-blue hover:bg-white/90 button-shine shadow-lg hover-scale animate-scale-in"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Chat with AI Assistant
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
                    <Card className={`border-0 shadow-lg rounded-2xl ${isClickable || isButton ? 'cursor-pointer card-hover' : ''}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground">{method.title}</h3>
                            <p className="text-sm text-foreground/60 mb-1 leading-relaxed">{method.description}</p>
                            <p className="text-sm font-semibold text-roam-blue">{method.details}</p>
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
              <Card className="mt-8 border-0 shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-roam-blue" />
                    Quick Help
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start border-2 hover:bg-roam-blue/5 hover:border-roam-blue">
                    <Link to="/my-bookings">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Manage My Bookings
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start border-2 hover:bg-roam-blue/5 hover:border-roam-blue">
                    <Link to="/become-a-provider">
                      <Users className="w-4 h-4 mr-2" />
                      Become a Provider
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start border-2 hover:bg-roam-blue/5 hover:border-roam-blue">
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
              <Card className="border-0 shadow-lg rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold">Send us a Message</CardTitle>
                  <CardDescription className="text-base">
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
                      size="lg"
                      className="w-full bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-md"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Send className="w-5 h-5 mr-2 animate-pulse" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5 mr-2" />
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
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              Frequently Asked Questions
            </h2>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {faqs.map((faq, index) => (
                <Card key={index} className="border-0 shadow-lg rounded-2xl card-hover">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-3 text-roam-blue">
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
            <Card className="border-0 shadow-2xl bg-gradient-to-br from-roam-blue/5 via-white to-roam-light-blue/5 rounded-3xl overflow-hidden">
              <CardContent className="p-12 md:p-16">
                <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-roam-blue/10 text-roam-blue">
                  24/7 Support
                </Badge>
                <h3 className="text-3xl md:text-4xl font-bold mb-4 gradient-text">Need Immediate Help?</h3>
                <p className="text-lg text-foreground/70 mb-8 max-w-2xl mx-auto leading-relaxed">
                  Our AI-powered chat assistant is available 24/7 to help answer your questions instantly. 
                  For complex issues, our support team is available during business hours.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    onClick={() => setChatBotOpen(true)}
                    size="lg"
                    className="bg-roam-blue hover:bg-roam-blue/90 button-shine shadow-lg hover-scale"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    Chat with AI Assistant
                  </Button>
                  <Button asChild size="lg" variant={undefined} className="border-2 border-roam-blue bg-background !text-roam-blue hover:!bg-roam-blue hover:!text-white shadow-lg hover-scale [&>*]:!text-inherit [&:hover>*]:!text-white">
                    <a href="mailto:contactus@roamyourbestlife.com" className="flex items-center !text-inherit hover:!text-white">
                      <Mail className="w-5 h-5 mr-2" />
                      <span className="!text-inherit">Email Support</span>
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
