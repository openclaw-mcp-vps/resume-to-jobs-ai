import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
import { z } from "zod";
import { parseResume } from "@/lib/ai";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    resumeText: z.string().optional(),
    pdfBase64: z.string().optional()
  })
  .refine((data) => Boolean(data.resumeText || data.pdfBase64), {
    message: "Provide resumeText or pdfBase64"
  });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { resumeText, pdfBase64 } = bodySchema.parse(json);

    let extractedResumeText = resumeText?.trim() ?? "";

    if (!extractedResumeText && pdfBase64) {
      const pdfBuffer = Buffer.from(pdfBase64, "base64");
      const parsedPdf = await pdfParse(pdfBuffer);
      extractedResumeText = parsedPdf.text.replace(/\s+\n/g, "\n").trim();
    }

    if (!extractedResumeText || extractedResumeText.length < 120) {
      return NextResponse.json(
        { error: "Resume content is too short to analyze." },
        { status: 400 }
      );
    }

    const parsedResume = await parseResume(extractedResumeText);

    return NextResponse.json({
      resumeText: extractedResumeText,
      parsedResume
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
