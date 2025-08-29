import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  User,
  Clock,
  Tag,
  ExternalLink,
  BookOpen,
  TrendingUp,
  Lightbulb,
  Users,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Blog() {
  const blogPosts = [
    {
      id: 1,
      title: "How to Build a Successful Mobile Service Business",
      excerpt: "Learn the essential strategies for growing your mobile service business and attracting more clients in today's competitive market.",
      author: "ROAM Team",
      date: "January 15, 2024",
      readTime: "5 min read",
      category: "Business Tips",
      featured: true,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    },
    {
      id: 2,
      title: "The Future of On-Demand Services: Trends to Watch",
      excerpt: "Discover the latest trends shaping the on-demand service industry and how providers can adapt to stay ahead of the curve.",
      author: "ROAM Team",
      date: "January 10, 2024",
      readTime: "7 min read",
      category: "Industry Insights",
      featured: false,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2015&q=80",
    },
    {
      id: 3,
      title: "Maximizing Your Earnings: Pricing Strategies for Service Providers",
      excerpt: "Expert advice on setting competitive prices, managing costs, and maximizing your revenue as a mobile service provider.",
      author: "ROAM Team",
      date: "January 5, 2024",
      readTime: "6 min read",
      category: "Business Tips",
      featured: false,
      image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2011&q=80",
    },
    {
      id: 4,
      title: "Building Trust with Your Clients: Best Practices",
      excerpt: "Learn how to build lasting relationships with your clients through trust, transparency, and exceptional service delivery.",
      author: "ROAM Team",
      date: "December 28, 2023",
      readTime: "4 min read",
      category: "Customer Service",
      featured: false,
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2074&q=80",
    },
    {
      id: 5,
      title: "Technology Tools Every Mobile Service Provider Should Use",
      excerpt: "Discover the essential apps and tools that can streamline your business operations and improve customer experience.",
      author: "ROAM Team",
      date: "December 20, 2023",
      readTime: "8 min read",
      category: "Technology",
      featured: false,
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2025&q=80",
    },
    {
      id: 6,
      title: "Seasonal Marketing Strategies for Service Providers",
      excerpt: "How to adapt your marketing efforts throughout the year to capitalize on seasonal trends and customer needs.",
      author: "ROAM Team",
      date: "December 15, 2023",
      readTime: "5 min read",
      category: "Marketing",
      featured: false,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80",
    },
  ];

  const categories = [
    { name: "All", count: blogPosts.length },
    { name: "Business Tips", count: 2 },
    { name: "Industry Insights", count: 1 },
    { name: "Customer Service", count: 1 },
    { name: "Technology", count: 1 },
    { name: "Marketing", count: 1 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F38446bf6c22b453fa45caf63b0513e21?format=webp&width=800"
                alt="ROAM - Your Best Life. Everywhere."
                className="h-8 w-auto"
              />
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/landing">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Landing
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-full flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-roam-blue mb-4">
            ROAM Blog
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Insights, tips, and strategies to help you grow your mobile service business
          </p>
        </div>

        {/* Featured Post */}
        {blogPosts.filter(post => post.featured).map(post => (
          <Card key={post.id} className="mb-12 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
              <div className="relative h-64 lg:h-full">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-roam-blue text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                </div>
              </div>
              <CardContent className="p-8 flex flex-col justify-center">
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {post.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    {post.readTime}
                  </div>
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-1" />
                    {post.author}
                  </div>
                </div>
                <Badge variant="secondary" className="w-fit mb-4">
                  <Tag className="w-3 h-3 mr-1" />
                  {post.category}
                </Badge>
                <CardTitle className="text-2xl font-bold text-roam-blue mb-4">
                  {post.title}
                </CardTitle>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                <Button className="w-fit bg-roam-blue hover:bg-roam-blue/90">
                  Read Full Article
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </div>
          </Card>
        ))}

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Badge
                key={category.name}
                variant="outline"
                className="cursor-pointer hover:bg-roam-blue hover:text-white transition-colors"
              >
                {category.name} ({category.count})
              </Badge>
            ))}
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.filter(post => !post.featured).map((post) => (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Badge variant="secondary">
                    <Tag className="w-3 h-3 mr-1" />
                    {post.category}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                  <div className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    {post.date}
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {post.readTime}
                  </div>
                </div>
                <CardTitle className="text-lg font-bold text-roam-blue mb-3 line-clamp-2">
                  {post.title}
                </CardTitle>
                <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <User className="w-3 h-3 mr-1" />
                    {post.author}
                  </div>
                  <Button variant="ghost" size="sm" className="text-roam-blue">
                    Read More
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Newsletter Signup */}
        <Card className="mt-16 bg-gradient-to-r from-roam-light-blue/10 to-roam-blue/10 border-roam-light-blue/30">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-roam-blue rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-roam-blue mb-2">
              Stay Updated
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Get the latest insights and tips delivered to your inbox to help grow your business.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-roam-blue"
              />
              <Button className="bg-roam-blue hover:bg-roam-blue/90">
                Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
