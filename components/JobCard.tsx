import { ExternalLink, MapPin, Coins, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JobLead } from "@/lib/types";

function formatSalary(job: JobLead): string {
  if (!job.salaryMin || !job.salaryMax) {
    return "Salary not disclosed";
  }

  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: job.salaryCurrency || "USD",
    maximumFractionDigits: 0
  });

  return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
}

export function JobCard({ job }: { job: JobLead }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Fit: {job.fitScore}/100</Badge>
          <Badge variant="muted">{job.source}</Badge>
          {job.remote ? <Badge variant="default">Remote</Badge> : null}
        </div>
        <CardTitle className="text-lg leading-tight">{job.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm text-slate-300">
          <p className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-cyan-300" />
            <span>{job.company}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-cyan-300" />
            <span>{job.location}</span>
          </p>
          <p className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-cyan-300" />
            <span>{formatSalary(job)}</span>
          </p>
        </div>

        <ul className="space-y-1 text-xs text-slate-400">
          {job.fitReasons.map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>

        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          Open job listing <ExternalLink className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}
