import OpenAI from "openai";
import { fetchTerraformDocs } from "./docsFetcher";
import { getServiceById } from "@/data/azureServices";
import type { CanvasNode, InfraConfig } from "@/types";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export async function generateTerraformWithAI(
  nodes: CanvasNode[],
  config: InfraConfig
): Promise<string> {
  if (nodes.length === 0) {
    return "# No resources to generate. Add services to the canvas first.";
  }

  // Fetch docs for all services and collect metadata
  const serviceIds = nodes.map((n) => n.serviceId);
  const services = serviceIds
    .map((id) => getServiceById(id))
    .filter((s) => s !== undefined);

  const docsPromises = services.map(async (service) => {
    const docs = await fetchTerraformDocs(service.docs_url);
    return {
      serviceId: service.id,
      resourceType: service.tfResourceType,
      dependencies: service.dependencies || [],
      useMinimalConfig: service.useMinimalConfig,
      docs,
    };
  });

  const allDocs = await Promise.all(docsPromises);
  const resourceDocsContext = allDocs
    .filter((d) => d.docs)
    .map(
      (d) => `### Service: ${d.serviceId}
Resource Type: ${d.resourceType}
Dependencies: ${d.dependencies.length > 0 ? d.dependencies.join(", ") : "none"}
Use Minimal Config: ${d.useMinimalConfig ? "yes" : "no"}

${d.docs}`
    )
    .join("\n\n---\n\n");

  // Build service list with resource types
  const servicesList = allDocs
    .map(
      (d) =>
        `- ${d.serviceId} (${d.resourceType})${
          d.dependencies.length > 0
            ? ` - requires: ${d.dependencies.join(", ")}`
            : ""
        }`
    )
    .join("\n");

  const prompt = `Generate a complete Terraform configuration file for Azure.

CONFIGURATION VALUES:
- Subscription ID: ${config.subscriptionId}
- Resource Group Name: ${config.resourceGroup}
- Location: ${config.location}

SERVICES TO DEPLOY:
${servicesList}

CRITICAL REQUIREMENTS:

1. TERRAFORM BLOCK: You MUST start with EXACTLY this terraform and provider block (version 4.14.0):

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=4.14.0"
    }
  }
}

provider "azurerm" {
  resource_provider_registrations = "none"
  features {}
  subscription_id = "${config.subscriptionId}"
}

2. RESOURCE GROUP: DO NOT CREATE the resource group. It already exists. Use a data source:

data "azurerm_resource_group" "main" {
  name = "${config.resourceGroup}"
}

3. RESOURCE TYPES: Use ONLY the exact resource types from the documentation below. DO NOT use deprecated resources like:
   - azurerm_app_service (use azurerm_linux_web_app or azurerm_windows_web_app)
   - azurerm_app_service_plan (use azurerm_service_plan)

4. LOCATION AND REFERENCES:
   - For resource_group_name: use data.azurerm_resource_group.main.name
   - For location: use "${config.location}" (the configured location, NOT the resource group's location)
   - CRITICAL: Always use location = "${config.location}" for ALL resources

5. SIMPLICITY RULES - THIS IS CRITICAL:
   - Use ONLY the FIRST/SIMPLEST example from the documentation
   - DO NOT add application_stack, language runtimes (python_version, node_version, etc)
   - DO NOT add helper resources like random_string, random_id unless they exist in the docs
   - Keep site_config blocks MINIMAL but ALWAYS include required settings for free tier
   - DO NOT invent resource names or add extra configuration not in the basic example

6. PRICING/SKU REQUIREMENTS:
   - For azurerm_service_plan: use sku_name = "F1" (Free tier) for testing
   - For databases: use smallest/cheapest SKU available (Basic, DTU-based)
   - For storage: use Standard_LRS (cheapest redundancy)
   - For other resources: use the lowest-cost tier mentioned in docs
   - NEVER use Premium, P1v2, or other expensive SKUs unless explicitly requested

7. FREE TIER COMPATIBILITY (CRITICAL FOR F1 SKU):
   - For azurerm_linux_web_app or azurerm_windows_web_app with F1 SKU:
     * MUST set always_on = false in site_config
     * Example: site_config { always_on = false }
   - Free tier does NOT support always_on = true (default fails)

8. RESOURCE NAMING:
   - Use unique, descriptive names with timestamps or random suffixes
   - For web apps: "webapp-${config.resourceGroup}-001" or similar
   - For service plans: "plan-${config.resourceGroup}-001" or similar
   - NEVER use generic names like "webApp", "servicePlan", "main"
   - Names must be globally unique for web apps (they become URLs)

9. OUTPUT: Raw HCL only, no markdown code blocks, no explanations, no comments.

=== RESOURCE DOCUMENTATION ===
${resourceDocsContext}`;

  try {
    console.log(`Generating complete Terraform configuration with AI...`);
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are a Terraform expert specialized in Azure (azurerm provider v4.x). STRICT RULES: 1) Copy terraform/provider blocks EXACTLY as provided. 2) NEVER create resource groups - use data sources ONLY. 3) Use ONLY the FIRST, SIMPLEST example from documentation - no language-specific configs, no application_stack, no runtime versions. 4) DO NOT add resources not explicitly requested (no random_string, random_id, etc). 5) Use FREE/CHEAPEST SKUs: F1 for service plans, Basic for databases, Standard_LRS for storage. 6) CRITICAL FOR FREE TIER: Always set 'always_on = false' in site_config for web apps using F1 SKU (required for free tier). 7) Use UNIQUE resource names with suffixes, NOT generic names like 'webApp' or 'servicePlan'. 8) Use resource types EXACTLY as documented. 9) For location, ALWAYS use the exact configured location value provided. 10) Output raw HCL only - no markdown, no explanations, no comments.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    });

    const result =
      completion.choices[0]?.message?.content ||
      "# Failed to generate Terraform configuration";

    // Clean up any markdown that might have slipped through
    return result
      .replace(/```hcl\n?/g, "")
      .replace(/```terraform\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
  } catch (error) {
    console.error("AI generation failed:", error);
    return `# Error generating Terraform configuration
# ${error instanceof Error ? error.message : "Unknown error"}
# Please check your OpenAI API key and try again.`;
  }
}
