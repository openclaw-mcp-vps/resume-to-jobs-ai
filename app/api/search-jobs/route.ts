import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedEmailFromRequest } from "@/lib/access";
import { findRankedJobs } from "@/lib/job-scrapers";
import { rerankJobsWithAI } from "@/lib/openai";

const profileSchema = z.object({
  fullName: z.string(),
  email: z.string(),
  yearsExperience: z.number(),
  targetRoles: z.array(z.string()),
  topSkills: z.array(z.string()),
  summary: z.string(),
  preferredLocations: z.array(z.string()),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "no_preference"]),
  seniority: z.enum(["junior", "mid", "senior"]),
});

export async function POST(request: NextRequest) {
  const authorizedEmail = await getAuthorizedEmailFromRequest(request);
  if (!authorizedEmail) {
    return NextResponse.json({ error: "Purchase required to use the job matching tool." }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const profile = profileSchema.parse(payload.profile);

    const scrapedJobs = await findRankedJobs(profile, 25);
    const rerankedJobs = await rerankJobsWithAI(profile, scrapedJobs);

    return NextResponse.json({ jobs: rerankedJobs.slice(0, 20) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid profile payload." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to search jobs right now." }, { status: 500 });
  }
}
