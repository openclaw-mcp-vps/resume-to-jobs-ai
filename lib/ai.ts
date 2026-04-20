import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import type { JobLead, ParsedResume, PitchEmailModel } from "@/lib/types";
import type { NormalizedJob } from "@/lib/job-scrapers";

const openai = process.env.OPENAI_API_KEY
  ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const parsedResumeSchema = z.object({
  summary: z.string().min(20),
  yearsExperience: z.number().min(0).max(40),
  desiredTitles: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(5),
  locations: z.array(z.string()).min(1),
  seniority: z.enum(["junior", "mid", "senior"])
});

const pitchSchema = z.object({
  pitches: z.array(
    z.object({
      jobId: z.string(),
      subject: z.string().min(6),
      body: z.string().min(60)
    })
  )
});

const commonSkills = [
  "typescript",
  "javascript",
  "react",
  "next.js",
  "node.js",
  "python",
  "java",
  "go",
  "aws",
  "gcp",
  "docker",
  "kubernetes",
  "postgresql",
  "graphql",
  "rest api",
  "redis",
  "ci/cd",
  "testing",
  "tailwind",
  "microservices"
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function inferSeniority(yearsExperience: number): ParsedResume["seniority"] {
  if (yearsExperience >= 7) {
    return "senior";
  }
  if (yearsExperience >= 2) {
    return "mid";
  }
  return "junior";
}

function fallbackParseResume(resumeText: string): ParsedResume {
  const normalized = normalizeText(resumeText);

  const yearsMatch = [
    ...normalized.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)\s+of\s+experience/g)
  ];

  const experienceCandidates = yearsMatch
    .map((entry) => Number(entry[1]))
    .filter((value) => Number.isFinite(value));

  const yearsExperience = experienceCandidates.length
    ? Math.max(...experienceCandidates)
    : 3;

  const skills = commonSkills.filter((skill) => normalized.includes(skill));

  const desiredTitles: string[] = [];
  if (normalized.includes("backend")) desiredTitles.push("Backend Engineer");
  if (normalized.includes("frontend") || normalized.includes("react"))
    desiredTitles.push("Frontend Engineer");
  if (normalized.includes("full stack") || normalized.includes("fullstack"))
    desiredTitles.push("Full Stack Engineer");
  if (desiredTitles.length === 0) desiredTitles.push("Software Engineer");

  const locations: string[] = [];
  const locationCandidates = [
    "new york",
    "san francisco",
    "seattle",
    "austin",
    "boston",
    "chicago",
    "los angeles",
    "remote"
  ];

  for (const location of locationCandidates) {
    if (normalized.includes(location)) {
      locations.push(location.replace(/\b\w/g, (match) => match.toUpperCase()));
    }
  }

  if (locations.length === 0) {
    locations.push("Remote", "United States");
  }

  const summary = resumeText
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

  return {
    summary,
    yearsExperience,
    desiredTitles,
    skills: skills.length > 0 ? skills : ["typescript", "react", "node.js", "testing", "aws"],
    locations,
    seniority: inferSeniority(yearsExperience)
  };
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  if (!resumeText || resumeText.trim().length < 120) {
    throw new Error("Resume content is too short. Please paste your full resume.");
  }

  if (!openai) {
    return fallbackParseResume(resumeText);
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: parsedResumeSchema,
      prompt: `Extract a concise software-engineer profile from this resume.\n\nResume:\n${resumeText}`
    });

    return object;
  } catch {
    return fallbackParseResume(resumeText);
  }
}

function scoreJobFit(parsedResume: ParsedResume, job: NormalizedJob): JobLead {
  const reasons: string[] = [];
  let score = 0;

  const title = normalizeText(job.title);
  const description = normalizeText(job.description);

  for (const desiredTitle of parsedResume.desiredTitles) {
    const desired = normalizeText(desiredTitle);
    if (title.includes(desired.split(" ")[0])) {
      score += 20;
      reasons.push(`Title alignment with ${desiredTitle}`);
      break;
    }
  }

  let skillHits = 0;
  for (const skill of parsedResume.skills) {
    const normalizedSkill = normalizeText(skill);
    if (description.includes(normalizedSkill) || title.includes(normalizedSkill)) {
      skillHits += 1;
    }
  }
  const skillScore = Math.min(45, skillHits * 6);
  score += skillScore;
  if (skillHits > 0) {
    reasons.push(`Matched ${skillHits} core skill${skillHits > 1 ? "s" : ""}`);
  }

  if (job.remote) {
    score += 10;
    reasons.push("Remote-friendly role");
  }

  const locationText = normalizeText(job.location);
  if (
    parsedResume.locations.some((location) =>
      locationText.includes(normalizeText(location))
    )
  ) {
    score += 10;
    reasons.push("Location preference match");
  }

  const seniority = parsedResume.seniority;
  if (seniority === "senior" && /senior|staff|lead|principal/.test(title)) {
    score += 12;
    reasons.push("Seniority match");
  } else if (seniority === "mid" && /engineer|developer/.test(title)) {
    score += 10;
    reasons.push("Career stage match");
  } else if (seniority === "junior" && /junior|associate/.test(title)) {
    score += 12;
    reasons.push("Entry-level alignment");
  }

  if (job.salaryMin && job.salaryMin >= 115_000) {
    score += 8;
    reasons.push("Strong salary band");
  }

  const fitScore = Math.max(1, Math.min(99, score));

  return {
    ...job,
    fitScore,
    fitReasons: reasons.slice(0, 4)
  };
}

export function rankJobs(parsedResume: ParsedResume, jobs: NormalizedJob[]): JobLead[] {
  const ranked = jobs.map((job) => scoreJobFit(parsedResume, job));
  return ranked.sort((a, b) => b.fitScore - a.fitScore).slice(0, 20);
}

function fallbackPitch(
  parsedResume: ParsedResume,
  jobs: JobLead[]
): PitchEmailModel[] {
  return jobs.map((job) => {
    const topSkills = parsedResume.skills.slice(0, 3).join(", ");
    return {
      jobId: job.id,
      subject: `Application for ${job.title} at ${job.company}`,
      body: `Hi ${job.company} hiring team,\n\nI’m reaching out about the ${job.title} role. I have ${parsedResume.yearsExperience} years of engineering experience and a track record of shipping production systems with ${topSkills}.\n\nYour posting stood out because it emphasizes ${job.fitReasons[0]?.toLowerCase() || "practical impact"}. I can contribute quickly by owning scoped features end-to-end, partnering tightly with product, and communicating clearly across engineering and stakeholders.\n\nIf helpful, I’d love to share a few relevant project examples and discuss how I can support your roadmap.\n\nBest,\n[Your Name]`
    };
  });
}

export async function generatePitches(
  parsedResume: ParsedResume,
  jobs: JobLead[]
): Promise<PitchEmailModel[]> {
  if (jobs.length === 0) {
    return [];
  }

  if (!openai) {
    return fallbackPitch(parsedResume, jobs);
  }

  try {
    const prompt = `Create concise, personalized outreach emails for software engineering jobs.
Candidate profile:
${JSON.stringify(parsedResume, null, 2)}

Jobs:
${JSON.stringify(
  jobs.map((job) => ({
    jobId: job.id,
    title: job.title,
    company: job.company,
    fitReasons: job.fitReasons,
    topSkills: parsedResume.skills
  })),
  null,
  2
)}

Rules:
- Return one pitch per job
- 110-170 words each
- Keep tone confident, practical, and specific
- Mention one concrete fit reason per job
- No placeholders like [insert company]
`;

    const { object } = await generateObject({
      model: openai("gpt-4.1-mini"),
      schema: pitchSchema,
      prompt
    });

    const byJob = new Map(object.pitches.map((pitch) => [pitch.jobId, pitch]));
    const filled = jobs.map((job) => {
      const fromModel = byJob.get(job.id);
      if (fromModel) {
        return fromModel;
      }

      return fallbackPitch(parsedResume, [job])[0];
    });

    return filled;
  } catch {
    return fallbackPitch(parsedResume, jobs);
  }
}

export async function rewriteResumeSummary(
  parsedResume: ParsedResume
): Promise<string> {
  if (!openai) {
    return parsedResume.summary;
  }

  try {
    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      prompt: `Rewrite this resume summary into 2 high-impact sentences for recruiter outreach: ${parsedResume.summary}`
    });

    return text.trim();
  } catch {
    return parsedResume.summary;
  }
}
