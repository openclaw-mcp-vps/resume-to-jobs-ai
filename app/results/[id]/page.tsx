import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowLeft, Mail, Target } from "lucide-react";
import { JobCard } from "@/components/JobCard";
import { PitchEmail } from "@/components/PitchEmail";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSearchResult, isAccessTokenPaid } from "@/lib/database";

export default async function ResultsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const accessToken = cookieStore.get("rtj_access")?.value ?? "";
  const hasAccess = accessToken ? await isAccessTokenPaid(accessToken) : false;

  if (!hasAccess) {
    redirect("/dashboard");
  }

  const result = await getSearchResult(id);

  if (!result) {
    notFound();
  }

  const pitchByJob = new Map(result.pitches.map((pitch) => [pitch.jobId, pitch]));

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">Resume-to-Jobs AI</p>
            <h1 className="text-3xl font-bold tracking-tight">Your ranked job matches</h1>
          </div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Candidate profile snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-300">{result.parsedResume.summary}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{result.parsedResume.yearsExperience}+ years experience</Badge>
              <Badge variant="muted">{result.parsedResume.seniority} level</Badge>
              {result.parsedResume.desiredTitles.map((title) => (
                <Badge key={title} variant="default">
                  {title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-semibold">Top 20 ranked job leads</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {result.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-cyan-300" />
            <h2 className="text-2xl font-semibold">Personalized pitch emails</h2>
          </div>
          <div className="space-y-4">
            {result.jobs.map((job) => {
              const pitch = pitchByJob.get(job.id);
              if (!pitch) {
                return null;
              }

              return (
                <PitchEmail
                  key={job.id}
                  pitch={pitch}
                  company={job.company}
                  title={job.title}
                />
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
