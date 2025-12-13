export interface Prospect {
  id: number;
  full_name: string;
  title?: string;
  company?: string;
  location?: string;
  profile_url?: string;
  source?: string;
  notes_raw?: string;
  tags: string[];
  last_active_hint?: string;
  score?: number;
  score_explanation?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProspectInput {
  id?: number;
  full_name: string;
  title?: string;
  company?: string;
  location?: string;
  profile_url?: string;
  source?: string;
  notes_raw?: string;
  tags?: string[];
  last_active_hint?: string;
  score?: number;
  status?: string;
}

export interface ScoreBreakdown {
  roleRelevance: number;
  seniority: number;
  geo: number;
  companyFit: number;
  activity: number;
  total: number;
  explanation: string;
}

export interface ScoringConfig {
  roleKeywords: string[];
  seniorityKeywords: Record<string, number>;
  geoPreferred: string[];
  companyKeywords: string[];
  activityWeighting: {
    fresh: number;
    warm: number;
    stale: number;
    unknown: number;
  };
}
