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
import type { CanonicalGraph } from './lib/canonicalGraph';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export interface LeakingSummary {
    totalMonthlyLeak: number;
    leakingCount: number;
    totalMonthlyCost: number;
    totalResources: number;
}

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

    // Scan state
    scanComplete: boolean;
    setScanComplete: (complete: boolean) => void;

    // Leak summary
    leakingSummary: LeakingSummary | null;
    setLeakingSummary: (summary: LeakingSummary | null) => void;

    // Report modal
    showReport: boolean;
    toggleReport: () => void;
    setShowReport: (show: boolean) => void;
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

    // Scan state
    scanComplete: false,
    setScanComplete: (complete) => set({ scanComplete: complete }),

    // Leak summary
    leakingSummary: null,
    setLeakingSummary: (summary) => set({ leakingSummary: summary }),

    // Report modal
    showReport: false,
    toggleReport: () => set((state) => ({ showReport: !state.showReport })),
    setShowReport: (show) => set({ showReport: show }),
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
