/**
 * Terraform Compiler Type Definitions
 * Based on Terraform JSON schema format
 */

export interface TerraformSchema {
  format_version: string;
  provider_schemas: {
    [providerKey: string]: ProviderSchema;
  };
}

export interface ProviderSchema {
  provider: BlockSchema;
  resource_schemas: {
    [resourceType: string]: BlockSchema;
  };
  data_source_schemas: {
    [dataSourceType: string]: BlockSchema;
  };
}

export interface BlockSchema {
  version: number;
  block: BlockDefinition;
}

export interface BlockDefinition {
  attributes?: {
    [attributeName: string]: AttributeSchema;
  };
  block_types?: {
    [blockName: string]: NestedBlockSchema;
  };
  description?: string;
  description_kind?: string;
}

export interface AttributeSchema {
  type: unknown; // Terraform type expression (string, number, bool, list, map, etc.)
  description?: string;
  required?: boolean;
  optional?: boolean;
  computed?: boolean;
  sensitive?: boolean;
}

export interface NestedBlockSchema {
  nesting_mode: "single" | "list" | "set" | "map";
  block: BlockDefinition;
  min_items?: number;
  max_items?: number;
}

/**
 * Normalized resource schema for easier consumption
 */
export interface ResourceSchemaModel {
  resourceType: string;
  version: number;
  description: string;
  requiredAttributes: AttributeMetadata[];
  optionalAttributes: AttributeMetadata[];
  computedAttributes: AttributeMetadata[];
  nestedBlocks: NestedBlockMetadata[];
}

export interface AttributeMetadata {
  name: string;
  type: string; // Simplified type string
  description: string;
  required: boolean;
  computed: boolean;
  sensitive: boolean;
}

export interface NestedBlockMetadata {
  name: string;
  nestingMode: "single" | "list" | "set" | "map";
  required: boolean;
  minItems?: number;
  maxItems?: number;
  attributes: AttributeMetadata[];
  nestedBlocks: NestedBlockMetadata[];
}

/**
 * Resource graph types
 */
export interface ResourceNode {
  id: string;
  resourceType: string; // e.g., "azurerm_linux_web_app"
  name: string; // Resource name in HCL (e.g., "main")
  attributes: Record<string, unknown>;
  dependencies: string[]; // IDs of dependent resources
}

export interface ResourceGraph {
  nodes: ResourceNode[];
  edges: Array<{
    from: string;
    to: string;
    attribute: string; // Which attribute references the dependency
  }>;
}
