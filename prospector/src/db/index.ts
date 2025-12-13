import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { Prospect, ProspectInput } from '../types';
import { mergeTags } from '../utils/tags';

function resolveDbPath(): string {
  const envPath = process.env.PROSPECTOR_DB_PATH;
  if (envPath === ':memory:') return ':memory:';
  if (envPath) {
    return path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
  }
  return path.resolve(__dirname, '../../data/prospects.db');
}

const dbPath = resolveDbPath();
if (dbPath !== ':memory:') {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

export function initDb(): void {
  const schema = `
    CREATE TABLE IF NOT EXISTS prospects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      title TEXT,
      company TEXT,
      location TEXT,
      profile_url TEXT,
      source TEXT,
      notes_raw TEXT,
      tags TEXT,
      last_active_hint TEXT,
      score INTEGER DEFAULT 0,
      score_explanation TEXT,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_url_unique ON prospects(profile_url COLLATE NOCASE);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_name_company_unique ON prospects(full_name COLLATE NOCASE, company COLLATE NOCASE);
  `;
  db.exec(schema);
}

function sanitizeInput(input: ProspectInput): ProspectInput {
  const trim = (value?: string) => (value ?? '').trim() || undefined;
  return {
    ...input,
    full_name: trim(input.full_name) || 'Unknown',
    title: trim(input.title),
    company: trim(input.company),
    location: trim(input.location),
    profile_url: trim(input.profile_url),
    source: trim(input.source),
    notes_raw: input.notes_raw?.trim(),
    last_active_hint: trim(input.last_active_hint),
    status: trim(input.status) || 'new',
    tags: input.tags ?? [],
  };
}

function rowToProspect(row: any): Prospect {
  return {
    id: row.id,
    full_name: row.full_name,
    title: row.title ?? undefined,
    company: row.company ?? undefined,
    location: row.location ?? undefined,
    profile_url: row.profile_url ?? undefined,
    source: row.source ?? undefined,
    notes_raw: row.notes_raw ?? undefined,
    tags: row.tags ? JSON.parse(row.tags) : [],
    last_active_hint: row.last_active_hint ?? undefined,
    score: row.score ?? 0,
    score_explanation: row.score_explanation ?? undefined,
    status: row.status ?? 'new',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function findByProfileUrl(url?: string): Prospect | undefined {
  if (!url) return undefined;
  const stmt = db.prepare(
    `SELECT * FROM prospects WHERE profile_url IS NOT NULL AND profile_url <> '' AND profile_url = ? COLLATE NOCASE LIMIT 1`
  );
  const row = stmt.get(url);
  return row ? rowToProspect(row) : undefined;
}

function findByNameAndCompany(name?: string, company?: string): Prospect | undefined {
  if (!name || !company) return undefined;
  const stmt = db.prepare(
    `SELECT * FROM prospects WHERE full_name = ? COLLATE NOCASE AND company = ? COLLATE NOCASE LIMIT 1`
  );
  const row = stmt.get(name, company);
  return row ? rowToProspect(row) : undefined;
}

export function upsertProspect(input: ProspectInput): { prospect: Prospect; action: 'inserted' | 'updated' } {
  const clean = sanitizeInput(input);
  const incomingTags = clean.tags ?? [];

  let existing = findByProfileUrl(clean.profile_url);
  if (!existing) {
    existing = findByNameAndCompany(clean.full_name, clean.company);
  }

  if (existing) {
    const mergedTags = mergeTags(existing.tags, incomingTags);
    const updated = {
      title: clean.title ?? existing.title,
      company: clean.company ?? existing.company,
      location: clean.location ?? existing.location,
      profile_url: clean.profile_url ?? existing.profile_url,
      source: clean.source ?? existing.source,
      notes_raw: clean.notes_raw ?? existing.notes_raw,
      tags: mergedTags,
      last_active_hint: clean.last_active_hint ?? existing.last_active_hint,
      status: clean.status ?? existing.status,
    };

    const stmt = db.prepare(
      `UPDATE prospects
       SET title = ?, company = ?, location = ?, profile_url = ?, source = ?, notes_raw = ?, tags = ?, last_active_hint = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    );
    stmt.run(
      updated.title,
      updated.company,
      updated.location,
      updated.profile_url,
      updated.source,
      updated.notes_raw,
      JSON.stringify(updated.tags),
      updated.last_active_hint,
      updated.status,
      existing.id
    );
    const refreshed = getProspectById(existing.id);
    if (!refreshed) {
      throw new Error('Failed to fetch prospect after update');
    }
    return { prospect: refreshed, action: 'updated' };
  }

  const insert = db.prepare(
    `INSERT INTO prospects (full_name, title, company, location, profile_url, source, notes_raw, tags, last_active_hint, score, score_explanation, status)
     VALUES (@full_name, @title, @company, @location, @profile_url, @source, @notes_raw, @tags, @last_active_hint, @score, @score_explanation, @status)`
  );

  const score = clean.score ?? 0;
  const info = insert.run({
    full_name: clean.full_name,
    title: clean.title,
    company: clean.company,
    location: clean.location,
    profile_url: clean.profile_url,
    source: clean.source ?? 'manual',
    notes_raw: clean.notes_raw,
    tags: JSON.stringify(incomingTags),
    last_active_hint: clean.last_active_hint,
    score,
    score_explanation: null,
    status: clean.status ?? 'new',
  });

  const inserted = getProspectById(Number(info.lastInsertRowid));
  if (!inserted) {
    throw new Error('Failed to fetch prospect after insert');
  }
  return { prospect: inserted, action: 'inserted' };
}

export function bulkUpsert(inputs: ProspectInput[]): { inserted: number; updated: number } {
  let inserted = 0;
  let updated = 0;
  for (const prospect of inputs) {
    const result = upsertProspect(prospect);
    if (result.action === 'inserted') inserted += 1;
    else updated += 1;
  }
  return { inserted, updated };
}

export function listProspects(ids?: number[]): Prospect[] {
  if (ids && ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM prospects WHERE id IN (${placeholders}) ORDER BY id ASC`);
    const rows = stmt.all(...ids);
    return rows.map(rowToProspect);
  }
  const stmt = db.prepare(`SELECT * FROM prospects ORDER BY id ASC`);
  return stmt.all().map(rowToProspect);
}

export function getProspectById(id: number): Prospect | undefined {
  const stmt = db.prepare(`SELECT * FROM prospects WHERE id = ? LIMIT 1`);
  const row = stmt.get(id);
  return row ? rowToProspect(row) : undefined;
}

export function updateScore(id: number, score: number, explanation: string): void {
  const stmt = db.prepare(
    `UPDATE prospects SET score = ?, score_explanation = ?, updated_at = datetime('now') WHERE id = ?`
  );
  stmt.run(score, explanation, id);
}

export function clearProspects(): void {
  db.exec('DELETE FROM prospects;');
}
