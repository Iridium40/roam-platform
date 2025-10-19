import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export function SEO({
  title = 'ROAM - Premium Wellness Services | Mobile Massage, IV Therapy, Fitness & More',
  description = 'Book verified wellness professionals for mobile, in-studio, and virtual services. Massage, IV therapy, beauty, fitness, and medical services delivered to your location in 30A Florida. 400+ licensed providers, 4.8⭐ rating.',
  keywords = 'wellness services, mobile massage, IV therapy, personal training, beauty services, healthcare at home, 30A wellness, Florida wellness',
  image = 'https://roamyourbestlife.com/og-image.jpg',
  url,
  type = 'website',
}: SEOProps) {
  const location = useLocation();
  const currentUrl = url || `https://roamyourbestlife.com${location.pathname}`;

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    updateMetaTag('name', 'description', description);
    updateMetaTag('name', 'keywords', keywords);

    // Update Open Graph tags
    updateMetaTag('property', 'og:title', title);
    updateMetaTag('property', 'og:description', description);
    updateMetaTag('property', 'og:image', image);
    updateMetaTag('property', 'og:url', currentUrl);
    updateMetaTag('property', 'og:type', type);

    // Update Twitter Card tags
    updateMetaTag('name', 'twitter:title', title);
    updateMetaTag('name', 'twitter:description', description);
    updateMetaTag('name', 'twitter:image', image);
    updateMetaTag('name', 'twitter:url', currentUrl);

    // Update canonical link
    updateCanonicalLink(currentUrl);
  }, [title, description, keywords, image, currentUrl, type]);

  return null;
}

function updateMetaTag(attribute: string, key: string, content: string) {
  let element = document.querySelector(`meta[${attribute}="${key}"]`);
  
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  
  element.setAttribute('content', content);
}

function updateCanonicalLink(url: string) {
  let link = document.querySelector('link[rel="canonical"]');
  
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  
  link.setAttribute('href', url);
}

// Predefined SEO configurations for different pages
export const SEO_CONFIG = {
  home: {
    title: 'ROAM - Book Premium Wellness Services | 30A Florida',
    description: 'Browse 400+ verified wellness professionals in 30A Florida. Book mobile massage, IV therapy, fitness training, beauty services & more. Instant booking, 4.8⭐ rating, flexible scheduling.',
    keywords: 'book wellness services, 30A massage, mobile spa Florida, personal trainer 30A, IV therapy Destin, beauty services Panama City, wellness professionals Florida',
  },
  about: {
    title: 'About ROAM - Our Mission & Values | Premium Wellness Platform',
    description: 'Learn about ROAM\'s mission to make wellness accessible to everyone. 10,000+ customers served, 400+ wellness professionals, 50,000+ appointments facilitated. Join our community today.',
    keywords: 'ROAM wellness, wellness platform mission, health services platform, mobile wellness company, 30A wellness',
  },
  services: {
    title: 'Wellness Services - Massage, IV Therapy, Fitness & More | ROAM',
    description: 'Explore our curated wellness services: Massage & Bodywork, IV Therapy, Medical Services, Beauty & Aesthetics, Fitness Training, and Lifestyle Wellness. Mobile, in-studio, and virtual options available.',
    keywords: 'wellness services, massage therapy, IV hydration, personal training, beauty services, medical house calls, fitness coaching, nutrition coaching',
  },
  howItWorks: {
    title: 'How ROAM Works - Simple 4-Step Booking Process',
    description: 'Book wellness services in 4 easy steps: Browse verified providers, select your service, pay securely, and enjoy. Real-time booking, transparent pricing, quality guaranteed.',
    keywords: 'how to book wellness services, wellness booking process, service marketplace, verified providers',
  },
  contact: {
    title: 'Contact ROAM - Get Help & Support | 24/7 AI Chat Available',
    description: 'Contact ROAM support team via email, phone, or 24/7 AI chat. Questions about bookings, services, or becoming a provider? We\'re here to help Mon-Fri 8AM-5PM CST.',
    keywords: 'ROAM contact, wellness services support, customer service, provider support',
  },
  becomeProvider: {
    title: 'Become a ROAM Provider - Join 400+ Wellness Professionals',
    description: 'Join ROAM as a wellness provider and grow your business. Flexible scheduling, dedicated customer base, automated payments, and professional support. Licensed professionals welcome.',
    keywords: 'become wellness provider, join ROAM, wellness professional opportunities, massage therapist jobs, personal trainer platform, beauty service provider',
  },
  whyroam: {
    title: 'Why ROAM - Wellness Services Delivered Your Way | Launching Soon',
    description: 'ROAM is revolutionizing wellness services with mobile, in-studio, and virtual options. Sign up for launch updates and be the first to experience premium wellness delivered anywhere you are.',
    keywords: 'ROAM platform, wellness marketplace, mobile wellness services, premium health services',
  },
};

export default SEO;

