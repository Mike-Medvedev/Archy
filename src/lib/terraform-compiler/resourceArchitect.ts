/**
 * Resource Architecture Analyzer
 *
 * Uses AI to determine which Terraform resources are needed
 * for a complete, working deployment of a service.
 *
 * AI decides WHAT resources.
 * Schema validates they exist.
 * Code generator handles HOW to configure them.
 */

import type { SchemaLoader } from "./schemaLoader";

export interface ResourceArchitecture {
  /** The user's original service selection */
  userServiceId: string;
  userServiceName: string;

  /** AI-determined Terraform resources needed */
  terraformResources: string[];

  /** Whether all resources were validated in schema */
  validated: boolean;
}

export class ResourceArchitectureAnalyzer {
  private openaiApiKey: string;
  private schemaLoader: SchemaLoader;

  constructor(openaiApiKey: string, schemaLoader: SchemaLoader) {
    this.openaiApiKey = openaiApiKey;
    this.schemaLoader = schemaLoader;
  }

  /**
   * Analyze what Terraform resources are needed for a service
   *
   * @param serviceName - User-friendly name (e.g., "Azure Service Bus")
   * @param serviceDescription - What the service does
   * @returns List of validated Terraform resource types
   */
  async analyzeRequiredResources(
    serviceName: string,
    serviceDescription: string
  ): Promise<string[]> {
    console.log(`🤖 Analyzing architecture for: ${serviceName}`);

    // Get ALL resource types from schema - AI will pick what's needed
    const allResources = this.getAllSchemaResources();
    console.log(`  📋 Schema has ${allResources.length} total resources`);

    // Build a simpler prompt - just ask for the exact resource name
    const prompt = `Given the Azure service "${serviceName}" (${serviceDescription}), what is the EXACT azurerm Terraform resource type?

Valid resources: ${allResources.join(", ")}

RULES:
- Return ONLY the resource name, nothing else
- For web apps, use azurerm_linux_web_app (not windows)
- For app service plans, use azurerm_service_plan (not deprecated azurerm_app_service_plan)
- Pick the MAIN resource only, not dependencies

Example response: azurerm_linux_web_app`;

    try {
      const response = await this.callOpenAI(prompt);

      // Clean the response - just extract the resource name
      const resourceName = response.trim().replace(/["[\]]/g, "");

      console.log(`  🤖 AI returned: ${resourceName}`);

      // Validate it exists in schema
      if (!this.schemaLoader.getResourceSchema(resourceName)) {
        console.error(`  ❌ ${resourceName} not found in schema`);
        return [];
      }

      console.log(`  ✓ ${resourceName} exists in schema`);

      // Resolve dependencies based on REQUIRED _id attributes in schema
      const allNeeded = this.resolveSchemaRequiredDeps(resourceName);
      console.log(`  📦 Total resources needed:`, allNeeded);
      return allNeeded;
    } catch (error) {
      console.error("❌ AI analysis failed:", error);
      throw new Error(`Failed to analyze architecture: ${error}`);
    }
  }

  /**
   * Get ALL resource types from the schema
   */
  private getAllSchemaResources(): string[] {
    return this.schemaLoader.getAllResourceTypes();
  }

  /**
   * Resolve required dependencies by looking at schema's REQUIRED _id attributes
   * This is purely schema-driven - no AI, no guessing
   */
  private resolveSchemaRequiredDeps(mainResource: string): string[] {
    const needed = new Set<string>();
    const processed = new Set<string>();
    const queue = [mainResource];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (processed.has(current)) continue;
      processed.add(current);
      needed.add(current);

      const model = this.schemaLoader.getResourceModel(current);
      if (!model) continue;

      // Check REQUIRED attributes that end in _id
      for (const attr of model.requiredAttributes) {
        if (attr.name.endsWith("_id") && attr.name !== "id") {
          const depResource = this.findDepResourceForIdAttr(current, attr.name);
          if (depResource && !processed.has(depResource)) {
            console.log(
              `  📎 ${current} requires ${attr.name} -> ${depResource}`
            );
            queue.push(depResource);
          }
        }
      }
    }

    return Array.from(needed);
  }

  /**
   * Find the resource type that provides a given _id attribute
   * Uses the parent resource's prefix to help find the right dependency
   */
  private findDepResourceForIdAttr(
    parentResource: string,
    idAttrName: string
  ): string | null {
    const allResources = this.getAllSchemaResources();
    const idBase = idAttrName.replace(/_id$/, ""); // e.g., "service_plan", "server", "namespace"

    // Try exact match first: azurerm_{idBase}
    const exactMatch = `azurerm_${idBase}`;
    if (allResources.includes(exactMatch)) {
      return exactMatch;
    }

    // Extract prefix from parent resource (e.g., "servicebus" from "azurerm_servicebus_queue")
    const parentPrefix = parentResource.replace(/^azurerm_/, "").split("_")[0];

    // Try with parent prefix: azurerm_{parentPrefix}_{idBase}
    const prefixedMatch = `azurerm_${parentPrefix}_${idBase}`;
    if (allResources.includes(prefixedMatch)) {
      return prefixedMatch;
    }

    // Not found - this might be optional or reference external resource
    return null;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an Azure Terraform expert. Return ONLY the exact resource name like 'azurerm_linux_web_app'. No explanation, no quotes, no brackets.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Find JSON array in response (starts with [ and ends with ])
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start !== -1 && end !== -1) {
      return content.slice(start, end + 1);
    }

    return content;
  }

  /**
   * Batch analyze multiple services at once
   */
  async batchAnalyze(
    services: Array<{ name: string; description: string }>
  ): Promise<Map<string, string[]>> {
    const results = new Map<string, string[]>();

    // Process in parallel for speed
    await Promise.all(
      services.map(async (service) => {
        try {
          const resources = await this.analyzeRequiredResources(
            service.name,
            service.description
          );
          results.set(service.name, resources);
        } catch (error) {
          console.error(`Failed to analyze ${service.name}:`, error);
          results.set(service.name, []); // Empty array on failure
        }
      })
    );

    return results;
  }
}
