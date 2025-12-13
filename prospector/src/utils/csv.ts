import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { ProspectInput } from '../types';
import { parseTags } from './tags';

interface CsvRow {
  [key: string]: string;
}

export function loadCsvProspects(filePath: string): { prospects: ProspectInput[]; errors: string[] } {
  const content = fs.readFileSync(filePath, 'utf8');
  return parseCsvProspects(content);
}

export function parseCsvProspects(content: string): { prospects: ProspectInput[]; errors: string[] } {
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as CsvRow[];

  const prospects: ProspectInput[] = [];
  const errors: string[] = [];

  records.forEach((row, idx) => {
    const fullName = (row.full_name || row.name || '').trim();
    if (!fullName) {
      errors.push(`Row ${idx + 1}: missing full_name/name`);
      return;
    }
    const company = (row.company || '').trim();
    const tags = parseTags(row.tags || row.tag_list);
    prospects.push({
      full_name: fullName,
      title: row.title || row.headline,
      company: company || undefined,
      location: row.location || row.city,
      profile_url: row.profile_url || row.url,
      source: row.source || 'csv',
      notes_raw: row.notes_raw || row.notes,
      tags,
      last_active_hint: row.last_active_hint || row.active,
      status: row.status,
    });
  });

  return { prospects, errors };
}
