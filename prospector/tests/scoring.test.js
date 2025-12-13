"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const scoring_1 = require("../src/scoring");
const config_1 = require("../src/scoring/config");
(0, vitest_1.describe)('scoreProspect', () => {
    (0, vitest_1.it)('applies rubric components deterministically', () => {
        const prospect = {
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
        const breakdown = (0, scoring_1.scoreProspect)(prospect, config_1.defaultScoringConfig);
        (0, vitest_1.expect)(breakdown.roleRelevance).toBeGreaterThan(0);
        (0, vitest_1.expect)(breakdown.seniority).toBeGreaterThan(0);
        (0, vitest_1.expect)(breakdown.geo).toBeGreaterThan(0);
        (0, vitest_1.expect)(breakdown.companyFit).toBeGreaterThan(0);
        (0, vitest_1.expect)(breakdown.activity).toBeGreaterThan(0);
        (0, vitest_1.expect)(breakdown.total).toBeGreaterThanOrEqual(breakdown.roleRelevance +
            breakdown.seniority +
            breakdown.geo +
            breakdown.companyFit +
            breakdown.activity -
            5 // rounding buffer
        );
    });
});
