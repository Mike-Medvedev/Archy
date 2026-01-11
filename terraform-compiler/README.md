# Terraform Schema-Driven Compiler

A deterministic, schema-based Terraform code generator that eliminates hallucinations and scraping.

## Architecture

### Phase 1: Schema Extraction (Offline)

Extract provider schemas using Terraform's built-in schema export:

```bash
cd schema-extractor
node extract-schema.js azurerm 4.14.0
```

This creates `schemas/azurerm@4.14.0.schema.json` - the **single source of truth** for all resource definitions.

### Phase 2: Terraform Compilation (Runtime)

The compiler uses the extracted schema to generate valid, deterministic Terraform HCL:

```
User Diagram → Resource Graph → Schema Validation → Terraform HCL
```

## Modules

### 1. Schema Loader (`src/lib/terraform-compiler/schemaLoader.ts`)

- Loads provider schema JSON
- Provides helpers to retrieve resource/data source schemas
- Normalizes schemas into clean models
- Validates attributes against schemas

### 2. Code Generator (`src/lib/terraform-compiler/codeGenerator.ts`)

- Generates Terraform HCL from resource graphs
- **Only uses schema-defined attributes**
- Never invents or hallucinates fields
- Handles dependencies via topological sort

### 3. Resource Graph (`src/lib/terraform-compiler/index.ts`)

- Converts canvas diagrams to typed resource graphs
- Detects dependencies automatically
- Maps edges to attribute references

### 4. Type System (`src/lib/terraform-compiler/types.ts`)

- Complete type definitions for schemas
- Resource graph types
- Attribute metadata

## Key Features

✅ **Schema-Driven**: All attributes come from real Terraform provider schemas  
✅ **Deterministic**: Same diagram always produces same code  
✅ **Validated**: Resources are checked against schemas before generation  
✅ **Version-Pinned**: Each schema is tied to a specific provider version  
✅ **Zero Hallucinations**: Cannot invent non-existent attributes  
✅ **No Scraping**: No HTML parsing, no docs fetching, no web crawling

## Explicitly Forbidden

❌ Scraping Terraform Registry HTML  
❌ Using headless browsers  
❌ Markdown/HTML parsing  
❌ Guessing provider arguments  
❌ Letting AI invent Terraform fields

## Usage

```typescript
import { generateTerraform } from "@/lib/terraform-compiler";

// Generate from canvas diagram
const hcl = await generateTerraform(canvasNodes, infraConfig);

// Validate resource attributes
const { valid, errors } = await validateResource(
  "azurerm_linux_web_app",
  attributes
);

// Get schema model
const model = await getResourceModel("azurerm_linux_web_app");
console.log(model.requiredAttributes);
console.log(model.optionalAttributes);
console.log(model.nestedBlocks);
```

## Schema Statistics

- **Provider**: Azure RM (azurerm) v4.14.0
- **Resources**: 1,069
- **Data Sources**: 365
- **Schema Size**: ~8MB (lazy-loaded at runtime)

## Adding New Providers

1. Extract schema:

   ```bash
   cd terraform-compiler/schema-extractor
   node extract-schema.js <provider> <version>
   ```

2. Copy schema to public directory:

   ```bash
   cp ../schemas/<provider>@<version>.schema.json ../../public/schemas/
   ```

3. Update SchemaLoader to support the new provider

## Future Enhancements

- [ ] Multi-provider support (AWS, GCP, etc.)
- [ ] Schema version auto-updates
- [ ] Visual schema explorer
- [ ] Custom validation rules
- [ ] Terraform module support
