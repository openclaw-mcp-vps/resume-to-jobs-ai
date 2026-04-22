"use client";

import { BriefcaseBusiness, ExternalLink, MapPin, Sparkles, Wallet } from "lucide-react";
import type { JobLead, PitchEmailDraft } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PitchEmail } from "@/components/PitchEmail";
import { Button } from "@/components/ui/button";

type JobResultsProps = {
  jobs: JobLead[];
  pitches: PitchEmailDraft[];
  loadingPitches: boolean;
};

function formatSalary(job: JobLead) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.salaryCurrency,
    maximumFractionDigits: 0,
  });

  return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
}

export function JobResults({ jobs, pitches, loadingPitches }: JobResultsProps) {
  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-[#9ba6b2]">
            No matching jobs were found right now. Update your resume text with clearer target roles and skills, then rerun.
          </p>
        </CardContent>
      </Card>
    );
  }

  const pitchMap = new Map(pitches.map((pitch) => [pitch.jobId, pitch]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-[#f0f6fc]">Top {jobs.length} ranked matches</h3>
        <Badge className="gap-1 border-[#2f81f7]/50 bg-[#2f81f7]/15 text-[#9cc2ff]">
          <Sparkles className="h-3.5 w-3.5" />
          Ranked by skill overlap, seniority fit, and salary confidence
        </Badge>
      </div>

      <div className="grid gap-4">
        {jobs.map((job, index) => {
          const pitch = pitchMap.get(job.id);

          return (
            <Card key={job.id} className="overflow-hidden border-[#2a3441]">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg text-[#f0f6fc]">
                      #{index + 1} {job.title}
                    </CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <BriefcaseBusiness className="h-4 w-4" />
                        {job.company}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="space-y-2 text-right">
                    <Badge className="border-[#20c99733] bg-[#20c99722] text-[#88f5d0]">{job.matchScore}% match</Badge>
                    <Badge className="ml-auto flex w-fit items-center gap-1 border-[#30363d] bg-[#121923] text-[#d0d7de]">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatSalary(job)}
                      {job.salaryConfidence === "estimated" ? " (estimated)" : ""}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-[#c9d1d9]">{job.matchReason}</p>
                <p className="line-clamp-3 text-sm leading-6 text-[#8b949e]">{job.description}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                  onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}
                >
                  Open Job Posting
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>

                {loadingPitches && !pitch ? (
                  <Card className="border-[#30363d] bg-[#0b1118]">
                    <CardContent className="py-4 text-sm text-[#9ba6b2]">
                      Building outreach pitch tailored to this role...
                    </CardContent>
                  </Card>
                ) : null}

                {pitch ? <PitchEmail pitch={pitch} company={job.company} title={job.title} /> : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
