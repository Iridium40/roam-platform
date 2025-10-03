import React from 'react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ 
  title, 
  description = "This page is coming soon!" 
}) => (
  <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-foreground/70">{description}</p>
    </div>
  </div>
);

export const CustomerFavorites = () => (
  <PlaceholderPage title="My Favorites" />
);
