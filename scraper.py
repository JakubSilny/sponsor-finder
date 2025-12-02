#!/usr/bin/env python3
"""
SponsorFinder Scraper - Link Extraction Strategy
Scrapes Podcast RSS Feeds to find sponsors by extracting domains from links in show notes.
"""

import os
from typing import Optional, Set
from pathlib import Path
from urllib.parse import urlparse
from html import unescape

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False

try:
    import feedparser
    FEEDPARSER_AVAILABLE = True
except ImportError:
    FEEDPARSER_AVAILABLE = False

try:
    from bs4 import BeautifulSoup
    BEAUTIFULSOUP_AVAILABLE = True
except ImportError:
    BEAUTIFULSOUP_AVAILABLE = False

from supabase import create_client, Client


# Load environment variables from .env.local or .env
if DOTENV_AVAILABLE:
    env_path = Path(__file__).parent / ".env.local"
    if not env_path.exists():
        env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✓ Loaded environment variables from {env_path.name}")
    else:
        print("⚠ No .env.local or .env file found, using system environment variables")
else:
    print("⚠ python-dotenv not installed. Install with: pip install python-dotenv")
    print("  Using system environment variables only")


# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

# The "Guaranteed" Feed List
PODCAST_RSS_FEEDS = [
    "https://feeds.megaphone.fm/hubermanlab",  # Huberman Lab
    "https://rss.art19.com/tim-ferriss-show",  # Tim Ferriss
    "https://lexfridman.com/feed/podcast/",  # Lex Fridman
    "https://feeds.simplecast.com/4T39_jAj",  # The Daily - NYT
    "https://feeds.megaphone.fm/stuffyoushouldknow",  # Stuff You Should Know
]

# The "Trash Filter" - Domains to ignore
TRASH_DOMAINS = {
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'youtube.com',
    'youtu.be',
    'tiktok.com',
    'spotify.com',
    'apple.com',
    'google.com',
    'patreon.com',
    'discord.com',
    'amazon.com',
    'amzn.to',
    'linktr.ee',
    't.me',
    'reddit.com',
    'megaphone.fm',
    'simplecast.com',
    'art19.com'
}


def get_supabase_client() -> Client:
    """Create and return Supabase client."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Supabase credentials not found. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "(or SUPABASE_ANON_KEY) environment variables."
        )
    
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def extract_root_domain(url: str) -> Optional[str]:
    """
    Extract root domain from a URL.
    Example: https://www.athleticgreens.com/tim -> athleticgreens.com
    """
    if not url:
        return None
    
    try:
        # Add protocol if missing
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        
        # Remove port if present
        if ':' in domain:
            domain = domain.split(':')[0]
        
        return domain if domain else None
    except Exception as e:
        print(f"      Error parsing URL '{url}': {e}")
        return None


def extract_domain_name(domain: str) -> str:
    """
    Extract brand name from domain (without TLD).
    Example: athleticgreens.com -> athleticgreens
    """
    if not domain:
        return ""
    
    domain = domain.lower().strip()
    
    # Split by dot and take the main part
    parts = domain.split('.')
    
    # Handle common two-part TLDs (e.g., co.uk, com.au)
    two_part_tlds = {'co', 'com', 'net', 'org', 'io', 'ai', 'tv', 'me', 'us', 'uk', 'ca', 'au'}
    
    if len(parts) >= 3 and parts[-2] in two_part_tlds:
        # e.g., example.co.uk -> example
        return parts[-3]
    elif len(parts) >= 2:
        # e.g., example.com -> example
        return parts[-2]
    else:
        return parts[0] if parts else domain


def extract_all_links(html_content: str) -> Set[str]:
    """
    Extract all <a href> links from HTML content using BeautifulSoup.
    Returns a set of unique URLs.
    """
    if not html_content:
        return set()
    
    if not BEAUTIFULSOUP_AVAILABLE:
        print("  ⚠ BeautifulSoup not available!")
        return set()
    
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        links = set()
        
        for anchor in soup.find_all('a', href=True):
            href = anchor.get('href', '').strip()
            if href:
                # Unescape HTML entities
                href = unescape(href)
                links.add(href)
        
        return links
    except Exception as e:
        print(f"      Error parsing HTML: {e}")
        return set()


def is_trash_domain(domain: str) -> bool:
    """
    Check if domain is in the trash filter list.
    Also checks if any part of the domain matches trash domains.
    """
    if not domain:
        return True
    
    # Direct match
    if domain in TRASH_DOMAINS:
        return True
    
    # Check if any part of the domain matches (for subdomains)
    domain_parts = domain.split('.')
    for part in domain_parts:
        if part in TRASH_DOMAINS or f"{part}.com" in TRASH_DOMAINS:
            return True
    
    return False


def brand_exists(supabase: Client, brand_name: str) -> bool:
    """Check if brand exists (case-insensitive)."""
    try:
        normalized_name = brand_name.lower().strip()
        
        response = supabase.table("brands").select("id, name").execute()
        
        if response.data:
            for brand in response.data:
                if brand["name"].lower().strip() == normalized_name:
                    return True
        
        return False
    except Exception as e:
        print(f"  Error checking brand existence: {e}")
        return False


def save_sponsor(supabase: Client, domain: str, website_url: str) -> bool:
    """
    Save sponsor to database.
    Returns True if saved successfully, False if skipped (duplicate) or error.
    """
    if not domain:
        return False
    
    brand_name = extract_domain_name(domain)
    
    if not brand_name:
        return False
    
    try:
        # Check if brand already exists
        if brand_exists(supabase, brand_name):
            return False
        
        # Insert new brand
        brand_data = {
            "name": brand_name,
            "category": "podcast-found",
            "website_url": website_url,
            "is_active": True
        }
        
        brand_response = supabase.table("brands").insert(brand_data).execute()
        
        if not brand_response.data or len(brand_response.data) == 0:
            print(f"  ⚠ Failed to create brand '{brand_name}'")
            return False
        
        print(f"  🎯 Sponsor Found: {brand_name} ({domain}) -> {website_url}")
        return True
    
    except Exception as e:
        # Handle duplicate key errors gracefully
        error_str = str(e).lower()
        if 'duplicate' in error_str or 'unique' in error_str or 'already exists' in error_str:
            return False
        print(f"  ⚠ Error saving '{brand_name}': {e}")
        return False


def scrape_feed(rss_url: str, max_episodes: int = 50):
    """
    Scrape a single RSS feed and extract sponsor links.
    """
    if not FEEDPARSER_AVAILABLE:
        raise ImportError("feedparser library not installed. Run: pip install feedparser")
    
    print(f"\n📻 Scraping: {rss_url}")
    
    try:
        feed = feedparser.parse(rss_url)
        
        if feed.bozo:
            print(f"  ⚠ Warning: Feed parsing issues detected")
        
        episodes = feed.entries[:max_episodes]
        print(f"   Found {len(episodes)} episodes")
        
        supabase = get_supabase_client()
        sponsors_found = 0
        
        for i, episode in enumerate(episodes, 1):
            title = episode.get("title", "")[:60]
            
            # Crucial: Check BOTH entry.description AND entry.content
            description = episode.get("description", "") or episode.get("summary", "")
            content = episode.get("content", "")
            
            # Combine both sources
            combined_html = ""
            if description:
                combined_html += description
            if content:
                # content might be a list of dictionaries with 'value' key
                if isinstance(content, list) and len(content) > 0:
                    for item in content:
                        if isinstance(item, dict) and 'value' in item:
                            combined_html += item['value']
                        elif isinstance(item, str):
                            combined_html += item
                elif isinstance(content, str):
                    combined_html += content
            
            if not combined_html:
                continue
            
            # Extract all links from the combined HTML
            links = extract_all_links(combined_html)
            
            if links:
                print(f"   Episode {i}: '{title}...' - Found {len(links)} links")
                
                for link in links:
                    domain = extract_root_domain(link)
                    
                    if not domain:
                        continue
                    
                    # Skip trash domains
                    if is_trash_domain(domain):
                        continue
                    
                    # Save sponsor (handles duplicates internally)
                    if save_sponsor(supabase, domain, link):
                        sponsors_found += 1
        
        print(f"   ✓ Found {sponsors_found} new sponsors from this feed")
        return sponsors_found
    
    except Exception as e:
        print(f"  ❌ Error scraping feed: {e}")
        return 0


def main():
    """Main function to run the scraper."""
    print("=" * 60)
    print("SponsorFinder - Link Extraction Strategy")
    print("The 'Link Detective' - Finding sponsors from RSS feed links")
    print("=" * 60)
    
    # Check dependencies
    if not FEEDPARSER_AVAILABLE:
        print("❌ feedparser library not installed!")
        print("  Install with: pip install feedparser")
        return
    
    if not BEAUTIFULSOUP_AVAILABLE:
        print("❌ BeautifulSoup library not installed!")
        print("  Install with: pip install beautifulsoup4")
        return
    
    # Check Supabase connection
    try:
        supabase = get_supabase_client()
        print("✓ Supabase connection successful")
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return
    
    # Scrape each feed
    total_sponsors = 0
    
    for rss_url in PODCAST_RSS_FEEDS:
        print(f"\n{'=' * 60}")
        sponsors = scrape_feed(rss_url, max_episodes=50)
        total_sponsors += sponsors
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("Scraping Complete!")
    print(f"{'=' * 60}")
    print(f"Total new sponsors found: {total_sponsors}")


if __name__ == "__main__":
    main()
