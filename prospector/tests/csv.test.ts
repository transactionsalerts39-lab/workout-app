import { describe, expect, it } from 'vitest';
import { parseCsvProspects } from '../src/utils/csv';

const sample = `full_name,title,company,location,profile_url,source,notes_raw,tags,last_active_hint,status
Alex Smith,Creator Partnerships Lead,Star Talent,NYC,https://example.com/alex,manual,"Works with IG creators","talent, creators","active 2w ago",new
`;

describe('parseCsvProspects', () => {
  it('parses and normalizes CSV rows', () => {
    const { prospects, errors } = parseCsvProspects(sample);
    expect(errors.length).toBe(0);
    expect(prospects.length).toBe(1);
    const p = prospects[0];
    expect(p.full_name).toBe('Alex Smith');
    expect(p.tags).toEqual(['talent', 'creators']);
    expect(p.last_active_hint).toContain('active');
  });
});
