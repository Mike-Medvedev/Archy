import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X } from "lucide-react";
import { getServiceById } from "@/data/azureServices";
import { useCanvas } from "@/store/useCanvas";
import { cn } from "@/lib/utils";

interface ServiceNodeData {
  serviceId: string;
}

function ServiceNodeComponent({
  id,
  data,
  selected,
}: NodeProps & { data: ServiceNodeData }) {
  const { removeNode } = useCanvas();
  const service = getServiceById(data.serviceId);

  if (!service) return null;

  return (
    <div
      className={cn(
        "group relative px-4 py-3 rounded-xl bg-card border border-border",
        "shadow-lg shadow-black/20 transition-all duration-200",
        "hover:border-primary/50 hover:shadow-primary/10",
        selected && "border-primary ring-2 ring-primary/20"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card"
      />

      <button
        onClick={() => removeNode(id)}
        className={cn(
          "absolute -top-2 -right-2 w-5 h-5 rounded-full",
          "bg-destructive text-destructive-foreground",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-destructive/80"
        )}
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary/50 p-2 flex items-center justify-center">
          <img
            src={service.icon}
            alt={service.name}
            className="w-6 h-6 object-contain"
            onError={(e) => {
              // Fallback if icon fails to load
              (e.target as HTMLImageElement).src =
                'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><rect width="24" height="24" rx="4"/></svg>';
            }}
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{service.name}</p>
          <p className="text-xs text-muted-foreground">{service.category}</p>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground/50 !border-2 !border-card"
      />
    </div>
  );
}

export const ServiceNode = memo(ServiceNodeComponent);
