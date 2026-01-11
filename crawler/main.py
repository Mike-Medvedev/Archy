from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import asyncio
from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
import re

app = FastAPI(title="Archy Crawler Service")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    markdown: str
    success: bool
    error: str | None = None


def clean_terraform_docs(markdown: str) -> str:
    """
    Clean up Terraform Registry markdown to keep only relevant documentation.
    Extract the main article content and remove navigation, footer, sidebars.
    """
    lines = markdown.split("\n")
    
    # Find where the actual documentation starts (look for resource name heading or "Example Usage")
    doc_start = 0
    doc_end = len(lines)
    
    for i, line in enumerate(lines):
        # Documentation usually starts with the resource name as H1
        if (line.startswith("# azurerm_") or 
            line.startswith("# data.azurerm_") or
            "## Example Usage" in line or
            "Example Usage" in line):
            doc_start = i
            break
    
    # Find where docs end (usually footer with Privacy, Terms, etc.)
    for i in range(len(lines) - 1, doc_start, -1):
        if any(pattern in lines[i] for pattern in ["HashiCorp", "© 20", "Privacy", "Terms of Service"]):
            doc_end = i
            break
    
    # Extract the documentation section
    cleaned_lines = []
    skip_patterns = [
        "Browse",
        "Sign-in",
        "Search all resources",
        "Version History",
        "[Published",
        "View all versions",
    ]
    
    for line in lines[doc_start:doc_end]:
        # Skip navigation noise
        if any(pattern in line for pattern in skip_patterns) and len(line) < 150:
            continue
        # Skip lines with too many repeated links (navigation)
        if line.count("](") > 5:
            continue
        cleaned_lines.append(line)
    
    markdown = "\n".join(cleaned_lines)
    
    # Remove excessive blank lines
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    
    return markdown.strip()


@app.get("/")
def root():
    return {"service": "Archy Crawler", "status": "running"}


@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """
    Scrape a Terraform Registry documentation page and return clean markdown.
    Handles JS-rendered content properly.
    """
    try:
        # Configure browser to handle JavaScript properly
        browser_config = BrowserConfig(
            headless=True,
            verbose=False,
        )
        
        # JavaScript to scroll and load all content (handles lazy loading)
        scroll_js = """
        // Scroll down multiple times to trigger lazy loading
        async function scrollToLoadAll() {
            const scrolls = 5;  // Number of scroll iterations
            const delay = 500;  // Delay between scrolls in ms
            
            for (let i = 0; i < scrolls; i++) {
                window.scrollTo(0, document.body.scrollHeight);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Scroll back to top to capture everything
            window.scrollTo(0, 0);
        }
        
        await scrollToLoadAll();
        """
        
        # Configure crawler to wait for content and extract markdown
        crawl_config = CrawlerRunConfig(
            cache_mode=CacheMode.BYPASS,  # Always fetch fresh content
            wait_until="domcontentloaded",  # Wait for DOM to load
            page_timeout=60000,  # 60 second timeout
            js_code=scroll_js,  # Execute scroll to load lazy content
            wait_for="css:article h1",  # Wait for article heading to appear (main doc content)
            delay_before_return_html=3.0,  # Extra wait after scrolling for JS to hydrate
            # DON'T use css_selector - it filters out too much! Get everything and clean in post-process
            exclude_external_links=True,
            remove_overlay_elements=True,
        )
        
        full_url = f"https://registry.terraform.io{request.url}" if request.url.startswith("/") else request.url
        
        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(
                url=full_url,
                config=crawl_config,
            )
            
            if not result.success:
                raise HTTPException(status_code=500, detail=f"Crawl failed: {result.error_message}")
            
            # Clean up the markdown
            markdown = clean_terraform_docs(result.markdown_v2.raw_markdown)
            
            # If we got very little content, something went wrong
            if len(markdown) < 200:
                raise HTTPException(
                    status_code=500, 
                    detail=f"Extracted content too short ({len(markdown)} chars). Page may not have loaded properly."
                )
            
            return ScrapeResponse(
                markdown=markdown,
                success=True,
            )
            
    except HTTPException:
        raise
    except Exception as e:
        return ScrapeResponse(
            markdown="",
            success=False,
            error=str(e),
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
