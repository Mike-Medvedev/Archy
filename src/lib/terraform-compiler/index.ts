/**
 * Terraform Compiler - Main Entry Point
 * Schema-driven, deterministic Terraform code generation
 */

import type { CanvasNode, InfraConfig } from "@/types";
import type { ResourceGraph, ResourceNode } from "./types";
import { SchemaLoader } from "./schemaLoader";
import { TerraformCodeGenerator } from "./codeGenerator";
import { DependencyResolver } from "./dependencyResolver";
import { ResourceArchitectureAnalyzer } from "./resourceArchitect";
import { getServiceById } from "@/data/azureServices";

// Schema instances (lazy loaded)
let schemaLoaderInstance: SchemaLoader | null = null;
let dependencyResolverInstance: DependencyResolver | null = null;
let codeGeneratorInstance: TerraformCodeGenerator | null = null;
let architectAnalyzerInstance: ResourceArchitectureAnalyzer | null = null;

/**
 * Initialize schema loader (lazy load to avoid bundling large JSON)
 */
async function getSchemaLoader(): Promise<SchemaLoader> {
  if (schemaLoaderInstance) return schemaLoaderInstance;

  // Fetch schema JSON from public directory
  const response = await fetch("/schemas/azurerm@4.14.0.schema.json");
  const schemaJson = await response.json();

  schemaLoaderInstance = new SchemaLoader(schemaJson, "azurerm");
  dependencyResolverInstance = new DependencyResolver(schemaLoaderInstance);
  codeGeneratorInstance = new TerraformCodeGenerator(schemaLoaderInstance);

  return schemaLoaderInstance;
}

/**
 * Get architecture analyzer instance
 */
async function getArchitectureAnalyzer(
  openaiApiKey: string
): Promise<ResourceArchitectureAnalyzer> {
  await getSchemaLoader(); // Ensure schema is loaded

  if (
    !architectAnalyzerInstance ||
    architectAnalyzerInstance["openaiApiKey"] !== openaiApiKey
  ) {
    architectAnalyzerInstance = new ResourceArchitectureAnalyzer(
      openaiApiKey,
      schemaLoaderInstance!
    );
  }

  return architectAnalyzerInstance;
}

/**
 * Get dependency resolver instance
 */
async function getDependencyResolver(): Promise<DependencyResolver> {
  await getSchemaLoader(); // Ensure loader is initialized
  return dependencyResolverInstance!;
}

/**
 * Get code generator instance
 */
async function getCodeGenerator(): Promise<TerraformCodeGenerator> {
  await getSchemaLoader(); // Ensure loader is initialized
  return codeGeneratorInstance!;
}

/**
 * Convert canvas diagram to resource graph
 */
export async function diagramToResourceGraph(
  nodes: CanvasNode[]
): Promise<ResourceGraph> {
  const resolver = await getDependencyResolver();
  const resourceNodes: ResourceNode[] = [];
  const edges: Array<{ from: string; to: string; attribute: string }> = [];
  const autoCreatedNodes = new Map<string, ResourceNode>();

  // Convert canvas nodes to resource nodes
  for (const canvasNode of nodes) {
    const service = getServiceById(canvasNode.serviceId);
    if (!service) {
      console.warn(`Unknown service: ${canvasNode.serviceId}`);
      continue;
    }

    const resourceNode: ResourceNode = {
      id: canvasNode.id,
      resourceType: service.tfResourceType,
      name: generateResourceName(service.tfResourceType),
      attributes: {},
      dependencies: [],
    };

    // Get REQUIRED dependencies from schema analysis
    const schemaDeps = resolver.getRequiredDependencies(service.tfResourceType);

    // Find which canvas nodes satisfy these dependencies
    const deps: CanvasNode[] = [];

    for (const schemaDep of schemaDeps) {
      // Look for existing node that matches this dependency
      const matchingNode = nodes.find((n) => {
        const s = getServiceById(n.serviceId);
        return s?.tfResourceType === schemaDep.resourceType;
      });

      if (matchingNode) {
        deps.push(matchingNode);
      } else {
        // Auto-create missing REQUIRED dependency
        let autoCreated = autoCreatedNodes.get(schemaDep.resourceType);
        if (!autoCreated) {
          autoCreated = {
            id: `auto-${schemaDep.resourceType}-${Date.now()}`,
            resourceType: schemaDep.resourceType,
            name: generateResourceName(schemaDep.resourceType),
            attributes: {},
            dependencies: [],
          };
          autoCreatedNodes.set(schemaDep.resourceType, autoCreated);
          resourceNodes.push(autoCreated);
          console.log(
            `🔧 Auto-created ${schemaDep.resourceType} (attribute: ${schemaDep.attributeName}) required by ${service.tfResourceType}`
          );
        }
        deps.push({ id: autoCreated.id, serviceId: "" } as CanvasNode);
      }
    }

    resourceNode.dependencies = deps.map((d) => d.id);

    for (const dep of deps) {
      let depResourceType: string;

      if (dep.serviceId) {
        const depService = getServiceById(dep.serviceId);
        if (!depService) continue;
        depResourceType = depService.tfResourceType;
      } else {
        // Auto-created dependency
        const autoCreated = Array.from(autoCreatedNodes.values()).find(
          (n) => n.id === dep.id
        );
        if (!autoCreated) continue;
        depResourceType = autoCreated.resourceType;
      }

      // Find the attribute name from schema
      const matchingSchemaDep = schemaDeps.find(
        (sd) => sd.resourceType === depResourceType
      );

      edges.push({
        from: canvasNode.id,
        to: dep.id,
        attribute: matchingSchemaDep?.attributeName || "id",
      });
    }

    resourceNodes.push(resourceNode);
  }

  return { nodes: resourceNodes, edges };
}

/**
 * Generate a unique, descriptive resource name
 */
function generateResourceName(tfResourceType: string): string {
  const serviceType = tfResourceType.replace("azurerm_", "");
  const timestamp = Date.now().toString().slice(-6);
  return `${serviceType}_${timestamp}`;
}

/**
 * Generate Terraform code from canvas diagram
 * Uses AI to determine architecture, schema to validate and configure
 */
export async function generateTerraform(
  nodes: CanvasNode[],
  config: InfraConfig,
  openaiApiKey: string
): Promise<string> {
  // Lazy load all components
  const schemaLoader = await getSchemaLoader();
  const architect = await getArchitectureAnalyzer(openaiApiKey);
  const dependencyResolver = await getDependencyResolver();
  const codeGenerator = await getCodeGenerator();

  // Use AI-driven compiler
  const { AIDrivenCompiler } = await import("./aiDrivenCompiler");
  const compiler = new AIDrivenCompiler(
    schemaLoader,
    architect,
    dependencyResolver,
    codeGenerator
  );

  return await compiler.generateFromCanvas(nodes, config);
}

/**
 * Validate a resource configuration against schema
 */
export async function validateResource(
  resourceType: string,
  attributes: Record<string, unknown>
): Promise<{ valid: boolean; errors: string[] }> {
  const loader = await getSchemaLoader();
  return loader.validateAttributes(resourceType, attributes);
}

/**
 * Get allowed attributes for a resource (for AI if needed)
 */
export async function getAttributeAllowlist(
  resourceType: string
): Promise<string[]> {
  const loader = await getSchemaLoader();
  return loader.getAttributeAllowlist(resourceType);
}

/**
 * Get resource schema model
 */
export async function getResourceModel(resourceType: string) {
  const loader = await getSchemaLoader();
  return loader.getResourceModel(resourceType);
}
