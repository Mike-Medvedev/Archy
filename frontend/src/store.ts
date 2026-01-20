import { create } from 'zustand';
import {
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    type Connection,
    type EdgeChange,
    type NodeChange,
    type Edge,
    type Node,
} from '@xyflow/react';
import type { CanonicalGraph, BlastRadiusResult } from './lib/canonicalGraph';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

interface CanvasState {
    // React Flow state
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (params: Connection) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;

    // Canonical graph (internal, complete)
    canonicalGraph: CanonicalGraph | null;
    setCanonicalGraph: (graph: CanonicalGraph) => void;

    // View mode
    showNetworkView: boolean;
    toggleNetworkView: () => void;

    // Blast radius state
    selectedBlastScenarioId: string | null;
    blastRadiusResult: BlastRadiusResult | null;
    setBlastScenario: (scenarioId: string | null, result: BlastRadiusResult | null) => void;
    clearBlastRadius: () => void;
}

const useCanvasStore = create<CanvasState>()((set) => ({
    // React Flow state
    nodes: initialNodes,
    edges: initialEdges,
    onNodesChange: (changes) =>
        set((state) => ({
            nodes: applyNodeChanges(changes, state.nodes),
        })),
    onEdgesChange: (changes) =>
        set((state) => ({
            edges: applyEdgeChanges(changes, state.edges),
        })),
    onConnect: (params) =>
        set((state) => ({
            edges: addEdge(params, state.edges),
        })),
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    // Canonical graph
    canonicalGraph: null,
    setCanonicalGraph: (graph) => set({ canonicalGraph: graph }),

    // View mode
    showNetworkView: false,
    toggleNetworkView: () => set((state) => ({ showNetworkView: !state.showNetworkView })),

    // Blast radius state
    selectedBlastScenarioId: null,
    blastRadiusResult: null,
    setBlastScenario: (scenarioId, result) => set({
        selectedBlastScenarioId: scenarioId,
        blastRadiusResult: result
    }),
    clearBlastRadius: () => set({
        selectedBlastScenarioId: null,
        blastRadiusResult: null
    }),
}));

export type AzureSubscription = {
    subscriptionId: string;
    displayName: string;
};

interface AppState {
    subscriptions: AzureSubscription[];
    selectedSubscriptionId: string | null;
    setSubscriptions: (subscriptions: AzureSubscription[]) => void;
    setSelectedSubscriptionId: (subscriptionId: string | null) => void;
}

export const useAppStore = create<AppState>()((set) => ({
    subscriptions: [],
    selectedSubscriptionId: null,
    setSubscriptions: (subscriptions) => set({ subscriptions }),
    setSelectedSubscriptionId: (subscriptionId) =>
        set({ selectedSubscriptionId: subscriptionId }),
}));

export default useCanvasStore;