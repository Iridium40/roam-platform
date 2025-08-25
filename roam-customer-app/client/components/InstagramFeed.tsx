import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logger } from '@/utils/logger';
import {
  Instagram,
  Heart,
  MessageCircle,
  ExternalLink,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface InstagramPost {
  id: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  caption?: string;
  timestamp?: string;
  permalink: string;
  likes?: number;
  comments?: number;
}

interface InstagramFeedProps {
  className?: string;
  maxPosts?: number;
}

export default function InstagramFeed({
  className = "",
  maxPosts = 6,
}: InstagramFeedProps) {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<string>("");

  useEffect(() => {
    fetchInstagramPosts();
  }, [maxPosts]);

  const fetchInstagramPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if we're in development mode and API route isn't available
      const isDevelopment = import.meta.env.DEV;

      if (isDevelopment) {
        // Use mock data in development
        logger.debug("Development mode: Using mock Instagram data");
        const mockData = [
          {
            id: "1",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=400&fit=crop",
            caption:
              "Transform your look with our amazing beauty services! ✨ #ROAMBeauty #GlowUp #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 127,
            comments: 12,
          },
          {
            id: "2",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=400&fit=crop",
            caption:
              "Fitness goals achieved with our certified trainers 💪 #ROAMFitness #HealthyLifestyle #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 89,
            comments: 8,
          },
          {
            id: "3",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=400&h=400&fit=crop",
            caption:
              "Wellness Wednesday: Find your inner peace with our meditation experts 🧘‍♀️ #ROAMWellness #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 156,
            comments: 15,
          },
          {
            id: "4",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=400&fit=crop",
            caption:
              "Healthcare professionals you can trust 🏥 #ROAMHealthcare #TrustedCare #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 203,
            comments: 24,
          },
          {
            id: "5",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&h=400&fit=crop",
            caption:
              "Behind the scenes with our amazing service providers! 👥 #ROAMTeam #BehindTheScenes #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 78,
            comments: 6,
          },
          {
            id: "6",
            media_type: "IMAGE" as const,
            media_url:
              "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=400&h=400&fit=crop",
            caption:
              "Client transformation Tuesday! Another happy ROAM customer 🌟 #ROAMResults #Transformation #roam_yourbestlife",
            timestamp: new Date().toISOString(),
            permalink: "https://www.instagram.com/roam_yourbestlife/",
            likes: 342,
            comments: 31,
          },
        ];

        setPosts(mockData.slice(0, maxPosts));
        setDataSource("development_mock");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/instagram-feed?limit=${maxPosts}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setPosts(data.data);
        setDataSource(data.source);
        logger.debug(`Instagram data loaded from: ${data.source}`);
      } else {
        throw new Error(data.error || "Failed to fetch Instagram data");
      }
    } catch (err: any) {
      logger.error("Error fetching Instagram posts:", err);
      setError(err.message);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const truncateCaption = (caption: string, maxLength: number = 80) => {
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + "...";
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Instagram className="w-8 h-8 text-roam-blue" />
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Follow Our Journey
          </h2>
        </div>
        <p className="text-xl text-foreground/70 max-w-2xl mx-auto mb-6">
          Stay connected with ROAM on Instagram for the latest updates, client
          transformations, and behind-the-scenes content.
        </p>
        <Button
          asChild
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-3"
        >
          <a
            href="https://www.instagram.com/roam_yourbestlife/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <Instagram className="w-5 h-5" />
            Follow @roam_yourbestlife
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-roam-blue" />
          <span className="ml-2 text-foreground/70">
            Loading Instagram posts...
          </span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Unable to load Instagram posts
          </h3>
          <p className="text-foreground/70 mb-4">
            Don't worry! You can still visit our Instagram directly.
          </p>
          <Button
            onClick={fetchInstagramPosts}
            variant="outline"
            className="mr-3"
          >
            Try Again
          </Button>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <a
              href="https://www.instagram.com/roam_yourbestlife/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Instagram
            </a>
          </Button>
        </div>
      )}

      {/* Data Source Indicator (for debugging) */}
      {!loading && posts.length > 0 && dataSource && (
        <div className="text-center mb-6">
          <span className="text-xs text-foreground/50 bg-foreground/5 px-2 py-1 rounded">
            Data source:{" "}
            {dataSource === "instagram_api"
              ? "Live Instagram API"
              : "Fallback Content"}
          </span>
        </div>
      )}

      {/* Instagram Grid */}
      {!loading && !error && posts.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Card
                key={post.id}
                className="overflow-hidden group cursor-pointer hover:shadow-xl transition-all duration-300 border-border/50"
              >
                <div className="relative">
                  <img
                    src={post.media_url}
                    alt="Instagram post"
                    className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="text-white text-center">
                      <div className="flex items-center justify-center gap-6 mb-3">
                        <div className="flex items-center gap-2">
                          <Heart className="w-5 h-5" />
                          <span className="font-semibold">
                            {post.likes || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MessageCircle className="w-5 h-5" />
                          <span className="font-semibold">
                            {post.comments || 0}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm font-medium">View on Instagram</p>
                    </div>
                  </div>
                </div>
                <CardContent className="p-4">
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {truncateCaption(post.caption || "")}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-4 text-sm text-foreground/60">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{post.likes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{post.comments || 0}</span>
                      </div>
                    </div>
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-roam-blue hover:text-roam-blue/80 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Call to Action */}
          <div className="text-center mt-12">
            <p className="text-foreground/70 mb-4">
              Want to see more? Check out our full Instagram profile!
            </p>
            <Button
              asChild
              variant="outline"
              className="border-roam-blue text-roam-blue hover:bg-roam-blue hover:text-white"
            >
              <a
                href="https://www.instagram.com/roam_yourbestlife/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                View More Posts
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </>
      )}

      {/* No Posts State */}
      {!loading && !error && posts.length === 0 && (
        <div className="text-center py-12">
          <Instagram className="w-16 h-16 text-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No posts available
          </h3>
          <p className="text-foreground/70 mb-4">
            Check out our Instagram profile for the latest content!
          </p>
          <Button
            asChild
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <a
              href="https://www.instagram.com/roam_yourbestlife/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Instagram
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
