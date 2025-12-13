#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { bulkUpsert, getProspectById, initDb, listProspects, updateScore, upsertProspect } from '../db';
import { scoreProspect } from '../scoring';
import { loadScoringConfig } from '../scoring/config';
import { buildOutreachDrafts } from '../templates/outreach';
import { Prospect, ProspectInput } from '../types';
import { loadCsvProspects } from '../utils/csv';
import { parseRawProfileText, buildProspectFromHint } from '../utils/parser';
import { parseTags } from '../utils/tags';

initDb();

const program = new Command();
program
  .name('prospector')
  .description('Manual prospect collector + outreach helper (no scraping; manual inputs only).')
  .version('1.0.0');

function parseIdList(raw?: string): number[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => !Number.isNaN(v));
}

program
  .command('import')
  .description('Import prospects from a manually-collected CSV file')
  .requiredOption('--csv <path>', 'Path to CSV (with headers)')
  .action((opts) => {
    const csvPath = path.isAbsolute(opts.csv) ? opts.csv : path.resolve(process.cwd(), opts.csv);
    if (!fs.existsSync(csvPath)) {
      console.error(`CSV not found at ${csvPath}`);
      process.exit(1);
    }
    const { prospects, errors } = loadCsvProspects(csvPath);
    if (errors.length) {
      console.warn('Some rows were skipped:');
      errors.forEach((err) => console.warn(`- ${err}`));
    }
    const { inserted, updated } = bulkUpsert(prospects);
    console.log(`Imported ${prospects.length} rows. Inserted: ${inserted}, Updated: ${updated}.`);
  });

async function capturePaste(): Promise<ProspectInput> {
  console.log('Paste profile headline/about text. Enter a single "." on its own line to finish:');
  const rl = readline.createInterface({ input, output });
  const lines: string[] = [];

  for await (const line of rl) {
    if (line.trim() === '.') break;
    lines.push(line);
  }

  const raw = lines.join('\n');
  const hint = parseRawProfileText(raw);

  const ask = async (label: string, preset?: string) => {
    const suffix = preset ? ` (${preset})` : '';
    const answer = await rl.question(`${label}${suffix}: `);
    return answer.trim() || preset || '';
  };

  const full_name = await ask('Full name', hint.full_name);
  const title = await ask('Title', hint.title);
  const company = await ask('Company', hint.company);
  const location = await ask('Location', hint.location);
  const profile_url = await ask('Profile URL (optional)');
  const tagsRaw = await ask('Tags (comma/semicolon separated)', hint.tags?.join(', '));
  const last_active_hint = await ask('Last active hint (e.g., active 2w ago)', hint.last_active_hint);
  rl.close();

  return buildProspectFromHint(hint, {
    full_name,
    title,
    company,
    location,
    profile_url,
    tags: parseTags(tagsRaw),
    last_active_hint,
    source: 'paste',
  });
}

program
  .command('paste')
  .description('Interactive mode: paste profile text; CLI structures and stores it')
  .action(async () => {
    const prospect = await capturePaste();
    const result = upsertProspect(prospect);
    console.log(`${result.action === 'inserted' ? 'Saved' : 'Updated'} prospect #${result.prospect.id} (${result.prospect.full_name}).`);
  });

program
  .command('score')
  .description('Apply deterministic scoring to prospects')
  .option('--id <ids>', 'Comma-separated prospect IDs to score (default: all)')
  .option('--config <path>', 'Optional JSON config to override scoring keywords')
  .action((opts) => {
    const ids = parseIdList(opts.id);
    const config = loadScoringConfig(opts.config);
    const prospects = listProspects(ids);
    if (!prospects.length) {
      console.log('No prospects found to score.');
      return;
    }
    prospects.forEach((p) => {
      const breakdown = scoreProspect(p as Prospect, config);
      updateScore(p.id, breakdown.total, breakdown.explanation);
      console.log(
        `#${p.id} ${p.full_name}: ${breakdown.total} (${breakdown.explanation})`
      );
    });
  });

program
  .command('draft')
  .description('Generate outreach drafts for stored prospects')
  .option('--id <ids>', 'Comma-separated prospect IDs (default: all)')
  .option('--limit <n>', 'Limit number of prospects for draft generation', (val) => Number(val), undefined)
  .action((opts) => {
    const ids = parseIdList(opts.id);
    const limit = typeof opts.limit === 'number' && !Number.isNaN(opts.limit) ? opts.limit : undefined;
    let prospects = listProspects(ids);
    if (limit && limit > 0) {
      prospects = prospects.slice(0, limit);
    }
    if (!prospects.length) {
      console.log('No prospects found for drafting.');
      return;
    }
    prospects.forEach((p) => {
      const drafts = buildOutreachDrafts(p);
      console.log(`\n---- Prospect #${p.id} ${p.full_name} (${p.title ?? ''} @ ${p.company ?? ''}) ----`);
      drafts.forEach((draft) => {
        console.log(`\n[${draft.variant}]\n${draft.body}\n`);
      });
    });
  });

program.parseAsync(process.argv);
