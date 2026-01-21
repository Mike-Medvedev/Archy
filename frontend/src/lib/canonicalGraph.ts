// =============================================================================
// CANONICAL GRAPH MODEL - Cloud Cost Scanner
// Simplified infrastructure graph for cost leak detection
// =============================================================================

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

export type NodeType = "service" | "database" | "cache" | "queue" | "storage" | "vm" | "function";

export type LeakType = "zombie" | "underutilized" | "misconfigured" | "oversized";

export interface CostLeak {
    type: LeakType;
    monthlyLeak: number;      // $/month wasted
    description: string;      // e.g., "VM has <5% CPU for 30 days"
    remediation: string;      // e.g., "Delete unused resource"
    severity: "low" | "medium" | "high";
}

export interface CanonicalNode {
    id: string;
    name: string;
    type: NodeType;
    resourceType: string;     // Azure resource type for display
    monthlyCost: number;      // Total monthly cost
    leak?: CostLeak;          // If leaking money
}

export interface CanonicalEdge {
    id: string;
    from: string;
    to: string;
}

export interface CanonicalGraph {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
}

// -----------------------------------------------------------------------------
// NODE TYPE ICONS
// -----------------------------------------------------------------------------

export const NODE_ICONS: Record<NodeType, { label: string; color: string; iconDataUri: string }> = {
    service: {
        label: "App Service",
        color: "#10b981",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2310b981'/><path d='M20 20h24v8H20zm0 16h24v8H20z' fill='white'/><path d='M32 28v8' stroke='white' stroke-width='4'/></svg>",
    },
    database: {
        label: "Database",
        color: "#8b5cf6",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%238b5cf6'/><ellipse cx='32' cy='18' rx='16' ry='6' fill='white'/><path d='M16 18v28c0 3.3 7.2 6 16 6s16-2.7 16-6V18' fill='none' stroke='white' stroke-width='4'/><path d='M16 30c0 3.3 7.2 6 16 6s16-2.7 16-6' fill='none' stroke='white' stroke-width='2'/></svg>",
    },
    cache: {
        label: "Redis Cache",
        color: "#ef4444",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23ef4444'/><path d='M32 12l4 8h-8l4-8zm-12 16l8 4-8 4v-8zm24 0v8l-8-4 8-4zm-12 16l-4-8h8l-4 8z' fill='white'/><circle cx='32' cy='32' r='6' fill='white'/></svg>",
    },
    queue: {
        label: "Service Bus",
        color: "#06b6d4",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2306b6d4'/><rect x='14' y='18' width='12' height='28' rx='2' fill='white'/><rect x='30' y='18' width='12' height='28' rx='2' fill='white' opacity='0.7'/><rect x='46' y='18' width='6' height='28' rx='2' fill='white' opacity='0.4'/></svg>",
    },
    storage: {
        label: "Storage",
        color: "#f59e0b",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23f59e0b'/><rect x='14' y='14' width='36' height='10' rx='2' fill='white'/><rect x='14' y='27' width='36' height='10' rx='2' fill='white' opacity='0.8'/><rect x='14' y='40' width='36' height='10' rx='2' fill='white' opacity='0.6'/></svg>",
    },
    vm: {
        label: "Virtual Machine",
        color: "#0078d4",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><rect x='12' y='14' width='40' height='28' rx='2' fill='white'/><rect x='24' y='44' width='16' height='4' fill='white'/><rect x='20' y='48' width='24' height='4' rx='1' fill='white'/></svg>",
    },
    function: {
        label: "Function App",
        color: "#fbbf24",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23fbbf24'/><path d='M20 18l12 14-12 14' stroke='white' stroke-width='4' fill='none' stroke-linecap='round' stroke-linejoin='round'/><path d='M36 38h12' stroke='white' stroke-width='4' stroke-linecap='round'/></svg>",
    },
};

// -----------------------------------------------------------------------------
// LEAK TYPE LABELS
// -----------------------------------------------------------------------------

export const LEAK_TYPE_LABELS: Record<LeakType, { label: string; icon: string }> = {
    zombie: { label: "Zombie Resource", icon: "💀" },
    underutilized: { label: "Underutilized", icon: "📉" },
    misconfigured: { label: "Misconfigured", icon: "⚙️" },
    oversized: { label: "Oversized", icon: "📦" },
};

// -----------------------------------------------------------------------------
// MOCK CANONICAL GRAPH DATA - Simplified Web App Architecture
// -----------------------------------------------------------------------------

export function createMockCanonicalGraph(): CanonicalGraph {
    const nodes: CanonicalNode[] = [
        // API Gateway - healthy
        {
            id: "api-gateway",
            name: "API Gateway",
            type: "service",
            resourceType: "Microsoft.ApiManagement/service",
            monthlyCost: 150,
        },
        // Web App - underutilized
        {
            id: "web-app",
            name: "Web App",
            type: "service",
            resourceType: "Microsoft.Web/sites",
            monthlyCost: 280,
            leak: {
                type: "underutilized",
                monthlyLeak: 180,
                description: "Average CPU usage is only 8% over the last 30 days. This Premium P2v3 tier is significantly oversized for the current workload.",
                remediation: "Downgrade to Basic B1 tier or consider using consumption-based App Service plan.",
                severity: "high",
            },
        },
        // Background Worker - zombie
        {
            id: "worker-service",
            name: "Background Worker",
            type: "service",
            resourceType: "Microsoft.Web/sites",
            monthlyCost: 95,
            leak: {
                type: "zombie",
                monthlyLeak: 95,
                description: "No requests processed in the last 30 days. This worker appears to be abandoned from a previous deployment.",
                remediation: "Delete this resource if it's no longer needed, or investigate why it's not receiving traffic.",
                severity: "high",
            },
        },
        // SQL Database - oversized
        {
            id: "sql-database",
            name: "SQL Database",
            type: "database",
            resourceType: "Microsoft.Sql/servers/databases",
            monthlyCost: 450,
            leak: {
                type: "oversized",
                monthlyLeak: 320,
                description: "Premium P4 tier with only 3% DTU utilization. Database is massively over-provisioned for current query load.",
                remediation: "Downgrade to Standard S2 tier which would handle current load with room to grow.",
                severity: "high",
            },
        },
        // Redis Cache - healthy
        {
            id: "redis-cache",
            name: "Redis Cache",
            type: "cache",
            resourceType: "Microsoft.Cache/Redis",
            monthlyCost: 85,
        },
        // Storage Account - misconfigured
        {
            id: "storage-account",
            name: "Storage Account",
            type: "storage",
            resourceType: "Microsoft.Storage/storageAccounts",
            monthlyCost: 120,
            leak: {
                type: "misconfigured",
                monthlyLeak: 72,
                description: "Hot access tier is configured but 85% of data hasn't been accessed in 90+ days. Data should be in Cool or Archive tier.",
                remediation: "Enable lifecycle management policy to automatically move old data to Cool tier after 30 days.",
                severity: "medium",
            },
        },
        // Function App - healthy
        {
            id: "function-app",
            name: "Order Processor",
            type: "function",
            resourceType: "Microsoft.Web/sites",
            monthlyCost: 25,
        },
        // CosmosDB - underutilized
        {
            id: "cosmos-db",
            name: "CosmosDB",
            type: "database",
            resourceType: "Microsoft.DocumentDB/databaseAccounts",
            monthlyCost: 200,
            leak: {
                type: "underutilized",
                monthlyLeak: 140,
                description: "Provisioned 1000 RU/s but average consumption is only 45 RU/s. 95% of provisioned throughput is wasted.",
                remediation: "Switch to autoscale mode or reduce provisioned RU/s to 400 (minimum).",
                severity: "medium",
            },
        },
        // VM - zombie
        {
            id: "dev-vm",
            name: "Dev VM",
            type: "vm",
            resourceType: "Microsoft.Compute/virtualMachines",
            monthlyCost: 185,
            leak: {
                type: "zombie",
                monthlyLeak: 185,
                description: "VM is running but has zero network traffic and no SSH connections in 45 days. Likely forgotten development machine.",
                remediation: "Deallocate or delete this VM. Consider using Azure Dev Test Labs for development environments.",
                severity: "high",
            },
        },
    ];

    const edges: CanonicalEdge[] = [
        { id: "edge-1", from: "api-gateway", to: "web-app" },
        { id: "edge-2", from: "web-app", to: "sql-database" },
        { id: "edge-3", from: "web-app", to: "redis-cache" },
        { id: "edge-4", from: "web-app", to: "cosmos-db" },
        { id: "edge-5", from: "api-gateway", to: "function-app" },
        { id: "edge-6", from: "function-app", to: "storage-account" },
        { id: "edge-7", from: "worker-service", to: "sql-database" },
    ];

    return { nodes, edges };
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

export function getLeakingNodes(graph: CanonicalGraph): CanonicalNode[] {
    return graph.nodes.filter(node => node.leak !== undefined);
}

export function getTotalMonthlyLeak(graph: CanonicalGraph): number {
    return graph.nodes.reduce((total, node) => total + (node.leak?.monthlyLeak ?? 0), 0);
}

export function getTotalMonthlyCost(graph: CanonicalGraph): number {
    return graph.nodes.reduce((total, node) => total + node.monthlyCost, 0);
}

export function getLeaksBySeverity(graph: CanonicalGraph): Record<string, CanonicalNode[]> {
    const leaking = getLeakingNodes(graph);
    return {
        high: leaking.filter(n => n.leak?.severity === "high"),
        medium: leaking.filter(n => n.leak?.severity === "medium"),
        low: leaking.filter(n => n.leak?.severity === "low"),
    };
}
