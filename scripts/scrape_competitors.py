#!/usr/bin/env python3
"""
Fitness Platform Competitor Analysis Scraper
===========================================

Scrapes pricing and feature information from 8 fitness/personal training platforms:
1. Trainerize, 2. TrueCoach, 3. My PT Hub, 4. PT Distinction, 
5. Everfit, 6. TrainHeroic, 7. Trainerize.me, 8. TrainHeroic Marketplace

Usage:
    python3 scrape_competitors.py --sites all --use-mcp true --save-html true
    python3 scrape_competitors.py --sites trainerize,truecoach --delay-min 3 --delay-max 6
"""

import argparse
import csv
import json
import logging
import os
import random
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests
from bs4 import BeautifulSoup, Tag


# =============================================================================
# Configuration and Constants
# =============================================================================

BASE_DIR = Path(__file__).parent.parent
RESEARCH_DIR = BASE_DIR / "Research"
RAW_HTML_DIR = RESEARCH_DIR / "raw_html"
PARSED_JSON_DIR = RESEARCH_DIR / "parsed_json"
COMPILED_DIR = RESEARCH_DIR / "compiled"
LOGS_DIR = RESEARCH_DIR / "logs"

# Target websites and their initial page URLs
SITE_TARGETS = {
    "trainerize": {
        "base_url": "https://www.trainerize.com",
        "pricing_urls": ["https://www.trainerize.com/pricing"],
        "features_urls": ["https://www.trainerize.com/features"],
        "slug": "trainerize"
    },
    "truecoach": {
        "base_url": "https://truecoach.co", 
        "pricing_urls": ["https://truecoach.co/pricing"],
        "features_urls": ["https://truecoach.co/features"],
        "slug": "truecoach"
    },
    "mypthub": {
        "base_url": "https://www.mypthub.net",
        "pricing_urls": ["https://www.mypthub.net/pricing"],
        "features_urls": ["https://www.mypthub.net/features"],
        "slug": "mypthub"
    },
    "ptdistinction": {
        "base_url": "https://www.ptdistinction.com",
        "pricing_urls": ["https://www.ptdistinction.com/pricing"],
        "features_urls": ["https://www.ptdistinction.com/features"],
        "slug": "ptdistinction"
    },
    "everfit": {
        "base_url": "https://everfit.io",
        "pricing_urls": ["https://everfit.io/pricing"],
        "features_urls": ["https://everfit.io/features"],
        "slug": "everfit"
    },
    "trainheroic": {
        "base_url": "https://www.trainheroic.com",
        "pricing_urls": ["https://www.trainheroic.com/pricing"],
        "features_urls": ["https://www.trainheroic.com/platform", "https://www.trainheroic.com/coaches"],
        "slug": "trainheroic"
    },
    "trainerize_me": {
        "base_url": "https://www.trainerize.me",
        "pricing_urls": ["https://www.trainerize.me/for-trainers", "https://www.trainerize.me/about"],
        "features_urls": ["https://www.trainerize.me/for-trainers"],
        "slug": "trainerize_me"
    },
    "trainheroic_marketplace": {
        "base_url": "https://marketplace.trainheroic.com",
        "pricing_urls": ["https://marketplace.trainheroic.com"],
        "features_urls": ["https://marketplace.trainheroic.com"],
        "slug": "trainheroic_marketplace"
    }
}

# Feature taxonomy for normalization
FEATURE_TAXONOMY = {
    "workout_builder": ["workout", "program", "builder", "exercise", "routine", "plan"],
    "exercise_library": ["exercise", "library", "database", "movement", "catalog"],
    "client_management": ["client", "member", "user", "profile", "contact", "roster"],
    "progress_tracking": ["progress", "track", "metrics", "measurement", "stats", "analytics"],
    "messaging": ["message", "chat", "communication", "inbox", "notification"],
    "habit_coaching": ["habit", "lifestyle", "behavior", "coach", "guidance"],
    "nutrition_tracking": ["nutrition", "meal", "food", "diet", "calorie", "macro"],
    "scheduling": ["schedule", "calendar", "appointment", "booking", "session"],
    "payments_billing": ["payment", "billing", "invoice", "subscription", "revenue"],
    "mobile_app": ["mobile", "app", "ios", "android", "smartphone"],
    "integrations": ["integration", "connect", "sync", "api", "third-party"],
    "white_label_branding": ["white", "label", "brand", "custom", "logo"],
    "groups_teams": ["group", "team", "class", "community", "multiple"],
    "marketplace_access": ["marketplace", "program", "sell", "buy", "store"],
    "analytics_reporting": ["analytics", "report", "dashboard", "insight", "data"],
    "video_calls": ["video", "call", "zoom", "meeting", "virtual"],
    "form_check_video": ["form", "check", "video", "technique", "review"],
    "templates_programs": ["template", "program", "preset", "ready-made"],
    "automation": ["automate", "automatic", "workflow", "trigger"],
    "check_ins": ["check", "in", "checkin", "update", "status"],
    "coach_athlete_chat": ["coach", "athlete", "chat", "direct", "message"],
    "custom_forms": ["form", "custom", "questionnaire", "survey", "intake"],
    "file_sharing": ["file", "share", "document", "upload", "attach"]
}

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


# =============================================================================
# Logging Setup
# =============================================================================

def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configure logging for the scraper."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    log_file = LOGS_DIR / f"scrape_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    logging.basicConfig(
        level=getattr(logging, log_level.upper()),
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler()
        ]
    )
    return logging.getLogger(__name__)


# =============================================================================
# Web Scraping Utilities
# =============================================================================

class CompetitorScraper:
    """Main scraper class for competitor analysis."""
    
    def __init__(self, delay_min: int = 2, delay_max: int = 5, use_mcp: bool = False, save_html: bool = True):
        self.delay_min = delay_min
        self.delay_max = delay_max
        self.use_mcp = use_mcp
        self.save_html = save_html
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': USER_AGENT,
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        self.logger = logging.getLogger(__name__)
        
        # Ensure directories exist
        for directory in [RAW_HTML_DIR, PARSED_JSON_DIR, COMPILED_DIR, LOGS_DIR]:
            directory.mkdir(parents=True, exist_ok=True)

    def check_robots_txt(self, base_url: str, path: str) -> bool:
        """Check if path is allowed by robots.txt."""
        try:
            rp = RobotFileParser()
            rp.set_url(urljoin(base_url, '/robots.txt'))
            rp.read()
            return rp.can_fetch(USER_AGENT, urljoin(base_url, path))
        except Exception as e:
            self.logger.warning(f"Could not check robots.txt for {base_url}: {e}")
            return True  # If can't check, assume allowed

    def delay_request(self):
        """Random delay between requests."""
        delay = random.uniform(self.delay_min, self.delay_max)
        time.sleep(delay)

    def fetch_with_requests(self, url: str, base_url: str) -> Tuple[Optional[str], int, str]:
        """Fetch content using requests library."""
        if not self.check_robots_txt(base_url, urlparse(url).path):
            self.logger.warning(f"URL blocked by robots.txt: {url}")
            return None, 403, "requests"

        try:
            self.session.headers['Referer'] = base_url
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 429:
                self.logger.warning(f"Rate limited at {url}, waiting longer...")
                time.sleep(30)
                response = self.session.get(url, timeout=30)
            
            response.raise_for_status()
            return response.text, response.status_code, "requests"
            
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed for {url}: {e}")
            return None, getattr(e.response, 'status_code', 0) if hasattr(e, 'response') else 0, "requests"

    def fetch_with_curl(self, url: str, base_url: str) -> Tuple[Optional[str], int, str]:
        """Fallback fetch using curl."""
        try:
            cmd = [
                'curl', '-s', '-L',
                '-A', USER_AGENT,
                '-H', 'Accept-Language: en-US,en;q=0.9',
                '-H', f'Referer: {base_url}',
                url
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout:
                return result.stdout, 200, "curl"
            else:
                self.logger.error(f"Curl failed for {url}: {result.stderr}")
                return None, result.returncode, "curl"
                
        except subprocess.TimeoutExpired:
            self.logger.error(f"Curl timeout for {url}")
            return None, 0, "curl"
        except Exception as e:
            self.logger.error(f"Curl error for {url}: {e}")
            return None, 0, "curl"

    def fetch_with_mcp(self, url: str) -> Tuple[Optional[str], int, str]:
        """Fetch using MCP browser tools for JavaScript-heavy pages."""
        try:
            # Import MCP call function
            import sys
            sys.path.append(str(BASE_DIR))
            from call_mcp_tool import call_mcp_tool
            
            self.logger.info(f"Trying MCP browser navigation to {url}")
            
            # Navigate to the URL
            nav_result = call_mcp_tool("navigate_page", json.dumps({"url": url}))
            if not nav_result or "error" in str(nav_result).lower():
                self.logger.warning(f"MCP navigation failed for {url}")
                return None, 0, "mcp"
            
            # Wait for page to load
            time.sleep(5)
            
            # Take a snapshot to get the rendered content
            snapshot_result = call_mcp_tool("take_snapshot", "{}")
            if snapshot_result and "content" in str(snapshot_result):
                # Extract HTML from snapshot
                html_result = call_mcp_tool("evaluate_script", json.dumps({
                    "function": "() => { return document.documentElement.outerHTML; }"
                }))
                
                if html_result:
                    self.logger.info(f"Successfully fetched {len(str(html_result))} chars via MCP for {url}")
                    return str(html_result), 200, "mcp"
            
            self.logger.warning(f"MCP content extraction failed for {url}")
            return None, 0, "mcp"
            
        except ImportError:
            self.logger.warning(f"MCP tools not available - cannot fetch {url} with JavaScript rendering")
            return None, 0, "mcp"
        except Exception as e:
            self.logger.error(f"MCP error for {url}: {e}")
            return None, 0, "mcp"

    def is_content_sufficient(self, html: str, url: str) -> bool:
        """Check if HTML contains sufficient content (not just JS redirects)."""
        if not html or len(html) < 1000:
            return False
            
        soup = BeautifulSoup(html, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
            
        text = soup.get_text()
        text_length = len(text.strip())
        
        # Check for common indicators of JS-heavy pages
        if text_length < 500:
            return False
            
        # Look for pricing or feature indicators
        price_indicators = ["pricing", "price", "$", "plan", "feature", "coach", "client"]
        text_lower = text.lower()
        
        return any(indicator in text_lower for indicator in price_indicators)

    def fetch_page(self, url: str, base_url: str, page_type: str, vendor_slug: str) -> Dict[str, Any]:
        """Fetch a single page with multiple fallback methods."""
        self.logger.info(f"Fetching {page_type} page: {url}")
        
        # Try requests first
        html, status_code, extraction_method = self.fetch_with_requests(url, base_url)
        
        # If requests failed or content insufficient, try curl
        if not html or not self.is_content_sufficient(html, url):
            self.logger.info(f"Trying curl fallback for {url}")
            self.delay_request()
            html, status_code, extraction_method = self.fetch_with_curl(url, base_url)
        
        # If still no good content and MCP enabled, try MCP
        if self.use_mcp and (not html or not self.is_content_sufficient(html, url)):
            self.logger.info(f"Trying MCP fallback for {url}")
            self.delay_request()
            html, status_code, extraction_method = self.fetch_with_mcp(url)

        # Save HTML if requested
        html_path = None
        if html and self.save_html:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{vendor_slug}_{page_type}_{timestamp}.html"
            html_path = RAW_HTML_DIR / filename
            html_path.write_text(html, encoding='utf-8')

        return {
            "url": url,
            "html": html,
            "status_code": status_code,
            "extraction_method": extraction_method,
            "html_path": str(html_path) if html_path else None,
            "is_sufficient": self.is_content_sufficient(html, url) if html else False
        }


# =============================================================================
# Content Parsing
# =============================================================================

class ContentParser:
    """Parse pricing and features from HTML content."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def clean_text(self, text: str) -> str:
        """Clean and normalize text content."""
        if not text:
            return ""
        
        # Remove extra whitespace and normalize
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Remove common footnote symbols
        text = re.sub(r'[*†‡§¶]', '', text)
        
        return text

    def extract_pricing_info(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Extract pricing information from parsed HTML."""
        pricing_plans = []
        
        # Common pricing selectors
        pricing_selectors = [
            '[class*="price"]', '[class*="plan"]', '[class*="tier"]',
            '[data-testid*="price"]', '[data-testid*="plan"]',
            '.pricing-card', '.plan-card', '.tier-card'
        ]
        
        # Find pricing sections
        pricing_sections = []
        for selector in pricing_selectors:
            elements = soup.select(selector)
            pricing_sections.extend(elements)
        
        # Look for text indicators
        pricing_keywords = re.compile(r'\b(pricing|plans?|tiers?|monthly|yearly|per month|per year|\/mo|\/month|\/yr|\/year|free trial)\b', re.I)
        text_elements = soup.find_all(text=pricing_keywords)
        
        for element in text_elements:
            parent = element.parent
            if parent and parent not in pricing_sections:
                pricing_sections.append(parent)

        # Extract plan details
        for section in pricing_sections:
            plan_info = self.parse_plan_details(section)
            if plan_info:
                pricing_plans.append(plan_info)

        return pricing_plans

    def parse_plan_details(self, element: Tag) -> Optional[Dict[str, Any]]:
        """Parse individual plan details from an element."""
        if not element:
            return None

        # Get text content
        text = self.clean_text(element.get_text())
        
        if len(text) < 10:  # Skip very short content
            return None

        # Extract plan name (often in headings)
        plan_name = ""
        for heading in element.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            heading_text = self.clean_text(heading.get_text())
            if heading_text and len(heading_text) < 50:  # Reasonable plan name length
                plan_name = heading_text
                break

        # Extract price information
        price_info = self.extract_price_from_text(text)
        
        # Extract trial information
        trial_info = self.extract_trial_info(text)

        if price_info or trial_info or "free" in text.lower():
            return {
                "plan_name": plan_name or "Unknown Plan",
                "raw_text": text[:500],  # Limit raw text length
                **price_info,
                **trial_info
            }

        return None

    def extract_price_from_text(self, text: str) -> Dict[str, Any]:
        """Extract price information from text."""
        price_info = {
            "price_amount": None,
            "currency": None,
            "billing_cycle": None,
            "per_unit": None
        }

        # Currency patterns
        currency_patterns = {
            r'\$': 'USD',
            r'£': 'GBP', 
            r'€': 'EUR',
            r'CA\$': 'CAD',
            r'AU\$': 'AUD'
        }

        # Price extraction patterns
        price_patterns = [
            r'(\$|£|€|CA\$|AU\$)\s*(\d+(?:\.\d{2})?)',  # $99, £50.00
            r'(\d+(?:\.\d{2})?)\s*(\$|£|€|CA\$|AU\$)',  # 99$, 50.00£
            r'(\$|£|€|CA\$|AU\$)\s*(\d+)',              # $99
            r'(\d+)\s*(\$|£|€|CA\$|AU\$)'               # 99$
        ]

        for pattern in price_patterns:
            matches = re.finditer(pattern, text)
            for match in matches:
                groups = match.groups()
                if len(groups) >= 2:
                    # Determine which group is currency and which is amount
                    if groups[0] in ['$', '£', '€', 'CA$', 'AU$']:
                        currency_symbol, amount = groups[0], groups[1]
                    else:
                        amount, currency_symbol = groups[0], groups[1]
                    
                    price_info["price_amount"] = float(amount)
                    price_info["currency"] = currency_patterns.get(currency_symbol, 'USD')
                    break

        # Billing cycle detection
        if re.search(r'\b(monthly|per month|\/mo|\/month)\b', text, re.I):
            price_info["billing_cycle"] = "monthly"
        elif re.search(r'\b(yearly|annually|per year|\/yr|\/year|annual)\b', text, re.I):
            price_info["billing_cycle"] = "yearly"

        # Per-unit detection
        if re.search(r'\b(per coach|per trainer|per professional)\b', text, re.I):
            price_info["per_unit"] = "per_coach"
        elif re.search(r'\b(per client|per member|per user)\b', text, re.I):
            price_info["per_unit"] = "per_client"
        elif re.search(r'\b(per team|per gym|per studio)\b', text, re.I):
            price_info["per_unit"] = "per_team"

        return price_info

    def extract_trial_info(self, text: str) -> Dict[str, Any]:
        """Extract trial period information."""
        trial_info = {"trial_days": None}
        
        # Trial patterns
        trial_patterns = [
            r'(\d+)[\s-]*day[s]?\s+free',
            r'free\s+(\d+)[\s-]*day[s]?',
            r'(\d+)[\s-]*day[s]?\s+trial',
            r'trial\s+(\d+)[\s-]*day[s]?'
        ]

        for pattern in trial_patterns:
            match = re.search(pattern, text, re.I)
            if match:
                trial_info["trial_days"] = int(match.group(1))
                break

        return trial_info

    def extract_features(self, soup: BeautifulSoup) -> List[str]:
        """Extract feature list from HTML."""
        features = []
        
        # Find feature sections
        feature_sections = []
        
        # Look for sections with feature-related headings
        feature_headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'], 
                                       text=re.compile(r'\b(features?|what.*(get|includes?)|tools?|platform|capabilities)\b', re.I))
        
        for heading in feature_headings:
            # Get the section containing this heading
            section = heading.find_parent(['div', 'section', 'article'])
            if section:
                feature_sections.append(section)

        # Also look for common feature list patterns
        feature_lists = soup.find_all(['ul', 'ol'])
        feature_sections.extend(feature_lists)

        # Extract features from sections
        for section in feature_sections:
            section_features = self.extract_features_from_section(section)
            features.extend(section_features)

        # Remove duplicates while preserving order
        seen = set()
        unique_features = []
        for feature in features:
            if feature.lower() not in seen:
                seen.add(feature.lower())
                unique_features.append(feature)

        return unique_features

    def extract_features_from_section(self, section: Tag) -> List[str]:
        """Extract features from a specific section."""
        features = []

        # Extract from list items
        list_items = section.find_all('li')
        for item in list_items:
            feature_text = self.clean_text(item.get_text())
            if feature_text and 10 <= len(feature_text) <= 200:  # Reasonable feature text length
                features.append(feature_text)

        # If no list items, look for other structured content
        if not features:
            # Look for divs or spans that might contain features
            feature_elements = section.find_all(['div', 'span', 'p'], limit=20)
            for element in feature_elements:
                feature_text = self.clean_text(element.get_text())
                if feature_text and 10 <= len(feature_text) <= 200:
                    # Check if it looks like a feature description
                    if any(keyword in feature_text.lower() for keyword in 
                          ['track', 'manage', 'create', 'build', 'monitor', 'support', 'enable', 'provide']):
                        features.append(feature_text)

        return features[:50]  # Limit to reasonable number of features

    def normalize_features(self, features: List[str]) -> Dict[str, Any]:
        """Normalize features against taxonomy."""
        normalized = {}
        unmatched = []

        for feature in features:
            feature_lower = feature.lower()
            matched = False

            for taxonomy_key, keywords in FEATURE_TAXONOMY.items():
                if any(keyword in feature_lower for keyword in keywords):
                    if taxonomy_key not in normalized:
                        normalized[taxonomy_key] = []
                    normalized[taxonomy_key].append(feature)
                    matched = True
                    break

            if not matched:
                unmatched.append(feature)

        # Convert lists to boolean flags and keep samples
        feature_flags = {}
        feature_samples = {}
        
        for key, feature_list in normalized.items():
            feature_flags[key] = True
            feature_samples[f"{key}_examples"] = feature_list[:3]  # Keep up to 3 examples

        return {
            "feature_flags": feature_flags,
            "feature_samples": feature_samples,
            "unmatched_features": unmatched[:10]  # Keep up to 10 unmatched features
        }


# =============================================================================
# Site-Specific Parsers
# =============================================================================

class SiteSpecificParsers:
    """Site-specific parsing overrides."""
    
    def __init__(self, content_parser: ContentParser):
        self.parser = content_parser
        self.logger = logging.getLogger(__name__)

    def parse_trainerize(self, html: str) -> Dict[str, Any]:
        """Parse Trainerize-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Trainerize often has pricing toggle buttons
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "Trainerize pricing may have monthly/yearly toggle"
        }

    def parse_truecoach(self, html: str) -> Dict[str, Any]:
        """Parse TrueCoach-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # Check for Next.js data
        nextjs_data = soup.find('script', {'id': '__NEXT_DATA__'})
        if nextjs_data:
            try:
                data = json.loads(nextjs_data.string)
                # Extract pricing from Next.js data if available
                self.logger.info("Found Next.js data in TrueCoach page")
            except json.JSONDecodeError:
                pass

        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "TrueCoach may use Next.js for dynamic content"
        }

    def parse_mypthub(self, html: str) -> Dict[str, Any]:
        """Parse My PT Hub-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "MyPTHub may show promotional pricing"
        }

    def parse_ptdistinction(self, html: str) -> Dict[str, Any]:
        """Parse PT Distinction-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "PT Distinction pricing may be based on client count"
        }

    def parse_everfit(self, html: str) -> Dict[str, Any]:
        """Parse Everfit-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "Everfit may have tabbed feature content"
        }

    def parse_trainheroic(self, html: str) -> Dict[str, Any]:
        """Parse TrainHeroic-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "TrainHeroic has separate coach/athlete features"
        }

    def parse_trainerize_me(self, html: str) -> Dict[str, Any]:
        """Parse Trainerize.me marketplace-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        # For marketplace, look for different pricing patterns
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "Trainerize.me marketplace - pricing may be commission-based"
        }

    def parse_trainheroic_marketplace(self, html: str) -> Dict[str, Any]:
        """Parse TrainHeroic marketplace-specific content."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "TrainHeroic marketplace - may show program pricing ranges"
        }

    def get_parser_for_site(self, site_slug: str):
        """Get the appropriate parser function for a site."""
        parser_map = {
            "trainerize": self.parse_trainerize,
            "truecoach": self.parse_truecoach,
            "mypthub": self.parse_mypthub,
            "ptdistinction": self.parse_ptdistinction,
            "everfit": self.parse_everfit,
            "trainheroic": self.parse_trainheroic,
            "trainerize_me": self.parse_trainerize_me,
            "trainheroic_marketplace": self.parse_trainheroic_marketplace
        }
        return parser_map.get(site_slug, self.parse_generic)

    def parse_generic(self, html: str) -> Dict[str, Any]:
        """Generic parser fallback."""
        soup = BeautifulSoup(html, 'html.parser')
        
        pricing_plans = self.parser.extract_pricing_info(soup)
        features = self.parser.extract_features(soup)
        
        return {
            "pricing": pricing_plans,
            "features_raw": features,
            "site_specific_notes": "Used generic parser"
        }


# =============================================================================
# Main Analysis Engine
# =============================================================================

class CompetitorAnalysisEngine:
    """Main engine that orchestrates the competitor analysis."""
    
    def __init__(self, delay_min: int = 2, delay_max: int = 5, use_mcp: bool = False, save_html: bool = True):
        self.scraper = CompetitorScraper(delay_min, delay_max, use_mcp, save_html)
        self.content_parser = ContentParser()
        self.site_parsers = SiteSpecificParsers(self.content_parser)
        self.logger = logging.getLogger(__name__)

    def analyze_site(self, site_name: str, site_config: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze a single competitor site."""
        self.logger.info(f"Starting analysis of {site_name}")
        
        site_data = {
            "vendor": site_name,
            "base_url": site_config["base_url"],
            "slug": site_config["slug"],
            "fetched_at": datetime.now().isoformat(),
            "pages_scraped": [],
            "pricing": [],
            "features_raw": [],
            "parsing_errors": []
        }

        # Process pricing pages
        for url in site_config["pricing_urls"]:
            try:
                page_data = self.scraper.fetch_page(url, site_config["base_url"], "pricing", site_config["slug"])
                site_data["pages_scraped"].append({
                    "url": url,
                    "page_type": "pricing",
                    "status_code": page_data["status_code"],
                    "extraction_method": page_data["extraction_method"],
                    "html_path": page_data["html_path"],
                    "is_sufficient": page_data["is_sufficient"]
                })

                if page_data["html"] and page_data["is_sufficient"]:
                    parsed_data = self.parse_page_content(page_data["html"], site_config["slug"])
                    site_data["pricing"].extend(parsed_data.get("pricing", []))
                else:
                    self.logger.warning(f"Insufficient content from pricing page: {url}")

                self.scraper.delay_request()
                
            except Exception as e:
                error_msg = f"Error processing pricing page {url}: {e}"
                self.logger.error(error_msg)
                site_data["parsing_errors"].append(error_msg)

        # Process features pages
        for url in site_config["features_urls"]:
            try:
                page_data = self.scraper.fetch_page(url, site_config["base_url"], "features", site_config["slug"])
                site_data["pages_scraped"].append({
                    "url": url,
                    "page_type": "features",
                    "status_code": page_data["status_code"],
                    "extraction_method": page_data["extraction_method"],
                    "html_path": page_data["html_path"],
                    "is_sufficient": page_data["is_sufficient"]
                })

                if page_data["html"] and page_data["is_sufficient"]:
                    parsed_data = self.parse_page_content(page_data["html"], site_config["slug"])
                    site_data["features_raw"].extend(parsed_data.get("features_raw", []))
                else:
                    self.logger.warning(f"Insufficient content from features page: {url}")

                self.scraper.delay_request()
                
            except Exception as e:
                error_msg = f"Error processing features page {url}: {e}"
                self.logger.error(error_msg)
                site_data["parsing_errors"].append(error_msg)

        # Normalize features
        if site_data["features_raw"]:
            normalized_features = self.content_parser.normalize_features(site_data["features_raw"])
            site_data.update(normalized_features)

        # Quality check
        self.perform_quality_check(site_data)

        # Save individual site data
        self.save_site_data(site_data)

        self.logger.info(f"Completed analysis of {site_name} - Found {len(site_data['pricing'])} pricing plans and {len(site_data['features_raw'])} features")
        
        return site_data

    def parse_page_content(self, html: str, site_slug: str) -> Dict[str, Any]:
        """Parse content using site-specific parser."""
        parser_func = self.site_parsers.get_parser_for_site(site_slug)
        return parser_func(html)

    def perform_quality_check(self, site_data: Dict[str, Any]):
        """Validate extracted data quality."""
        vendor = site_data["vendor"]
        
        # Check pricing data
        if not site_data["pricing"]:
            self.logger.warning(f"{vendor}: No pricing plans extracted")
        
        # Check features data  
        if len(site_data["features_raw"]) < 5:
            self.logger.warning(f"{vendor}: Only {len(site_data['features_raw'])} features extracted")

        # Check for common currencies
        currencies = [plan.get("currency") for plan in site_data["pricing"] if plan.get("currency")]
        if len(set(currencies)) > 1:
            self.logger.info(f"{vendor}: Multiple currencies detected: {set(currencies)}")

    def save_site_data(self, site_data: Dict[str, Any]):
        """Save individual site analysis results."""
        filename = f"{site_data['slug']}_analysis.json"
        filepath = PARSED_JSON_DIR / filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(site_data, f, indent=2, ensure_ascii=False)

    def run_analysis(self, target_sites: List[str]) -> List[Dict[str, Any]]:
        """Run competitor analysis on specified sites."""
        self.logger.info(f"Starting competitor analysis for sites: {target_sites}")
        
        results = []
        
        for site_name in target_sites:
            if site_name not in SITE_TARGETS:
                self.logger.error(f"Unknown site: {site_name}")
                continue
                
            try:
                site_config = SITE_TARGETS[site_name]
                site_results = self.analyze_site(site_name, site_config)
                results.append(site_results)
                
            except Exception as e:
                self.logger.error(f"Failed to analyze {site_name}: {e}")
                continue

        self.logger.info(f"Completed analysis of {len(results)} sites")
        return results


# =============================================================================
# Output Generation
# =============================================================================

class OutputGenerator:
    """Generate comparison tables and reports."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def generate_all_outputs(self, analysis_results: List[Dict[str, Any]]):
        """Generate all output formats."""
        self.logger.info("Generating output files...")
        
        # Save raw results
        self.save_raw_results(analysis_results)
        
        # Generate comparison CSV
        self.generate_comparison_csv(analysis_results)
        
        # Generate comparison markdown
        self.generate_comparison_markdown(analysis_results)
        
        # Generate consolidated JSON
        self.generate_consolidated_json(analysis_results)
        
        # Generate summary README
        self.generate_readme(analysis_results)

    def save_raw_results(self, results: List[Dict[str, Any]]):
        """Save raw analysis results as JSONL."""
        filepath = COMPILED_DIR / "competitors_raw.jsonl"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            for result in results:
                # Flatten pages_scraped for JSONL format
                for page in result.get("pages_scraped", []):
                    record = {
                        "vendor": result["vendor"],
                        "base_url": result["base_url"],
                        "page_type": page["page_type"],
                        "source_url": page["url"],
                        "fetched_at": result["fetched_at"],
                        "http_status": page["status_code"],
                        "html_path": page["html_path"],
                        "extraction_method": page["extraction_method"],
                        "is_sufficient": page["is_sufficient"]
                    }
                    f.write(json.dumps(record) + '\n')

    def generate_comparison_csv(self, results: List[Dict[str, Any]]):
        """Generate CSV comparison table."""
        filepath = COMPILED_DIR / "competitor_comparison.csv"
        
        # Determine all feature flags across all sites
        all_features = set()
        for result in results:
            feature_flags = result.get("feature_flags", {})
            all_features.update(feature_flags.keys())
        
        all_features = sorted(list(all_features))

        with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                'Vendor', 'Base_URL', 'Pricing_URLs', 'Features_URLs',
                'Plans_Found', 'Features_Found', 'Entry_Plan_Price', 'Entry_Plan_Currency',
                'Entry_Plan_Billing', 'Trial_Days', 'Notes'
            ] + all_features

            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()

            for result in results:
                # Get entry-level pricing info
                pricing_info = self.get_entry_pricing_info(result.get("pricing", []))
                
                # Prepare row data
                row_data = {
                    'Vendor': result["vendor"],
                    'Base_URL': result["base_url"],
                    'Pricing_URLs': '; '.join([p["url"] for p in result.get("pages_scraped", []) if p["page_type"] == "pricing"]),
                    'Features_URLs': '; '.join([p["url"] for p in result.get("pages_scraped", []) if p["page_type"] == "features"]),
                    'Plans_Found': len(result.get("pricing", [])),
                    'Features_Found': len(result.get("features_raw", [])),
                    'Entry_Plan_Price': pricing_info.get("price"),
                    'Entry_Plan_Currency': pricing_info.get("currency"),
                    'Entry_Plan_Billing': pricing_info.get("billing"),
                    'Trial_Days': pricing_info.get("trial_days"),
                    'Notes': '; '.join(result.get("parsing_errors", [])[:2])  # Limit notes
                }

                # Add feature flags
                feature_flags = result.get("feature_flags", {})
                for feature in all_features:
                    row_data[feature] = 'Yes' if feature_flags.get(feature, False) else 'No'

                writer.writerow(row_data)

    def get_entry_pricing_info(self, pricing_plans: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract entry-level pricing information."""
        if not pricing_plans:
            return {}

        # Try to find the cheapest plan
        cheapest_plan = None
        cheapest_price = float('inf')

        for plan in pricing_plans:
            price = plan.get("price_amount")
            if price and price < cheapest_price:
                cheapest_price = price
                cheapest_plan = plan

        if cheapest_plan:
            return {
                "price": cheapest_plan.get("price_amount"),
                "currency": cheapest_plan.get("currency"),
                "billing": cheapest_plan.get("billing_cycle"),
                "trial_days": cheapest_plan.get("trial_days")
            }

        return {}

    def generate_comparison_markdown(self, results: List[Dict[str, Any]]):
        """Generate markdown comparison table."""
        filepath = COMPILED_DIR / "competitor_comparison.md"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("# Fitness Platform Competitor Analysis\n\n")
            f.write(f"*Analysis completed on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n\n")
            
            f.write("## Pricing Comparison\n\n")
            
            # Pricing table
            f.write("| Vendor | Entry Price | Currency | Billing | Trial Days | Plans Found |\n")
            f.write("|--------|-------------|----------|---------|------------|-------------|\n")
            
            for result in results:
                pricing_info = self.get_entry_pricing_info(result.get("pricing", []))
                f.write(f"| {result['vendor']} | {pricing_info.get('price', 'N/A')} | "
                       f"{pricing_info.get('currency', 'N/A')} | {pricing_info.get('billing', 'N/A')} | "
                       f"{pricing_info.get('trial_days', 'N/A')} | {len(result.get('pricing', []))} |\n")
            
            f.write("\n## Feature Comparison\n\n")
            
            # Feature table
            common_features = ['workout_builder', 'client_management', 'progress_tracking', 
                             'mobile_app', 'payments_billing', 'messaging']
            
            header = "| Vendor |" + "".join([f" {feature.replace('_', ' ').title()} |" for feature in common_features])
            f.write(header + "\n")
            f.write("|" + "---|" * (len(common_features) + 1) + "\n")
            
            for result in results:
                feature_flags = result.get("feature_flags", {})
                row = f"| {result['vendor']} |"
                for feature in common_features:
                    status = "✅" if feature_flags.get(feature, False) else "❌"
                    row += f" {status} |"
                f.write(row + "\n")
            
            f.write("\n## Analysis Notes\n\n")
            
            for result in results:
                f.write(f"### {result['vendor']}\n")
                f.write(f"- Base URL: {result['base_url']}\n")
                f.write(f"- Pages analyzed: {len(result.get('pages_scraped', []))}\n")
                f.write(f"- Features found: {len(result.get('features_raw', []))}\n")
                
                if result.get("parsing_errors"):
                    f.write(f"- Issues: {'; '.join(result['parsing_errors'][:3])}\n")
                
                f.write("\n")

    def generate_consolidated_json(self, results: List[Dict[str, Any]]):
        """Generate consolidated JSON results."""
        filepath = COMPILED_DIR / "competitors_parsed.json"
        
        consolidated = {
            "analysis_metadata": {
                "completed_at": datetime.now().isoformat(),
                "sites_analyzed": len(results),
                "total_pages_scraped": sum(len(r.get("pages_scraped", [])) for r in results)
            },
            "competitors": {}
        }

        for result in results:
            consolidated["competitors"][result["vendor"]] = result

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(consolidated, f, indent=2, ensure_ascii=False)

    def generate_readme(self, results: List[Dict[str, Any]]):
        """Generate README with methodology and findings."""
        filepath = RESEARCH_DIR / "README.md"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write("# Fitness Platform Competitor Analysis\n\n")
            f.write(f"**Analysis Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Methodology\n\n")
            f.write("This analysis scraped pricing and feature information from 8 fitness/personal training platforms using:\n")
            f.write("- Primary: Python requests library with BeautifulSoup parsing\n")
            f.write("- Fallback: curl for server-side rendered content\n")
            f.write("- Rate limiting: 2-5 second delays between requests\n")
            f.write("- Robots.txt compliance: Checked and respected\n\n")
            
            f.write("## Sites Analyzed\n\n")
            for result in results:
                f.write(f"- **{result['vendor']}**: {result['base_url']}\n")
            
            f.write("\n## Directory Structure\n\n")
            f.write("```\n")
            f.write("Research/\n")
            f.write("├── raw_html/          # HTML snapshots from each site\n")
            f.write("├── parsed_json/       # Individual site analysis results\n")
            f.write("├── compiled/          # Comparison tables and consolidated data\n")
            f.write("│   ├── competitors_raw.jsonl\n")
            f.write("│   ├── competitors_parsed.json\n")
            f.write("│   ├── competitor_comparison.csv\n")
            f.write("│   └── competitor_comparison.md\n")
            f.write("└── logs/              # Scraping logs\n")
            f.write("```\n\n")
            
            f.write("## Key Findings\n\n")
            total_plans = sum(len(r.get("pricing", [])) for r in results)
            total_features = sum(len(r.get("features_raw", [])) for r in results)
            
            f.write(f"- **Total pricing plans found:** {total_plans}\n")
            f.write(f"- **Total features extracted:** {total_features}\n")
            
            # Currency analysis
            currencies = []
            for result in results:
                for plan in result.get("pricing", []):
                    if plan.get("currency"):
                        currencies.append(plan["currency"])
            
            if currencies:
                from collections import Counter
                currency_counts = Counter(currencies)
                f.write(f"- **Currencies detected:** {', '.join(currency_counts.keys())}\n")
            
            f.write("\n## Caveats\n\n")
            f.write("- Pricing information changes frequently - data reflects snapshot at analysis time\n")
            f.write("- Some sites may use JavaScript for dynamic content - HTML snapshots captured where possible\n")
            f.write("- Feature extraction based on public marketing content only\n")
            f.write("- Analysis respects robots.txt and uses reasonable rate limiting\n")


# =============================================================================
# CLI and Main Execution
# =============================================================================

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Scrape competitor fitness platform data')
    
    parser.add_argument('--sites', type=str, default='all',
                       help='Comma-separated list of sites to scrape, or "all" (default: all)')
    parser.add_argument('--delay-min', type=int, default=2,
                       help='Minimum delay between requests in seconds (default: 2)')
    parser.add_argument('--delay-max', type=int, default=5,
                       help='Maximum delay between requests in seconds (default: 5)')
    parser.add_argument('--use-mcp', type=str, default='false', choices=['true', 'false'],
                       help='Use MCP for JavaScript-heavy pages (default: false)')
    parser.add_argument('--save-html', type=str, default='true', choices=['true', 'false'],
                       help='Save HTML snapshots (default: true)')
    parser.add_argument('--log-level', type=str, default='INFO',
                       choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'],
                       help='Logging level (default: INFO)')
    
    return parser.parse_args()


def main():
    """Main execution function."""
    args = parse_arguments()
    
    # Setup logging
    logger = setup_logging(args.log_level)
    
    # Parse boolean arguments
    use_mcp = args.use_mcp.lower() == 'true'
    save_html = args.save_html.lower() == 'true'
    
    # Determine target sites
    if args.sites.lower() == 'all':
        target_sites = list(SITE_TARGETS.keys())
    else:
        target_sites = [site.strip() for site in args.sites.split(',')]
        # Validate sites
        invalid_sites = [site for site in target_sites if site not in SITE_TARGETS]
        if invalid_sites:
            logger.error(f"Invalid sites specified: {invalid_sites}")
            logger.info(f"Available sites: {', '.join(SITE_TARGETS.keys())}")
            return 1

    logger.info(f"Starting competitor analysis for: {target_sites}")
    logger.info(f"Configuration: delay={args.delay_min}-{args.delay_max}s, use_mcp={use_mcp}, save_html={save_html}")

    try:
        # Initialize analysis engine
        engine = CompetitorAnalysisEngine(
            delay_min=args.delay_min,
            delay_max=args.delay_max,
            use_mcp=use_mcp,
            save_html=save_html
        )
        
        # Run analysis
        results = engine.run_analysis(target_sites)
        
        # Generate outputs
        output_generator = OutputGenerator()
        output_generator.generate_all_outputs(results)
        
        logger.info(f"Competitor analysis completed successfully!")
        logger.info(f"Results available in: {COMPILED_DIR}")
        logger.info("Key files:")
        logger.info(f"  - Comparison table: {COMPILED_DIR}/competitor_comparison.csv")
        logger.info(f"  - Markdown report: {COMPILED_DIR}/competitor_comparison.md")
        logger.info(f"  - Raw data: {COMPILED_DIR}/competitors_parsed.json")
        
        return 0
        
    except KeyboardInterrupt:
        logger.info("Analysis interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())