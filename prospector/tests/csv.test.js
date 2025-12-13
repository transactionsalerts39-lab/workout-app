"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const csv_1 = require("../src/utils/csv");
const sample = `full_name,title,company,location,profile_url,source,notes_raw,tags,last_active_hint,status
Alex Smith,Creator Partnerships Lead,Star Talent,NYC,https://example.com/alex,manual,"Works with IG creators","talent, creators","active 2w ago",new
`;
(0, vitest_1.describe)('parseCsvProspects', () => {
    (0, vitest_1.it)('parses and normalizes CSV rows', () => {
        const { prospects, errors } = (0, csv_1.parseCsvProspects)(sample);
        (0, vitest_1.expect)(errors.length).toBe(0);
        (0, vitest_1.expect)(prospects.length).toBe(1);
        const p = prospects[0];
        (0, vitest_1.expect)(p.full_name).toBe('Alex Smith');
        (0, vitest_1.expect)(p.tags).toEqual(['talent', 'creators']);
        (0, vitest_1.expect)(p.last_active_hint).toContain('active');
    });
});
