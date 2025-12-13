# Prospector (manual-only)

Compliant “Prospect Collector + Outreach” workflow for LinkedIn-style networking **without scraping, crawling, or automated extraction**. All data comes from you (pasted text or CSV you prepared). Optionally enrich using public company sites you provide.

## Setup
```bash
cd prospector
npm install
# optional: override DB location
export PROSPECTOR_DB_PATH=./data/prospects.db
```

SQLite is used by default at `data/prospects.db` (created automatically). No connections to LinkedIn or headless browsers are used.

## Commands
All commands run after `npm run build` or directly with `ts-node` via `npm run dev`.

### Import manually collected CSV
```bash
npm run build
node dist/cli/index.js import --csv data/prospects.csv
# or after build
./dist/cli/index.js import --csv path/to/file.csv
```
CSV headers accepted: `full_name,title,company,location,profile_url,source,notes_raw,tags,last_active_hint,status`.

### Paste interactive mode
```bash
npm run dev -- paste
# or after build
node dist/cli/index.js paste
```
- Paste headline/about text, end with `.` on a new line.
- CLI proposes fields; you can edit each before saving.

### Score prospects (deterministic rubric)
```bash
npm run build
node dist/cli/index.js score             # score everyone
node dist/cli/index.js score --id 1,3    # specific IDs
node dist/cli/index.js score --config config/scoring.json  # override keywords
```
Rubric (0–100):
- Role relevance (0–40) via role keywords
- Seniority match (0–20)
- Geo fit (0–10)
- Company fit keywords (0–15)
- Recency/activity hint (0–15)
Each score stores an explanation in the DB.

### Generate outreach drafts
```bash
npm run build
node dist/cli/index.js draft             # all prospects
node dist/cli/index.js draft --id 2,5    # specific IDs
node dist/cli/index.js draft --limit 5   # first N
```
Outputs two variants per prospect:
1. Referral / intro ask
2. Short value pitch + call request  
Drafts only use stored fields and your notes; they never claim scraping.

## Example CSV
`data/prospects.csv` shows a minimal template with three sample rows. Tags accept comma/semicolon lists.

## Data model (SQLite)
Fields: `id, full_name, title, company, location, profile_url, source, notes_raw, tags[], last_active_hint, score, score_explanation, status, created_at, updated_at`.  
Dedupe: unique on `profile_url` (case-insensitive) and fallback `full_name + company`.

## Tests
```bash
npm test
```
Includes parsing, dedupe, and scoring checks (runs against an in-memory DB).

## Compliance reminders
- No login, scraping, crawling, or automated requests to LinkedIn or gated sources.
- Only process text/CSV you provide, plus optional public company pages you explicitly supply.
- Outreach templates avoid any claim of scraping or unauthorized data use.
