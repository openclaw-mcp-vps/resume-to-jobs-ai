import OpenAI from "openai";
import { z } from "zod";
import type { JobLead, PitchEmailDraft, ResumeProfile } from "@/lib/types";

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

const resumeSchema = z.object({
  fullName: z.string().min(1).max(120),
  email: z.string().email().or(z.literal("")),
  yearsExperience: z.number().int().min(0).max(40),
  targetRoles: z.array(z.string().min(2).max(60)).min(1).max(8),
  topSkills: z.array(z.string().min(1).max(40)).min(3).max(20),
  summary: z.string().min(40).max(800),
  preferredLocations: z.array(z.string().min(2).max(80)).max(6),
  remotePreference: z.enum(["remote", "hybrid", "onsite", "no_preference"]),
  seniority: z.enum(["junior", "mid", "senior"]),
});

const rerankSchema = z.object({
  ranked: z.array(
    z.object({
      id: z.string(),
      matchScore: z.number().min(0).max(100),
      matchReason: z.string().min(10).max(200),
    }),
  ),
});

const pitchSchema = z.object({
  pitches: z.array(
    z.object({
      jobId: z.string(),
      subject: z.string().min(10).max(120),
      body: z.string().min(120).max(1400),
    }),
  ),
});

const KNOWN_SKILLS = [
  "TypeScript",
  "JavaScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Go",
  "Java",
  "Kotlin",
  "Swift",
  "AWS",
  "GCP",
  "Azure",
  "Docker",
  "Kubernetes",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "CI/CD",
  "Terraform",
  "Rust",
  "C#",
];

function extractJsonObject(input: string) {
  const trimmed = input.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    const objectMatch = trimmed.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      return JSON.parse(objectMatch[0]);
    }

    throw new Error("No valid JSON object found.");
  }
}

function inferSeniority(years: number): ResumeProfile["seniority"] {
  if (years <= 2) {
    return "junior";
  }
  if (years <= 6) {
    return "mid";
  }
  return "senior";
}

function fallbackAnalyzeResume(resumeText: string): ResumeProfile {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i);
  const yearsMatches = Array.from(resumeText.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)).map((entry) =>
    Number(entry[1]),
  );
  const yearsExperience = yearsMatches.length > 0 ? Math.max(...yearsMatches) : 3;

  const topSkills = KNOWN_SKILLS.filter((skill) =>
    new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}\\b`, "i").test(resumeText),
  );

  const defaultRoles = [
    "Software Engineer",
    "Backend Engineer",
    "Full Stack Engineer",
    "Platform Engineer",
  ];

  const targetRoles = defaultRoles.filter((role) => new RegExp(role, "i").test(resumeText));

  const remotePreference: ResumeProfile["remotePreference"] = /\bremote\b/i.test(resumeText)
    ? "remote"
    : /\bhybrid\b/i.test(resumeText)
      ? "hybrid"
      : /\bonsite\b/i.test(resumeText)
        ? "onsite"
        : "no_preference";

  const firstLikelyName =
    lines.find((line) => line.split(" ").length <= 4 && !line.includes("@") && /^[A-Za-z\-\s'.]+$/.test(line)) ??
    "Candidate";

  const summary = resumeText.replace(/\s+/g, " ").slice(0, 560);

  return {
    fullName: firstLikelyName,
    email: emailMatch?.[0]?.toLowerCase() ?? "",
    yearsExperience,
    targetRoles: targetRoles.length > 0 ? targetRoles : ["Software Engineer", "Full Stack Engineer"],
    topSkills: topSkills.length >= 3 ? topSkills.slice(0, 12) : ["TypeScript", "React", "Node.js", "AWS"],
    summary:
      summary.length >= 80
        ? summary
        : `${firstLikelyName} is a software engineer with experience shipping production features, collaborating across teams, and owning outcomes end to end.`,
    preferredLocations: [],
    remotePreference,
    seniority: inferSeniority(yearsExperience),
  };
}

export async function analyzeResumeWithAI(resumeText: string): Promise<ResumeProfile> {
  const fallback = fallbackAnalyzeResume(resumeText);

  if (!openaiClient) {
    return fallback;
  }

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_RESUME_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert technical recruiter. Extract resume data into strict JSON with keys: fullName,email,yearsExperience,targetRoles,topSkills,summary,preferredLocations,remotePreference,seniority. remotePreference must be one of remote,hybrid,onsite,no_preference. seniority must be junior,mid,or senior.",
        },
        {
          role: "user",
          content: resumeText,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return fallback;
    }

    const parsed = resumeSchema.parse(extractJsonObject(content));
    return parsed;
  } catch {
    return fallback;
  }
}

export async function rerankJobsWithAI(profile: ResumeProfile, jobs: JobLead[]) {
  if (!openaiClient || jobs.length === 0) {
    return jobs;
  }

  const candidateJobs = jobs.slice(0, 30).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.description.slice(0, 520),
  }));

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_RERANK_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are ranking jobs for fit. Return JSON only with: { \"ranked\": [{ \"id\": string, \"matchScore\": number 0-100, \"matchReason\": string }] }. Keep reasons concise and specific to this candidate.",
        },
        {
          role: "user",
          content: JSON.stringify({ profile, jobs: candidateJobs }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jobs;
    }

    const parsed = rerankSchema.parse(extractJsonObject(content));
    const lookup = new Map(parsed.ranked.map((entry) => [entry.id, entry]));

    const reranked = jobs
      .map((job) => {
        const aiEntry = lookup.get(job.id);
        if (!aiEntry) {
          return job;
        }

        return {
          ...job,
          matchScore: Math.round((job.matchScore * 0.45 + aiEntry.matchScore * 0.55) * 10) / 10,
          matchReason: aiEntry.matchReason,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return reranked;
  } catch {
    return jobs;
  }
}

function fallbackPitch(profile: ResumeProfile, job: JobLead): PitchEmailDraft {
  const skillPreview = profile.topSkills.slice(0, 3).join(", ");
  const firstName = profile.fullName.split(" ")[0] || profile.fullName;

  return {
    jobId: job.id,
    subject: `${firstName} | ${profile.yearsExperience}+ yrs ${job.title} experience for ${job.company}`,
    body: `Hi ${job.company} hiring team,\n\nI’m reaching out about your ${job.title} role. I have ${profile.yearsExperience}+ years of software engineering experience, with hands-on delivery in ${skillPreview}. In my recent work, I’ve shipped production features that improved reliability and developer velocity while collaborating closely with product and design.\n\nWhat stood out in your role is the focus on ${job.matchReason.toLowerCase()}. I’d love to bring my experience building maintainable systems and delivering measurable outcomes to your team.\n\nIf helpful, I can share relevant project examples and how I’d approach the first 90 days in this role.\n\nBest,\n${profile.fullName}`,
  };
}

export async function generatePitchEmailsWithAI(
  profile: ResumeProfile,
  jobs: JobLead[],
): Promise<PitchEmailDraft[]> {
  if (jobs.length === 0) {
    return [];
  }

  if (!openaiClient) {
    return jobs.map((job) => fallbackPitch(profile, job));
  }

  const shortlist = jobs.slice(0, 20).map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    matchReason: job.matchReason,
    url: job.url,
  }));

  try {
    const completion = await openaiClient.chat.completions.create({
      model: process.env.OPENAI_PITCH_MODEL ?? "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise, high-converting cold outreach emails for software engineering roles. Return JSON only with key pitches. Each item must include jobId, subject, body. Body should be 120-180 words, plain text, professional, no fluff.",
        },
        {
          role: "user",
          content: JSON.stringify({ profile, jobs: shortlist }),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return jobs.map((job) => fallbackPitch(profile, job));
    }

    const parsed = pitchSchema.parse(extractJsonObject(content));
    const byId = new Map(parsed.pitches.map((pitch) => [pitch.jobId, pitch]));

    return jobs.map((job) => byId.get(job.id) ?? fallbackPitch(profile, job));
  } catch {
    return jobs.map((job) => fallbackPitch(profile, job));
  }
}
