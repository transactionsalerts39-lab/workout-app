import { describe, expect, it } from 'vitest';
import { scoreProspect } from '../src/scoring';
import { defaultScoringConfig } from '../src/scoring/config';
import { Prospect } from '../src/types';

describe('scoreProspect', () => {
  it('applies rubric components deterministically', () => {
    const prospect: Prospect = {
      id: 1,
      full_name: 'Taylor Rivers',
      title: 'Head of Talent Partnerships',
      company: 'Influence Media',
      location: 'Los Angeles, USA',
      profile_url: 'https://example.com/taylor',
      source: 'test',
      notes_raw: 'Active 2024; works with influencer campaigns',
      tags: ['talent', 'creator'],
      last_active_hint: 'active 1w ago',
      score: 0,
      score_explanation: '',
      status: 'new',
      created_at: '',
      updated_at: '',
    };

    const breakdown = scoreProspect(prospect, defaultScoringConfig);
    expect(breakdown.roleRelevance).toBeGreaterThan(0);
    expect(breakdown.seniority).toBeGreaterThan(0);
    expect(breakdown.geo).toBeGreaterThan(0);
    expect(breakdown.companyFit).toBeGreaterThan(0);
    expect(breakdown.activity).toBeGreaterThan(0);
    expect(breakdown.total).toBeGreaterThanOrEqual(
      breakdown.roleRelevance +
        breakdown.seniority +
        breakdown.geo +
        breakdown.companyFit +
        breakdown.activity -
        5 // rounding buffer
    );
  });
});
