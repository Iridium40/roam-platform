import { PRIVACY_POLICY_CONTENT as P } from "@/lib/legal/privacy-policy-content";
import { Badge } from "@/components/ui/badge";

export default function PrivacyPolicy() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <Badge variant="outline">Version {P.version}</Badge>
            <Badge variant="outline">Effective {P.effectiveDate}</Badge>
            <Badge variant="outline">Updated {P.lastUpdated}</Badge>
          </div>
        </header>

        <section className="mt-8 rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">{P.summary.title}</h2>
          <p className="mt-1 text-muted-foreground">{P.summary.description}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {P.summary.keyCommitments.map((k) => (
              <li key={k} className="rounded-lg border bg-white/70 p-3 text-sm">
                {k}
              </li>
            ))}
          </ul>
        </section>

        <nav className="mt-8 rounded-xl border bg-card p-4 text-sm">
          <div className="mb-2 font-semibold">Contents</div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {P.sections.map((s) => (
              <li key={s.id}>
                <a className="text-primary underline-offset-4 hover:underline" href={`#${s.id}`}>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="mt-8 space-y-10">
          {P.sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h3 className="mb-3 text-xl font-semibold">{s.title}</h3>
              <div className="whitespace-pre-line leading-relaxed text-[15px] text-foreground/90">
                {s.content}
              </div>
            </section>
          ))}
        </article>

        <section className="mt-10 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold">{P.acknowledgment.title}</h3>
          <div className="whitespace-pre-line text-[15px] text-foreground/90">{P.acknowledgment.content}</div>
        </section>
      </div>
    </div>
  );
}
