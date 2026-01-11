/**
 * Fetches Terraform documentation using the Python crawler service.
 * The crawler uses Crawl4AI to render JavaScript and extract clean markdown.
 */
export async function fetchTerraformDocs(docs_url: string): Promise<string> {
  try {
    console.log("Fetching Terraform docs via crawler service for:", docs_url);

    // Call the Python FastAPI crawler service
    const response = await fetch("http://localhost:8000/scrape", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: docs_url,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch docs: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unknown error from crawler service");
    }

    console.log(
      `Fetched docs for ${docs_url}: ${data.markdown.length} chars of markdown`
    );
    console.log(data.markdown);
    throw new Error(";p");
    return data.markdown;
  } catch (error) {
    console.error("Error fetching Terraform docs:", error);
    throw error;
  }
}
