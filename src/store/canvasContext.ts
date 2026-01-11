import { createContext } from "react";
import type { CanvasNode, CanvasEdge, InfraConfig } from "@/types";

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  infraConfig: InfraConfig;
  isServiceModalOpen: boolean;
  isConfigModalOpen: boolean;
  isPreviewOpen: boolean;
  generatedTerraform: string;
}

export interface CanvasContextType extends CanvasState {
  addNode: (serviceId: string) => void;
  removeNode: (nodeId: string) => void;
  updateNodePosition: (
    nodeId: string,
    position: { x: number; y: number }
  ) => void;
  addEdge: (source: string, target: string) => void;
  removeEdge: (edgeId: string) => void;
  setInfraConfig: (config: Partial<InfraConfig>) => void;
  setServiceModalOpen: (open: boolean) => void;
  setConfigModalOpen: (open: boolean) => void;
  setPreviewOpen: (open: boolean) => void;
  setGeneratedTerraform: (terraform: string) => void;
  clearCanvas: () => void;
}

export const CanvasContext = createContext<CanvasContextType | null>(null);
