import { ScoringConfig } from '../types';

export const defaultScoringConfig: ScoringConfig = {
  roleKeywords: [
    'talent manager',
    'influencer manager',
    'creator partnerships',
    'creator manager',
    'partnerships',
    'talent partnerships',
    'agent',
    'talent lead',
    'brand partnerships'
  ],
  seniorityKeywords: {
    head: 20,
    director: 18,
    vp: 18,
    'vice president': 18,
    lead: 16,
    manager: 14,
    principal: 16,
    partner: 16,
    founder: 20,
    owner: 16,
    coordinator: 8,
    specialist: 8
  },
  geoPreferred: ['united states', 'usa', 'us', 'canada', 'uk', 'united kingdom', 'europe', 'london', 'los angeles', 'nyc', 'new york', 'austin', 'san francisco'],
  companyKeywords: ['talent', 'media', 'creator', 'influencer', 'agency', 'management', 'entertainment', 'digital'],
  activityWeighting: {
    fresh: 15,
    warm: 10,
    stale: 5,
    unknown: 7
  }
};

export function loadScoringConfig(configPath?: string): ScoringConfig {
  if (!configPath) return defaultScoringConfig;
  const fs = require('fs');
  const path = require('path');
  const resolved = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Config file not found at ${resolved}`);
  }
  const userConfig = JSON.parse(fs.readFileSync(resolved, 'utf8')) as Partial<ScoringConfig>;
  return {
    ...defaultScoringConfig,
    ...userConfig,
    seniorityKeywords: {
      ...defaultScoringConfig.seniorityKeywords,
      ...(userConfig.seniorityKeywords ?? {})
    },
    activityWeighting: {
      ...defaultScoringConfig.activityWeighting,
      ...(userConfig.activityWeighting ?? {})
    }
  };
}
