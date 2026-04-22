import axios from "axios";
import * as cheerio from "cheerio";
import type { JobLead, ResumeProfile, SalaryConfidence } from "@/lib/types";

type RawJob = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  postedAt: string;
  salaryText?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
};

const http = axios.create({
  timeout: 12000,
  headers: {
    "User-Agent": "resume-to-jobs-ai/1.0",
  },
});

const roleVocabulary = [
  "software engineer",
  "backend engineer",
  "frontend engineer",
  "full stack engineer",
  "platform engineer",
  "devops",
  "site reliability",
  "machine learning engineer",
  "data engineer",
  "mobile engineer",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

function cleanText(text: string) {
  if (!text) {
    return "";
  }

  const $ = cheerio.load(`<div>${text}</div>`);
  return $.text().replace(/\s+/g, " ").trim();
}

function extractSalaryRange(input: string) {
  const text = input.replace(/,/g, "");

  const rangeMatch = text.match(/([$€£])\s?(\d{2,3})k?\s*(?:-|to|–)\s*([$€£])?\s?(\d{2,3})k?/i);
  if (rangeMatch) {
    const symbol = rangeMatch[1] || rangeMatch[3] || "$";
    const currency = symbol === "$" ? "USD" : symbol === "€" ? "EUR" : "GBP";

    const lowRaw = Number(rangeMatch[2]);
    const highRaw = Number(rangeMatch[4]);

    const low = lowRaw < 1000 ? lowRaw * 1000 : lowRaw;
    const high = highRaw < 1000 ? highRaw * 1000 : highRaw;

    return { salaryMin: Math.min(low, high), salaryMax: Math.max(low, high), salaryCurrency: currency };
  }

  const singleMatch = text.match(/([$€£])\s?(\d{2,6})(?:\s*\/\s*(?:year|yr|annum))?/i);
  if (singleMatch) {
    const symbol = singleMatch[1] || "$";
    const currency = symbol === "$" ? "USD" : symbol === "€" ? "EUR" : "GBP";
    const value = Number(singleMatch[2]);
    const normalized = value < 1000 ? value * 1000 : value;

    return {
      salaryMin: Math.round(normalized * 0.9),
      salaryMax: Math.round(normalized * 1.1),
      salaryCurrency: currency,
    };
  }

  return null;
}

function estimateSalary(title: string, seniority: ResumeProfile["seniority"]) {
  const titleText = title.toLowerCase();
  const isFrontend = titleText.includes("frontend") || titleText.includes("front-end");
  const isBackend = titleText.includes("backend") || titleText.includes("back-end");
  const isFullStack = titleText.includes("full") && titleText.includes("stack");
  const isPlatform = titleText.includes("platform") || titleText.includes("devops") || titleText.includes("sre");
  const isData = titleText.includes("data") || titleText.includes("machine learning");

  let baseMin = 110_000;
  let baseMax = 150_000;

  if (seniority === "junior") {
    baseMin = 85_000;
    baseMax = 120_000;
  }

  if (seniority === "senior") {
    baseMin = 145_000;
    baseMax = 215_000;
  }

  if (isFrontend) {
    baseMin -= 8_000;
    baseMax -= 6_000;
  }

  if (isBackend || isFullStack) {
    baseMin += 4_000;
    baseMax += 8_000;
  }

  if (isPlatform || isData) {
    baseMin += 12_000;
    baseMax += 18_000;
  }

  return {
    salaryMin: Math.max(baseMin, 70_000),
    salaryMax: Math.max(baseMax, baseMin + 20_000),
    salaryCurrency: "USD",
  };
}

function normalizeRawJob(raw: RawJob, profile: ResumeProfile): JobLead {
  const salaryFromText = raw.salaryText ? extractSalaryRange(raw.salaryText) : null;
  const salaryFromDescription = extractSalaryRange(raw.description);
  const salaryKnown = salaryFromText ?? salaryFromDescription;

  const estimated = estimateSalary(raw.title, profile.seniority);
  const salaryMin = raw.salaryMin ?? salaryKnown?.salaryMin ?? estimated.salaryMin;
  const salaryMax = raw.salaryMax ?? salaryKnown?.salaryMax ?? estimated.salaryMax;
  const salaryCurrency = raw.salaryCurrency ?? salaryKnown?.salaryCurrency ?? estimated.salaryCurrency;
  const salaryConfidence: SalaryConfidence =
    raw.salaryMin || raw.salaryMax || salaryKnown ? "listed" : "estimated";

  return {
    id: raw.id,
    source: raw.source,
    title: raw.title,
    company: raw.company,
    location: raw.location,
    url: raw.url,
    description: raw.description,
    postedAt: raw.postedAt,
    salaryMin,
    salaryMax,
    salaryCurrency,
    salaryConfidence,
    matchScore: 0,
    matchReason: "",
  };
}

function calculateMatch(job: JobLead, profile: ResumeProfile) {
  const titleText = `${job.title} ${job.description}`.toLowerCase();

  const roleHits = profile.targetRoles.filter((role) => titleText.includes(role.toLowerCase())).length;
  const skillHits = profile.topSkills.filter((skill) => titleText.includes(skill.toLowerCase())).length;

  let score = 28;
  score += Math.min(roleHits * 12, 36);
  score += Math.min(skillHits * 4, 24);

  if (profile.remotePreference === "remote" && /remote|anywhere|distributed/i.test(job.location)) {
    score += 12;
  }

  if (profile.remotePreference === "hybrid" && /hybrid/i.test(job.location)) {
    score += 8;
  }

  if (profile.seniority === "senior" && /senior|staff|lead|principal/i.test(job.title)) {
    score += 10;
  }

  if (profile.seniority === "mid" && /engineer ii|mid|software engineer/i.test(job.title)) {
    score += 8;
  }

  if (job.salaryConfidence === "listed") {
    score += 5;
  }

  score = Math.max(1, Math.min(100, score));

  const reasons: string[] = [];
  if (roleHits > 0) {
    reasons.push(`role overlap with ${profile.targetRoles.slice(0, 2).join("/")}`);
  }
  if (skillHits > 0) {
    reasons.push(`${skillHits} matching skill${skillHits > 1 ? "s" : ""}`);
  }
  if (profile.remotePreference !== "no_preference" && /remote|hybrid/i.test(job.location)) {
    reasons.push(`${profile.remotePreference} preference alignment`);
  }
  if (job.salaryConfidence === "listed") {
    reasons.push("explicit salary range listed");
  }

  const reason = reasons.slice(0, 2).join(" + ") || "strong general fit for your engineering background";

  return {
    score,
    reason,
  };
}

function dedupeJobs(jobs: JobLead[]) {
  const map = new Map<string, JobLead>();

  for (const job of jobs) {
    const key = job.url ? job.url.toLowerCase() : `${job.company}-${job.title}`.toLowerCase();
    const existing = map.get(key);
    if (!existing || existing.matchScore < job.matchScore) {
      map.set(key, job);
    }
  }

  return Array.from(map.values());
}

function prioritizeRecent(a: JobLead, b: JobLead) {
  if (b.matchScore !== a.matchScore) {
    return b.matchScore - a.matchScore;
  }

  return new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime();
}

async function fetchRemoteOkJobs(keywords: string[]): Promise<RawJob[]> {
  try {
    const response = await http.get("https://remoteok.com/api", {
      headers: {
        Accept: "application/json",
      },
    });

    const payload = Array.isArray(response.data) ? response.data : [];

    return payload
      .filter((entry) => entry && typeof entry === "object" && entry.position)
      .map((entry) => {
        const title = String(entry.position ?? "");
        const description = cleanText(String(entry.description ?? ""));

        return {
          id: `remoteok-${entry.id ?? slugify(`${title}-${entry.company}`)}`,
          source: "RemoteOK",
          title,
          company: String(entry.company ?? "Unknown company"),
          location: String(entry.location ?? "Remote"),
          url: String(entry.url ?? ""),
          description,
          postedAt: String(entry.date ?? new Date().toISOString()),
          salaryMin: typeof entry.salary_min === "number" ? entry.salary_min : undefined,
          salaryMax: typeof entry.salary_max === "number" ? entry.salary_max : undefined,
        } satisfies RawJob;
      })
      .filter((job: RawJob) => {
        if (keywords.length === 0) {
          return true;
        }

        const haystack = `${job.title} ${job.description}`.toLowerCase();
        return keywords.some((term) => haystack.includes(term.toLowerCase()));
      });
  } catch {
    return [];
  }
}

async function fetchRemotiveJobs(keywords: string[]): Promise<RawJob[]> {
  try {
    const search = encodeURIComponent(keywords.slice(0, 3).join(" "));
    const response = await http.get(`https://remotive.com/api/remote-jobs?search=${search}`);

    const jobs = Array.isArray(response.data?.jobs) ? response.data.jobs : [];

    return jobs.map((entry: Record<string, unknown>) => {
      const title = String(entry.title ?? "");
      const description = cleanText(String(entry.description ?? ""));

      return {
        id: `remotive-${entry.id ?? slugify(`${title}-${entry.company_name}`)}`,
        source: "Remotive",
        title,
        company: String(entry.company_name ?? "Unknown company"),
        location: String(entry.candidate_required_location ?? "Remote"),
        url: String(entry.url ?? ""),
        description,
        postedAt: String(entry.publication_date ?? new Date().toISOString()),
        salaryText: String(entry.salary ?? ""),
      } satisfies RawJob;
    });
  } catch {
    return [];
  }
}

async function fetchArbeitnowJobs(keywords: string[]): Promise<RawJob[]> {
  try {
    const response = await http.get("https://www.arbeitnow.com/api/job-board-api");
    const jobs = Array.isArray(response.data?.data) ? response.data.data : [];

    return jobs
      .map((entry: Record<string, unknown>) => {
        const title = String(entry.title ?? "");
        const description = cleanText(String(entry.description ?? ""));
        const location = String(entry.location ?? "Remote");

        const sourceUrl =
          typeof entry.url === "string" && entry.url.length > 0
            ? entry.url
            : `https://www.arbeitnow.com/jobs/${entry.slug ?? slugify(title)}`;

        return {
          id: `arbeitnow-${entry.slug ?? slugify(`${title}-${entry.company_name}`)}`,
          source: "Arbeitnow",
          title,
          company: String(entry.company_name ?? "Unknown company"),
          location,
          url: sourceUrl,
          description,
          postedAt: new Date().toISOString(),
        } satisfies RawJob;
      })
      .filter((job: RawJob) => {
        if (keywords.length === 0) {
          return true;
        }

        const haystack = `${job.title} ${job.description}`.toLowerCase();
        return keywords.some((term) => haystack.includes(term.toLowerCase()));
      });
  } catch {
    return [];
  }
}

async function fetchMuseJobs(keywords: string[]): Promise<RawJob[]> {
  try {
    const query = encodeURIComponent(keywords.slice(0, 2).join(" ") || "software engineer");
    const response = await http.get(`https://www.themuse.com/api/public/jobs?category=${query}&page=1`);

    const results = Array.isArray(response.data?.results) ? response.data.results : [];

    return results.map((entry: Record<string, unknown>) => {
      const title = String(entry.name ?? "");
      const company =
        typeof entry.company === "object" && entry.company && "name" in entry.company
          ? String((entry.company as { name?: string }).name ?? "Unknown company")
          : "Unknown company";

      const locations =
        Array.isArray(entry.locations) && entry.locations.length > 0
          ? entry.locations
              .map((location) => {
                if (typeof location === "object" && location && "name" in location) {
                  return String((location as { name?: string }).name ?? "");
                }
                return "";
              })
              .filter(Boolean)
              .join(", ")
          : "Remote";

      const landingPage =
        typeof entry.refs === "object" && entry.refs && "landing_page" in entry.refs
          ? String((entry.refs as { landing_page?: string }).landing_page ?? "")
          : "";

      return {
        id: `muse-${entry.id ?? slugify(`${title}-${company}`)}`,
        source: "The Muse",
        title,
        company,
        location: locations,
        url: landingPage,
        description: cleanText(String(entry.contents ?? "")),
        postedAt: String(entry.publication_date ?? new Date().toISOString()),
      } satisfies RawJob;
    });
  } catch {
    return [];
  }
}

export function buildSearchKeywords(profile: ResumeProfile) {
  const rawTerms = [...profile.targetRoles, ...profile.topSkills, ...roleVocabulary]
    .map((term) => term.trim())
    .filter(Boolean);

  return Array.from(new Set(rawTerms)).slice(0, 20);
}

export async function findRankedJobs(profile: ResumeProfile, limit = 20): Promise<JobLead[]> {
  const keywords = buildSearchKeywords(profile);

  const [remoteOk, remotive, arbeitnow, muse] = await Promise.all([
    fetchRemoteOkJobs(keywords),
    fetchRemotiveJobs(keywords),
    fetchArbeitnowJobs(keywords),
    fetchMuseJobs(keywords),
  ]);

  const combined = [...remoteOk, ...remotive, ...arbeitnow, ...muse]
    .filter((job) => job.title && job.company && job.url)
    .map((job) => normalizeRawJob(job, profile))
    .map((job) => {
      const { score, reason } = calculateMatch(job, profile);
      return {
        ...job,
        matchScore: score,
        matchReason: reason,
      };
    });

  const deduped = dedupeJobs(combined)
    .filter((job) => {
      const text = `${job.title} ${job.description}`.toLowerCase();
      return roleVocabulary.some((term) => text.includes(term));
    })
    .sort(prioritizeRecent);

  if (deduped.length >= limit) {
    return deduped.slice(0, limit);
  }

  return deduped;
}
