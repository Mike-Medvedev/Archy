/**
 * Attribute Inference Engine
 * Automatically fills in required Terraform attributes based on schema analysis
 *
 * Pure pattern-based inference - works for ANY Azure resource!
 */

import type { ResourceNode } from "./types";

export class AttributeInferenceEngine {
  /**
   * Infer a sensible default value for any attribute
   * Based purely on attribute name patterns and types
   */
  static inferDefaultValue(
    attrName: string,
    attrType: string,
    node: ResourceNode,
    config: { location: string; resourceGroup: string },
    findDependency: (attrName: string) => ResourceNode | null
  ): unknown {
    // ===== PATTERN 1: Resource References (ends with _id) =====
    if (attrName.endsWith("_id")) {
      const depNode = findDependency(attrName);
      if (depNode) {
        return `${depNode.resourceType}.${depNode.name}.id`;
      }
      console.error(
        `❌ Missing dependency for ${attrName} on ${node.resourceType}`
      );
      return null;
    }

    // ===== PATTERN 2: Standard Azure Attributes =====
    if (attrName === "name") {
      return this.generateAzureCompliantName(node.name, config.resourceGroup);
    }

    if (attrName === "location") {
      return `"${config.location}"`;
    }

    if (attrName === "resource_group_name") {
      return "data.azurerm_resource_group.main.name";
    }

    // ===== PATTERN 3: SKU/Tier Attributes =====
    // Different naming conventions:
    // - "sku_name" uses codes like "B1", "S1", "P1v2" (App Service)
    // - "sku" uses words like "Basic", "Standard", "Premium" (Service Bus, etc.)
    if (attrName === "sku_name") {
      return '"B1"';
    }
    if (attrName === "sku") {
      return '"Basic"';
    }

    if (attrName === "tier") {
      return '"Basic"';
    }

    // ===== PATTERN 4: OS/Platform Attributes =====
    if (attrName === "os_type") {
      return '"Linux"';
    }

    // ===== PATTERN 5: Version Attributes =====
    if (attrName === "version") {
      // Schema doesn't provide enum/validation values
      // Use "12.0" as it's common for Azure services (SQL Server 2014+, etc)
      // This may fail validation for some resources - schema limitation
      return '"12.0"';
    }

    // ===== PATTERN 6: Authentication/Credentials =====
    if (
      attrName.includes("password") ||
      attrName.includes("secret") ||
      attrName.includes("key")
    ) {
      // Use a simple placeholder password - DO NOT reference non-existent resources!
      return '"TempPassword123!"';
    }

    if (
      attrName.includes("administrator_login") ||
      attrName === "admin_username" ||
      attrName === "admin_user"
    ) {
      return '"adminuser"';
    }

    // ===== PATTERN 7: Capacity/Size Attributes =====
    if (
      attrName === "capacity" ||
      attrName === "max_size_gb" ||
      attrName.includes("size")
    ) {
      return "1"; // Minimum
    }

    // ===== PATTERN 8: Boolean Attributes =====
    if (attrType.includes("bool")) {
      // Most booleans default to false for minimal config
      return "false";
    }

    // ===== PATTERN 9: Enable/Disable Flags =====
    if (attrName.startsWith("enable_") || attrName.startsWith("enabled")) {
      return "false";
    }

    // ===== PATTERN 10: String Attributes =====
    if (attrType.includes("string")) {
      // Try to infer from attribute name
      if (attrName.includes("namespace") && !attrName.endsWith("_id")) {
        return `"namespace-${node.name.replace(/_/g, "-")}"`;
      }
      if (attrName.includes("queue") && !attrName.endsWith("_id")) {
        return `"queue-${node.name.replace(/_/g, "-")}"`;
      }
      // Generic default
      return '"default"';
    }

    // ===== PATTERN 11: Number Attributes =====
    if (attrType.includes("number")) {
      return "1";
    }

    // Cannot infer - needs user input or more context
    return null;
  }

  /**
   * Generate Azure-compliant resource name
   * Rules: lowercase, alphanumeric + dashes only, max 60 chars
   */
  private static generateAzureCompliantName(
    baseName: string,
    resourceGroup: string
  ): string {
    const sanitizedRG = resourceGroup.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    const sanitizedName = baseName
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    const fullName = `${sanitizedRG}-${sanitizedName}`.substring(0, 60);
    return `"${fullName}"`;
  }

  /**
   * Infer SKU - use B1 as default (works for service plans)
   * Schema doesn't provide valid values, this is a limitation
   */
}
