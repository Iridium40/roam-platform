import React from 'react';
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/home/HomeHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SimpleHomeIndex() {
  // Mock data - no database fetching
  const mockFeaturedServices = [
    {
      id: "1",
      title: "Premium Massage",
      category: "Wellness",
      price: "$80",
      rating: 4.8,
      duration: "60 min"
    },
    {
      id: "2", 
      title: "Hair Styling",
      category: "Beauty",
      price: "$60",
      rating: 4.9,
      duration: "45 min"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      <HomeHero />
      
      {/* Featured Services Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-roam-blue mb-4">Featured Services</h2>
            <p className="text-lg text-gray-600">Discover our most popular services</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockFeaturedServices.map((service) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">{service.category}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-roam-blue">{service.price}</span>
                      <span className="text-sm text-gray-500">{service.duration}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-500">★</span>
                      <span className="text-sm">{service.rating}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-roam-blue text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to book your next service?</h2>
          <p className="text-xl mb-8">Join thousands of satisfied customers</p>
          <Button size="lg" variant="secondary">
            Browse All Services
          </Button>
        </div>
      </section>
    </div>
  );
}