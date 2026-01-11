/**
 * Schema Loader
 * Loads provider schema JSON and provides helpers to retrieve resource/data source schemas
 */

import type {
  TerraformSchema,
  ProviderSchema,
  BlockSchema,
  ResourceSchemaModel,
  AttributeMetadata,
  NestedBlockMetadata,
  BlockDefinition,
} from "./types";

export class SchemaLoader {
  private schema: TerraformSchema;
  private providerKey: string;

  constructor(schemaJson: TerraformSchema, provider: string) {
    this.schema = schemaJson;
    this.providerKey = `registry.terraform.io/hashicorp/${provider}`;
  }

  /**
   * Get the provider schema
   */
  getProviderSchema(): ProviderSchema | null {
    return this.schema.provider_schemas?.[this.providerKey] || null;
  }

  /**
   * Get a resource schema by type
   */
  getResourceSchema(resourceType: string): BlockSchema | null {
    const provider = this.getProviderSchema();
    return provider?.resource_schemas?.[resourceType] || null;
  }

  /**
   * Get a data source schema by type
   */
  getDataSourceSchema(dataSourceType: string): BlockSchema | null {
    const provider = this.getProviderSchema();
    return provider?.data_source_schemas?.[dataSourceType] || null;
  }

  /**
   * Get all resource types
   */
  getAllResourceTypes(): string[] {
    const provider = this.getProviderSchema();
    return Object.keys(provider?.resource_schemas || {});
  }

  /**
   * Get all data source types
   */
  getAllDataSourceTypes(): string[] {
    const provider = this.getProviderSchema();
    return Object.keys(provider?.data_source_schemas || {});
  }

  /**
   * Normalize a resource schema into a clean model
   */
  getResourceModel(resourceType: string): ResourceSchemaModel | null {
    const schema = this.getResourceSchema(resourceType);
    if (!schema) return null;

    const block = schema.block;
    const attributes = block.attributes || {};

    const requiredAttributes: AttributeMetadata[] = [];
    const optionalAttributes: AttributeMetadata[] = [];
    const computedAttributes: AttributeMetadata[] = [];

    // Categorize attributes
    for (const [name, attr] of Object.entries(attributes)) {
      const metadata: AttributeMetadata = {
        name,
        type: this.simplifyType(attr.type),
        description: attr.description || "",
        required: attr.required || false,
        computed: attr.computed || false,
        sensitive: attr.sensitive || false,
      };

      if (attr.computed && !attr.optional && !attr.required) {
        computedAttributes.push(metadata);
      } else if (attr.required) {
        requiredAttributes.push(metadata);
      } else {
        optionalAttributes.push(metadata);
      }
    }

    // Parse nested blocks
    const nestedBlocks = this.parseNestedBlocks(block);

    return {
      resourceType,
      version: schema.version,
      description: block.description || "",
      requiredAttributes,
      optionalAttributes,
      computedAttributes,
      nestedBlocks,
    };
  }

  /**
   * Parse nested blocks recursively
   */
  private parseNestedBlocks(block: BlockDefinition): NestedBlockMetadata[] {
    const result: NestedBlockMetadata[] = [];
    const blockTypes = block.block_types || {};

    for (const [name, nestedBlock] of Object.entries(blockTypes)) {
      const nestedAttributes: AttributeMetadata[] = [];
      const nestedBlockAttrs = nestedBlock.block.attributes || {};

      for (const [attrName, attr] of Object.entries(nestedBlockAttrs)) {
        nestedAttributes.push({
          name: attrName,
          type: this.simplifyType(attr.type),
          description: attr.description || "",
          required: attr.required || false,
          computed: attr.computed || false,
          sensitive: attr.sensitive || false,
        });
      }

      const required =
        nestedBlock.min_items !== undefined && nestedBlock.min_items > 0;

      result.push({
        name,
        nestingMode: nestedBlock.nesting_mode,
        required,
        minItems: nestedBlock.min_items,
        maxItems: nestedBlock.max_items,
        attributes: nestedAttributes,
        nestedBlocks: this.parseNestedBlocks(nestedBlock.block),
      });
    }

    return result;
  }

  /**
   * Simplify Terraform type expressions into readable strings
   */
  private simplifyType(typeExpr: any): string {
    if (typeof typeExpr === "string") {
      return typeExpr;
    }

    if (Array.isArray(typeExpr)) {
      const [kind, ...args] = typeExpr;
      switch (kind) {
        case "list":
          return `list(${this.simplifyType(args[0])})`;
        case "set":
          return `set(${this.simplifyType(args[0])})`;
        case "map":
          return `map(${this.simplifyType(args[0])})`;
        case "object":
          return "object";
        default:
          return kind;
      }
    }

    return "unknown";
  }

  /**
   * Get attribute allowlist for a resource (for AI)
   * Only returns attributes that should be user-provided
   */
  getAttributeAllowlist(resourceType: string): string[] {
    const model = this.getResourceModel(resourceType);
    if (!model) return [];

    const allowlist: string[] = [];

    // Add all required attributes
    allowlist.push(...model.requiredAttributes.map((a) => a.name));

    // Add common optional attributes (exclude computed-only)
    allowlist.push(
      ...model.optionalAttributes.filter((a) => !a.computed).map((a) => a.name)
    );

    return allowlist;
  }

  /**
   * Validate if attributes are schema-compliant
   */
  validateAttributes(
    resourceType: string,
    attributes: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const model = this.getResourceModel(resourceType);
    if (!model) {
      return {
        valid: false,
        errors: [`Unknown resource type: ${resourceType}`],
      };
    }

    const errors: string[] = [];
    const allowedAttributes = new Set([
      ...model.requiredAttributes.map((a) => a.name),
      ...model.optionalAttributes.map((a) => a.name),
    ]);

    // Check for required attributes
    for (const attr of model.requiredAttributes) {
      if (!(attr.name in attributes)) {
        errors.push(`Missing required attribute: ${attr.name}`);
      }
    }

    // Check for unknown attributes
    for (const attrName of Object.keys(attributes)) {
      if (!allowedAttributes.has(attrName)) {
        errors.push(`Unknown attribute: ${attrName}`);
      }
    }

    // Check for computed attributes (should never be set by user)
    for (const attr of model.computedAttributes) {
      if (attr.name in attributes) {
        errors.push(`Cannot set computed attribute: ${attr.name}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
