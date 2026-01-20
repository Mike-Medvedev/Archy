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

const initialNodes: Node[] = [
];
const initialEdges: Edge[] = [];

interface CanvasState {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (params: Connection) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
}


const useCanvasStore = create<CanvasState>()((set) => ({
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