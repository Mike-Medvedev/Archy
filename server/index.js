import express from "express";
import cors from "cors";
import { spawn } from "child_process";
import { writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Store active deployments
const deployments = new Map();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Deploy Terraform
app.post("/deploy", async (req, res) => {
  const { terraform } = req.body;

  if (!terraform) {
    return res.status(400).json({ error: "No Terraform code provided" });
  }

  const deployId = Date.now().toString();
  const workDir = join(tmpdir(), `archy-deploy-${deployId}`);

  try {
    // Create temp directory
    if (!existsSync(workDir)) {
      mkdirSync(workDir, { recursive: true });
    }

    // Write terraform file
    writeFileSync(join(workDir, "main.tf"), terraform);
    console.log(`[${deployId}] Created main.tf in ${workDir}`);

    // Store deployment info
    deployments.set(deployId, {
      status: "initializing",
      workDir,
      logs: [],
    });

    // Start deployment in background
    runTerraform(deployId, workDir);

    res.json({
      deployId,
      message: "Deployment started",
      status: "initializing",
    });
  } catch (error) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get deployment status
app.get("/deploy/:deployId", (req, res) => {
  const { deployId } = req.params;
  const deployment = deployments.get(deployId);

  if (!deployment) {
    return res.status(404).json({ error: "Deployment not found" });
  }

  res.json({
    deployId,
    status: deployment.status,
    logs: deployment.logs,
    error: deployment.error,
  });
});

// Run terraform commands
async function runTerraform(deployId, workDir) {
  const deployment = deployments.get(deployId);

  const addLog = (message) => {
    console.log(`[${deployId}] ${message}`);
    deployment.logs.push({ time: new Date().toISOString(), message });
  };

  try {
    // Step 1: terraform init
    addLog("Running terraform init...");
    deployment.status = "initializing";
    await runCommand("terraform", ["init", "-no-color"], workDir, addLog);
    addLog("Terraform initialized successfully");

    // Step 2: terraform plan
    addLog("Running terraform plan...");
    deployment.status = "planning";
    await runCommand(
      "terraform",
      ["plan", "-no-color", "-out=tfplan"],
      workDir,
      addLog
    );
    addLog("Plan created successfully");

    // Step 3: terraform apply
    addLog("Running terraform apply...");
    deployment.status = "applying";
    await runCommand(
      "terraform",
      ["apply", "-no-color", "-auto-approve", "tfplan"],
      workDir,
      addLog
    );
    addLog("✅ Deployment completed successfully!");

    deployment.status = "completed";
  } catch (error) {
    addLog(`❌ Error: ${error.message}`);
    deployment.status = "failed";
    deployment.error = error.message;
  }
}

// Run a command and capture output
function runCommand(cmd, args, cwd, onLog) {
  return new Promise((resolve, reject) => {
    // Ensure PATH includes common tool locations (Homebrew, etc.)
    const extraPaths = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      `${process.env.HOME}/.local/bin`,
      `${process.env.HOME}/bin`,
    ].join(":");
    
    const proc = spawn(cmd, args, {
      cwd,
      shell: true,
      env: { 
        ...process.env, 
        TF_IN_AUTOMATION: "1",
        PATH: `${extraPaths}:${process.env.PATH || ""}`,
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      const text = data.toString();
      stdout += text;
      // Log each line
      text.split("\n").forEach((line) => {
        if (line.trim()) onLog(line);
      });
    });

    proc.stderr.on("data", (data) => {
      const text = data.toString();
      stderr += text;
      text.split("\n").forEach((line) => {
        if (line.trim()) onLog(`[stderr] ${line}`);
      });
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Command failed with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

// Cleanup old deployments periodically
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [id, deployment] of deployments) {
    if (parseInt(id) < oneHourAgo) {
      // Cleanup temp directory
      try {
        if (existsSync(deployment.workDir)) {
          rmSync(deployment.workDir, { recursive: true });
        }
      } catch (e) {
        console.error(`Failed to cleanup ${deployment.workDir}:`, e);
      }
      deployments.delete(id);
    }
  }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`🚀 Archy Terraform Server running on http://localhost:${PORT}`);
  console.log("");
  console.log("Prerequisites:");
  console.log("  1. Terraform CLI installed: https://terraform.io/downloads");
  console.log("  2. Azure CLI logged in: az login");
  console.log("");
});
