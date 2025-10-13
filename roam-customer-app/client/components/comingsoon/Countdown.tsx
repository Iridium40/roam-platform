import { useEffect, useMemo, useState } from "react";

function getTimeRemaining(target: Date) {
  const total = Math.max(0, target.getTime() - Date.now());
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
}

export default function Countdown({ date }: { date?: string }) {
  const target = useMemo(() => {
    if (date) return new Date(date);
    const d = new Date();
    d.setDate(d.getDate() + 30); // default: 30 days from now
    return d;
  }, [date]);

  const [time, setTime] = useState(() => getTimeRemaining(target));

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeRemaining(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const items = [
    { label: "Days", value: time.days },
    { label: "Hours", value: time.hours },
    { label: "Minutes", value: time.minutes },
    { label: "Seconds", value: time.seconds },
  ];

  return (
    <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border bg-card px-6 py-5 text-center shadow-sm"
          aria-label={`${it.value} ${it.label}`}
        >
          <div className="text-4xl font-extrabold tabular-nums tracking-tight">
            {String(it.value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-foreground/70">
            {it.label}
          </div>
        </div>
      ))}
    </div>
  );
}
