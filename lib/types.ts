export type RemotePreference = "remote" | "hybrid" | "onsite" | "no_preference";
export type Seniority = "junior" | "mid" | "senior";

export type ResumeProfile = {
  fullName: string;
  email: string;
  yearsExperience: number;
  targetRoles: string[];
  topSkills: string[];
  summary: string;
  preferredLocations: string[];
  remotePreference: RemotePreference;
  seniority: Seniority;
};

export type SalaryConfidence = "listed" | "estimated";

export type JobLead = {
  id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  postedAt: string;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  salaryConfidence: SalaryConfidence;
  matchScore: number;
  matchReason: string;
};

export type PitchEmailDraft = {
  jobId: string;
  subject: string;
  body: string;
};
