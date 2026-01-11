import type { CanvasNode, InfraConfig } from "@/types";
import { generateTerraform as generateWithCompiler } from "../terraform-compiler";

/**
 * Generate Terraform code using AI-driven, schema-validated compiler
 *
 * AI determines WHAT resources are needed.
 * Schema validates and configures HOW to deploy them.
 */
export async function generateTerraform(
  nodes: CanvasNode[],
  config: InfraConfig
): Promise<string> {
  // Get OpenAI API key from environment
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error(
      "VITE_OPENAI_API_KEY environment variable is required. " +
        "Add it to your .env file."
    );
  }

  // Use AI-driven, schema-validated compiler
  const terraform = await generateWithCompiler(nodes, config, openaiApiKey);
  return terraform;
}
