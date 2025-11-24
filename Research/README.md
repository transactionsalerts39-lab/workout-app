# Fitness Platform Competitor Analysis

**Analysis Date:** 2025-10-16 20:13:51

## Methodology

This analysis scraped pricing and feature information from 8 fitness/personal training platforms using:
- Primary: Python requests library with BeautifulSoup parsing
- Fallback: curl for server-side rendered content
- Rate limiting: 2-5 second delays between requests
- Robots.txt compliance: Checked and respected

## Sites Analyzed

- **trainerize**: https://www.trainerize.com
- **truecoach**: https://truecoach.co
- **mypthub**: https://www.mypthub.net
- **ptdistinction**: https://www.ptdistinction.com
- **everfit**: https://everfit.io
- **trainheroic**: https://www.trainheroic.com
- **trainerize_me**: https://www.trainerize.me
- **trainheroic_marketplace**: https://marketplace.trainheroic.com

## Directory Structure

```
Research/
├── raw_html/          # HTML snapshots from each site
├── parsed_json/       # Individual site analysis results
├── compiled/          # Comparison tables and consolidated data
│   ├── competitors_raw.jsonl
│   ├── competitors_parsed.json
│   ├── competitor_comparison.csv
│   └── competitor_comparison.md
└── logs/              # Scraping logs
```

## Key Findings

- **Total pricing plans found:** 522
- **Total features extracted:** 231
- **Currencies detected:** USD

## Caveats

- Pricing information changes frequently - data reflects snapshot at analysis time
- Some sites may use JavaScript for dynamic content - HTML snapshots captured where possible
- Feature extraction based on public marketing content only
- Analysis respects robots.txt and uses reasonable rate limiting
