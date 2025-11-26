import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 py-16 lg:py-24 items-center">
        <div>
          <img
            src="/roam-hero.png"
            alt="ROAM logo"
            className="mb-4 h-10 w-auto object-contain"
          />
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-foreground">
            Your Best Life. Everywhere.
          </h1>
          <p className="mt-4 text-lg text-foreground/80 max-w-xl">
            From beachfront bliss to at-home luxury, connect with vetted
            professionals in Beauty, Fitness, Therapy &amp; Healthcare. Book in
            minutes. Know the price. Stay in control.
          </p>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-foreground/80">
            <li>✓ All Providers Background-Checked</li>
            <li>✓ Transparent Pricing, No Hidden Fees</li>
            <li>✓ Secure Booking &amp; Private Communication</li>
            <li>✓ Rated 4.8/5 by 10,000+ Customers</li>
          </ul>
        </div>
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <img
              src="https://images.pexels.com/photos/18251621/pexels-photo-18251621.jpeg"
              alt="Beachfront balcony relaxation with ocean view"
              className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
            />
            <img
              src="https://images.pexels.com/photos/5793781/pexels-photo-5793781.jpeg"
              alt="Professional massage therapist at work"
              className="aspect-[4/3] w-full rounded-xl object-cover shadow-lg"
            />
          </div>
          <div className="mt-4 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2">
            {[
              "https://images.pexels.com/photos/5928243/pexels-photo-5928243.jpeg",
              "https://images.pexels.com/photos/3356170/pexels-photo-3356170.jpeg",
              "https://images.pexels.com/photos/5265161/pexels-photo-5265161.jpeg",
              "https://images.pexels.com/photos/7659873/pexels-photo-7659873.jpeg",
            ].map((src, i) => (
              <img
                key={i}
                src={src}
                alt="Lifestyle wellness"
                className="snap-center h-28 w-44 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(600px_300px_at_20%_10%,hsl(var(--primary)/0.15),transparent),radial-gradient(600px_300px_at_80%_20%,hsl(var(--secondary)/0.12),transparent)]" />
    </section>
  );
}
