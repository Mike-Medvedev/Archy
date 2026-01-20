import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "../store";
import useCanvasStore from "../store";
import type { Node, Edge } from "@xyflow/react";
import {
    createMockCanonicalGraph,
    projectToServiceView,
    isServiceNode,
    isNetworkNode,
    SERVICE_NODE_ICONS,
    NETWORK_NODE_ICONS,
    type CanonicalNode,
    type CanonicalEdge,
    type CanonicalGraph,
    type NodeType,
} from "../lib/canonicalGraph";

// =============================================================================
// CONSTANTS
// =============================================================================

const VNET_PADDING = 40;
const SUBNET_PADDING = 30;
const SUBNET_HEADER_HEIGHT = 40;
const NODE_WIDTH = 200;
const NODE_HEIGHT = 90;
const NODE_GAP_X = 40;
const NODE_GAP_Y = 30;
const SUBNET_GAP = 30;
const VNET_GAP = 100;
const INFRA_NODE_OFFSET_X = 60;
const INFRA_NODE_GAP_Y = 120;

// =============================================================================
// GRAPH BUILDING UTILITIES
// =============================================================================

function getNodeIcon(type: NodeType): { label: string; color: string; iconDataUri: string } {
    if (isServiceNode(type)) {
        return SERVICE_NODE_ICONS[type] || SERVICE_NODE_ICONS.service;
    }
    if (isNetworkNode(type)) {
        return NETWORK_NODE_ICONS[type as keyof typeof NETWORK_NODE_ICONS];
    }
    return SERVICE_NODE_ICONS.service;
}

// Determine subnet type from name for coloring
function getSubnetType(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes("frontend") || lower.includes("web")) return "frontend";
    if (lower.includes("backend") || lower.includes("compute") || lower.includes("app")) return "backend";
    if (lower.includes("data")) return "data";
    return "default";
}

// =============================================================================
// HIERARCHICAL STRUCTURE BUILDING
// =============================================================================

interface HierarchyInfo {
    vnetToSubnets: Map<string, string[]>;           // vnetId -> subnetIds
    subnetToServices: Map<string, string[]>;        // subnetId -> serviceIds
    subnetToVnet: Map<string, string>;              // subnetId -> vnetId
    serviceToSubnet: Map<string, string>;           // serviceId -> subnetId
    subnetToNat: Map<string, string>;               // subnetId -> natId
    subnetToLb: Map<string, string>;                // subnetId -> lbId
    subnetToFirewall: Map<string, string>;          // subnetId -> firewallId
    natToPublicIp: Map<string, string>;             // natId -> publicIpId
    standaloneNodes: Set<string>;                   // nodes not in any hierarchy
    vnetIds: Set<string>;
    subnetIds: Set<string>;
}

function buildHierarchyInfo(graph: CanonicalGraph): HierarchyInfo {
    const vnetToSubnets = new Map<string, string[]>();
    const subnetToServices = new Map<string, string[]>();
    const subnetToVnet = new Map<string, string>();
    const serviceToSubnet = new Map<string, string>();
    const subnetToNat = new Map<string, string>();
    const subnetToLb = new Map<string, string>();
    const subnetToFirewall = new Map<string, string>();
    const natToPublicIp = new Map<string, string>();
    const vnetIds = new Set<string>();
    const subnetIds = new Set<string>();

    // Identify vnets and subnets
    for (const node of graph.nodes) {
        if (node.type === "vnet") vnetIds.add(node.id);
        if (node.type === "subnet") subnetIds.add(node.id);
    }

    // Build relationships from edges
    for (const edge of graph.edges) {
        switch (edge.type) {
            case "contains":
                // VNet contains Subnet
                if (vnetIds.has(edge.from) && subnetIds.has(edge.to)) {
                    if (!vnetToSubnets.has(edge.from)) vnetToSubnets.set(edge.from, []);
                    vnetToSubnets.get(edge.from)!.push(edge.to);
                    subnetToVnet.set(edge.to, edge.from);
                }
                break;
            case "runs_in":
                // Service runs in Subnet
                if (subnetIds.has(edge.to)) {
                    if (!subnetToServices.has(edge.to)) subnetToServices.set(edge.to, []);
                    subnetToServices.get(edge.to)!.push(edge.from);
                    serviceToSubnet.set(edge.from, edge.to);
                }
                break;
            case "routes_through":
                // Subnet routes through NAT
                if (subnetIds.has(edge.from)) {
                    subnetToNat.set(edge.from, edge.to);
                }
                break;
            case "ingress_via": {
                // Service ingresses via LB - find subnet
                const subnet = serviceToSubnet.get(edge.from);
                if (subnet) {
                    subnetToLb.set(subnet, edge.to);
                }
                break;
            }
            case "protected_by":
                // Subnet protected by Firewall
                if (subnetIds.has(edge.from)) {
                    subnetToFirewall.set(edge.from, edge.to);
                }
                break;
            case "egresses_via":
                // NAT egresses via Public IP
                natToPublicIp.set(edge.from, edge.to);
                break;
        }
    }

    // Find standalone nodes (not part of VNet hierarchy)
    const standaloneNodes = new Set<string>();
    const hierarchyNodes = new Set<string>();
    
    for (const vnetId of vnetIds) hierarchyNodes.add(vnetId);
    for (const subnetId of subnetIds) hierarchyNodes.add(subnetId);
    for (const serviceId of serviceToSubnet.keys()) hierarchyNodes.add(serviceId);
    
    for (const node of graph.nodes) {
        if (!hierarchyNodes.has(node.id)) {
            standaloneNodes.add(node.id);
        }
    }

    return {
        vnetToSubnets,
        subnetToServices,
        subnetToVnet,
        serviceToSubnet,
        subnetToNat,
        subnetToLb,
        subnetToFirewall,
        natToPublicIp,
        standaloneNodes,
        vnetIds,
        subnetIds,
    };
}

// =============================================================================
// HIERARCHICAL LAYOUT
// =============================================================================

interface LayoutResult {
    nodes: Node[];
    vnetSizes: Map<string, { width: number; height: number }>;
    subnetSizes: Map<string, { width: number; height: number }>;
}

function layoutHierarchically(
    graph: CanonicalGraph,
    hierarchy: HierarchyInfo,
    impactedNodeIds?: Set<string>
): LayoutResult {
    // IMPORTANT: React Flow requires parent nodes to come BEFORE children in the array
    // So we build: VNet nodes -> Subnet nodes -> Service nodes -> Infrastructure nodes -> Standalone nodes
    
    const vnetNodes: Node[] = [];
    const subnetNodes: Node[] = [];
    const serviceNodes: Node[] = [];
    const infraNodes: Node[] = [];
    const standaloneNodes: Node[] = [];
    
    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));
    const vnetSizes = new Map<string, { width: number; height: number }>();
    const subnetSizes = new Map<string, { width: number; height: number }>();
    
    let globalX = 0;
    const processedInfra = new Set<string>();

    // Process each VNet
    for (const vnetId of hierarchy.vnetIds) {
        const vnetNode = nodeMap.get(vnetId);
        if (!vnetNode) continue;

        const subnetIds = hierarchy.vnetToSubnets.get(vnetId) || [];
        let vnetWidth = 0;
        let vnetHeight = VNET_PADDING;
        let subnetX = VNET_PADDING;

        // First pass: calculate sizes and create subnet/service nodes
        for (const subnetId of subnetIds) {
            const subnetNode = nodeMap.get(subnetId);
            if (!subnetNode) continue;

            const serviceIds = hierarchy.subnetToServices.get(subnetId) || [];
            
            // Calculate subnet size based on services
            const cols = Math.max(1, Math.min(3, Math.ceil(Math.sqrt(serviceIds.length))));
            const rows = Math.ceil(serviceIds.length / cols);
            
            const subnetWidth = Math.max(
                NODE_WIDTH + SUBNET_PADDING * 2,
                cols * NODE_WIDTH + (cols - 1) * NODE_GAP_X + SUBNET_PADDING * 2
            );
            const subnetHeight = Math.max(
                NODE_HEIGHT + SUBNET_HEADER_HEIGHT + SUBNET_PADDING * 2,
                rows * NODE_HEIGHT + (rows - 1) * NODE_GAP_Y + SUBNET_HEADER_HEIGHT + SUBNET_PADDING * 2
            );
            
            subnetSizes.set(subnetId, { width: subnetWidth, height: subnetHeight });

            // Create subnet node
            subnetNodes.push({
                id: subnetId,
                type: "subnetGroup",
                position: { x: subnetX, y: VNET_PADDING },
                parentId: vnetId,
                extent: "parent",
                data: {
                    name: subnetNode.name,
                    subnetType: getSubnetType(subnetNode.name),
                    isImpacted: impactedNodeIds?.has(subnetId) ?? false,
                },
                style: {
                    width: subnetWidth,
                    height: subnetHeight,
                },
            });

            // Layout services within subnet
            let serviceX = SUBNET_PADDING;
            let serviceY = SUBNET_HEADER_HEIGHT + SUBNET_PADDING;
            let colIndex = 0;

            for (const serviceId of serviceIds) {
                const serviceNode = nodeMap.get(serviceId);
                if (!serviceNode) continue;

                const icon = getNodeIcon(serviceNode.type);
                
                serviceNodes.push({
                    id: serviceId,
                    type: "azureResource",
                    position: { x: serviceX, y: serviceY },
                    parentId: subnetId,
                    extent: "parent",
                    data: {
                        name: serviceNode.name,
                        resourceType: serviceNode.type,
                        typeLabel: icon.label,
                        location: serviceNode.environment === "prod" ? "Production" : "Staging",
                        iconDataUri: icon.iconDataUri,
                        isNetworkNode: false,
                        isImpacted: impactedNodeIds?.has(serviceId) ?? false,
                    },
                });

                colIndex++;
                if (colIndex >= cols) {
                    colIndex = 0;
                    serviceX = SUBNET_PADDING;
                    serviceY += NODE_HEIGHT + NODE_GAP_Y;
                } else {
                    serviceX += NODE_WIDTH + NODE_GAP_X;
                }
            }

            subnetX += subnetWidth + SUBNET_GAP;
            vnetWidth = Math.max(vnetWidth, subnetX);
            vnetHeight = Math.max(vnetHeight, VNET_PADDING + subnetHeight + VNET_PADDING);
        }

        vnetWidth = Math.max(vnetWidth + VNET_PADDING, 400);
        vnetSizes.set(vnetId, { width: vnetWidth, height: vnetHeight });

        // Create VNet node (added to vnetNodes array which comes FIRST)
        vnetNodes.push({
            id: vnetId,
            type: "vnetGroup",
            position: { x: globalX, y: 0 },
            data: {
                name: vnetNode.name,
                environment: vnetNode.environment,
                isImpacted: impactedNodeIds?.has(vnetId) ?? false,
            },
            style: {
                width: vnetWidth,
                height: vnetHeight,
            },
        });

        // Position infrastructure nodes (NAT, LB, Firewall) to the right of VNet
        let infraY = 0;
        const infraX = globalX + vnetWidth + INFRA_NODE_OFFSET_X;

        for (const subnetId of subnetIds) {
            // NAT Gateway
            const natId = hierarchy.subnetToNat.get(subnetId);
            if (natId && !processedInfra.has(natId)) {
                const natNode = nodeMap.get(natId);
                if (natNode) {
                    const icon = getNodeIcon(natNode.type);
                    infraNodes.push({
                        id: natId,
                        type: "networkResource",
                        position: { x: infraX, y: infraY },
                        data: {
                            name: natNode.name,
                            resourceType: natNode.type,
                            typeLabel: icon.label,
                            location: natNode.environment === "prod" ? "Production" : "Staging",
                            iconDataUri: icon.iconDataUri,
                            isNetworkNode: true,
                            isImpacted: impactedNodeIds?.has(natId) ?? false,
                        },
                    });
                    processedInfra.add(natId);
                    infraY += INFRA_NODE_GAP_Y;

                    // Public IP connected to NAT
                    const publicIpId = hierarchy.natToPublicIp.get(natId);
                    if (publicIpId && !processedInfra.has(publicIpId)) {
                        const publicIpNode = nodeMap.get(publicIpId);
                        if (publicIpNode) {
                            const pipIcon = getNodeIcon(publicIpNode.type);
                            infraNodes.push({
                                id: publicIpId,
                                type: "networkResource",
                                position: { x: infraX + NODE_WIDTH + NODE_GAP_X, y: infraY - INFRA_NODE_GAP_Y },
                                data: {
                                    name: publicIpNode.name,
                                    resourceType: publicIpNode.type,
                                    typeLabel: pipIcon.label,
                                    location: publicIpNode.environment === "prod" ? "Production" : "Staging",
                                    iconDataUri: pipIcon.iconDataUri,
                                    isNetworkNode: true,
                                    isImpacted: impactedNodeIds?.has(publicIpId) ?? false,
                                },
                            });
                            processedInfra.add(publicIpId);
                        }
                    }
                }
            }

            // Load Balancer
            const lbId = hierarchy.subnetToLb.get(subnetId);
            if (lbId && !processedInfra.has(lbId)) {
                const lbNode = nodeMap.get(lbId);
                if (lbNode) {
                    const icon = getNodeIcon(lbNode.type);
                    infraNodes.push({
                        id: lbId,
                        type: "networkResource",
                        position: { x: globalX - NODE_WIDTH - INFRA_NODE_OFFSET_X, y: infraY },
                        data: {
                            name: lbNode.name,
                            resourceType: lbNode.type,
                            typeLabel: icon.label,
                            location: lbNode.environment === "prod" ? "Production" : "Staging",
                            iconDataUri: icon.iconDataUri,
                            isNetworkNode: true,
                            isImpacted: impactedNodeIds?.has(lbId) ?? false,
                        },
                    });
                    processedInfra.add(lbId);
                    infraY += INFRA_NODE_GAP_Y;
                }
            }

            // Firewall
            const firewallId = hierarchy.subnetToFirewall.get(subnetId);
            if (firewallId && !processedInfra.has(firewallId)) {
                const firewallNode = nodeMap.get(firewallId);
                if (firewallNode) {
                    const icon = getNodeIcon(firewallNode.type);
                    infraNodes.push({
                        id: firewallId,
                        type: "networkResource",
                        position: { x: infraX, y: infraY },
                        data: {
                            name: firewallNode.name,
                            resourceType: firewallNode.type,
                            typeLabel: icon.label,
                            location: firewallNode.environment === "prod" ? "Production" : "Staging",
                            iconDataUri: icon.iconDataUri,
                            isNetworkNode: true,
                            isImpacted: impactedNodeIds?.has(firewallId) ?? false,
                        },
                    });
                    processedInfra.add(firewallId);
                    infraY += INFRA_NODE_GAP_Y;
                }
            }
        }

        globalX += vnetWidth + Math.max(processedInfra.size > 0 ? NODE_WIDTH * 2 + INFRA_NODE_OFFSET_X * 2 : 0, 0) + VNET_GAP;
    }

    // Layout standalone nodes (external services, etc.) below VNets
    const standaloneY = Math.max(...Array.from(vnetSizes.values()).map(s => s.height), 300) + 100;
    let standaloneX = 0;

    for (const nodeId of hierarchy.standaloneNodes) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const icon = getNodeIcon(node.type);
        standaloneNodes.push({
            id: nodeId,
            type: isNetworkNode(node.type) ? "networkResource" : "azureResource",
            position: { x: standaloneX, y: standaloneY },
            data: {
                name: node.name,
                resourceType: node.type,
                typeLabel: icon.label,
                location: node.environment === "prod" ? "Production" : "Staging",
                iconDataUri: icon.iconDataUri,
                isNetworkNode: isNetworkNode(node.type),
                isImpacted: impactedNodeIds?.has(nodeId) ?? false,
            },
        });

        standaloneX += NODE_WIDTH + NODE_GAP_X;
    }

    // CRITICAL: Combine in correct order - parents MUST come before children
    const nodes: Node[] = [
        ...vnetNodes,      // VNets first (top-level parents)
        ...subnetNodes,    // Subnets second (children of VNets, parents of services)
        ...serviceNodes,   // Services third (children of Subnets)
        ...infraNodes,     // Infrastructure nodes (no parent)
        ...standaloneNodes // Standalone nodes (no parent)
    ];

    return { nodes, vnetSizes, subnetSizes };
}

// =============================================================================
// FLAT LAYOUT (for service-only view)
// =============================================================================

function layoutFlat(
    canonicalNodes: CanonicalNode[],
    canonicalEdges: CanonicalEdge[],
    impactedNodeIds?: Set<string>
): Node[] {
    // Build nodes
    const nodes: Node[] = canonicalNodes.map((node) => {
        const icon = getNodeIcon(node.type);
        return {
            id: node.id,
            type: isNetworkNode(node.type) ? "networkResource" : "azureResource",
            position: { x: 0, y: 0 },
            data: {
                name: node.name,
                resourceType: node.type,
                typeLabel: icon.label,
                location: node.environment === "prod" ? "Production" : "Staging",
                iconDataUri: icon.iconDataUri,
                isNetworkNode: isNetworkNode(node.type),
                isImpacted: impactedNodeIds?.has(node.id) ?? false,
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

    // Find roots
    const roots = allNodeIds.filter(id => !hasIncoming.has(id));
    if (roots.length === 0 && allNodeIds.length > 0) {
        roots.push(allNodeIds[0]);
    }

    // BFS layout
    const positions = new Map<string, { x: number; y: number }>();
    const visited = new Set<string>();
    let currentLevel = roots;
    let y = 0;

    while (currentLevel.length > 0) {
        const nextLevel: string[] = [];
        const levelWidth = currentLevel.length * (NODE_WIDTH + NODE_GAP_X);
        let x = -levelWidth / 2;

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
        y += NODE_HEIGHT + NODE_GAP_Y + 50;
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
    impactedNodeIds?: Set<string>,
    showNetworkView?: boolean
): Edge[] {
    return canonicalEdges
        .filter(edge => {
            // Filter out edges for nodes not in view
            if (!visibleNodeIds.has(edge.from) || !visibleNodeIds.has(edge.to)) {
                return false;
            }
            // In hierarchical view, hide "runs_in" and "contains" edges (shown via nesting)
            if (showNetworkView && (edge.type === "runs_in" || edge.type === "contains")) {
                return false;
            }
            return true;
        })
        .map((edge) => {
            const isImpactedEdge = impactedNodeIds?.has(edge.from) && impactedNodeIds?.has(edge.to);
            
            return {
                id: edge.id,
                source: edge.from,
                target: edge.to,
                animated: edge.type === "depends_on",
                label: edge.type === "depends_on" ? undefined : edge.type.replace(/_/g, " "),
                labelStyle: { fontSize: 10, fill: "#64748b" },
                labelBgStyle: { fill: "white", fillOpacity: 0.8 },
                style: {
                    stroke: isImpactedEdge ? "#ef4444" : "#94a3b8",
                    strokeWidth: isImpactedEdge ? 2 : 1,
                },
                data: {
                    edgeType: edge.type,
                    isImpacted: isImpactedEdge,
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
    const showNetworkView = useCanvasStore((state) => state.showNetworkView);
    const blastRadiusResult = useCanvasStore((state) => state.blastRadiusResult);

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
            // Simulate 5 second scanning animation
            await new Promise(resolve => setTimeout(resolve, 5000));

            // Create canonical graph with all nodes (services + network)
            const canonicalGraph = createMockCanonicalGraph();
            
            return { canonicalGraph };
        },
    });

    // Update store when canonical graph is loaded
    useEffect(() => {
        if (!query.data) return;
        setCanonicalGraph(query.data.canonicalGraph);
    }, [query.data, setCanonicalGraph]);

    // Update displayed nodes/edges based on view mode and blast radius
    useEffect(() => {
        if (!query.data) return;
        
        const { canonicalGraph } = query.data;
        const impactedIds = blastRadiusResult?.impactedNodeIds;
        
        let nodes: Node[];
        let edges: Edge[];
        
        if (showNetworkView) {
            // Hierarchical network view with containers
            const hierarchy = buildHierarchyInfo(canonicalGraph);
            const layoutResult = layoutHierarchically(canonicalGraph, hierarchy, impactedIds);
            nodes = layoutResult.nodes;
            
            const visibleNodeIds = new Set(nodes.map(n => n.id));
            edges = buildEdges(canonicalGraph.edges, visibleNodeIds, impactedIds, true);
        } else {
            // Flat service-only view
            const projected = projectToServiceView(canonicalGraph);
            nodes = layoutFlat(projected.nodes, projected.edges, impactedIds);
            
            const visibleNodeIds = new Set(nodes.map(n => n.id));
            edges = buildEdges(projected.edges, visibleNodeIds, impactedIds, false);
        }
        
        setNodes(nodes);
        setEdges(edges);
    }, [query.data, showNetworkView, blastRadiusResult, setNodes, setEdges]);

    return query;
}
