import { Prospect, ScoreBreakdown, ScoringConfig } from '../types';
import { defaultScoringConfig } from './config';

function matchKeywords(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase();
  return keywords.filter((kw) => lower.includes(kw.toLowerCase()));
}

function clampScore(value: number, max: number): number {
  return value > max ? max : value;
}

export function scoreProspect(prospect: Prospect, config: ScoringConfig = defaultScoringConfig): ScoreBreakdown {
  const roleText = [
    prospect.title ?? '',
    prospect.notes_raw ?? '',
    prospect.tags?.join(' ') ?? '',
  ].join(' ');
  const roleMatches = matchKeywords(roleText, config.roleKeywords);
  const roleScore = clampScore(Math.round((Math.min(roleMatches.length, 4) / 4) * 40), 40);

  const titleText = (prospect.title ?? '').toLowerCase();
  let seniorityScore = 0;
  let seniorityKeyword = '';
  Object.entries(config.seniorityKeywords).forEach(([keyword, value]) => {
    if (titleText.includes(keyword.toLowerCase()) && value > seniorityScore) {
      seniorityScore = clampScore(value, 20);
      seniorityKeyword = keyword;
    }
  });

  const locationText = (prospect.location ?? '').toLowerCase();
  const geoHit = locationText
    ? config.geoPreferred.find((g) => locationText.includes(g.toLowerCase()))
    : undefined;
  let geoScore = 0;
  if (geoHit) geoScore = 10;
  else if (locationText.includes('remote')) geoScore = 8;
  else if (locationText) geoScore = 4;
  else geoScore = 5;

  const companyText = `${prospect.company ?? ''} ${prospect.notes_raw ?? ''}`.toLowerCase();
  const companyMatches = matchKeywords(companyText, config.companyKeywords);
  const companyScore = clampScore(Math.round((Math.min(companyMatches.length, 3) / 3) * 15), 15);

  const activityHint = (prospect.last_active_hint ?? prospect.notes_raw ?? '').toLowerCase();
  let activityScore = config.activityWeighting.unknown;
  let activityLabel = 'unknown recency';
  if (/(today|day|week|current|2024|recent)/i.test(activityHint)) {
    activityScore = config.activityWeighting.fresh;
    activityLabel = 'fresh';
  } else if (/(month|2023|quarter|active)/i.test(activityHint)) {
    activityScore = config.activityWeighting.warm;
    activityLabel = 'warm';
  } else if (/(2019|2020|2021|inactive|last year|ago)/i.test(activityHint)) {
    activityScore = config.activityWeighting.stale;
    activityLabel = 'stale';
  }

  const totalRaw = roleScore + seniorityScore + geoScore + companyScore + activityScore;
  const total = clampScore(Math.round(totalRaw), 100);

  const explanation = [
    `Role relevance (${roleScore}/40): ${roleMatches.length ? `matched ${roleMatches.join(', ')}` : 'no strong keyword matches'}`,
    `Seniority (${seniorityScore}/20): ${seniorityKeyword || 'no clear seniority keyword'}`,
    `Geo (${geoScore}/10): ${geoHit ? `matches ${geoHit}` : locationText ? 'non-target location' : 'no location provided'}`,
    `Company fit (${companyScore}/15): ${companyMatches.length ? `matched ${companyMatches.join(', ')}` : 'no company fit keywords'}`,
    `Activity (${activityScore}/15): ${activityLabel}`,
  ].join(' | ');

  return {
    roleRelevance: roleScore,
    seniority: seniorityScore,
    geo: geoScore,
    companyFit: companyScore,
    activity: activityScore,
    total,
    explanation,
  };
}
