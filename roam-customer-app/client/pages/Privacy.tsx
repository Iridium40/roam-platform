import { PRIVACY_POLICY_CONTENT as P } from "@/lib/legal/privacy-policy-content";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/Header";
import { Shield, FileText, CheckCircle } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-roam-light-blue/10">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden bg-gradient-to-br from-roam-blue via-roam-blue/90 to-roam-light-blue">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 bg-white/20 text-white border-white/30 backdrop-blur-sm animate-fade-in">
              Legal
            </Badge>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white animate-slide-up">
              Privacy Policy
            </h1>
            <div className="flex items-center justify-center gap-3 text-sm flex-wrap mb-4">
              <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm">Effective {P.effectiveDate}</Badge>
            </div>
            <p className="text-base text-white/80 animate-fade-in">
              Learn how we protect your privacy and data
            </p>
          </div>
        </div>
      </section>

      <div className="container py-12 mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* Summary Section */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold">{P.summary.title}</h2>
            </div>
              <p className="text-foreground/70 mb-6 leading-relaxed">{P.summary.description}</p>
              <div className="grid gap-3 sm:grid-cols-2">
              {P.summary.keyCommitments.map((k) => (
                  <div key={k} className="rounded-xl border-2 border-roam-blue/20 bg-roam-blue/5 p-4 text-sm font-medium">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-roam-blue mt-0.5 flex-shrink-0" />
                      <span>{k}</span>
                    </div>
                  </div>
              ))}
              </div>
            </CardContent>
          </Card>

          {/* Table of Contents */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-sm">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold">Contents</h2>
              </div>
            <ol className="grid gap-2 sm:grid-cols-2">
                {P.sections.map((s, index) => (
                <li key={s.id}>
                    <a 
                      className="flex items-center gap-2 p-3 rounded-xl hover:bg-roam-blue/5 hover:border-roam-blue border border-transparent transition-all group" 
                      href={`#${s.id}`}
                    >
                      <span className="w-6 h-6 bg-roam-blue/10 rounded-lg flex items-center justify-center text-xs font-bold text-roam-blue flex-shrink-0 group-hover:bg-roam-blue group-hover:text-white transition-all">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium group-hover:text-roam-blue transition-all">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
            </CardContent>
          </Card>

          {/* Main Content */}
          <Card className="mb-8 border-0 shadow-lg rounded-2xl">
            <CardContent className="p-8 md:p-12">
              <article className="space-y-10">
                {P.sections.map((s, index) => (
              <section key={s.id} id={s.id} className="scroll-mt-24">
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-roam-blue to-roam-light-blue rounded-xl flex items-center justify-center shadow-sm flex-shrink-0 mt-1">
                        <span className="text-white font-bold">{index + 1}</span>
                      </div>
                      <h3 className="text-2xl font-bold">{s.title}</h3>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed text-[15px] text-foreground/80 bg-roam-blue/5 p-6 rounded-xl border border-roam-blue/20">
                  {s.content}
                </div>
              </section>
            ))}
          </article>
            </CardContent>
          </Card>

          {/* Acknowledgment */}
          <Card className="border-0 shadow-lg rounded-2xl bg-gradient-to-br from-roam-blue/5 via-white to-roam-light-blue/5">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-sm">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-bold">{P.acknowledgment.title}</h3>
              </div>
              <div className="whitespace-pre-line text-[15px] text-foreground/80 leading-relaxed bg-white p-6 rounded-xl border border-green-200">
                {P.acknowledgment.content}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

