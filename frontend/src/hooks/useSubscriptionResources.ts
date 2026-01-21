import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store";
import useCanvasStore from "../store";
import type { Node, Edge } from "@xyflow/react";
import {
    createMockCanonicalGraph,
    NODE_ICONS,
    getTotalMonthlyLeak,
    getTotalMonthlyCost,
    getLeakingNodes,
    type CanonicalNode,
    type CanonicalEdge,
    type NodeType,
} from "../lib/canonicalGraph";

// =============================================================================
// CONSTANTS
// =============================================================================

const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const NODE_GAP_X = 80;
const NODE_GAP_Y = 120;

// =============================================================================
// GRAPH BUILDING UTILITIES
// =============================================================================

function getNodeIcon(type: NodeType): { label: string; color: string; iconDataUri: string } {
    return NODE_ICONS[type] || NODE_ICONS.service;
}

// =============================================================================
// FLAT LAYOUT - Simple grid layout for cost scanner view
// =============================================================================

function layoutFlat(
    canonicalNodes: CanonicalNode[],
    canonicalEdges: CanonicalEdge[]
): Node[] {
    // Build nodes
    const nodes: Node[] = canonicalNodes.map((node) => {
        const icon = getNodeIcon(node.type);
        return {
            id: node.id,
            type: "azureResource",
            position: { x: 0, y: 0 },
            data: {
                name: node.name,
                resourceType: node.resourceType,
                typeLabel: icon.label,
                iconDataUri: icon.iconDataUri,
                monthlyCost: node.monthlyCost,
                isLeaking: !!node.leak,
                leakAmount: node.leak?.monthlyLeak,
                leak: node.leak,
            },
        };
    });

    // Build edges for layout
    const edges: Edge[] = canonicalEdges.map((edge) => ({
        id: edge.id,
        source: edge.from,
        target: edge.to,
    }));

    // Apply simple hierarchical layout
    return positionNodesFlat(nodes, edges);
}

function positionNodesFlat(nodes: Node[], edges: Edge[]): Node[] {
    const allNodeIds = nodes.map(n => n.id);
    
    // Build adjacency
    const hasIncoming = new Set<string>();
    const adjacency = new Map<string, string[]>();
    
    for (const id of allNodeIds) {
        adjacency.set(id, []);
    }
    for (const edge of edges) {
        adjacency.get(edge.source)?.push(edge.target);
        hasIncoming.add(edge.target);
    }

    // Find roots (nodes with no incoming edges)
    const roots = allNodeIds.filter(id => !hasIncoming.has(id));
    if (roots.length === 0 && allNodeIds.length > 0) {
        roots.push(allNodeIds[0]);
    }

    // BFS layout - position nodes level by level
    const positions = new Map<string, { x: number; y: number }>();
    const visited = new Set<string>();
    let currentLevel = roots;
    let y = 0;

    while (currentLevel.length > 0) {
        const nextLevel: string[] = [];
        const levelWidth = currentLevel.length * (NODE_WIDTH + NODE_GAP_X);
        let x = -levelWidth / 2 + (NODE_WIDTH + NODE_GAP_X) / 2;

        for (const nodeId of currentLevel) {
            if (!visited.has(nodeId)) {
                positions.set(nodeId, { x, y });
                visited.add(nodeId);

                const children = adjacency.get(nodeId) ?? [];
                for (const child of children) {
                    if (!visited.has(child)) {
                        nextLevel.push(child);
                    }
                }
            }
            x += NODE_WIDTH + NODE_GAP_X;
        }

        currentLevel = [...new Set(nextLevel)];
        y += NODE_HEIGHT + NODE_GAP_Y;
    }

    // Position any unvisited nodes (disconnected)
    let disconnectedX = 0;
    const maxY = y;
    for (const node of nodes) {
        if (!visited.has(node.id)) {
            positions.set(node.id, { x: disconnectedX, y: maxY });
            disconnectedX += NODE_WIDTH + NODE_GAP_X;
        }
    }

    return nodes.map(node => {
        const position = positions.get(node.id);
        return position ? { ...node, position } : node;
    });
}

// =============================================================================
// EDGE BUILDING
// =============================================================================

function buildEdges(
    canonicalEdges: CanonicalEdge[],
    visibleNodeIds: Set<string>,
    leakingNodeIds: Set<string>
): Edge[] {
    return canonicalEdges
        .filter(edge => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to))
        .map((edge) => {
            // Highlight edges connected to leaking nodes
            const isLeakingEdge = leakingNodeIds.has(edge.from) || leakingNodeIds.has(edge.to);
            
            return {
                id: edge.id,
                source: edge.from,
                target: edge.to,
                animated: true,
                style: {
                    stroke: isLeakingEdge ? "#f87171" : "#94a3b8",
                    strokeWidth: isLeakingEdge ? 2 : 1,
                },
            };
        });
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export default function useSubscriptionResources() {
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId
    );
    const setNodes = useCanvasStore((state) => state.setNodes);
    const setEdges = useCanvasStore((state) => state.setEdges);
    const setCanonicalGraph = useCanvasStore((state) => state.setCanonicalGraph);
    const setScanComplete = useCanvasStore((state) => state.setScanComplete);
    const setLeakingSummary = useCanvasStore((state) => state.setLeakingSummary);

    const queryKey = useMemo(
        () => ["subscriptionResources", "mock", selectedSubscriptionId],
        [selectedSubscriptionId]
    );

    const query = useQuery({
        queryKey,
        enabled: Boolean(selectedSubscriptionId),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        queryFn: async () => {
            // Reset scan state
            setScanComplete(false);
            setLeakingSummary(null);

            // Simulate 5 second scanning animation
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Create canonical graph with mock data
            const canonicalGraph = createMockCanonicalGraph();
            
            return { canonicalGraph };
        },
    });

    // Update store when canonical graph is loaded
    useEffect(() => {
        if (!query.data) return;
        
        const { canonicalGraph } = query.data;
        setCanonicalGraph(canonicalGraph);
        
        // Calculate leak summary
        const leakingNodes = getLeakingNodes(canonicalGraph);
        const totalMonthlyLeak = getTotalMonthlyLeak(canonicalGraph);
        const totalMonthlyCost = getTotalMonthlyCost(canonicalGraph);
        
        setLeakingSummary({
            totalMonthlyLeak,
            leakingCount: leakingNodes.length,
            totalMonthlyCost,
            totalResources: canonicalGraph.nodes.length,
        });
        
        setScanComplete(true);
    }, [query.data, setCanonicalGraph, setLeakingSummary, setScanComplete]);

    // Update displayed nodes/edges when data changes
    useEffect(() => {
        if (!query.data) return;
        
        const { canonicalGraph } = query.data;
        
        // Layout all nodes
        const nodes = layoutFlat(canonicalGraph.nodes, canonicalGraph.edges);
        
        // Build edges with leak highlighting
        const visibleNodeIds = new Set(nodes.map(n => n.id));
        const leakingNodeIds = new Set(
            canonicalGraph.nodes
                .filter(n => n.leak)
                .map(n => n.id)
        );
        const edges = buildEdges(canonicalGraph.edges, visibleNodeIds, leakingNodeIds);
        
        setNodes(nodes);
        setEdges(edges);
    }, [query.data, setNodes, setEdges]);

    return query;
}
