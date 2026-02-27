import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

const serviceExamples = [
  {
    category: "Massage Therapy",
    avgPrice: "$120-180",
    avgBookings: "8-15/week",
    topEarners: "$6,000+/mo",
  },
  {
    category: "Hair & Makeup",
    avgPrice: "$150-350",
    avgBookings: "5-12/week",
    topEarners: "$8,000+/mo",
  },
  {
    category: "IV Therapy",
    avgPrice: "$175-300",
    avgBookings: "10-20/week",
    topEarners: "$12,000+/mo",
  },
  {
    category: "Personal Training",
    avgPrice: "$80-150",
    avgBookings: "15-25/week",
    topEarners: "$7,500+/mo",
  },
];

export default function EarningsCalculator() {
  const [price, setPrice] = useState<number>(120);
  const [bookings, setBookings] = useState<number>(12);

  const weekly = useMemo(() => price * bookings, [price, bookings]);
  const monthly = useMemo(() => weekly * 4, [weekly]);
  const annual = useMemo(() => weekly * 52, [weekly]);

  return (
    <section id="calculator" className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Calculate Your Earning Potential
        </h2>
        <p className="mt-3 text-muted-foreground">
          You keep every dollar of your service price. Customers pay the
          platform fee — not you.
        </p>
      </div>

      {/* Service Examples */}
      <div className="mx-auto mt-8 max-w-5xl">
        <p className="text-sm font-medium text-center text-muted-foreground mb-4">
          What providers in your category typically earn on ROAM:
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {serviceExamples.map((ex) => (
            <div
              key={ex.category}
              className="rounded-xl border bg-card p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => {
                const avgPrice = parseInt(ex.avgPrice.split("-")[0].replace("$", ""));
                const avgBookings = parseInt(ex.avgBookings.split("-")[0]);
                setPrice(avgPrice);
                setBookings(avgBookings);
              }}
            >
              <div className="text-sm font-semibold text-foreground">{ex.category}</div>
              <div className="text-xs text-muted-foreground mt-1">{ex.avgPrice}/session</div>
              <div className="text-xs text-muted-foreground">{ex.avgBookings}</div>
              <div className="text-sm font-bold text-primary mt-2">{ex.topEarners}</div>
              <div className="text-xs text-muted-foreground">top earners</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-8 rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur lg:grid-cols-2 lg:p-10">
        <div>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <label className="text-sm font-medium">
                  Your Average Service Price
                </label>
                <span className="text-sm tabular-nums font-semibold">
                  {formatCurrency(price)}
                </span>
              </div>
              <Slider
                value={[price]}
                min={40}
                max={400}
                step={5}
                onValueChange={(v) => setPrice(v[0])}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>$40</span>
                <span>$400</span>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-end justify-between">
                <label className="text-sm font-medium">
                  Target Bookings per Week
                </label>
                <span className="text-sm tabular-nums font-semibold">{bookings}</span>
              </div>
              <Slider
                value={[bookings]}
                min={1}
                max={40}
                step={1}
                onValueChange={(v) => setBookings(v[0])}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>40</span>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-roam-yellow/10 border border-roam-yellow/30">
              <p className="text-sm text-foreground">
                <strong>Pro tip:</strong> Most ROAM providers see 2-3x more bookings during peak vacation season (March-August).
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-gradient-to-br from-secondary/30 to-primary/10 p-6">
          <div className="grid gap-4">
            <KPI label="Your Weekly Earnings" value={formatCurrency(weekly)} />
            <KPI
              label="Your Monthly Earnings"
              value={formatCurrency(monthly)}
            />
            <KPI
              label="Your Annual Earnings"
              value={formatCurrency(annual)}
              highlight
            />
          </div>
          <div className="mt-4 p-3 rounded-lg bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">
              <strong>On other platforms:</strong> You'd lose {formatCurrency(annual * 0.25)} to commissions.
              <br />
              <strong>On ROAM:</strong> You keep it all.
            </p>
          </div>
          <Button className="mt-6 w-full" asChild>
            <a href="/provider-portal">Start Earning Today →</a>
          </Button>
        </div>
      </div>
    </section>
  );
}

function KPI({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border bg-white/70 p-4 " +
        (highlight ? "ring-2 ring-primary" : "")
      }
    >
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
