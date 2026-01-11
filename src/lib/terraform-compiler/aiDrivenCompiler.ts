/**
 * AI-Driven Terraform Compiler
 * 
 * Flow:
 * 1. User selects services in canvas
 * 2. AI determines what Terraform resources are needed for each
 * 3. Schema validates and auto-fills attributes
 * 4. Generate HCL
 */

import type { CanvasNode, InfraConfig } from "@/types";
import type { ResourceGraph, ResourceNode } from "./types";
import { getServiceById } from "@/data/azureServices";
import { SchemaLoader } from "./schemaLoader";
import { ResourceArchitectureAnalyzer } from "./resourceArchitect";
import { DependencyResolver } from "./dependencyResolver";
import { TerraformCodeGenerator } from "./codeGenerator";

export class AIDrivenCompiler {
  private schemaLoader: SchemaLoader;
  private architect: ResourceArchitectureAnalyzer;
  private dependencyResolver: DependencyResolver;
  private codeGenerator: TerraformCodeGenerator;

  constructor(
    schemaLoader: SchemaLoader,
    architect: ResourceArchitectureAnalyzer,
    dependencyResolver: DependencyResolver,
    codeGenerator: TerraformCodeGenerator
  ) {
    this.schemaLoader = schemaLoader;
    this.architect = architect;
    this.dependencyResolver = dependencyResolver;
    this.codeGenerator = codeGenerator;
  }

  /**
   * Generate Terraform from canvas selections
   */
  async generateFromCanvas(
    nodes: CanvasNode[],
    config: InfraConfig
  ): Promise<string> {
    console.log(`\n🤖 AI-Driven Terraform Generation`);
    console.log(`📋 User selected ${nodes.length} services`);

    // Step 1: For each canvas node, ask AI what resources are needed
    const allResources: ResourceNode[] = [];
    const resourceMap = new Map<string, ResourceNode>();

    for (const canvasNode of nodes) {
      const service = getServiceById(canvasNode.serviceId);
      if (!service) {
        console.warn(`⚠️  Unknown service: ${canvasNode.serviceId}`);
        continue;
      }

      console.log(`\n📦 ${service.name}`);

      // AI determines required Terraform resources
      const tfResources = await this.architect.analyzeRequiredResources(
        service.name,
        service.description
      );

      console.log(`  → AI suggests: ${tfResources.join(", ")}`);

      // Create ResourceNode for each
      for (const tfResourceType of tfResources) {
        const uniqueKey = `${tfResourceType}-${Date.now()}-${Math.random()}`;
        
        const resourceNode: ResourceNode = {
          id: uniqueKey,
          resourceType: tfResourceType,
          name: this.generateResourceName(tfResourceType),
          attributes: {},
          dependencies: [],
        };

        allResources.push(resourceNode);
        resourceMap.set(uniqueKey, resourceNode);
      }
    }

    console.log(`\n✅ Total resources to create: ${allResources.length}`);

    // Step 2: Resolve dependencies between resources
    console.log(`\n🔗 Resolving dependencies...`);
    
    for (const resource of allResources) {
      const schemaDeps = this.dependencyResolver.getRequiredDependencies(
        resource.resourceType
      );

      for (const schemaDep of schemaDeps) {
        // Find another resource that matches this dependency
        const depResource = allResources.find(
          (r) => r.resourceType === schemaDep.resourceType && r.id !== resource.id
        );

        if (depResource) {
          resource.dependencies.push(depResource.id);
          console.log(
            `  ${resource.resourceType} → ${depResource.resourceType} (${schemaDep.attributeName})`
          );
        } else {
          console.warn(
            `  ⚠️  ${resource.resourceType} needs ${schemaDep.resourceType} but not found`
          );
        }
      }
    }

    // Step 3: Build resource graph
    const graph: ResourceGraph = {
      nodes: allResources,
      edges: [],
    };

    // Build edges from dependencies
    for (const resource of allResources) {
      for (const depId of resource.dependencies) {
        const depResource = resourceMap.get(depId);
        if (depResource) {
          const schemaDeps = this.dependencyResolver.getRequiredDependencies(
            resource.resourceType
          );
          const matchingDep = schemaDeps.find(
            (d) => d.resourceType === depResource.resourceType
          );

          if (matchingDep) {
            graph.edges.push({
              from: resource.id,
              to: depId,
              attribute: matchingDep.attributeName,
            });
          }
        }
      }
    }

    // Step 4: Generate HCL
    console.log(`\n⚙️  Generating Terraform HCL...`);
    const hcl = this.codeGenerator.generate(graph, {
      subscriptionId: config.subscriptionId,
      resourceGroup: config.resourceGroup,
      location: config.location,
    });

    console.log(`\n✅ Generated ${hcl.split("\n").length} lines of Terraform`);
    return hcl;
  }

  /**
   * Generate unique resource name
   */
  private generateResourceName(tfResourceType: string): string {
    const serviceType = tfResourceType.replace("azurerm_", "");
    const timestamp = Date.now().toString().slice(-6);
    return `${serviceType}_${timestamp}`;
  }
}
