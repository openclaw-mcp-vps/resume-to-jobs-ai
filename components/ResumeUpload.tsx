"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Loader2, FileUp, ArrowRight } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ParsedResume } from "@/lib/types";

const formSchema = z.object({
  resumeText: z
    .string()
    .min(180, "Paste at least 180 characters so we can extract useful signals.")
});

type FormValues = z.infer<typeof formSchema>;

type FlowStage =
  | "idle"
  | "parsing"
  | "searching"
  | "writing"
  | "complete";

export function ResumeUpload() {
  const router = useRouter();
  const [stage, setStage] = useState<FlowStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      resumeText: ""
    }
  });

  const stageLabel = useMemo(() => {
    if (stage === "parsing") return "Parsing your resume";
    if (stage === "searching") return "Searching and ranking job leads";
    if (stage === "writing") return "Generating personalized pitch emails";
    if (stage === "complete") return "Done";
    return "";
  }, [stage]);

  async function handlePdfUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setFileName(file.name);
    setErrorMessage(null);

    try {
      const bytes = await file.arrayBuffer();
      const uint8 = new Uint8Array(bytes);
      let binary = "";
      for (const byte of uint8) {
        binary += String.fromCharCode(byte);
      }
      const base64 = btoa(binary);

      setStage("parsing");
      const response = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pdfBase64: base64
        })
      });

      if (!response.ok) {
        throw new Error("Could not parse this PDF. Try pasting plain text instead.");
      }

      const payload = (await response.json()) as {
        resumeText: string;
        parsedResume: ParsedResume;
      };

      form.setValue("resumeText", payload.resumeText);
      setParsed(payload.parsedResume);
      setStage("idle");
    } catch (error) {
      setStage("idle");
      setErrorMessage(
        error instanceof Error ? error.message : "PDF upload failed."
      );
    }
  }

  async function onSubmit(values: FormValues) {
    setErrorMessage(null);

    try {
      setStage("parsing");
      const parseResponse = await fetch("/api/parse-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ resumeText: values.resumeText })
      });

      if (!parseResponse.ok) {
        throw new Error("Resume parsing failed. Please review your resume text.");
      }

      const parsePayload = (await parseResponse.json()) as {
        resumeText: string;
        parsedResume: ParsedResume;
      };

      setParsed(parsePayload.parsedResume);

      setStage("searching");
      const searchResponse = await fetch("/api/search-jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeText: parsePayload.resumeText,
          parsedResume: parsePayload.parsedResume
        })
      });

      if (!searchResponse.ok) {
        throw new Error("Job search failed. Please retry in a minute.");
      }

      const searchPayload = (await searchResponse.json()) as {
        resultId: string;
        jobsCount: number;
      };

      setStage("writing");
      const pitchResponse = await fetch("/api/generate-pitches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resultId: searchPayload.resultId
        })
      });

      if (!pitchResponse.ok) {
        throw new Error("Pitch email generation failed. Please retry.");
      }

      setStage("complete");
      router.push(`/results/${searchPayload.resultId}`);
    } catch (error) {
      setStage("idle");
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paste your resume</CardTitle>
          <CardDescription>
            We extract skill signals, experience, and role preferences to rank jobs by fit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Textarea
              placeholder="Paste your full resume text here..."
              className="min-h-56"
              {...form.register("resumeText")}
            />
            {form.formState.errors.resumeText ? (
              <p className="text-sm text-rose-300">
                {form.formState.errors.resumeText.message}
              </p>
            ) : null}

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 hover:text-slate-200">
                <FileUp className="h-4 w-4" />
                <span>{fileName ? `Loaded: ${fileName}` : "Or upload PDF"}</span>
                <Input
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfUpload}
                  className="hidden"
                />
              </label>
              <Button type="submit" size="lg" disabled={stage !== "idle"}>
                {stage !== "idle" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {stageLabel}
                  </>
                ) : (
                  <>
                    Find 20 jobs and write pitches
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {parsed ? (
        <Card>
          <CardHeader>
            <CardTitle>Extracted candidate profile</CardTitle>
            <CardDescription>{parsed.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{parsed.yearsExperience}+ years</Badge>
              <Badge variant="muted">{parsed.seniority} level</Badge>
              {parsed.desiredTitles.map((title) => (
                <Badge key={title} variant="default">
                  {title}
                </Badge>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {parsed.skills.slice(0, 12).map((skill) => (
                <Badge key={skill} variant="muted">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-rose-800 bg-rose-950/20">
          <CardContent className="p-4 text-sm text-rose-200">{errorMessage}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
