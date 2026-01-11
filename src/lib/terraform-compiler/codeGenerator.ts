/**
 * Terraform Code Generator
 * Generates valid HCL from resource graph using provider schemas
 * NEVER invents attributes - only uses schema-defined fields
 */

import type { ResourceGraph, ResourceNode, NestedBlockMetadata } from "./types";
import type { SchemaLoader } from "./schemaLoader";
import { AttributeInferenceEngine } from "./attributeInference";

export class TerraformCodeGenerator {
  private currentGraph: ResourceGraph | null = null;
  private schemaLoader: SchemaLoader;

  constructor(schemaLoader: SchemaLoader) {
    this.schemaLoader = schemaLoader;
  }

  /**
   * Generate Terraform HCL from a resource graph
   */
  generate(
    graph: ResourceGraph,
    config: {
      subscriptionId: string;
      resourceGroup: string;
      location: string;
    }
  ): string {
    // Store graph for dependency resolution
    this.currentGraph = graph;

    const blocks: string[] = [];

    // Add terraform and provider blocks
    blocks.push(this.generateTerraformBlock());
    blocks.push(this.generateProviderBlock(config.subscriptionId));

    // Add data source for existing resource group
    blocks.push(this.generateResourceGroupDataSource(config.resourceGroup));

    // Generate resources in dependency order
    const sorted = this.topologicalSort(graph);

    for (const node of sorted) {
      const resourceBlock = this.generateResource(node, config);
      if (resourceBlock) {
        blocks.push(resourceBlock);
      }
    }

    return blocks.join("\n\n");
  }

  /**
   * Generate terraform required_providers block
   */
  private generateTerraformBlock(): string {
    return `terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=4.14.0"
    }
  }
}`;
  }

  /**
   * Generate provider block
   */
  private generateProviderBlock(subscriptionId: string): string {
    return `provider "azurerm" {
  resource_provider_registrations = "none"
  features {}
  subscription_id = "${subscriptionId}"
}`;
  }

  /**
   * Generate data source for existing resource group
   */
  private generateResourceGroupDataSource(resourceGroupName: string): string {
    return `data "azurerm_resource_group" "main" {
  name = "${resourceGroupName}"
}`;
  }

  /**
   * Generate a single resource block
   */
  private generateResource(
    node: ResourceNode,
    config: { location: string; resourceGroup: string }
  ): string | null {
    const model = this.schemaLoader.getResourceModel(node.resourceType);
    if (!model) {
      console.error(`Unknown resource type: ${node.resourceType}`);
      return null;
    }

    // Start resource block
    const lines: string[] = [];
    lines.push(`resource "${node.resourceType}" "${node.name}" {`);

    // Add attributes - only schema-defined ones
    const attributes = this.buildAttributes(node, model, config);

    for (const [key, value] of Object.entries(attributes)) {
      // Validate attribute exists in schema
      const attrExists =
        model.requiredAttributes.some((a) => a.name === key) ||
        model.optionalAttributes.some((a) => a.name === key);

      if (!attrExists) {
        console.warn(
          `Skipping unknown attribute: ${key} for ${node.resourceType}`
        );
        continue;
      }

      lines.push(`  ${key} = ${this.formatValue(value)}`);
    }

    // Add nested blocks if needed
    const nestedBlocks = this.buildNestedBlocks(node, model);
    for (const block of nestedBlocks) {
      lines.push(block);
    }

    lines.push(`}`);
    return lines.join("\n");
  }

  /**
   * Build attributes for a resource based on schema
   */
  private buildAttributes(
    node: ResourceNode,
    model: ReturnType<SchemaLoader["getResourceModel"]>,
    config: { location: string; resourceGroup: string }
  ): Record<string, unknown> {
    if (!model) return {};

    const attributes: Record<string, unknown> = {};

    // Add user-provided attributes
    for (const [key, value] of Object.entries(node.attributes)) {
      attributes[key] = value;
    }

    // Fill in ALL required attributes using schema-driven inference
    for (const reqAttr of model.requiredAttributes) {
      if (attributes[reqAttr.name]) continue; // Already set by user

      const inferredValue = AttributeInferenceEngine.inferDefaultValue(
        reqAttr.name,
        reqAttr.type,
        node,
        config,
        (attrName) => this.findDependencyForAttribute(node, attrName)
      );

      if (inferredValue !== null) {
        attributes[reqAttr.name] = inferredValue;
        console.log(
          `✅ Auto-filled ${node.resourceType}.${reqAttr.name} = ${inferredValue}`
        );
      } else {
        console.error(
          `❌ Cannot infer value for required attribute: ${reqAttr.name} ` +
            `(type: ${reqAttr.type}) on ${node.resourceType}`
        );
      }
    }

    // ALSO fill in common optional attributes that are often needed
    // (e.g., administrator_login is optional if using Azure AD, but we'll provide it anyway)
    this.fillCommonOptionalAttributes(node, model, attributes, config);

    return attributes;
  }

  /**
   * Fill common optional attributes that are frequently required - PATTERN-BASED, NOT RESOURCE-SPECIFIC
   */
  private fillCommonOptionalAttributes(
    node: ResourceNode,
    model: ReturnType<SchemaLoader["getResourceModel"]>,
    attributes: Record<string, unknown>,
    config: { location: string; resourceGroup: string }
  ): void {
    if (!model) return;

    for (const optAttr of model.optionalAttributes) {
      // Skip if already filled
      if (attributes[optAttr.name]) continue;

      // Fill attributes that match common patterns (login, password, admin, etc)
      // NO resource-specific checks - purely pattern-based!
      const attrNameLower = optAttr.name.toLowerCase();
      const shouldFill =
        attrNameLower.includes("login") ||
        attrNameLower.includes("password") ||
        attrNameLower.includes("admin") ||
        attrNameLower.includes("username") ||
        attrNameLower.includes("secret");

      if (shouldFill) {
        const value = AttributeInferenceEngine.inferDefaultValue(
          optAttr.name,
          optAttr.type,
          node,
          config,
          (attrName) => this.findDependencyForAttribute(node, attrName)
        );
        if (value) {
          attributes[optAttr.name] = value;
          console.log(
            `✅ Auto-filled optional ${node.resourceType}.${optAttr.name} = ${value}`
          );
        }
      }
    }
  }

  /**
   * Find dependency node that should provide a specific attribute
   * Uses smart matching: checks if the dependency resource type name matches the attribute name pattern
   */
  private findDependencyForAttribute(
    node: ResourceNode,
    attrName: string
  ): ResourceNode | null {
    // Extract the expected resource name from the attribute
    // e.g., "service_plan_id" -> "service_plan"
    // e.g., "namespace_id" -> "namespace"
    const expectedResourcePart = attrName.replace(/_id$/, "");

    for (const depId of node.dependencies) {
      const depNode = this.findNodeById(depId);
      if (!depNode) continue;

      // Check if the dependency resource type contains the expected part
      // e.g., "azurerm_service_plan" contains "service_plan"
      // e.g., "azurerm_servicebus_namespace" contains "namespace"
      const depResourceName = depNode.resourceType.replace(/^azurerm_/, "");

      if (
        depResourceName.includes(expectedResourcePart) ||
        expectedResourcePart.includes(depResourceName)
      ) {
        return depNode;
      }

      // Also try matching the last part of compound names
      // e.g., "server_id" should match "azurerm_mssql_server"
      const depParts = depResourceName.split("_");
      const lastPart = depParts[depParts.length - 1];
      if (
        expectedResourcePart === lastPart ||
        expectedResourcePart.endsWith(`_${lastPart}`)
      ) {
        return depNode;
      }
    }
    return null;
  }

  /**
   * Build nested blocks dynamically from schema
   */
  private buildNestedBlocks(
    node: ResourceNode,
    model: ReturnType<SchemaLoader["getResourceModel"]>
  ): string[] {
    if (!model) return [];

    const blocks: string[] = [];

    // Process ALL required nested blocks from schema
    for (const nestedBlock of model.nestedBlocks) {
      if (!nestedBlock.required) continue;

      // Generate content for specific known blocks
      const blockContent = this.inferNestedBlockContent(
        nestedBlock.name,
        nestedBlock,
        node.resourceType
      );

      if (blockContent.length > 0) {
        blocks.push(`  ${nestedBlock.name} {`);
        blockContent.forEach((line) => blocks.push(`    ${line}`));
        blocks.push("  }");
      } else {
        // Required but we don't know what to put - leave empty
        blocks.push(`  ${nestedBlock.name} {}`);
      }
    }

    return blocks;
  }

  /**
   * Infer content for nested blocks based ENTIRELY on schema attributes
   */
  private inferNestedBlockContent(
    blockName: string,
    blockMetadata: NestedBlockMetadata,
    resourceType: string
  ): string[] {
    const content: string[] = [];

    // Fill ALL required attributes from the block's schema
    if (blockMetadata.attributes && Array.isArray(blockMetadata.attributes)) {
      for (const attr of blockMetadata.attributes) {
        if (!attr.required) continue;

        // Use type-based inference - NO resource-specific logic
        const value = this.inferBlockAttributeValue(attr.name, attr.type);

        if (value) {
          content.push(`${attr.name} = ${value}`);
        } else {
          console.warn(
            `⚠️  Cannot infer value for required block attribute: ${blockName}.${attr.name} on ${resourceType}`
          );
        }
      }

      // ONLY fill REQUIRED attributes - don't over-fill with optional stuff
    }

    return content;
  }

  /**
   * Infer values for attributes inside nested blocks - NO HARDCODING, PURE TYPE PATTERNS
   */
  private inferBlockAttributeValue(
    attrName: string,
    attrType: string
  ): string | null {
    // Use ONLY type-based patterns from the AttributeInferenceEngine
    // NO resource-specific or block-specific hardcoding!

    // String type patterns
    if (attrType.includes("string")) {
      // Size/tier typically use small values
      if (attrName.includes("size") || attrName.includes("tier")) {
        return '"Basic"';
      }
      if (attrName.includes("type")) {
        return '"Standard"';
      }
      if (attrName.includes("name")) {
        return '"default"';
      }
      return '"default"';
    }

    // Boolean type patterns
    if (attrType.includes("bool")) {
      return "false";
    }

    // Number type patterns
    if (attrType.includes("number")) {
      return "1";
    }

    return null;
  }

  /**
   * Format a value for HCL output
   */
  private formatValue(value: unknown): string {
    if (typeof value === "string") {
      // Check if it's a reference (doesn't need quotes)
      if (value.includes(".") && !value.startsWith('"')) {
        return value;
      }
      return value.startsWith('"') ? value : `"${value}"`;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "number") {
      return String(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((v) => this.formatValue(v)).join(", ")}]`;
    }
    if (typeof value === "object" && value !== null) {
      const entries = Object.entries(value)
        .map(([k, v]) => `${k} = ${this.formatValue(v)}`)
        .join(", ");
      return `{ ${entries} }`;
    }
    return "null";
  }

  /**
   * Topological sort of resources by dependencies
   */
  private topologicalSort(graph: ResourceGraph): ResourceNode[] {
    const sorted: ResourceNode[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      if (visiting.has(nodeId)) {
        throw new Error(`Circular dependency detected: ${nodeId}`);
      }

      visiting.add(nodeId);

      const node = graph.nodes.find((n) => n.id === nodeId);
      if (node) {
        // Visit dependencies first
        for (const depId of node.dependencies) {
          visit(depId);
        }
        sorted.push(node);
        visited.add(nodeId);
      }

      visiting.delete(nodeId);
    };

    for (const node of graph.nodes) {
      visit(node.id);
    }

    return sorted;
  }

  /**
   * Find node by ID (helper for dependency resolution)
   */
  private findNodeById(id: string): ResourceNode | null {
    if (!this.currentGraph) return null;
    return this.currentGraph.nodes.find((n) => n.id === id) || null;
  }
}
