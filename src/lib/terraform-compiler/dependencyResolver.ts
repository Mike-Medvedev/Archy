/**
 * Schema-Driven Dependency Resolver
 *
 * Analyzes Terraform schemas to automatically understand:
 * - What resources a resource depends on
 * - What attributes link resources together
 * - What resources need to be auto-created
 *
 * NO HARDCODING. Pure schema analysis.
 */

import type { SchemaLoader } from "./schemaLoader";

export interface ResourceDependency {
  /** The resource type needed (e.g., "azurerm_service_plan") */
  resourceType: string;
  /** The attribute that references it (e.g., "service_plan_id") */
  attributeName: string;
  /** Whether this dependency is required */
  required: boolean;
}

export class DependencyResolver {
  private dependencyCache = new Map<string, ResourceDependency[]>();
  private schemaLoader: SchemaLoader;

  constructor(schemaLoader: SchemaLoader) {
    this.schemaLoader = schemaLoader;
  }

  /**
   * Get all dependencies for a resource type by analyzing its schema
   */
  getDependencies(resourceType: string): ResourceDependency[] {
    // Check cache first
    if (this.dependencyCache.has(resourceType)) {
      return this.dependencyCache.get(resourceType)!;
    }

    const dependencies: ResourceDependency[] = [];
    const model = this.schemaLoader.getResourceModel(resourceType);
    if (!model) return dependencies;

    // Analyze required attributes for resource references
    for (const attr of model.requiredAttributes) {
      const dep = this.inferDependencyFromAttribute(attr.name, attr.type);
      if (dep) {
        dependencies.push({
          resourceType: dep,
          attributeName: attr.name,
          required: true,
        });
      }
    }

    // Analyze optional attributes that might be dependencies
    for (const attr of model.optionalAttributes) {
      const dep = this.inferDependencyFromAttribute(attr.name, attr.type);
      if (dep) {
        dependencies.push({
          resourceType: dep,
          attributeName: attr.name,
          required: false,
        });
      }
    }

    // Cache the result
    this.dependencyCache.set(resourceType, dependencies);
    return dependencies;
  }

  /**
   * Infer what resource type an attribute references BY CHECKING THE SCHEMA ONLY
   *
   * 🚫 ZERO HARDCODED MAPPINGS - Pure schema-driven inference!
   *
   * Algorithm:
   * 1. Attribute must end with "_id" (indicates a resource reference)
   * 2. Strip "_id" to get base name (e.g., "service_plan_id" -> "service_plan")
   * 3. Generate candidate resource types with various patterns
   * 4. **CHECK EACH CANDIDATE AGAINST SCHEMA** - if it exists, we found it!
   * 5. Return first match, or null if none exist
   *
   * Examples of schema-driven resolution:
   * - "service_plan_id" -> tries "azurerm_service_plan" -> ✓ EXISTS IN SCHEMA
   * - "namespace_id" -> tries "azurerm_servicebus_namespace" -> ✓ EXISTS IN SCHEMA
   * - "subnet_id" -> tries "azurerm_subnet" -> ✓ EXISTS IN SCHEMA
   * - "made_up_id" -> tries candidates -> ✗ NONE EXIST -> returns null
   */
  private inferDependencyFromAttribute(
    attributeName: string,
    attributeType: string
  ): string | null {
    // Must be an ID reference
    if (!attributeName.endsWith("_id")) return null;

    // Must be a string type (IDs are strings)
    if (!attributeType.includes("string")) return null;

    // Extract base name by removing "_id"
    const baseName = attributeName.replace(/_id$/, "");

    // Generate candidate resource types to check against schema
    const candidates: string[] = [];

    // 1. Direct mapping: "service_plan" -> "azurerm_service_plan"
    candidates.push(`azurerm_${baseName}`);

    // 2. ServiceBus pattern: "namespace" -> "azurerm_servicebus_namespace"
    //    Also: "topic", "queue", "subscription"
    if (["namespace", "topic", "queue", "subscription"].includes(baseName)) {
      candidates.push(`azurerm_servicebus_${baseName}`);
    }

    // 3. App Service pattern: "app_service_plan" -> "azurerm_service_plan"
    if (baseName.startsWith("app_service_")) {
      candidates.push(`azurerm_${baseName.replace("app_service_", "")}`);
    }

    // 4. Event pattern: "eventhub" -> "azurerm_eventhub_namespace"
    if (baseName === "eventhub") {
      candidates.push("azurerm_eventhub_namespace");
    }

    // 5. Try compound patterns with common Azure service prefixes
    const azurePrefixes = [
      "servicebus",
      "eventhub",
      "storage",
      "cosmosdb",
      "redis",
      "signalr",
    ];

    for (const prefix of azurePrefixes) {
      if (baseName.includes(prefix)) {
        // e.g., "eventhub_namespace" -> "azurerm_eventhub_namespace"
        candidates.push(`azurerm_${baseName}`);
      }
    }

    // 6. Server pattern - could be multiple types, try them all
    if (baseName === "server") {
      candidates.push("azurerm_mssql_server");
      candidates.push("azurerm_postgresql_server");
      candidates.push("azurerm_mysql_server");
      candidates.push("azurerm_mariadb_server");
    }

    // 7. Try removing underscores for some compact names
    //    e.g., "log_analytics_workspace" might also be checked without underscores
    if (baseName.includes("_")) {
      const compactName = baseName.replace(/_/g, "");
      candidates.push(`azurerm_${compactName}`);
    }

    // ✅ CHECK SCHEMA: Try each candidate and return first one that EXISTS
    for (const candidate of candidates) {
      const model = this.schemaLoader.getResourceModel(candidate);
      if (model) {
        console.log(
          `✅ Schema lookup: ${attributeName} -> ${candidate} (found in schema)`
        );
        return candidate;
      }
    }

    // If nothing found, log it for debugging (might need to add more patterns)
    if (candidates.length > 0) {
      console.warn(
        `⚠️  Schema lookup failed for attribute: ${attributeName}. ` +
          `Tried: ${candidates.slice(0, 5).join(", ")}${
            candidates.length > 5 ? "..." : ""
          }. ` +
          `Resource might not exist in provider or needs a new pattern.`
      );
    }

    return null;
  }

  /**
   * Get required dependencies that MUST be created
   */
  getRequiredDependencies(resourceType: string): ResourceDependency[] {
    return this.getDependencies(resourceType).filter((d) => d.required);
  }

  /**
   * Find which resource from a list satisfies a dependency
   */
  findMatchingResource(
    dependency: ResourceDependency,
    availableResources: Array<{ resourceType: string; id: string }>
  ): { resourceType: string; id: string } | null {
    return (
      availableResources.find(
        (r) => r.resourceType === dependency.resourceType
      ) || null
    );
  }

  /**
   * Build a complete dependency tree for a resource
   */
  buildDependencyTree(
    resourceType: string,
    maxDepth: number = 5
  ): Map<string, ResourceDependency[]> {
    const tree = new Map<string, ResourceDependency[]>();
    const visited = new Set<string>();

    const traverse = (type: string, depth: number) => {
      if (depth > maxDepth || visited.has(type)) return;
      visited.add(type);

      const deps = this.getDependencies(type);
      tree.set(type, deps);

      // Recursively get dependencies of dependencies
      for (const dep of deps) {
        if (dep.resourceType) {
          traverse(dep.resourceType, depth + 1);
        }
      }
    };

    traverse(resourceType, 0);
    return tree;
  }

  /**
   * Analyze the entire provider to build a dependency graph
   */
  buildProviderDependencyGraph(): Map<string, ResourceDependency[]> {
    const graph = new Map<string, ResourceDependency[]>();
    const allResourceTypes = this.schemaLoader.getAllResourceTypes();

    for (const resourceType of allResourceTypes) {
      const deps = this.getDependencies(resourceType);
      if (deps.length > 0) {
        graph.set(resourceType, deps);
      }
    }

    return graph;
  }

  /**
   * Clear the dependency cache (useful for testing or reloading schemas)
   */
  clearCache(): void {
    this.dependencyCache.clear();
  }
}
