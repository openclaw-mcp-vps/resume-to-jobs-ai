import { NextResponse } from "next/server";
import { z } from "zod";
import { parseResume, rankJobs } from "@/lib/ai";
import { createSearchResult, isAccessTokenPaid } from "@/lib/database";
import { fetchJobLeads } from "@/lib/job-scrapers";

export const runtime = "nodejs";

const parsedResumeSchema = z.object({
  summary: z.string(),
  yearsExperience: z.number(),
  desiredTitles: z.array(z.string()),
  skills: z.array(z.string()),
  locations: z.array(z.string()),
  seniority: z.enum(["junior", "mid", "senior"])
});

const bodySchema = z.object({
  resumeText: z.string().min(120),
  parsedResume: parsedResumeSchema.optional()
});

export async function POST(request: Request) {
  try {
    const accessToken = request.headers
      .get("cookie")
      ?.split(";")
      .find((entry) => entry.trim().startsWith("rtj_access="))
      ?.split("=")[1];

    const hasAccess = accessToken
      ? await isAccessTokenPaid(decodeURIComponent(accessToken))
      : false;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Payment required: unlock access on /dashboard." },
        { status: 402 }
      );
    }

    const body = bodySchema.parse(await request.json());

    const parsedResume = body.parsedResume ?? (await parseResume(body.resumeText));

    const allJobs = await fetchJobLeads(140);
    const rankedJobs = rankJobs(parsedResume, allJobs);

    if (rankedJobs.length < 5) {
      return NextResponse.json(
        { error: "Not enough live job data available. Please retry shortly." },
        { status: 503 }
      );
    }

    const record = await createSearchResult({
      resumeText: body.resumeText,
      parsedResume,
      jobs: rankedJobs
    });

    return NextResponse.json({
      resultId: record.id,
      jobsCount: rankedJobs.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
