import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthorizedEmailFromRequest } from "@/lib/access";
import { analyzeResumeWithAI } from "@/lib/openai";

const analyzeResumeSchema = z.object({
  resumeText: z.string().min(300).max(50_000),
});

export async function POST(request: NextRequest) {
  const authorizedEmail = await getAuthorizedEmailFromRequest(request);
  if (!authorizedEmail) {
    return NextResponse.json({ error: "Purchase required to use the job matching tool." }, { status: 403 });
  }

  try {
    const payload = analyzeResumeSchema.parse(await request.json());
    const profile = await analyzeResumeWithAI(payload.resumeText);

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid resume text." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to analyze resume." }, { status: 500 });
  }
}
