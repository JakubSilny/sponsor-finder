#!/usr/bin/env python3
"""
SponsorFinder Enricher - Upgrade from Generic Brands to Specific People
Uses a waterfall method to find specific human contacts:
1. Hunter.io API (preferred)
2. Team page scraper (fallback)
3. Smart guesser (last resort)
"""

import os
import re
import time
from datetime import datetime, timezone
from typing import Optional, List, Dict, Set, Tuple
from pathlib import Path
from urllib.parse import urljoin, urlparse

try:
    from dotenv import load_dotenv
    DOTENV_AVAILABLE = True
except ImportError:
    DOTENV_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

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
HUNTER_API_KEY = os.getenv("HUNTER_API_KEY")

# Request settings
REQUEST_TIMEOUT = 10  # seconds
REQUEST_DELAY = 2  # seconds between requests (be polite)
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

# Target roles for filtering Hunter.io results
TARGET_ROLES = ["marketing", "partnership", "sponsorship", "pr", "director"]

# Generic department emails to try as last resort
GENERIC_DEPARTMENTS = ["partnerships", "marketing", "press", "creators"]


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


def normalize_url(url: str) -> Optional[str]:
    """Normalize URL by adding protocol if missing."""
    if not url:
        return None
    
    url = url.strip()
    
    # Add protocol if missing
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    
    return url


def fetch_brands_without_contacts(supabase: Client) -> List[dict]:
    """
    Fetch all brands that have website_url but no contacts yet.
    """
    try:
        # Get all brands with their contacts
        response = supabase.table("brands").select("id, name, website_url, contacts(id)").execute()
        
        if not response.data:
            return []
        
        # Filter brands without contacts but with website_url
        brands_without_contacts = []
        for brand in response.data:
            contacts = brand.get('contacts', [])
            if not contacts or len(contacts) == 0:
                if brand.get('website_url'):
                    brands_without_contacts.append({
                        'id': brand['id'],
                        'name': brand['name'],
                        'website_url': brand['website_url']
                    })
        
        return brands_without_contacts
    
    except Exception as e:
        print(f"❌ Error fetching brands: {e}")
        return []


def hunter_api_search(domain: str) -> List[Dict[str, str]]:
    """
    Step A: Use Hunter.io API to find contacts.
    Returns list of contacts with name, role, and email.
    """
    if not HUNTER_API_KEY:
        print("      ⚠ HUNTER_API_KEY not set, skipping Hunter.io API")
        return []
    
    if not REQUESTS_AVAILABLE:
        print("      ⚠ requests library not available")
        return []
    
    try:
        url = "https://api.hunter.io/v2/domain-search"
        params = {
            "domain": domain,
            "api_key": HUNTER_API_KEY
        }
        
        response = requests.get(url, params=params, timeout=REQUEST_TIMEOUT)
        
        if response.status_code != 200:
            print(f"      ⚠ Hunter.io API returned {response.status_code}")
            return []
        
        data = response.json()
        
        # Check for API errors
        if data.get("errors"):
            print(f"      ⚠ Hunter.io API error: {data['errors']}")
            return []
        
        # Extract contacts from response
        contacts = []
        emails = data.get("data", {}).get("emails", [])
        
        for email_data in emails:
            # Filter by target roles
            role = email_data.get("position", "").lower()
            if not any(target_role in role for target_role in TARGET_ROLES):
                continue
            
            contact = {
                "name": email_data.get("first_name", "") + " " + email_data.get("last_name", ""),
                "role": email_data.get("position", ""),
                "email": email_data.get("value", "")
            }
            
            # Clean up name
            contact["name"] = contact["name"].strip()
            if not contact["name"]:
                contact["name"] = None
            
            if contact["email"]:
                contacts.append(contact)
        
        return contacts
    
    except requests.exceptions.RequestException as e:
        print(f"      ⚠ Hunter.io API request failed: {e}")
        return []
    except Exception as e:
        print(f"      ⚠ Error with Hunter.io API: {e}")
        return []


def find_team_pages(base_url: str) -> List[str]:
    """
    Find potential team/contact pages by looking for common links.
    Returns list of URLs to check.
    """
    if not REQUESTS_AVAILABLE or not BEAUTIFULSOUP_AVAILABLE:
        return []
    
    normalized_url = normalize_url(base_url)
    if not normalized_url:
        return []
    
    team_keywords = ["about", "team", "contact", "press"]
    found_pages = [normalized_url]  # Always check the homepage
    
    try:
        response = requests.get(
            normalized_url,
            timeout=REQUEST_TIMEOUT,
            headers={'User-Agent': USER_AGENT},
            allow_redirects=True
        )
        
        if response.status_code != 200:
            return found_pages
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find all links
        for anchor in soup.find_all('a', href=True):
            href = anchor.get('href', '').strip()
            link_text = anchor.get_text().lower().strip()
            
            # Check if link text or href contains team keywords
            if any(keyword in link_text for keyword in team_keywords) or \
               any(keyword in href.lower() for keyword in team_keywords):
                
                # Resolve relative URLs
                full_url = urljoin(normalized_url, href)
                
                # Only add if it's from the same domain
                parsed_base = urlparse(normalized_url)
                parsed_link = urlparse(full_url)
                
                if parsed_link.netloc == parsed_base.netloc or not parsed_link.netloc:
                    if full_url not in found_pages:
                        found_pages.append(full_url)
        
        # Limit to first 5 pages to avoid too many requests
        return found_pages[:5]
    
    except Exception as e:
        print(f"      ⚠ Error finding team pages: {e}")
        return [normalized_url] if normalized_url else []


def scrape_team_pages_for_contacts(domain: str, base_url: str) -> List[Dict[str, str]]:
    """
    Step B: Scrape team/about/contact pages for mailto links.
    Returns list of contacts with name, role, and email.
    """
    if not REQUESTS_AVAILABLE or not BEAUTIFULSOUP_AVAILABLE:
        return []
    
    contacts = []
    team_pages = find_team_pages(base_url)
    
    for page_url in team_pages:
        try:
            response = requests.get(
                page_url,
                timeout=REQUEST_TIMEOUT,
                headers={'User-Agent': USER_AGENT},
                allow_redirects=True
            )
            
            if response.status_code != 200:
                continue
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Find all mailto links
            for anchor in soup.find_all('a', href=True):
                href = anchor.get('href', '').strip()
                
                if href.startswith('mailto:'):
                    # Extract email
                    email = href.replace('mailto:', '').split('?')[0].split('&')[0].strip()
                    
                    if not email or '@' not in email:
                        continue
                    
                    # Extract name and role from surrounding context
                    link_text = anchor.get_text().strip()
                    parent_text = ""
                    
                    # Try to get parent element text for context
                    parent = anchor.parent
                    if parent:
                        parent_text = parent.get_text().strip()
                    
                    # Smart extraction: look for role indicators
                    role = None
                    combined_text = (link_text + " " + parent_text).lower()
                    
                    role_keywords = {
                        "press": ["press", "media", "pr", "public relations"],
                        "marketing": ["marketing", "growth", "acquisition"],
                        "partnership": ["partnership", "partnerships", "sponsor", "sponsorship"],
                        "contact": ["contact", "general", "info"]
                    }
                    
                    for role_name, keywords in role_keywords.items():
                        if any(keyword in combined_text for keyword in keywords):
                            role = role_name.title()
                            break
                    
                    if not role:
                        role = "Contact"  # Default role
                    
                    # Try to extract name from link text or nearby text
                    name = None
                    if link_text and '@' not in link_text:
                        # If link text doesn't contain email, it might be a name
                        name = link_text
                    elif parent_text:
                        # Try to extract name from parent text (before email)
                        name_match = re.search(r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)', parent_text)
                        if name_match:
                            name = name_match.group(1)
                    
                    contact = {
                        "name": name,
                        "role": role,
                        "email": email.lower()
                    }
                    
                    contacts.append(contact)
            
            # Small delay between page requests
            time.sleep(1)
        
        except Exception as e:
            print(f"      ⚠ Error scraping {page_url}: {e}")
            continue
    
    return contacts


def generate_generic_emails(domain: str) -> List[Dict[str, str]]:
    """
    Step C: Generate generic department emails as last resort.
    Returns list of contacts with role "Department Generic".
    """
    contacts = []
    
    for dept in GENERIC_DEPARTMENTS:
        email = f"{dept}@{domain}"
        contact = {
            "name": None,
            "role": "Department Generic",
            "email": email
        }
        contacts.append(contact)
    
    return contacts


def save_contact(supabase: Client, brand_id: str, name: Optional[str], role: Optional[str], email: str) -> bool:
    """
    Save contact to database.
    Returns True if saved successfully, False otherwise.
    """
    if not brand_id or not email:
        return False
    
    try:
        contact_data = {
            "brand_id": brand_id,
            "email": email.lower().strip(),
            "name": name.strip() if name else None,
            "role": role.strip() if role else None
        }
        
        # Remove None values
        contact_data = {k: v for k, v in contact_data.items() if v is not None}
        
        response = supabase.table("contacts").insert(contact_data).execute()
        
        if response.data and len(response.data) > 0:
            return True
        else:
            return False
    
    except Exception as e:
        # Handle duplicate key errors gracefully
        error_str = str(e).lower()
        if 'duplicate' in error_str or 'unique' in error_str or 'already exists' in error_str:
            return False
        print(f"      ⚠ Error saving contact '{email}': {e}")
        return False


def mark_brand_checked(supabase: Client, brand_id: str) -> bool:
    """
    Mark brand as checked by updating updated_at timestamp.
    This helps track which brands have been processed.
    """
    try:
        # Update the updated_at timestamp
        supabase.table("brands").update({
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", brand_id).execute()
        return True
    except Exception as e:
        # Fail gracefully if update fails
        return False


def enrich_brand(supabase: Client, brand: dict) -> Tuple[bool, int]:
    """
    Enrich a single brand using waterfall method.
    Returns (success, contacts_found) tuple.
    """
    brand_id = brand['id']
    brand_name = brand['name']
    website_url = brand['website_url']
    
    print(f"\n🔍 Processing: {brand_name} ({website_url})")
    
    domain = extract_root_domain(website_url)
    if not domain:
        print(f"   ⚠ Could not extract domain from {website_url}")
        mark_brand_checked(supabase, brand_id)
        return (False, 0)
    
    print(f"   Domain: {domain}")
    
    contacts_found = 0
    
    # Step A: Hunter.io API
    print("   Step A: Trying Hunter.io API...")
    hunter_contacts = hunter_api_search(domain)
    
    if hunter_contacts:
        print(f"   ✓ Found {len(hunter_contacts)} contact(s) via Hunter.io")
        for contact in hunter_contacts:
            if save_contact(supabase, brand_id, contact.get("name"), contact.get("role"), contact.get("email")):
                contacts_found += 1
                name_display = contact.get("name") or "Unknown"
                role_display = contact.get("role") or "Unknown"
                print(f"      ✓ Found {name_display} ({role_display}) at {brand_name}")
        
        if contacts_found > 0:
            mark_brand_checked(supabase, brand_id)
            return (True, contacts_found)
    
    # Step B: Team page scraper
    print("   Step B: Trying team page scraper...")
    team_contacts = scrape_team_pages_for_contacts(domain, website_url)
    
    if team_contacts:
        print(f"   ✓ Found {len(team_contacts)} contact(s) via team pages")
        for contact in team_contacts:
            if save_contact(supabase, brand_id, contact.get("name"), contact.get("role"), contact.get("email")):
                contacts_found += 1
                name_display = contact.get("name") or "Unknown"
                role_display = contact.get("role") or "Unknown"
                print(f"      ✓ Found {name_display} ({role_display}) at {brand_name}")
        
        if contacts_found > 0:
            mark_brand_checked(supabase, brand_id)
            return (True, contacts_found)
    
    # Step C: Smart guesser
    print("   Step C: Trying smart guesser (generic emails)...")
    generic_contacts = generate_generic_emails(domain)
    
    for contact in generic_contacts:
        if save_contact(supabase, brand_id, contact.get("name"), contact.get("role"), contact.get("email")):
            contacts_found += 1
            print(f"      ✓ Generated {contact.get('email')} ({contact.get('role')}) for {brand_name}")
    
    # Mark as checked regardless of success
    mark_brand_checked(supabase, brand_id)
    
    if contacts_found > 0:
        return (True, contacts_found)
    else:
        print(f"   ⚠ No contacts found for {brand_name}")
        return (False, 0)


def main():
    """Main function to run the enricher."""
    print("=" * 60)
    print("SponsorFinder - Contact Enricher")
    print("Upgrading from Generic Brands to Specific People")
    print("=" * 60)
    
    # Check dependencies
    if not REQUESTS_AVAILABLE:
        print("❌ requests library not installed!")
        print("  Install with: pip install requests")
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
    
    # Check Hunter.io API key
    if HUNTER_API_KEY:
        print("✓ Hunter.io API key found")
    else:
        print("⚠ HUNTER_API_KEY not set - Step A (Hunter.io) will be skipped")
        print("  Get a free API key at: https://hunter.io/api")
    
    # Fetch brands without contacts
    print("\n📋 Fetching brands without contacts...")
    brands = fetch_brands_without_contacts(supabase)
    
    if not brands:
        print("✓ No brands found that need enrichment")
        return
    
    print(f"✓ Found {len(brands)} brand(s) to enrich")
    
    # Process each brand
    enriched_count = 0
    total_contacts = 0
    
    for i, brand in enumerate(brands, 1):
        print(f"\n{'=' * 60}")
        print(f"Brand {i}/{len(brands)}")
        
        success, contacts = enrich_brand(supabase, brand)
        if success:
            enriched_count += 1
            total_contacts += contacts
        
        # Add delay between brands to be polite
        if i < len(brands):
            time.sleep(REQUEST_DELAY)
    
    # Print summary
    print(f"\n{'=' * 60}")
    print("Enrichment Complete!")
    print(f"{'=' * 60}")
    print(f"Total brands processed: {len(brands)}")
    print(f"Brands enriched with contacts: {enriched_count}")
    print(f"Total contacts found: {total_contacts}")
    print(f"Brands without contacts found: {len(brands) - enriched_count}")


if __name__ == "__main__":
    main()
