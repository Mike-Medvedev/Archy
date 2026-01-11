import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { azureLocations } from "@/data/azureServices";
import { useCanvas } from "@/store/useCanvas";
import { generateTerraform } from "@/lib/terraform/generator";
import { Settings2, Loader2 } from "lucide-react";

export function ConfigModal() {
  const {
    isConfigModalOpen,
    setConfigModalOpen,
    infraConfig,
    setInfraConfig,
    nodes,
    setGeneratedTerraform,
    setPreviewOpen,
  } = useCanvas();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!infraConfig.subscriptionId.trim()) {
      newErrors.subscriptionId = "Subscription ID is required";
    }
    if (!infraConfig.resourceGroup.trim()) {
      newErrors.resourceGroup = "Resource Group name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    if (!validate()) return;

    setIsGenerating(true);
    try {
      const terraform = await generateTerraform(nodes, infraConfig);
      setGeneratedTerraform(terraform);
      setConfigModalOpen(false);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Failed to generate Terraform:", error);
      setErrors({ general: "Failed to generate Terraform. Please try again." });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isConfigModalOpen} onOpenChange={setConfigModalOpen}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                Azure Configuration
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Configure your Azure deployment settings
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errors.general && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {errors.general}
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="subscription" className="text-foreground">
              Subscription ID
            </Label>
            <Input
              id="subscription"
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={infraConfig.subscriptionId}
              onChange={(e) =>
                setInfraConfig({ subscriptionId: e.target.value })
              }
              className="bg-secondary border-border focus:border-primary"
              disabled={isGenerating}
            />
            {errors.subscriptionId && (
              <p className="text-xs text-destructive">
                {errors.subscriptionId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="resourceGroup" className="text-foreground">
              Resource Group Name
            </Label>
            <Input
              id="resourceGroup"
              placeholder="my-resource-group"
              value={infraConfig.resourceGroup}
              onChange={(e) =>
                setInfraConfig({ resourceGroup: e.target.value })
              }
              className="bg-secondary border-border focus:border-primary"
              disabled={isGenerating}
            />
            {errors.resourceGroup && (
              <p className="text-xs text-destructive">{errors.resourceGroup}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-foreground">
              Azure Region
            </Label>
            <Select
              value={infraConfig.location}
              onValueChange={(value) => setInfraConfig({ location: value })}
              disabled={isGenerating}
            >
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Select a region" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {azureLocations.map((location) => (
                  <SelectItem
                    key={location.value}
                    value={location.value}
                    className="focus:bg-secondary"
                  >
                    {location.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGenerating && (
            <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Fetching docs & generating Terraform with AI...
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setConfigModalOpen(false)}
            className="border-border hover:bg-secondary"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Terraform"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
