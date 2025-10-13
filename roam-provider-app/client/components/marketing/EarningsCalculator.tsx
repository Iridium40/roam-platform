import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

function formatCurrency(n: number) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export default function EarningsCalculator() {
  const [price, setPrice] = useState<number>(100);
  const [bookings, setBookings] = useState<number>(10);

  const weekly = useMemo(() => price * bookings, [price, bookings]);
  const monthly = useMemo(() => weekly * 4, [weekly]);
  const annual = useMemo(() => weekly * 52, [weekly]);

  return (
    <section id="calculator" className="container py-12 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          See Your Potential with ROAM
        </h2>
        <p className="mt-3 text-muted-foreground">
          You keep every dollar of your service price. Customers pay the
          platform fee.
        </p>
      </div>
      <div className="mx-auto mt-8 grid max-w-5xl gap-8 rounded-2xl border bg-white/60 p-6 shadow-sm backdrop-blur lg:grid-cols-2 lg:p-10">
        <div>
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <label className="text-sm font-medium">
                  Your Average Service Price Cost
                </label>
                <span className="text-sm tabular-nums">
                  {formatCurrency(price)}
                </span>
              </div>
              <Slider
                value={[price]}
                min={40}
                max={300}
                step={5}
                onValueChange={(v) => setPrice(v[0])}
              />
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>$40</span>
                <span>$300</span>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-end justify-between">
                <label className="text-sm font-medium">
                  Target Bookings per Week
                </label>
                <span className="text-sm tabular-nums">{bookings}</span>
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
          <p className="mt-4 text-sm text-muted-foreground">
            No commissions. No hidden fees. Your earnings are your earnings.
          </p>
          <Button className="mt-6 w-full" asChild>
            <a href="/apply">Start Earning →</a>
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
