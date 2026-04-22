"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Lock, UploadCloud, WandSparkles } from "lucide-react";
import type { JobLead, PitchEmailDraft, ResumeProfile } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { JobResults } from "@/components/JobResults";

const resumeSchema = z.object({
  resumeText: z
    .string()
    .min(300, "Paste at least 300 characters from your resume for accurate matching.")
    .max(50_000, "Resume text is too long. Keep it below 50,000 characters."),
});

type ResumeFormValues = z.infer<typeof resumeSchema>;

type ResumeUploadProps = {
  initialAccess: boolean;
};

export function ResumeUpload({ initialAccess }: ResumeUploadProps) {
  const [hasAccess, setHasAccess] = useState(initialAccess);
  const [unlockEmail, setUnlockEmail] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockSuccess, setUnlockSuccess] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [loadingPitches, setLoadingPitches] = useState(false);
  const [apiError, setApiError] = useState("");
  const [statusText, setStatusText] = useState("");

  const [profile, setProfile] = useState<ResumeProfile | null>(null);
  const [jobs, setJobs] = useState<JobLead[]>([]);
  const [pitches, setPitches] = useState<PitchEmailDraft[]>([]);

  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK;

  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      resumeText: "",
    },
  });

  async function handleUnlock() {
    setUnlockError("");
    setUnlockSuccess("");

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: unlockEmail }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok) {
        setUnlockError(data.error ?? "Unable to unlock access.");
        return;
      }

      setHasAccess(true);
      setUnlockSuccess("Access unlocked. You can now run your resume through the matcher.");
    } catch {
      setUnlockError("Network error while checking your purchase.");
    }
  }

  async function handleResumeFileUpload(file: File) {
    const text = await file.text();
    form.setValue("resumeText", text, { shouldValidate: true });
  }

  async function onSubmit(values: ResumeFormValues) {
    setApiError("");
    setStatusText("Analyzing your resume for role, skills, and seniority...");
    setIsRunning(true);
    setJobs([]);
    setPitches([]);

    try {
      const analyzeResponse = await fetch("/api/analyze-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeText: values.resumeText }),
      });

      const analyzedData = (await analyzeResponse.json()) as { profile?: ResumeProfile; error?: string };

      if (!analyzeResponse.ok || !analyzedData.profile) {
        throw new Error(analyzedData.error ?? "Failed to analyze resume.");
      }

      setProfile(analyzedData.profile);

      setStatusText("Searching multi-board job feeds and ranking best-fit roles...");
      const searchResponse = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: analyzedData.profile }),
      });

      const searchData = (await searchResponse.json()) as { jobs?: JobLead[]; error?: string };

      if (!searchResponse.ok || !searchData.jobs) {
        throw new Error(searchData.error ?? "Failed to search jobs.");
      }

      setJobs(searchData.jobs);

      setStatusText("Generating personalized outreach pitches for each matched role...");
      setLoadingPitches(true);
      const pitchResponse = await fetch("/api/generate-pitches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profile: analyzedData.profile, jobs: searchData.jobs }),
      });

      const pitchData = (await pitchResponse.json()) as { pitches?: PitchEmailDraft[]; error?: string };

      if (!pitchResponse.ok || !pitchData.pitches) {
        throw new Error(pitchData.error ?? "Failed to generate pitches.");
      }

      setPitches(pitchData.pitches);
      setStatusText("Done. Review your ranked leads and copy-ready pitch emails below.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error while running the matcher.";
      setApiError(message);
      setStatusText("");

      if (message.toLowerCase().includes("purchase required")) {
        setHasAccess(false);
      }
    } finally {
      setIsRunning(false);
      setLoadingPitches(false);
    }
  }

  if (!hasAccess) {
    return (
      <Card className="border-[#3b4552] bg-[#0d1117]/95">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#f0f6fc]">
            <Lock className="h-6 w-6 text-[#2f81f7]" />
            Tool access is paid
          </CardTitle>
          <CardDescription>
            Pay via Stripe checkout, then unlock with the same purchase email. Access stays active for your billing period.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <a
              href={process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK as string}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-md border border-[#2f81f7] bg-[#2f81f7] px-4 text-sm font-semibold text-white transition hover:bg-[#3f8cff]"
            >
              Buy Access - $19/month
            </a>
            <Input
              type="email"
              placeholder="Purchase email"
              value={unlockEmail}
              onChange={(event) => setUnlockEmail(event.target.value)}
            />
          </div>

          <Button type="button" variant="secondary" onClick={handleUnlock} className="h-11 w-full sm:w-auto">
            Unlock with purchase email
          </Button>

          {!paymentLink ? (
            <p className="text-sm text-[#ffb4b4]">Set NEXT_PUBLIC_STRIPE_PAYMENT_LINK to enable checkout.</p>
          ) : null}

          {unlockError ? (
            <p className="inline-flex items-center gap-2 text-sm text-[#ff9b9b]">
              <AlertCircle className="h-4 w-4" />
              {unlockError}
            </p>
          ) : null}

          {unlockSuccess ? (
            <p className="inline-flex items-center gap-2 text-sm text-[#8de3be]">
              <CheckCircle2 className="h-4 w-4" />
              {unlockSuccess}
            </p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-[#3b4552] bg-[#0d1117]/95">
        <CardHeader>
          <CardTitle className="text-2xl text-[#f0f6fc]">Run Your Resume Match</CardTitle>
          <CardDescription>
            Paste your resume text, then get ranked job leads and personalized pitch emails in under a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label htmlFor="resumeText" className="text-sm font-medium text-[#c9d1d9]">
                Resume text
              </label>
              <Textarea
                id="resumeText"
                placeholder="Paste your resume content including summary, experience bullets, technologies, and impact metrics."
                {...form.register("resumeText")}
              />
              {form.formState.errors.resumeText ? (
                <p className="text-sm text-[#ff9b9b]">{form.formState.errors.resumeText.message}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[#30363d] bg-[#161b22] px-3 py-2 text-sm text-[#d0d7de] transition hover:bg-[#1f2733]">
                <UploadCloud className="h-4 w-4" />
                Upload text file
                <input
                  type="file"
                  accept=".txt,.md,.rtf,text/plain,text/markdown"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void handleResumeFileUpload(file);
                    }
                  }}
                />
              </label>

              <Button type="submit" className="h-11" disabled={isRunning}>
                <WandSparkles className="mr-2 h-4 w-4" />
                {isRunning ? "Running pipeline..." : "Analyze resume + find jobs"}
              </Button>
            </div>
          </form>

          {statusText ? <p className="mt-4 text-sm text-[#9cc2ff]">{statusText}</p> : null}
          {apiError ? <p className="mt-3 text-sm text-[#ff9b9b]">{apiError}</p> : null}
          {profile ? (
            <div className="mt-4 rounded-md border border-[#30363d] bg-[#0b1118] p-3 text-sm text-[#b9c4cf]">
              <p>
                <span className="font-semibold text-[#d0d7de]">Detected profile:</span> {profile.seniority} {" | "}
                {profile.yearsExperience}+ years {" | "}
                {profile.topSkills.slice(0, 6).join(", ")}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <JobResults jobs={jobs} pitches={pitches} loadingPitches={loadingPitches} />
    </div>
  );
}
