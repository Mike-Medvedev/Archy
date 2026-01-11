import { useState, useCallback, type ReactNode } from "react";
import type { CanvasNode, InfraConfig } from "@/types";
import { CanvasContext, type CanvasState } from "./canvasContext";

const initialState: CanvasState = {
  nodes: [],
  edges: [],
  infraConfig: {
    subscriptionId: "3f296bc1-22da-4789-9c7a-2f7eaf3415d7",
    resourceGroup: "Arch-test-group",
    location: "centralus",
  },
  isServiceModalOpen: false,
  isConfigModalOpen: false,
  isPreviewOpen: false,
  generatedTerraform: "",
};

export function CanvasProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CanvasState>(initialState);

  const addNode = useCallback((serviceId: string) => {
    const newNode: CanvasNode = {
      id: `${serviceId}-${Date.now()}`,
      serviceId,
      position: {
        x: 250 + Math.random() * 200,
        y: 150 + Math.random() * 200,
      },
      config: {},
    };
    setState((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
      isServiceModalOpen: false,
    }));
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setState((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      // Also remove any edges connected to this node
      edges: prev.edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    }));
  }, []);

  const updateNodePosition = useCallback(
    (nodeId: string, position: { x: number; y: number }) => {
      setState((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        ),
      }));
    },
    []
  );

  const addEdge = useCallback((source: string, target: string) => {
    const edgeId = `edge-${source}-${target}`;
    setState((prev) => {
      // Check if edge already exists
      const exists = prev.edges.some(
        (e) =>
          (e.source === source && e.target === target) ||
          (e.source === target && e.target === source)
      );
      if (exists) return prev;

      return {
        ...prev,
        edges: [...prev.edges, { id: edgeId, source, target }],
      };
    });
  }, []);

  const removeEdge = useCallback((edgeId: string) => {
    setState((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  }, []);

  const setInfraConfig = useCallback((config: Partial<InfraConfig>) => {
    setState((prev) => ({
      ...prev,
      infraConfig: { ...prev.infraConfig, ...config },
    }));
  }, []);

  const setServiceModalOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isServiceModalOpen: open }));
  }, []);

  const setConfigModalOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isConfigModalOpen: open }));
  }, []);

  const setPreviewOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isPreviewOpen: open }));
  }, []);

  const setGeneratedTerraform = useCallback((terraform: string) => {
    setState((prev) => ({ ...prev, generatedTerraform: terraform }));
  }, []);

  const clearCanvas = useCallback(() => {
    setState((prev) => ({ ...prev, nodes: [], edges: [] }));
  }, []);

  return (
    <CanvasContext.Provider
      value={{
        ...state,
        addNode,
        removeNode,
        updateNodePosition,
        addEdge,
        removeEdge,
        setInfraConfig,
        setServiceModalOpen,
        setConfigModalOpen,
        setPreviewOpen,
        setGeneratedTerraform,
        clearCanvas,
      }}
    >
      {children}
    </CanvasContext.Provider>
  );
}
