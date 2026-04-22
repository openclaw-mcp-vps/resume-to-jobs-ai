import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedEmailFromRequest } from "@/lib/access";
import { generatePitchEmailsWithAI } from "@/lib/openai";

const payloadSchema = z.object({
  profile: z.object({
    fullName: z.string(),
    email: z.string(),
    yearsExperience: z.number(),
    targetRoles: z.array(z.string()),
    topSkills: z.array(z.string()),
    summary: z.string(),
    preferredLocations: z.array(z.string()),
    remotePreference: z.enum(["remote", "hybrid", "onsite", "no_preference"]),
    seniority: z.enum(["junior", "mid", "senior"]),
  }),
  jobs: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      url: z.string().url(),
      description: z.string(),
      postedAt: z.string(),
      salaryMin: z.number(),
      salaryMax: z.number(),
      salaryCurrency: z.string(),
      salaryConfidence: z.enum(["listed", "estimated"]),
      matchScore: z.number(),
      matchReason: z.string(),
    }),
  ),
});

export async function POST(request: NextRequest) {
  const authorizedEmail = await getAuthorizedEmailFromRequest(request);
  if (!authorizedEmail) {
    return NextResponse.json({ error: "Purchase required to use the job matching tool." }, { status: 403 });
  }

  try {
    const payload = payloadSchema.parse(await request.json());
    const jobs = payload.jobs.slice(0, 20);
    const pitches = await generatePitchEmailsWithAI(payload.profile, jobs);

    return NextResponse.json({ pitches });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to generate pitches." }, { status: 500 });
  }
}
