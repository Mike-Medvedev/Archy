import { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useCanvas } from "@/store/useCanvas";
import {
  Check,
  Copy,
  Rocket,
  ArrowLeft,
  FileCode2,
  Pencil,
  Eye,
  Terminal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND_URL = "/api";

interface DeployLog {
  time: string;
  message: string;
}

export function TerraformPreview() {
  const {
    isPreviewOpen,
    setPreviewOpen,
    generatedTerraform,
    setGeneratedTerraform,
  } = useCanvas();
  const [copied, setCopied] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string>("");
  const [deployLogs, setDeployLogs] = useState<DeployLog[]>([]);
  const [deployError, setDeployError] = useState<string>("");
  const [showLogs, setShowLogs] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Sync editedCode with generatedTerraform when dialog opens or terraform changes
  useEffect(() => {
    if (isPreviewOpen && generatedTerraform) {
      setEditedCode(generatedTerraform);
    }
  }, [isPreviewOpen, generatedTerraform]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isPreviewOpen) {
      setIsEditing(false);
      setShowLogs(false);
      setDeployLogs([]);
      setDeployError("");
      setDeployStatus("");
    }
  }, [isPreviewOpen]);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [deployLogs]);

  const handleCopy = async () => {
    const codeToCopy = isEditing ? editedCode : generatedTerraform;
    await navigator.clipboard.writeText(codeToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeploy = async () => {
    // Save any edits before deploying
    const codeToDeply = isEditing ? editedCode : generatedTerraform;
    if (isEditing && editedCode !== generatedTerraform) {
      setGeneratedTerraform(editedCode);
    }

    setDeploying(true);
    setShowLogs(true);
    setDeployLogs([]);
    setDeployError("");
    setDeployStatus("starting");

    try {
      // Start deployment
      const response = await fetch(`${BACKEND_URL}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terraform: codeToDeply }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start deployment");
      }

      const { deployId } = await response.json();
      setDeployLogs([
        {
          time: new Date().toISOString(),
          message: `Deployment started (ID: ${deployId})`,
        },
      ]);

      // Poll for status
      const pollStatus = async () => {
        try {
          const statusRes = await fetch(`${BACKEND_URL}/deploy/${deployId}`);
          const data = await statusRes.json();

          setDeployStatus(data.status);
          setDeployLogs(data.logs || []);

          if (data.error) {
            setDeployError(data.error);
          }

          // Continue polling if not finished
          if (data.status !== "completed" && data.status !== "failed") {
            setTimeout(pollStatus, 1000);
          } else {
            setDeploying(false);
          }
        } catch {
          setDeployError("Lost connection to deployment server");
          setDeploying(false);
        }
      };

      // Start polling
      setTimeout(pollStatus, 500);
    } catch (error) {
      console.error("Deploy error:", error);
      setDeployError(
        error instanceof Error
          ? error.message
          : "Failed to connect to deployment server. Make sure the server is running."
      );
      setDeployLogs([
        {
          time: new Date().toISOString(),
          message:
            "❌ " +
            (error instanceof Error ? error.message : "Connection failed"),
        },
      ]);
      setDeploying(false);
    }
  };

  const toggleEditMode = () => {
    if (isEditing && editedCode) {
      setGeneratedTerraform(editedCode);
    } else if (!isEditing) {
      setEditedCode(generatedTerraform);
    }
    setIsEditing(!isEditing);
  };

  const displayCode = isEditing ? editedCode : generatedTerraform;
  const lineCount = displayCode.split("\n").length;
  const hasChanges = isEditing && editedCode !== generatedTerraform;
  const isCompleted = deployStatus === "completed";
  const isFailed = deployStatus === "failed";

  return (
    <Dialog open={isPreviewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="sm:max-w-5xl h-[85vh] bg-card border-border flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileCode2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Generated Terraform
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    main.tf
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {lineCount} lines
                  </span>
                  {hasChanges && (
                    <Badge
                      variant="outline"
                      className="text-xs text-amber-500 border-amber-500/50"
                    >
                      Modified
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {showLogs && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLogs(false)}
                  className="gap-2 border-border hover:bg-secondary"
                >
                  <X className="w-4 h-4" />
                  Hide Logs
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleEditMode}
                className={cn(
                  "gap-2 border-border",
                  isEditing
                    ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20"
                    : "hover:bg-secondary"
                )}
              >
                {isEditing ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Preview
                  </>
                ) : (
                  <>
                    <Pencil className="w-4 h-4" />
                    Edit
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2 border-border hover:bg-secondary"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 flex gap-4 mt-4 min-h-0">
          {/* Code Panel */}
          <ScrollArea
            className={cn(
              "rounded-lg border border-border overflow-hidden",
              showLogs ? "w-1/2" : "w-full"
            )}
          >
            {isEditing ? (
              <div
                className="relative min-h-full"
                style={{ background: "rgb(20, 20, 22)" }}
              >
                <div
                  className="absolute left-0 top-0 select-none pointer-events-none"
                  style={{
                    padding: "1rem 0",
                    paddingLeft: "0.5rem",
                    color: "#4a4a4a",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    textAlign: "right",
                    width: "3.5em",
                  }}
                >
                  {editedCode.split("\n").map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={textareaRef}
                  value={editedCode}
                  onChange={(e) => setEditedCode(e.target.value)}
                  spellCheck={false}
                  className="w-full resize-none bg-transparent outline-none"
                  style={{
                    padding: "1rem",
                    paddingLeft: "4.5em",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    minHeight: "500px",
                    height: "auto",
                    color: "#abb2bf",
                    caretColor: "#fff",
                  }}
                />
              </div>
            ) : (
              <SyntaxHighlighter
                language="hcl"
                style={oneDark}
                customStyle={{
                  margin: 0,
                  padding: "1rem",
                  background: "rgb(20, 20, 22)",
                  fontSize: "13px",
                  lineHeight: "1.6",
                }}
                showLineNumbers
                lineNumberStyle={{
                  minWidth: "3em",
                  paddingRight: "1em",
                  color: "#4a4a4a",
                  textAlign: "right",
                }}
              >
                {generatedTerraform}
              </SyntaxHighlighter>
            )}
          </ScrollArea>

          {/* Logs Panel */}
          {showLogs && (
            <div className="w-1/2 flex flex-col rounded-lg border border-border overflow-hidden bg-[rgb(20,20,22)]">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-secondary/30">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Deployment Logs</span>
                {deployStatus && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs ml-auto",
                      isCompleted && "text-green-500 border-green-500/50",
                      isFailed && "text-red-500 border-red-500/50",
                      deploying && "text-blue-500 border-blue-500/50"
                    )}
                  >
                    {deployStatus}
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="font-mono text-xs space-y-1">
                  {deployLogs.map((log, i) => (
                    <div
                      key={i}
                      className={cn(
                        "whitespace-pre-wrap",
                        log.message.includes("✅") && "text-green-400",
                        log.message.includes("❌") && "text-red-400",
                        log.message.includes("[stderr]") && "text-yellow-400",
                        !log.message.includes("✅") &&
                          !log.message.includes("❌") &&
                          !log.message.includes("[stderr]") &&
                          "text-muted-foreground"
                      )}
                    >
                      {log.message}
                    </div>
                  ))}
                  {deploying && (
                    <div className="flex items-center gap-2 text-blue-400">
                      <div className="w-3 h-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                      Running...
                    </div>
                  )}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border flex-shrink-0">
          <Button
            variant="ghost"
            onClick={() => setPreviewOpen(false)}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Canvas
          </Button>

          <div className="flex items-center gap-2">
            {deployError && !deploying && (
              <span className="text-xs text-red-400 mr-2">{deployError}</span>
            )}
            <Button
              onClick={handleDeploy}
              disabled={deploying}
              className={cn(
                "gap-2 min-w-[160px]",
                isCompleted
                  ? "bg-green-600 hover:bg-green-700"
                  : isFailed
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isCompleted ? (
                <>
                  <Check className="w-4 h-4" />
                  Deployed!
                </>
              ) : isFailed ? (
                <>
                  <X className="w-4 h-4" />
                  Failed - Retry
                </>
              ) : deploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Deploy to Azure
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
