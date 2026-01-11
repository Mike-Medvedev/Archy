#!/usr/bin/env node

/**
 * Terraform Schema Extractor
 *
 * Extracts provider schemas using `terraform providers schema -json`
 * This is the ONLY source of truth for resource definitions.
 *
 * Usage: node extract-schema.js <provider> <version>
 * Example: node extract-schema.js azurerm 4.14.0
 */

import { spawn } from "child_process";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const provider = process.argv[2];
const version = process.argv[3];

if (!provider || !version) {
  console.error("Usage: node extract-schema.js <provider> <version>");
  console.error("Example: node extract-schema.js azurerm 4.14.0");
  process.exit(1);
}

const workDir = join(tmpdir(), `terraform-schema-${provider}-${Date.now()}`);
const outputDir = join(process.cwd(), "..", "schemas");
const outputFile = join(outputDir, `${provider}@${version}.schema.json`);

console.log(`\n🔧 Extracting schema for ${provider}@${version}`);
console.log(`📁 Working directory: ${workDir}`);
console.log(`💾 Output: ${outputFile}\n`);

async function main() {
  try {
    // Create working directory
    mkdirSync(workDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    // Write terraform configuration
    const terraformConfig = `
terraform {
  required_providers {
    ${provider} = {
      source  = "hashicorp/${provider}"
      version = "=${version}"
    }
  }
}

provider "${provider}" {
  # No configuration needed for schema extraction
  features {}
  skip_provider_registration = true
}
`.trim();

    writeFileSync(join(workDir, "main.tf"), terraformConfig);
    console.log("✅ Created main.tf");

    // Run terraform init
    console.log("\n📦 Running terraform init...");
    await runCommand("terraform", ["init"], workDir);
    console.log("✅ Terraform initialized");

    // Extract schema
    console.log("\n📋 Extracting provider schema...");
    const schemaJson = await runCommand(
      "terraform",
      ["providers", "schema", "-json"],
      workDir
    );

    // Parse and save
    const schema = JSON.parse(schemaJson);
    writeFileSync(outputFile, JSON.stringify(schema, null, 2));
    console.log(`✅ Schema saved to: ${outputFile}`);

    // Print statistics
    const providerSchema =
      schema.provider_schemas?.[`registry.terraform.io/hashicorp/${provider}`];
    if (providerSchema) {
      const resourceCount = Object.keys(
        providerSchema.resource_schemas || {}
      ).length;
      const dataSourceCount = Object.keys(
        providerSchema.data_source_schemas || {}
      ).length;

      console.log(`\n📊 Schema Statistics:`);
      console.log(`   - Resources: ${resourceCount}`);
      console.log(`   - Data Sources: ${dataSourceCount}`);
      console.log(`   - Provider: ${provider}@${version}`);
    }

    // Cleanup
    rmSync(workDir, { recursive: true, force: true });
    console.log("\n✅ Schema extraction complete!");
  } catch (error) {
    console.error("\n❌ Error:", error.message);

    // Cleanup on error
    if (existsSync(workDir)) {
      rmSync(workDir, { recursive: true, force: true });
    }

    process.exit(1);
  }
}

function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      env: {
        ...process.env,
        TF_IN_AUTOMATION: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      // Show progress for init
      if (text.includes("Initializing") || text.includes("Installing")) {
        process.stdout.write(".");
      }
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

main();
