import { useCallback, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  MarkerType,
  ConnectionLineType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { ServiceNode } from "./ServiceNode";
import { CanvasToolbar } from "./CanvasToolbar";
import { useCanvas } from "@/store/useCanvas";
import { cn } from "@/lib/utils";

const nodeTypes = {
  service: ServiceNode,
};

// Default edge options for consistent styling
const defaultEdgeOptions = {
  style: {
    strokeWidth: 2,
    stroke: "#3b82f6",
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#3b82f6",
    width: 20,
    height: 20,
  },
  animated: true,
};

export function InfraCanvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    updateNodePosition,
    addEdge: addStoreEdge,
    removeEdge: removeStoreEdge,
    setServiceModalOpen,
  } = useCanvas();

  // Convert store nodes to React Flow nodes format
  const initialNodes: Node[] = storeNodes.map((node) => ({
    id: node.id,
    type: "service",
    position: node.position,
    data: { serviceId: node.serviceId },
  }));

  // Convert store edges to React Flow edges format
  const initialEdges: Edge[] = storeEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...defaultEdgeOptions,
  }));

  // Use React Flow's built-in state management
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync store nodes to React Flow nodes when store changes
  useEffect(() => {
    const newNodes: Node[] = storeNodes.map((node) => ({
      id: node.id,
      type: "service",
      position: node.position,
      data: { serviceId: node.serviceId },
    }));
    setNodes(newNodes);
  }, [storeNodes, setNodes]);

  // Sync store edges to React Flow edges when store changes
  useEffect(() => {
    const newEdges: Edge[] = storeEdges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...defaultEdgeOptions,
    }));
    setEdges(newEdges);
  }, [storeEdges, setEdges]);

  // Handle node changes and sync position updates back to store
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          updateNodePosition(change.id, change.position);
        }
      }
    },
    [onNodesChange, updateNodePosition]
  );

  // Handle edge changes (deletions)
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);

      for (const change of changes) {
        if (change.type === "remove") {
          removeStoreEdge(change.id);
        }
      }
    },
    [onEdgesChange, removeStoreEdge]
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        // Add to React Flow
        setEdges((eds) =>
          addEdge(
            {
              ...connection,
              ...defaultEdgeOptions,
            },
            eds
          )
        );
        // Add to store
        addStoreEdge(connection.source, connection.target);
      }
    },
    [setEdges, addStoreEdge]
  );

  return (
    <div className="relative flex-1 h-full">
      <CanvasToolbar />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
        style={{ backgroundColor: "#0a0a0b" }}
        connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2 }}
        connectionLineType={ConnectionLineType.SmoothStep}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#27272a"
          style={{ backgroundColor: "#0a0a0b" }}
        />
        <Controls
          showInteractive={false}
          className="!bg-card !border-border !rounded-lg !shadow-lg"
        />
      </ReactFlow>

      {/* FAB Button */}
      <button
        onClick={() => setServiceModalOpen(true)}
        className={cn(
          "absolute bottom-6 right-6 w-14 h-14 rounded-full",
          "bg-primary text-primary-foreground",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/30",
          "hover:bg-primary/90 hover:scale-105",
          "active:scale-95 transition-all duration-200",
          "z-20"
        )}
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Empty state */}
      {storeNodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/50 flex items-center justify-center">
              <Plus className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              Start building your infrastructure
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Click the + button to add Azure services to your canvas
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
