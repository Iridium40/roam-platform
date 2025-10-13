import { TERMS_OF_SERVICE_CONTENT as T } from "@/lib/legal/terms-of-service-content";
import { Badge } from "@/components/ui/badge";

export default function TermsOfService() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <Badge variant="outline">Version {T.version}</Badge>
            <Badge variant="outline">Effective {T.effectiveDate}</Badge>
            <Badge variant="outline">Updated {T.lastUpdated}</Badge>
            <Badge variant="outline">{T.jurisdiction}</Badge>
          </div>
        </header>

        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{T.summary.title}</h2>
          <p className="mt-1 text-muted-foreground">{T.summary.description}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {T.summary.keyPoints.map((p) => (
              <li key={p} className="rounded-lg border bg-white/70 p-3 text-sm">
                {p}
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-8 rounded-xl border bg-card p-4 text-sm">
          <div className="mb-2 font-semibold">Contents</div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {T.sections.map((s) => (
              <li key={s.id}>
                <a className="text-primary underline-offset-4 hover:underline" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-8 space-y-10">
          {T.sections.map((s) => (
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
