export interface AzureService {
  id: string;
  name: string;
  category:
    | "compute"
    | "storage"
    | "networking"
    | "database"
    | "ai"
    | "integration";
  icon: string;
  tfResourceType: string;
  description: string;
  docs_url: string;
  // Optional: dependencies this resource needs (e.g., web app needs service plan)
  dependencies?: string[];
  // Optional: hint to use minimal/simple configuration
  useMinimalConfig?: boolean;
}

export interface CanvasNode {
  id: string;
  serviceId: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
}

export interface InfraConfig {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface AppState {
  nodes: CanvasNode[];
  infraConfig: InfraConfig;
  isServiceModalOpen: boolean;
  isConfigModalOpen: boolean;
  isPreviewOpen: boolean;
  generatedTerraform: string;
}

export type AzureLocation = {
  value: string;
  label: string;
};
