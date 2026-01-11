import { Sparkles, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCanvas } from "@/store/useCanvas";
import { cn } from "@/lib/utils";

export function CanvasToolbar() {
  const { nodes, setConfigModalOpen, clearCanvas } = useCanvas();

  const handleGenerate = () => {
    if (nodes.length === 0) {
      alert("Add at least one service to the canvas first");
      return;
    }
    setConfigModalOpen(true);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/80 backdrop-blur border border-border">
          <Layers className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {nodes.length} {nodes.length === 1 ? "service" : "services"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {nodes.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearCanvas}
            className={cn(
              "gap-2 bg-card/80 backdrop-blur border-border",
              "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50"
            )}
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
        )}

        <Button
          onClick={handleGenerate}
          size="sm"
          className={cn(
            "gap-2 bg-primary text-primary-foreground",
            "hover:bg-primary/90 shadow-lg shadow-primary/25",
            "transition-all duration-200"
          )}
        >
          <Sparkles className="w-4 h-4" />
          Generate Infra
        </Button>
      </div>
    </div>
  );
}
