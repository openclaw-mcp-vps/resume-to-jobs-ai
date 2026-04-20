import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const faqs = [
  {
    question: "How are jobs ranked?",
    answer:
      "Each lead gets a fit score based on your skills, years of experience, seniority signal, location preference, and salary strength. You see exactly why a job ranked high."
  },
  {
    question: "Do I need to connect my LinkedIn or email?",
    answer:
      "No. Paste your resume, run the scan, and copy the pitch emails you want to send."
  },
  {
    question: "Is this a subscription?",
    answer:
      "You can run it as a one-time purchase or keep monthly access for fresh job leads as the market shifts."
  },
  {
    question: "Will this work for 2-5 years experience engineers?",
    answer:
      "Yes. The scoring defaults are tuned for early-to-mid career software engineers navigating growth-stage and established teams."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
        <header className="flex items-center justify-between">
          <div className="text-lg font-semibold tracking-tight">Resume-to-Jobs AI</div>
          <Link href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">
            Dashboard
          </Link>
        </header>

        <section className="mt-14 grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <Badge className="mb-4">Career tools for software engineers</Badge>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">
              Paste your resume.
              <br />
              Get 20 high-fit job leads with salary and pitch emails.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              Stop spending nights on scattered job boards. We parse your resume,
              pull live software engineering openings, score fit, and draft outreach
              emails you can send in minutes.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/dashboard">
                <Button size="lg">
                  Start now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button size="lg" variant="secondary">
                  View pricing
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-400">
              Built for engineers with 2-5 years experience.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>What you get in one run</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                20 ranked software roles matched to your profile
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Salary range estimates for every lead
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                Personalized pitch emails for each opportunity
              </div>
              <div className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-100">
                <p className="font-medium">Typical time saved:</p>
                <p className="mt-1 text-sm">
                  4-6 hours/week on job search and first-contact outreach.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold md:text-3xl">The problem</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold">Fragmented search</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Good software roles are scattered across aggregators,
                  company boards, and niche remote feeds.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold">Weak fit signal</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Most boards show relevance by keyword, not by your
                  experience level and stack depth.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold">Outreach bottleneck</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Personalized first-contact emails take time, so strong
                  opportunities get delayed.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-2xl font-semibold md:text-3xl">The solution</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <Sparkles className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-3 font-semibold">AI resume parser</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Extracts core skills, years of experience, seniority, and role intent.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Zap className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-3 font-semibold">Live job aggregation</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Pulls current software engineering openings and enriches salary visibility.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                <h3 className="mt-3 font-semibold">Action-ready output</h3>
                <p className="mt-2 text-sm text-slate-400">
                  Delivers top matches plus personalized pitch emails you can copy and send.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="pricing" className="mt-20">
          <h2 className="text-2xl font-semibold md:text-3xl">Pricing</h2>
          <div className="mt-6 max-w-xl">
            <Card className="border-cyan-400/30 bg-cyan-500/5">
              <CardHeader>
                <CardTitle className="text-2xl">$19</CardTitle>
                <p className="text-sm text-slate-300">One-time run or monthly access</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>Includes full resume analysis, 20 ranked leads, and 20 pitch emails.</p>
                <p>
                  Perfect for focused job-search sprints when you need speed without
                  self-hosting any infrastructure.
                </p>
                <Link href="/dashboard">
                  <Button size="lg" className="mt-2 w-full">
                    Unlock tool
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="mt-20 pb-8">
          <h2 className="text-2xl font-semibold md:text-3xl">FAQ</h2>
          <div className="mt-6 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <summary className="cursor-pointer font-medium">{faq.question}</summary>
                <p className="mt-3 text-sm text-slate-400">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
