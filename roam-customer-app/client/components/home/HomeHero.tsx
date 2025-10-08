import React from "react";

interface HomeHeroProps {
  className?: string;
}

export function HomeHero({ className = "" }: HomeHeroProps) {
  return (
    <section className={`py-20 lg:py-32 relative overflow-hidden ${className}`}>
      {/* Background Video */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Video container with responsive aspect ratio */}
        <div className="absolute inset-0 w-full h-full">
          <iframe
            src="https://www.youtube.com/embed/Z0A84Ev5Waw?autoplay=1&mute=1&loop=1&playlist=Z0A84Ev5Waw&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&vq=hd1080"
            className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto scale-110"
            style={{
              filter: "brightness(0.7)",
              pointerEvents: "none",
              aspectRatio: "16/9",
              transform: "translate(-50%, -50%) scale(1.1)",
            }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            title="Background Video"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-roam-blue/10 via-black/5 to-roam-yellow/10 pointer-events-none"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="mb-6">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F98c77fcac42745ca81f9db3fb7f4e366?format=webp&width=800"
              alt="ROAM Logo"
              className="mx-auto h-24 sm:h-32 lg:h-40 w-auto drop-shadow-lg"
            />
          </div>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            Florida's premier on-demand services marketplace. Connecting
            customers with verified professionals for premium services
            delivered anywhere.
          </p>
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-roam-blue/20 via-roam-light-blue/20 to-roam-yellow/20 px-6 py-2 rounded-full backdrop-blur-sm border border-white/20">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
              <span className="text-sm font-medium text-white uppercase tracking-wider">
                Discover Services
              </span>
              <div className="w-2 h-2 rounded-full bg-roam-yellow animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}