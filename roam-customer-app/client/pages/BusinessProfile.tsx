import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, Clock, Building, User, CreditCard, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Business {
  id: string;
  business_name: string;
  description: string;
  image_url?: string;
  rating: number;
  review_count: number;
}

interface Service {
  id: string;
  name: string;
  description: string;
  min_price: number;
  duration_minutes: number;
  image_url?: string;
}

export default function BusinessProfile() {
  const { businessId } = useParams();
  const [searchParams] = useSearchParams();
  const { customer } = useAuth();
  const { toast } = useToast();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Check if user wants to book directly
  const shouldBook = searchParams.get('book') === 'true';

  // Load business details and services
  useEffect(() => {
    const loadBusinessAndServices = async () => {
      if (!businessId) return;
      
      try {
        // Load business details
        const { data: businessData, error: businessError } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('id', businessId)
          .single();

        if (businessError) throw businessError;
        
        setBusiness({
          id: businessData.id,
          business_name: businessData.business_name,
          description: businessData.description,
          image_url: businessData.image_url,
          rating: 4.5, // Mock data
          review_count: 25, // Mock data
        });

        // Load services for this business
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select(`
            id,
            name,
            description,
            min_price,
            duration_minutes,
            image_url
          `)
          .eq('is_active', true);

        if (!servicesError && servicesData) {
          setServices(servicesData);
        }

        // If user wants to book and there are services, redirect to first service
        if (shouldBook && servicesData && servicesData.length > 0) {
          const firstService = servicesData[0];
          window.location.href = `/book-service/${firstService.id}?business_id=${businessId}`;
          return;
        }

      } catch (error) {
        console.error('Error loading business:', error);
        toast({
          title: "Error",
          description: "Failed to load business details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadBusinessAndServices();
  }, [businessId, shouldBook, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-roam-blue mx-auto mb-4"></div>
          <p>Loading business details...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Business Not Found</h2>
          <Button asChild>
            <Link to="/">Return to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

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
        <div className="max-w-6xl mx-auto">
          {/* Business Header */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                {business.image_url ? (
                  <img src={business.image_url} alt={business.business_name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <Building className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {business.business_name}
                </h1>
                <p className="text-foreground/60 mb-4">
                  {business.description}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <span className="text-yellow-500">★</span>
                    <span className="ml-1">{business.rating}</span>
                    <span className="text-gray-500 ml-1">({business.review_count} reviews)</span>
                  </div>
                  <Badge variant="outline" className="text-sm">
                    Verified Business
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-lg mb-8">
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'overview'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'services'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Services ({services.length})
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`px-6 py-4 font-medium ${
                    activeTab === 'reviews'
                      ? 'border-b-2 border-roam-blue text-roam-blue'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Reviews
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-4">About {business.business_name}</h2>
                  <p className="text-gray-600 mb-6">
                    {business.description}
                  </p>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold mb-2">Business Information</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Verified business on ROAM</li>
                        <li>• Professional service providers</li>
                        <li>• Quality guaranteed</li>
                        <li>• Secure booking and payment</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Why Choose Us</h3>
                      <ul className="space-y-2 text-gray-600">
                        <li>• Experienced professionals</li>
                        <li>• Competitive pricing</li>
                        <li>• Flexible scheduling</li>
                        <li>• Customer satisfaction guarantee</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'services' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Available Services</h2>
                  {services.length > 0 ? (
                    <div className="grid gap-6">
                      {services.map((service) => (
                        <Card key={service.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                                  {service.image_url ? (
                                    <img src={service.image_url} alt={service.name} className="w-full h-full object-cover rounded-lg" />
                                  ) : (
                                    <Clock className="w-8 h-8 text-gray-400" />
                                  )}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{service.name}</h3>
                                  <p className="text-gray-600 text-sm">{service.description}</p>
                                  <div className="flex items-center gap-4 mt-2">
                                    <Badge variant="secondary" className="text-sm">
                                      ${service.min_price} starting
                                    </Badge>
                                    <Badge variant="outline" className="text-sm">
                                      {service.duration_minutes} minutes
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button asChild>
                                <Link to={`/book-service/${service.id}?business_id=${business.id}`}>
                                  <Calendar className="w-4 h-4 mr-2" />
                                  Book Now
                                </Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">
                        No Services Available
                      </h3>
                      <p className="text-gray-500">
                        This business doesn't have any services listed yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div>
                  <h2 className="text-2xl font-semibold mb-6">Customer Reviews</h2>
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center mb-4">
                      <span className="text-yellow-500 text-2xl">★</span>
                      <span className="text-2xl font-semibold ml-2">{business.rating}</span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Based on {business.review_count} reviews
                    </p>
                    <p className="text-gray-500">
                      Reviews coming soon! Be the first to review this business.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
