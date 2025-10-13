import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Mail, Clock, ShieldCheck } from "lucide-react";

export default function Contact() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      message: String(fd.get("message") || ""),
    };

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to send");
      toast.success("Thanks! We'll be in touch shortly.");
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast.error(err?.message || "Could not send message");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_500px_at_10%_-20%,theme(colors.accent/0.25),transparent),radial-gradient(900px_400px_at_90%_10%,theme(colors.primary/0.2),transparent)]" />

      <section className="container py-12 text-center md:py-16">
        <div className="mx-auto max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Provider Success Team
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">Talk to a Provider Success Manager</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Questions, demos, partnerships—send a message and we’ll respond within one business day.
          </p>
        </div>
      </section>

      <section className="container pb-16">
        <div className="grid gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
              <div className="border-b bg-secondary/40 p-6">
                <h2 className="text-xl font-semibold">Send us a message</h2>
                <p className="mt-1 text-sm text-muted-foreground">We’ll route it to the right person and get back quickly.</p>
              </div>
              <form onSubmit={onSubmit} className="grid gap-6 p-6">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <label htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      required
                      autoComplete="name"
                      className="h-11 rounded-md border bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="grid gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      className="h-11 rounded-md border bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
                <div className="grid gap-2 sm:max-w-xs">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    autoComplete="tel"
                    className="h-11 rounded-md border bg-background px-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="message" className="text-sm font-medium">
                    How can we help?
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={7}
                    className="rounded-md border bg-background p-3 outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full sm:w-auto bg-[#f88221] text-white hover:bg-[#f88221]/90"
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </Button>
                  <Button type="reset" variant="outline" className="w-full sm:w-auto">
                    Clear
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree to be contacted about your inquiry.
                  </p>
                </div>
              </form>
            </div>
          </div>

          <aside className="lg:col-span-2">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="rounded-2xl border bg-white/70 p-6 backdrop-blur">
                <h3 className="text-base font-semibold">Contact details</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-primary" /> contactus@roamyourbestlife.com
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-primary" /> 7 days/week, 8am–10pm ET
                  </li>
                </ul>
                <a
                  href="mailto:contactus@roamyourbestlife.com"
                  className="mt-4 inline-flex w-full justify-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:w-auto"
                >
                  Email us directly
                </a>
              </div>

              <div className="rounded-2xl border bg-white/70 p-6 backdrop-blur">
                <h3 className="text-base font-semibold">Why contact our team?</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>See how ROAM brings you prepaid bookings</li>
                  <li>Get help setting up your provider profile</li>
                  <li>Learn best practices to maximize earnings</li>
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
