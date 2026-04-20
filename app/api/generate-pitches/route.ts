import { NextResponse } from "next/server";
import { z } from "zod";
import { generatePitches } from "@/lib/ai";
import {
  getSearchResult,
  isAccessTokenPaid,
  updateSearchResultPitches
} from "@/lib/database";

export const runtime = "nodejs";

const bodySchema = z.object({
  resultId: z.string().min(10)
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

    const { resultId } = bodySchema.parse(await request.json());

    const record = await getSearchResult(resultId);
    if (!record) {
      return NextResponse.json({ error: "Result not found." }, { status: 404 });
    }

    const pitches = await generatePitches(record.parsedResume, record.jobs);
    await updateSearchResultPitches(record.id, pitches);

    return NextResponse.json({
      resultId: record.id,
      pitchCount: pitches.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
