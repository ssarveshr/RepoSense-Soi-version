import re
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
import markdownify

class HTMLExtractor:
    def __init__(self, base_url=None):
        self.base_url = base_url

    def clean_html(self, html_content):
        """Parse HTML and remove unnecessary boilerplate elements."""
        soup = BeautifulSoup(html_content, 'html.parser')

        # Elements to completely remove (and their content)
        tags_to_remove = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'noscript', 'iframe', 'svg']
        for tag in tags_to_remove:
            for element in soup.find_all(tag):
                element.decompose()

        # Remove elements by common noise classes or ids
        noise_selectors = [
            '.cookie-banner', '#cookie-banner', '.cookie-consent', 
            '.search', '#search', '.navigation', '.sidebar', 
            '[role="navigation"]', '[role="search"]', '[role="banner"]', '[role="contentinfo"]',
            '.sr-only', '.visually-hidden'
        ]
        for selector in noise_selectors:
            for element in soup.select(selector):
                element.decompose()

        # Isolate main content if possible
        main_content = soup.find('main') or soup.find('article') or soup.find('div', id='content') or soup.find('body')
        if not main_content:
            main_content = soup

        return main_content

    def convert_links_to_absolute(self, soup):
        """Convert relative links in <a> tags to absolute URLs."""
        if not self.base_url:
            return soup
            
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            # Only convert relative URLs (not absolute or anchor links)
            if not href.startswith(('http://', 'https://', 'mailto:', 'tel:', '#')):
                a_tag['href'] = urljoin(self.base_url, href)
        return soup

    def preserve_code_blocks(self, soup):
        """Standardize code blocks to ensure markdownify handles them well."""
        # markdownify usually handles <pre><code> well, but we can clean up language classes if needed
        return soup

    def extract_metadata(self, html_content, base_url=None):
        """Extract unified metadata schema from HTML content."""
        import datetime
        soup = BeautifulSoup(html_content, 'html.parser')
        
        metadata = {
            "title": "",
            "source": "",
            "url": base_url or "",
            "type": "documentation",
            "tags": [],
            "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "language": "en"
        }
        
        # Title
        title_tag = soup.find('title')
        if title_tag and title_tag.string:
            metadata["title"] = title_tag.string.strip()
        elif soup.find('h1'):
            metadata["title"] = soup.find('h1').get_text(strip=True)
            
        # Source
        og_site_name = soup.find('meta', property='og:site_name')
        if og_site_name and og_site_name.get('content'):
            metadata["source"] = og_site_name.get('content').strip()
        elif base_url:
            parsed = urlparse(base_url)
            metadata["source"] = parsed.netloc
            
        # Tags
        keywords_tag = soup.find('meta', attrs={'name': 'keywords'})
        if keywords_tag and keywords_tag.get('content'):
            keys = keywords_tag.get('content').split(',')
            metadata["tags"] = [k.strip() for k in keys if k.strip()]
            
        # Language
        html_tag = soup.find('html')
        if html_tag and html_tag.get('lang'):
            metadata["language"] = html_tag.get('lang').split('-')[0]
            
        return metadata

    def extract_to_markdown(self, html_content, base_url=None):
        """
        Main pipeline: HTML -> Clean Soup -> Absolute Links -> Markdown
        """
        if base_url:
            self.base_url = base_url
            
        # 1. Clean HTML and extract metadata
        metadata = self.extract_metadata(html_content, base_url)
        clean_soup = self.clean_html(html_content)
        
        # 2. Convert Links
        clean_soup = self.convert_links_to_absolute(clean_soup)
        
        # 3. Preserve code blocks (if needed)
        clean_soup = self.preserve_code_blocks(clean_soup)
        
        # 4. Convert to Markdown
        # Use markdownify with specific options to preserve useful structures
        md = markdownify.markdownify(
            str(clean_soup),
            heading_style="ATX",
            bullets="-",
            code_language="",
            strip=['img', 'br'] # Strip images and br if we only want pure text content, but usually we want to keep them or not? 
            # The prompt says: preserve headings, paragraphs, lists, links, code blocks, tables.
        )
        
        # Clean up excessive newlines
        md = re.sub(r'\n{3,}', '\n\n', md)
        
        return md.strip(), metadata
