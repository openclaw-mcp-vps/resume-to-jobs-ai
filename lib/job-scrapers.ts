import * as cheerio from "cheerio";
import type { JobLead } from "@/lib/types";

export type NormalizedJob = Omit<JobLead, "fitScore" | "fitReasons">;

const REQUEST_TIMEOUT_MS = 12_000;

async function fetchJson<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "resume-to-jobs-ai/1.0"
      },
      next: {
        revalidate: 600
      }
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "resume-to-jobs-ai/1.0"
      },
      next: {
        revalidate: 600
      }
    });

    if (!response.ok) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function compactText(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function toJobId(source: string, seed: string): string {
  const cleaned = seed.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);
  return `${source.toLowerCase()}-${cleaned}`;
}

function parseSalaryFromText(input: string): {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
} {
  const text = input.replace(/,/g, "");
  const pattern =
    /(\$|USD|EUR|GBP)?\s?(\d{2,3})(?:k|000)?\s?(?:-|to|–)\s?(\$|USD|EUR|GBP)?\s?(\d{2,3})(?:k|000)?/i;
  const match = text.match(pattern);

  if (match) {
    const minRaw = Number(match[2]);
    const maxRaw = Number(match[4]);

    const salaryMin = minRaw < 1000 ? minRaw * 1000 : minRaw;
    const salaryMax = maxRaw < 1000 ? maxRaw * 1000 : maxRaw;

    const currencyMark = (match[1] || match[3] || "$" ).toUpperCase();
    const salaryCurrency = currencyMark.includes("EUR")
      ? "EUR"
      : currencyMark.includes("GBP")
        ? "GBP"
        : "USD";

    return { salaryMin, salaryMax, salaryCurrency };
  }

  return {
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "USD"
  };
}

function estimateSalary(title: string): { salaryMin: number; salaryMax: number } {
  const normalized = title.toLowerCase();

  if (normalized.includes("staff") || normalized.includes("principal")) {
    return { salaryMin: 175_000, salaryMax: 240_000 };
  }

  if (normalized.includes("senior") || normalized.includes("lead")) {
    return { salaryMin: 145_000, salaryMax: 205_000 };
  }

  if (
    normalized.includes("full stack") ||
    normalized.includes("backend") ||
    normalized.includes("frontend") ||
    normalized.includes("software engineer")
  ) {
    return { salaryMin: 120_000, salaryMax: 175_000 };
  }

  return { salaryMin: 105_000, salaryMax: 150_000 };
}

function enrichSalary(job: NormalizedJob): NormalizedJob {
  if (job.salaryMin && job.salaryMax) {
    return job;
  }

  const estimated = estimateSalary(job.title);
  return {
    ...job,
    salaryMin: estimated.salaryMin,
    salaryMax: estimated.salaryMax,
    salaryCurrency: "USD"
  };
}

async function fetchRemotiveJobs(limit: number): Promise<NormalizedJob[]> {
  const payload = await fetchJson<{
    jobs: Array<{
      id: number;
      title: string;
      company_name: string;
      candidate_required_location: string;
      url: string;
      description: string;
      salary: string;
      publication_date: string;
      job_type: string;
      category: string;
    }>;
  }>("https://remotive.com/api/remote-jobs?category=software-dev");

  if (!payload?.jobs) {
    return [];
  }

  return payload.jobs.slice(0, limit).map((job) => {
    const salary = parseSalaryFromText(`${job.salary} ${job.description}`);
    return {
      id: `remotive-${job.id}`,
      source: "Remotive",
      title: compactText(job.title),
      company: compactText(job.company_name),
      location: compactText(job.candidate_required_location || "Remote"),
      remote: true,
      url: job.url,
      description: compactText(job.description),
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      salaryCurrency: salary.salaryCurrency,
      postedAt: job.publication_date
    };
  });
}

async function fetchArbeitnowJobs(limit: number): Promise<NormalizedJob[]> {
  const payload = await fetchJson<{
    data: Array<{
      slug: string;
      title: string;
      company_name: string;
      location: string;
      remote: boolean;
      url: string;
      description: string;
      created_at: string;
      tags: string[];
    }>;
  }>("https://www.arbeitnow.com/api/job-board-api");

  if (!payload?.data) {
    return [];
  }

  return payload.data
    .filter((job) => {
      const title = job.title.toLowerCase();
      return (
        title.includes("engineer") ||
        title.includes("developer") ||
        title.includes("full stack")
      );
    })
    .slice(0, limit)
    .map((job) => {
      const salary = parseSalaryFromText(job.description);
      return {
        id: toJobId("arbeitnow", job.slug),
        source: "Arbeitnow",
        title: compactText(job.title),
        company: compactText(job.company_name),
        location: compactText(job.location || "Remote"),
        remote: job.remote,
        url: job.url,
        description: compactText(job.description),
        salaryMin: salary.salaryMin,
        salaryMax: salary.salaryMax,
        salaryCurrency: salary.salaryCurrency,
        postedAt: job.created_at
      };
    });
}

async function fetchTheMuseJobs(limit: number): Promise<NormalizedJob[]> {
  const payload = await fetchJson<{
    results: Array<{
      id: number;
      name: string;
      contents: string;
      locations: Array<{ name: string }>;
      company: { name: string };
      publication_date: string;
      refs: { landing_page: string };
    }>;
  }>(
    "https://www.themuse.com/api/public/jobs?page=1&descending=true&category=Software%20Engineering"
  );

  if (!payload?.results) {
    return [];
  }

  return payload.results.slice(0, limit).map((job) => {
    const salary = parseSalaryFromText(job.contents);
    return {
      id: `themuse-${job.id}`,
      source: "The Muse",
      title: compactText(job.name),
      company: compactText(job.company?.name),
      location: compactText(job.locations?.[0]?.name || "Remote"),
      remote: /remote/i.test(job.name) || /remote/i.test(job.contents),
      url: job.refs?.landing_page,
      description: compactText(job.contents),
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      salaryCurrency: salary.salaryCurrency,
      postedAt: job.publication_date
    };
  });
}

async function fetchRemoteOkJobs(limit: number): Promise<NormalizedJob[]> {
  const payload = await fetchJson<
    Array<{
      id?: number;
      position?: string;
      company?: string;
      location?: string;
      url?: string;
      description?: string;
      date?: string;
      salary_min?: number;
      salary_max?: number;
      salary_currency?: string;
    }>
  >("https://remoteok.com/api");

  if (!payload || payload.length < 2) {
    return [];
  }

  return payload
    .slice(1)
    .filter((job) => job.position && job.url)
    .slice(0, limit)
    .map((job) => ({
      id: `remoteok-${job.id ?? toJobId("remoteok", job.url ?? "")}`,
      source: "Remote OK",
      title: compactText(job.position),
      company: compactText(job.company),
      location: compactText(job.location || "Remote"),
      remote: true,
      url: job.url ?? "",
      description: compactText(job.description),
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      salaryCurrency: (job.salary_currency ?? "USD").toUpperCase(),
      postedAt: job.date ?? null
    }));
}

async function fetchWwrJobs(limit: number): Promise<NormalizedJob[]> {
  const xml = await fetchText(
    "https://weworkremotely.com/categories/remote-programming-jobs.rss"
  );

  if (!xml) {
    return [];
  }

  const $ = cheerio.load(xml, { xmlMode: true });
  const jobs: NormalizedJob[] = [];

  $("item").each((index, item) => {
    if (index >= limit) {
      return;
    }

    const title = compactText($(item).find("title").text());
    const description = compactText($(item).find("description").text());
    const link = compactText($(item).find("link").text());
    const pubDate = compactText($(item).find("pubDate").text());

    const [company = "Unknown Company", ...titleSegments] = title.split(":");
    const role = titleSegments.join(":").trim() || title;

    const salary = parseSalaryFromText(`${title} ${description}`);

    jobs.push({
      id: toJobId("wwr", link || `${company}-${role}`),
      source: "We Work Remotely",
      title: role,
      company: company.trim(),
      location: "Remote",
      remote: true,
      url: link,
      description,
      salaryMin: salary.salaryMin,
      salaryMax: salary.salaryMax,
      salaryCurrency: salary.salaryCurrency,
      postedAt: pubDate || null
    });
  });

  return jobs;
}

function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const byUrl = new Map<string, NormalizedJob>();

  for (const job of jobs) {
    const key = job.url || `${job.company}-${job.title}`;
    if (!key) {
      continue;
    }

    if (!byUrl.has(key)) {
      byUrl.set(key, enrichSalary(job));
    }
  }

  return Array.from(byUrl.values());
}

export async function fetchJobLeads(maxLeads = 120): Promise<NormalizedJob[]> {
  const sourceLimit = Math.max(20, Math.ceil(maxLeads / 4));

  const [remotive, arbeitnow, muse, remoteOk, wwr] = await Promise.all([
    fetchRemotiveJobs(sourceLimit),
    fetchArbeitnowJobs(sourceLimit),
    fetchTheMuseJobs(sourceLimit),
    fetchRemoteOkJobs(sourceLimit),
    fetchWwrJobs(sourceLimit)
  ]);

  return dedupeJobs([...remotive, ...arbeitnow, ...muse, ...remoteOk, ...wwr]).slice(
    0,
    maxLeads
  );
}
