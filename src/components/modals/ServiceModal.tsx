import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { azureServices } from "@/data/azureServices";
import { useCanvas } from "@/store/useCanvas";
import { cn } from "@/lib/utils";

export function ServiceModal() {
  const { isServiceModalOpen, setServiceModalOpen, addNode } = useCanvas();

  const handleSelectService = (serviceId: string) => {
    console.log("adding", serviceId);
    addNode(serviceId);
  };

  return (
    <Dialog open={isServiceModalOpen} onOpenChange={setServiceModalOpen}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            Add Azure Service
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {azureServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleSelectService(service.id)}
              className={cn(
                "group flex flex-col items-center gap-3 p-4 rounded-xl",
                "bg-secondary/50 border border-transparent",
                "hover:bg-secondary hover:border-primary/30",
                "transition-all duration-200",
                "text-left"
              )}
            >
              <div
                className={cn(
                  "w-12 h-12 rounded-lg bg-card p-2.5",
                  "flex items-center justify-center",
                  "group-hover:bg-primary/10 transition-colors"
                )}
              >
                <img
                  src={service.icon}
                  alt={service.name}
                  className="w-7 h-7 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%233b82f6"><rect width="24" height="24" rx="4"/></svg>';
                  }}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  {service.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {service.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
