import { ProspectInput } from '../types';
import { parseTags } from './tags';

export interface ParsedProfileHint {
  full_name?: string;
  title?: string;
  company?: string;
  location?: string;
  tags?: string[];
  notes_raw?: string;
  last_active_hint?: string;
}

function looksLikeName(value: string): boolean {
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 5) return false;
  return parts.every((p) => /^[A-Z]/.test(p));
}

export function parseRawProfileText(raw: string): ParsedProfileHint {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hint: ParsedProfileHint = { notes_raw: raw.trim() || undefined };
  const headline = lines[0] ?? '';

  if (headline) {
    const parts = headline.split(/\s*[|—–-]\s*/).filter(Boolean);
    if (parts.length > 0 && looksLikeName(parts[0])) {
      hint.full_name = parts[0];
      if (parts.length > 1) {
        const maybeTitle = parts.slice(1).join(' | ');
        hint.title = maybeTitle;
      }
    } else if (looksLikeName(headline)) {
      hint.full_name = headline;
    }

    const atMatchTarget = (hint.title ?? headline).match(/(.+?)\s+at\s+(.+)/i);
    if (atMatchTarget) {
      hint.title = atMatchTarget[1].trim();
      hint.company = atMatchTarget[2].trim();
    }
  }

  const locationLine = lines.find((l) => /(Based in|Remote|USA|United|London|Paris|NYC|San\s+|Los\s+)/i.test(l));
  if (locationLine) {
    hint.location = locationLine.replace(/^Based in\s*/i, '').trim();
  }

  const tagLine = lines.find((l) => /tags:/i.test(l));
  if (tagLine) {
    const [, tagString] = tagLine.split(/tags:/i);
    hint.tags = parseTags(tagString);
  }

  return hint;
}

export function buildProspectFromHint(
  hint: ParsedProfileHint,
  overrides: Partial<ProspectInput> = {}
): ProspectInput {
  return {
    full_name: overrides.full_name ?? hint.full_name ?? 'Unknown',
    title: overrides.title ?? hint.title,
    company: overrides.company ?? hint.company,
    location: overrides.location ?? hint.location,
    profile_url: overrides.profile_url,
    source: overrides.source ?? 'paste',
    notes_raw: overrides.notes_raw ?? hint.notes_raw,
    tags: overrides.tags ?? hint.tags ?? [],
    last_active_hint: overrides.last_active_hint,
    status: overrides.status,
  };
}
