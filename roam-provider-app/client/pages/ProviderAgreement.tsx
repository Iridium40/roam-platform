import { PROVIDER_POLICY_CONTENT } from "@/lib/legal/provider-policy-content";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText } from "lucide-react";

function downloadText() {
  const parts = [
    "ROAM PROVIDER SERVICES AGREEMENT",
    `Version: ${PROVIDER_POLICY_CONTENT.version}`,
    `Effective Date: ${PROVIDER_POLICY_CONTENT.effectiveDate}`,
    "",
    ...PROVIDER_POLICY_CONTENT.sections.flatMap((section) => [section.title, section.content, ""]),
  ];
  const blob = new Blob([parts.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ROAM-Provider-Agreement.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProviderAgreement() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">ROAM Provider Services Agreement</h1>
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <Badge variant="outline">Version {PROVIDER_POLICY_CONTENT.version}</Badge>
            <Badge variant="outline">Effective {PROVIDER_POLICY_CONTENT.effectiveDate}</Badge>
          </div>
          <div className="mt-4">
            <Button onClick={downloadText} className="bg-[#f88221] text-white hover:bg-[#f88221]/90">
              <Download className="mr-2 h-4 w-4" /> Download as Text
            </Button>
          </div>
        </div>

        <nav className="mb-8 rounded-xl border bg-card p-4 text-sm">
          <div className="mb-2 font-semibold">Contents</div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {PROVIDER_POLICY_CONTENT.sections.map((section) => (
              <li key={section.id}>
                <a className="text-primary underline-offset-4 hover:underline" href={`#${section.id}`}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="prose prose-slate max-w-none dark:prose-invert">
          {PROVIDER_POLICY_CONTENT.sections.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <h2 className="mb-3 text-xl font-semibold">{section.title}</h2>
              <div className="whitespace-pre-line leading-relaxed text-[15px] text-foreground/90">
                {section.content}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
