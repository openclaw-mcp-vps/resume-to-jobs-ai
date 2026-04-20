export type ParsedResume = {
  summary: string;
  yearsExperience: number;
  desiredTitles: string[];
  skills: string[];
  locations: string[];
  seniority: "junior" | "mid" | "senior";
};

export type JobLead = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  postedAt: string | null;
  fitScore: number;
  fitReasons: string[];
};

export type PitchEmailModel = {
  jobId: string;
  subject: string;
  body: string;
};

export type SearchResultRecord = {
  id: string;
  createdAt: string;
  resumeText: string;
  parsedResume: ParsedResume;
  jobs: JobLead[];
  pitches: PitchEmailModel[];
};

export type AccessTokenRecord = {
  token: string;
  email: string;
  orderId: string;
  status: "paid" | "pending";
  createdAt: string;
};
