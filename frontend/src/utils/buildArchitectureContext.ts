import type { Node, Edge } from "@xyflow/react";

type CostData = {
    resourceId: string;
    cost: number;
    currency: string;
};

/**
 * Builds a comprehensive context about the current Azure architecture
 * for the Archy Agent to answer questions
 */
export function buildArchitectureContext(
    nodes: Node[],
    edges: Edge[],
    costsMap?: Map<string, CostData>,
    subscriptionName?: string
): string {
    if (nodes.length === 0) {
        return "No architecture loaded yet. Please select a subscription to analyze.";
    }

    // Separate Azure and external resources
    const azureResources = nodes.filter(n => {
        const data = n.data as { location?: string };
        return data?.location !== "External";
    });
    const externalServices = nodes.filter(n => {
        const data = n.data as { location?: string };
        return data?.location === "External";
    });

    // Group resources by type
    const resourcesByType = azureResources.reduce((acc, node) => {
        const data = node.data as { typeLabel?: string };
        const type = data?.typeLabel || "Unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(node);
        return acc;
    }, {} as Record<string, Node[]>);

    // Calculate total costs
    let totalCost = 0;
    const resourceCosts: Array<{ name: string; type: string; cost: number; currency: string }> = [];

    if (costsMap) {
        for (const node of azureResources) {
            const costData = costsMap.get(node.id);
            if (costData && costData.cost > 0) {
                const data = node.data as { name?: string; typeLabel?: string };
                resourceCosts.push({
                    name: data?.name || "Unknown",
                    type: data?.typeLabel || "Unknown",
                    cost: costData.cost,
                    currency: costData.currency
                });
                totalCost += costData.cost;
            }
        }
    }

    // Analyze connections
    const connectionsBySource = edges.reduce((acc, edge) => {
        if (!acc[edge.source]) acc[edge.source] = [];
        acc[edge.source].push(edge);
        return acc;
    }, {} as Record<string, Edge[]>);

    // Build context string
    let context = `# Current Azure Architecture Context\n\n`;

    if (subscriptionName) {
        context += `Subscription: ${subscriptionName}\n\n`;
    }

    // Summary
    context += `## Overview\n`;
    context += `- Total Azure Resources: ${azureResources.length}\n`;
    context += `- External Services: ${externalServices.length}\n`;
    context += `- Total Connections: ${edges.length}\n`;
    if (totalCost > 0) {
        const currency = resourceCosts[0]?.currency || "USD";
        context += `- Total Month-to-Date Cost: ${currency} $${totalCost.toFixed(2)}\n`;
    }
    context += `\n`;

    // Resource breakdown
    context += `## Azure Resources by Type\n`;
    for (const [type, resources] of Object.entries(resourcesByType)) {
        context += `\n### ${type} (${resources.length})\n`;
        for (const resource of resources) {
            const data = resource.data as { name?: string; location?: string; sku?: string };
            const costData = costsMap?.get(resource.id);
            const costStr = costData && costData.cost > 0
                ? ` | Cost: ${costData.currency} $${costData.cost.toFixed(2)}/month`
                : "";
            const location = data?.location ? ` | ${data.location}` : "";
            const sku = data?.sku ? ` | ${data.sku}` : "";

            context += `- ${data?.name || "Unknown"}${location}${sku}${costStr}\n`;
        }
    }

    // External services
    if (externalServices.length > 0) {
        context += `\n## External Services\n`;
        for (const service of externalServices) {
            const data = service.data as { name?: string; typeLabel?: string };
            context += `- ${data?.name || "Unknown"} (${data?.typeLabel || "Unknown"})\n`;
        }
    }

    // Connections/Dependencies
    context += `\n## Service Dependencies\n`;
    for (const node of nodes) {
        const connections = connectionsBySource[node.id];
        if (connections && connections.length > 0) {
            const nodeData = node.data as { name?: string };
            const nodeName = nodeData?.name || "Unknown";
            const targets = connections.map(edge => {
                const targetNode = nodes.find(n => n.id === edge.target);
                const targetData = targetNode?.data as { name?: string; location?: string };
                const targetName = targetData?.name || "Unknown";
                const isExternal = targetData?.location === "External";
                return `${targetName}${isExternal ? " (External)" : ""}`;
            });
            context += `- ${nodeName} → [${targets.join(", ")}]\n`;
        }
    }

    // Cost breakdown (top 5 most expensive)
    if (resourceCosts.length > 0) {
        const sortedCosts = [...resourceCosts].sort((a, b) => b.cost - a.cost).slice(0, 5);
        context += `\n## Top 5 Most Expensive Resources\n`;
        for (const item of sortedCosts) {
            context += `- ${item.name} (${item.type}): ${item.currency} $${item.cost.toFixed(2)}/month\n`;
        }
    }

    // Unused resources (no connections)
    const unusedResources = azureResources.filter(node => {
        const hasOutgoing = connectionsBySource[node.id]?.length > 0;
        const hasIncoming = edges.some(edge => edge.target === node.id);
        return !hasOutgoing && !hasIncoming;
    });

    if (unusedResources.length > 0) {
        context += `\n## Potentially Unused Resources (${unusedResources.length})\n`;
        for (const resource of unusedResources.slice(0, 10)) {
            const data = resource.data as { name?: string; typeLabel?: string };
            const costData = costsMap?.get(resource.id);
            const costStr = costData && costData.cost > 0
                ? ` | Costing ${costData.currency} $${costData.cost.toFixed(2)}/month`
                : "";
            context += `- ${data?.name || "Unknown"} (${data?.typeLabel || "Unknown"})${costStr}\n`;
        }
        if (unusedResources.length > 10) {
            context += `... and ${unusedResources.length - 10} more\n`;
        }
    }

    context += `\n---\n`;
    context += `Use this context to answer questions about the user's Azure infrastructure, costs, dependencies, and architecture.\n`;

    return context;
}
