import { ArrowRight, ChartNoAxesCombined, MailCheck, SearchCheck, ShieldCheck } from "lucide-react";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { hasAuthorizedPageAccess } from "@/lib/access";

const problems = [
  "Job search is fragmented across dozens of boards, requiring hours of manual filtering.",
  "Most listings hide salary ranges, forcing blind applications and wasted interview cycles.",
  "Even qualified engineers struggle to write personalized outreach quickly for each role.",
];

const solutionSteps = [
  {
    icon: SearchCheck,
    title: "Resume-aware role targeting",
    description:
      "We extract your seniority, stack, and impact profile, then map that against engineering roles where your experience is relevant.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Aggregated job + salary intelligence",
    description:
      "The pipeline pulls from multiple engineering job feeds and standardizes salary signals into usable compensation ranges.",
  },
  {
    icon: MailCheck,
    title: "One-click personalized pitches",
    description:
      "Each matched role includes a tailored outreach draft that references your likely strengths for that posting.",
  },
];

const faqs = [
  {
    q: "What happens after I pay?",
    a: "Use the same email in the unlock box and the app sets a secure access cookie. If the webhook is still syncing, retry after a few seconds.",
  },
  {
    q: "How accurate are salary estimates?",
    a: "When a listing includes salary, we show it as listed. When it does not, we estimate a range using role and seniority benchmarks so you can prioritize quickly.",
  },
  {
    q: "Do I need to upload files?",
    a: "No. Paste resume text directly. You can also upload plain-text resume files if you prefer.",
  },
  {
    q: "Is my resume data shared publicly?",
    a: "No. Resume text is processed only to produce your analysis, ranked leads, and pitch drafts.",
  },
];

export default async function HomePage() {
  const hasAccess = await hasAuthorizedPageAccess();

  return (
    <main className="relative mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_15%,rgba(47,129,247,0.22),transparent_35%),radial-gradient(circle_at_20%_75%,rgba(34,197,94,0.18),transparent_30%)]" />

      <section className="grid gap-8 py-10 md:grid-cols-[1.05fr_0.95fr] md:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-[#2f81f755] bg-[#2f81f722] px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[#9cc2ff]">
            Career tools for software engineers
          </p>
          <h1
            className="text-4xl font-bold leading-tight text-[#f0f6fc] sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Resume-to-Jobs AI.
            <br />
            20 ranked leads with salary and pitch emails.
          </h1>
          <p className="max-w-xl text-base leading-7 text-[#c9d1d9] sm:text-lg">
            Paste your resume once. The system analyzes your stack and experience, scans aggregated engineering job feeds, and returns 20 high-fit openings with compensation context and personalized outreach drafts.
          </p>

          <div className="flex flex-wrap gap-3">
            <a href="#tool">
              <Button className="h-11 px-6 text-sm font-semibold">
                Try the matcher
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </a>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#30363d] bg-[#161b22] px-6 text-sm font-semibold text-[#f0f6fc] transition hover:bg-[#1f2733]"
            >
              Buy access - $19/month
            </a>
          </div>
        </div>

        <Card className="border-[#2a3441] bg-[#0d1117]/95">
          <CardHeader>
            <CardTitle className="text-xl text-[#f0f6fc]">Who this is for</CardTitle>
            <CardDescription>Software engineers with 2-5 years experience actively changing jobs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-[#c9d1d9]">
            <p>
              Instead of spending weekends manually searching and writing custom outreach, you get a short list that is already ranked by likely fit.
            </p>
            <div className="space-y-2 rounded-lg border border-[#30363d] bg-[#111826] p-4">
              <p className="font-semibold text-[#f0f6fc]">What you receive each run</p>
              <p>1. Structured resume profile</p>
              <p>2. 20 ranked engineering job leads</p>
              <p>3. Salary range for each role</p>
              <p>4. Personalized pitch email for each lead</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {problems.map((problem) => (
          <Card key={problem} className="border-[#2a3441] bg-[#0b1118]/90">
            <CardContent className="pt-6">
              <p className="text-sm leading-6 text-[#c9d1d9]">{problem}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#8de3be]" />
          <h2 className="text-2xl font-semibold text-[#f0f6fc]" style={{ fontFamily: "var(--font-heading)" }}>
            How Resume-to-Jobs AI solves it
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {solutionSteps.map((step) => (
            <Card key={step.title} className="border-[#2a3441] bg-[#0f1722]/90 transition hover:-translate-y-0.5">
              <CardHeader>
                <step.icon className="h-5 w-5 text-[#9cc2ff]" />
                <CardTitle className="mt-3 text-lg text-[#f0f6fc]">{step.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-[#c9d1d9]">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <Card className="border-[#2f81f755] bg-[#101a2b]">
          <CardHeader>
            <CardTitle className="text-2xl text-[#f0f6fc]">Pricing</CardTitle>
            <CardDescription>Simple hosted workflow without self-host setup or maintenance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-4xl font-bold text-[#f0f6fc]">$19<span className="text-lg font-medium text-[#9ba6b2]">/month</span></p>
            <ul className="space-y-2 text-sm text-[#c9d1d9]">
              <li>20 ranked engineering leads per run</li>
              <li>Salary visibility with estimate fallback</li>
              <li>Personalized outreach emails ready to send</li>
              <li>Hosted app, no self-hosting required</li>
            </ul>
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#2f81f7] bg-[#2f81f7] px-6 text-sm font-semibold text-white transition hover:bg-[#3f8cff]"
            >
              Buy on Stripe
            </a>
          </CardContent>
        </Card>

        <Card className="border-[#2a3441] bg-[#0b1118]/90">
          <CardHeader>
            <CardTitle className="text-xl text-[#f0f6fc]">FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-md border border-[#30363d] bg-[#111826] p-3">
                <p className="text-sm font-semibold text-[#f0f6fc]">{faq.q}</p>
                <p className="mt-1 text-sm leading-6 text-[#c9d1d9]">{faq.a}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section id="tool" className="mt-16">
        <div className="mb-5">
          <h2 className="text-3xl font-semibold text-[#f0f6fc]" style={{ fontFamily: "var(--font-heading)" }}>
            Run the tool
          </h2>
          <p className="mt-2 text-sm text-[#9ba6b2]">
            Paid users can run the full resume-to-jobs pipeline below.
          </p>
        </div>
        <ResumeUpload initialAccess={hasAccess} />
      </section>
    </main>
  );
}
