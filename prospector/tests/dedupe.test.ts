import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

let db: typeof import('../src/db');

beforeAll(async () => {
  process.env.PROSPECTOR_DB_PATH = ':memory:';
  db = await import('../src/db');
  db.initDb();
});

beforeEach(() => {
  db.clearProspects();
});

describe('dedupe rules', () => {
  it('dedupes by profile_url', () => {
    const first = db.upsertProspect({
      full_name: 'Jamie Doe',
      company: 'Creator Co',
      profile_url: 'https://example.com/jamie',
      title: 'Talent Manager',
    });
    const second = db.upsertProspect({
      full_name: 'Jamie Doe',
      company: 'Creator Co',
      profile_url: 'https://example.com/jamie',
      title: 'Senior Talent Manager',
    });
    expect(first.prospect.id).toBe(second.prospect.id);
    const stored = db.listProspects();
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toContain('Senior');
  });

  it('dedupes by name + company when url missing', () => {
    const first = db.upsertProspect({
      full_name: 'Robin Lee',
      company: 'Talent House',
      title: 'Manager',
    });
    const second = db.upsertProspect({
      full_name: 'Robin Lee',
      company: 'Talent House',
      title: 'Director',
    });
    expect(first.prospect.id).toBe(second.prospect.id);
    expect(db.listProspects()[0].title).toBe('Director');
  });
});
