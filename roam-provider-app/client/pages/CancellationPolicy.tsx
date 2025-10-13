import { CANCELLATION_POLICY_CONTENT } from "@/lib/legal/cancellation-policy-content";
import { Badge } from "@/components/ui/badge";

export default function CancellationPolicy() {
  const c = CANCELLATION_POLICY_CONTENT;
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Cancellation Policy</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <Badge variant="outline">Version {c.version}</Badge>
            <Badge variant="outline">Effective {c.effectiveDate}</Badge>
          </div>
        </header>

        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{c.summary.title}</h2>
          <p className="mt-1 text-muted-foreground">{c.summary.description}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {c.summary.keyPoints.map((p) => (
              <li key={p} className="rounded-lg border bg-white/70 p-3 text-sm">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <article className="mt-10 space-y-10">
          {c.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h3 className="mb-3 text-xl font-semibold">{s.title}</h3>
              <div className="whitespace-pre-line leading-relaxed text-[15px] text-foreground/90">
                {s.content}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
