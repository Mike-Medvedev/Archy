// =============================================================================
// CANONICAL GRAPH MODEL
// Complete infrastructure graph with network nodes
// =============================================================================

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

export type ServiceNodeType = "service" | "database" | "cache" | "queue" | "external";
export type NetworkNodeType = "vnet" | "subnet" | "nat_gateway" | "load_balancer" | "firewall" | "public_ip";
export type NodeType = ServiceNodeType | NetworkNodeType;

export type EdgeType =
    | "depends_on"      // Service → Service/DB/External
    | "runs_in"         // Service → Subnet
    | "routes_through"  // Subnet → NAT Gateway
    | "egresses_via"    // NAT Gateway → Public IP
    | "ingress_via"     // Service → Load Balancer
    | "protected_by"    // Subnet → Firewall
    | "contains";       // VNet → Subnet

export type Environment = "prod" | "staging";

export interface CanonicalNode {
    id: string;
    name: string;
    type: NodeType;
    environment?: Environment;
}

export interface CanonicalEdge {
    id: string;
    from: string;
    to: string;
    type: EdgeType;
}

export interface CanonicalGraph {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
}

// -----------------------------------------------------------------------------
// BLAST RADIUS TYPES
// -----------------------------------------------------------------------------

export interface BlastScenario {
    id: string;
    name: string;
    description: string;
    startNodeId: string;
    icon: string;
}

export interface BlastRadiusResult {
    impactedNodeIds: Set<string>;
    paths: Map<string, string[]>; // nodeId → path from start
    explanations: Map<string, string>; // nodeId → why impacted
}

// -----------------------------------------------------------------------------
// SERVICE NODE TYPES (for UI icons)
// -----------------------------------------------------------------------------

export const SERVICE_NODE_ICONS: Record<string, { label: string; color: string; iconDataUri: string }> = {
    service: {
        label: "Service",
        color: "#10b981",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2310b981'/><path d='M20 20h24v8H20zm0 16h24v8H20z' fill='white'/><path d='M32 28v8' stroke='white' stroke-width='4'/></svg>",
    },
    database: {
        label: "Database",
        color: "#8b5cf6",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%238b5cf6'/><ellipse cx='32' cy='18' rx='16' ry='6' fill='white'/><path d='M16 18v28c0 3.3 7.2 6 16 6s16-2.7 16-6V18' fill='none' stroke='white' stroke-width='4'/><path d='M16 30c0 3.3 7.2 6 16 6s16-2.7 16-6' fill='none' stroke='white' stroke-width='2'/></svg>",
    },
    cache: {
        label: "Cache",
        color: "#ef4444",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23ef4444'/><path d='M32 12l4 8h-8l4-8zm-12 16l8 4-8 4v-8zm24 0v8l-8-4 8-4zm-12 16l-4-8h8l-4 8z' fill='white'/><circle cx='32' cy='32' r='6' fill='white'/></svg>",
    },
    queue: {
        label: "Queue",
        color: "#06b6d4",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2306b6d4'/><rect x='14' y='18' width='12' height='28' rx='2' fill='white'/><rect x='30' y='18' width='12' height='28' rx='2' fill='white' opacity='0.7'/><rect x='46' y='18' width='6' height='28' rx='2' fill='white' opacity='0.4'/></svg>",
    },
    external: {
        label: "External",
        color: "#64748b",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2364748b'/><circle cx='32' cy='32' r='14' fill='none' stroke='white' stroke-width='4'/><path d='M32 18v-6m0 40v-6m14-14h6m-40 0h6' stroke='white' stroke-width='4'/></svg>",
    },
};

export const NETWORK_NODE_ICONS: Record<NetworkNodeType, { label: string; color: string; iconDataUri: string }> = {
    vnet: {
        label: "VNet",
        color: "#0ea5e9",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230ea5e9'/><rect x='12' y='12' width='40' height='40' rx='4' fill='none' stroke='white' stroke-width='3' stroke-dasharray='6,3'/><circle cx='20' cy='20' r='4' fill='white'/><circle cx='44' cy='20' r='4' fill='white'/><circle cx='32' cy='44' r='4' fill='white'/><path d='M20 20L44 20M20 20L32 44M44 20L32 44' stroke='white' stroke-width='2'/></svg>",
    },
    subnet: {
        label: "Subnet",
        color: "#38bdf8",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2338bdf8'/><rect x='14' y='14' width='36' height='36' rx='2' fill='none' stroke='white' stroke-width='3'/><path d='M14 28h36M14 42h36M28 14v36M42 14v36' stroke='white' stroke-width='1' opacity='0.5'/></svg>",
    },
    nat_gateway: {
        label: "NAT Gateway",
        color: "#a855f7",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23a855f7'/><path d='M16 32h12M36 32h12M28 24v16M36 24v16' stroke='white' stroke-width='4'/><path d='M28 32l8-8v16l-8-8' fill='white'/></svg>",
    },
    load_balancer: {
        label: "Load Balancer",
        color: "#22c55e",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%2322c55e'/><circle cx='32' cy='18' r='6' fill='white'/><circle cx='20' cy='46' r='6' fill='white'/><circle cx='44' cy='46' r='6' fill='white'/><path d='M32 24v10M26 34l-6 12M38 34l6 12' stroke='white' stroke-width='3'/></svg>",
    },
    firewall: {
        label: "Firewall",
        color: "#f97316",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23f97316'/><rect x='12' y='16' width='40' height='32' rx='2' fill='none' stroke='white' stroke-width='3'/><path d='M12 28h40M24 16v32M40 16v32' stroke='white' stroke-width='2'/><circle cx='32' cy='38' r='6' fill='white'/></svg>",
    },
    public_ip: {
        label: "Public IP",
        color: "#ec4899",
        iconDataUri: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23ec4899'/><circle cx='32' cy='32' r='16' fill='none' stroke='white' stroke-width='3'/><ellipse cx='32' cy='32' rx='8' ry='16' fill='none' stroke='white' stroke-width='2'/><path d='M16 32h32' stroke='white' stroke-width='2'/></svg>",
    },
};

// -----------------------------------------------------------------------------
// MOCK CANONICAL GRAPH DATA
// -----------------------------------------------------------------------------

export function createMockCanonicalGraph(): CanonicalGraph {
    const nodes: CanonicalNode[] = [];
    const edges: CanonicalEdge[] = [];
    let edgeId = 0;

    const addEdge = (from: string, to: string, type: EdgeType) => {
        edges.push({ id: `edge-${edgeId++}`, from, to, type });
    };

    // =========================================================================
    // E-COMMERCE PLATFORM (PROD)
    // =========================================================================

    // Network Infrastructure
    nodes.push(
        { id: "ecom-vnet", name: "E-Commerce VNet", type: "vnet", environment: "prod" },
        { id: "ecom-subnet-frontend", name: "Frontend Subnet", type: "subnet", environment: "prod" },
        { id: "ecom-subnet-backend", name: "Backend Subnet", type: "subnet", environment: "prod" },
        { id: "ecom-subnet-data", name: "Data Subnet", type: "subnet", environment: "prod" },
        { id: "ecom-nat", name: "E-Commerce NAT", type: "nat_gateway", environment: "prod" },
        { id: "ecom-lb", name: "E-Commerce LB", type: "load_balancer", environment: "prod" },
        { id: "ecom-firewall", name: "E-Commerce Firewall", type: "firewall", environment: "prod" },
        { id: "ecom-public-ip", name: "E-Commerce Public IP", type: "public_ip", environment: "prod" },
        { id: "public-internet", name: "Public Internet", type: "external", environment: "prod" },
    );

    // VNet contains subnets
    addEdge("ecom-vnet", "ecom-subnet-frontend", "contains");
    addEdge("ecom-vnet", "ecom-subnet-backend", "contains");
    addEdge("ecom-vnet", "ecom-subnet-data", "contains");

    // Subnet routing
    addEdge("ecom-subnet-backend", "ecom-nat", "routes_through");
    addEdge("ecom-subnet-backend", "ecom-firewall", "protected_by");
    addEdge("ecom-nat", "ecom-public-ip", "egresses_via");
    addEdge("ecom-public-ip", "public-internet", "depends_on");

    // Services
    nodes.push(
        { id: "ecom-frontend", name: "Web Store", type: "service", environment: "prod" },
        { id: "ecom-api-gateway", name: "API Gateway", type: "service", environment: "prod" },
        { id: "ecom-auth-api", name: "Auth Service", type: "service", environment: "prod" },
        { id: "ecom-products-api", name: "Products API", type: "service", environment: "prod" },
        { id: "ecom-orders-api", name: "Orders API", type: "service", environment: "prod" },
        { id: "ecom-worker", name: "Order Processor", type: "service", environment: "prod" },
    );

    // Data stores
    nodes.push(
        { id: "ecom-db-users", name: "Users Database", type: "database", environment: "prod" },
        { id: "ecom-db-products", name: "Products Database", type: "database", environment: "prod" },
        { id: "ecom-db-orders", name: "Orders Database", type: "database", environment: "prod" },
        { id: "ecom-cache", name: "Redis Cache", type: "cache", environment: "prod" },
        { id: "ecom-queue", name: "Order Queue", type: "queue", environment: "prod" },
        { id: "ecom-stripe", name: "Stripe API", type: "external", environment: "prod" },
    );

    // Services run in subnets
    addEdge("ecom-frontend", "ecom-subnet-frontend", "runs_in");
    addEdge("ecom-frontend", "ecom-lb", "ingress_via");
    addEdge("ecom-api-gateway", "ecom-subnet-backend", "runs_in");
    addEdge("ecom-auth-api", "ecom-subnet-backend", "runs_in");
    addEdge("ecom-products-api", "ecom-subnet-backend", "runs_in");
    addEdge("ecom-orders-api", "ecom-subnet-backend", "runs_in");
    addEdge("ecom-worker", "ecom-subnet-backend", "runs_in");

    // Data stores in data subnet
    addEdge("ecom-db-users", "ecom-subnet-data", "runs_in");
    addEdge("ecom-db-products", "ecom-subnet-data", "runs_in");
    addEdge("ecom-db-orders", "ecom-subnet-data", "runs_in");
    addEdge("ecom-cache", "ecom-subnet-data", "runs_in");
    addEdge("ecom-queue", "ecom-subnet-data", "runs_in");

    // Service dependencies (intent edges)
    addEdge("ecom-frontend", "ecom-api-gateway", "depends_on");
    addEdge("ecom-api-gateway", "ecom-auth-api", "depends_on");
    addEdge("ecom-api-gateway", "ecom-products-api", "depends_on");
    addEdge("ecom-api-gateway", "ecom-orders-api", "depends_on");
    addEdge("ecom-auth-api", "ecom-db-users", "depends_on");
    addEdge("ecom-auth-api", "ecom-cache", "depends_on");
    addEdge("ecom-products-api", "ecom-db-products", "depends_on");
    addEdge("ecom-products-api", "ecom-cache", "depends_on");
    addEdge("ecom-orders-api", "ecom-db-orders", "depends_on");
    addEdge("ecom-orders-api", "ecom-queue", "depends_on");
    addEdge("ecom-orders-api", "ecom-stripe", "depends_on");
    addEdge("ecom-worker", "ecom-queue", "depends_on");
    addEdge("ecom-worker", "ecom-db-orders", "depends_on");

    // =========================================================================
    // SAAS ANALYTICS PLATFORM (PROD)
    // =========================================================================

    // Network Infrastructure
    nodes.push(
        { id: "saas-vnet", name: "Analytics VNet", type: "vnet", environment: "prod" },
        { id: "saas-subnet-web", name: "Web Subnet", type: "subnet", environment: "prod" },
        { id: "saas-subnet-compute", name: "Compute Subnet", type: "subnet", environment: "prod" },
        { id: "saas-subnet-data", name: "Data Subnet", type: "subnet", environment: "prod" },
        { id: "saas-nat", name: "Analytics NAT", type: "nat_gateway", environment: "prod" },
        { id: "saas-lb", name: "Analytics LB", type: "load_balancer", environment: "prod" },
        { id: "saas-public-ip", name: "Analytics Public IP", type: "public_ip", environment: "prod" },
    );

    // VNet contains subnets
    addEdge("saas-vnet", "saas-subnet-web", "contains");
    addEdge("saas-vnet", "saas-subnet-compute", "contains");
    addEdge("saas-vnet", "saas-subnet-data", "contains");

    // Subnet routing
    addEdge("saas-subnet-compute", "saas-nat", "routes_through");
    addEdge("saas-nat", "saas-public-ip", "egresses_via");
    addEdge("saas-public-ip", "public-internet", "depends_on");

    // Services
    nodes.push(
        { id: "saas-dashboard", name: "Analytics Dashboard", type: "service", environment: "prod" },
        { id: "saas-api", name: "Analytics API", type: "service", environment: "prod" },
        { id: "saas-ingest-api", name: "Data Ingestion API", type: "service", environment: "prod" },
        { id: "saas-etl-worker", name: "ETL Worker", type: "service", environment: "prod" },
        { id: "saas-report-worker", name: "Report Generator", type: "service", environment: "prod" },
    );

    // Data stores
    nodes.push(
        { id: "saas-timeseries-db", name: "TimeSeries DB", type: "database", environment: "prod" },
        { id: "saas-metadata-db", name: "Metadata Store", type: "database", environment: "prod" },
        { id: "saas-query-cache", name: "Query Cache", type: "cache", environment: "prod" },
        { id: "saas-event-queue", name: "Event Queue", type: "queue", environment: "prod" },
        { id: "saas-sendgrid", name: "SendGrid", type: "external", environment: "prod" },
    );

    // Services run in subnets
    addEdge("saas-dashboard", "saas-subnet-web", "runs_in");
    addEdge("saas-dashboard", "saas-lb", "ingress_via");
    addEdge("saas-api", "saas-subnet-compute", "runs_in");
    addEdge("saas-ingest-api", "saas-subnet-compute", "runs_in");
    addEdge("saas-etl-worker", "saas-subnet-compute", "runs_in");
    addEdge("saas-report-worker", "saas-subnet-compute", "runs_in");

    // Data stores in data subnet
    addEdge("saas-timeseries-db", "saas-subnet-data", "runs_in");
    addEdge("saas-metadata-db", "saas-subnet-data", "runs_in");
    addEdge("saas-query-cache", "saas-subnet-data", "runs_in");
    addEdge("saas-event-queue", "saas-subnet-data", "runs_in");

    // Service dependencies
    addEdge("saas-dashboard", "saas-api", "depends_on");
    addEdge("saas-api", "saas-timeseries-db", "depends_on");
    addEdge("saas-api", "saas-metadata-db", "depends_on");
    addEdge("saas-api", "saas-query-cache", "depends_on");
    addEdge("saas-ingest-api", "saas-event-queue", "depends_on");
    addEdge("saas-etl-worker", "saas-event-queue", "depends_on");
    addEdge("saas-etl-worker", "saas-timeseries-db", "depends_on");
    addEdge("saas-report-worker", "saas-timeseries-db", "depends_on");
    addEdge("saas-report-worker", "saas-sendgrid", "depends_on");

    // =========================================================================
    // CHAT APPLICATION (STAGING)
    // =========================================================================

    // Network Infrastructure
    nodes.push(
        { id: "chat-vnet", name: "Chat VNet", type: "vnet", environment: "staging" },
        { id: "chat-subnet-app", name: "App Subnet", type: "subnet", environment: "staging" },
        { id: "chat-subnet-data", name: "Data Subnet", type: "subnet", environment: "staging" },
        { id: "chat-nat", name: "Chat NAT", type: "nat_gateway", environment: "staging" },
        { id: "chat-lb", name: "Chat LB", type: "load_balancer", environment: "staging" },
        { id: "chat-public-ip", name: "Chat Public IP", type: "public_ip", environment: "staging" },
    );

    // VNet contains subnets
    addEdge("chat-vnet", "chat-subnet-app", "contains");
    addEdge("chat-vnet", "chat-subnet-data", "contains");

    // Subnet routing
    addEdge("chat-subnet-app", "chat-nat", "routes_through");
    addEdge("chat-nat", "chat-public-ip", "egresses_via");
    addEdge("chat-public-ip", "public-internet", "depends_on");

    // Services
    nodes.push(
        { id: "chat-web", name: "Chat Web App", type: "service", environment: "staging" },
        { id: "chat-api", name: "Chat API", type: "service", environment: "staging" },
        { id: "chat-presence-api", name: "Presence Service", type: "service", environment: "staging" },
        { id: "chat-notification-worker", name: "Push Notifier", type: "service", environment: "staging" },
    );

    // Data stores
    nodes.push(
        { id: "chat-messages-db", name: "Messages DB", type: "database", environment: "staging" },
        { id: "chat-presence-cache", name: "Presence Cache", type: "cache", environment: "staging" },
        { id: "chat-notification-queue", name: "Notification Queue", type: "queue", environment: "staging" },
        { id: "chat-firebase", name: "Firebase FCM", type: "external", environment: "staging" },
    );

    // Services run in subnets
    addEdge("chat-web", "chat-subnet-app", "runs_in");
    addEdge("chat-web", "chat-lb", "ingress_via");
    addEdge("chat-api", "chat-subnet-app", "runs_in");
    addEdge("chat-presence-api", "chat-subnet-app", "runs_in");
    addEdge("chat-notification-worker", "chat-subnet-app", "runs_in");

    // Data stores in data subnet
    addEdge("chat-messages-db", "chat-subnet-data", "runs_in");
    addEdge("chat-presence-cache", "chat-subnet-data", "runs_in");
    addEdge("chat-notification-queue", "chat-subnet-data", "runs_in");

    // Service dependencies
    addEdge("chat-web", "chat-api", "depends_on");
    addEdge("chat-web", "chat-presence-api", "depends_on");
    addEdge("chat-api", "chat-messages-db", "depends_on");
    addEdge("chat-api", "chat-notification-queue", "depends_on");
    addEdge("chat-presence-api", "chat-presence-cache", "depends_on");
    addEdge("chat-notification-worker", "chat-notification-queue", "depends_on");
    addEdge("chat-notification-worker", "chat-firebase", "depends_on");

    return { nodes, edges };
}

// -----------------------------------------------------------------------------
// BLAST SCENARIOS
// -----------------------------------------------------------------------------

export const BLAST_SCENARIOS: BlastScenario[] = [
    {
        id: "ecom-nat-ip-change",
        name: "E-Commerce NAT IP Change",
        description: "Outbound IP address of the E-Commerce NAT Gateway changes",
        startNodeId: "ecom-nat",
        icon: "🔄",
    },
    {
        id: "ecom-firewall-restrict",
        name: "E-Commerce Firewall Restricted",
        description: "Outbound firewall rules restricted on E-Commerce subnet",
        startNodeId: "ecom-firewall",
        icon: "🛡️",
    },
    {
        id: "ecom-lb-misconfiguration",
        name: "E-Commerce LB Misconfiguration",
        description: "Load balancer health check configuration error",
        startNodeId: "ecom-lb",
        icon: "⚖️",
    },
    {
        id: "saas-nat-ip-change",
        name: "Analytics NAT IP Change",
        description: "Outbound IP address of the Analytics NAT Gateway changes",
        startNodeId: "saas-nat",
        icon: "🔄",
    },
    {
        id: "chat-nat-ip-change",
        name: "Chat NAT IP Change",
        description: "Outbound IP address of the Chat NAT Gateway changes",
        startNodeId: "chat-nat",
        icon: "🔄",
    },
];

// -----------------------------------------------------------------------------
// BLAST RADIUS COMPUTATION
// -----------------------------------------------------------------------------

export function computeBlastRadius(
    graph: CanonicalGraph,
    startNodeId: string
): BlastRadiusResult {
    const impactedNodeIds = new Set<string>();
    const paths = new Map<string, string[]>();
    const explanations = new Map<string, string>();

    const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

    // Build reverse adjacency for backward traversal
    // We want: if NAT changes, what services are affected?
    // Services → Subnet → NAT, so we traverse backward
    const forwardEdges = new Map<string, CanonicalEdge[]>();
    const reverseEdges = new Map<string, CanonicalEdge[]>();

    for (const edge of graph.edges) {
        if (!forwardEdges.has(edge.from)) forwardEdges.set(edge.from, []);
        if (!reverseEdges.has(edge.to)) reverseEdges.set(edge.to, []);
        forwardEdges.get(edge.from)!.push(edge);
        reverseEdges.get(edge.to)!.push(edge);
    }

    const startNode = nodeMap.get(startNodeId);
    if (!startNode) return { impactedNodeIds, paths, explanations };

    // BFS to find all impacted nodes
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[]; explanation: string }[] = [
        { nodeId: startNodeId, path: [startNodeId], explanation: `${startNode.name} changed` }
    ];

    while (queue.length > 0) {
        const { nodeId, path, explanation } = queue.shift()!;

        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        // Mark this node as impacted
        impactedNodeIds.add(nodeId);
        paths.set(nodeId, path);
        explanations.set(nodeId, explanation);

        // Traverse in REVERSE direction (who depends on / runs in / routes through this?)
        const incoming = reverseEdges.get(nodeId) ?? [];

        for (const edge of incoming) {
            const sourceNode = nodeMap.get(edge.from);
            if (!sourceNode || visited.has(edge.from)) continue;

            let newExplanation = "";

            switch (edge.type) {
                case "runs_in":
                    newExplanation = `${sourceNode.name} runs in ${node.name}`;
                    break;
                case "routes_through":
                    newExplanation = `${sourceNode.name} routes through ${node.name}`;
                    break;
                case "egresses_via":
                    newExplanation = `${sourceNode.name} egresses via ${node.name}`;
                    break;
                case "ingress_via":
                    newExplanation = `${sourceNode.name} receives traffic via ${node.name}`;
                    break;
                case "protected_by":
                    newExplanation = `${sourceNode.name} is protected by ${node.name}`;
                    break;
                case "depends_on":
                    newExplanation = `${sourceNode.name} depends on ${node.name}`;
                    break;
                case "contains":
                    newExplanation = `${sourceNode.name} contains ${node.name}`;
                    break;
                default:
                    newExplanation = `${sourceNode.name} is connected to ${node.name}`;
            }

            queue.push({
                nodeId: edge.from,
                path: [...path, edge.from],
                explanation: `${explanation} → ${newExplanation}`,
            });
        }
    }

    return { impactedNodeIds, paths, explanations };
}

// -----------------------------------------------------------------------------
// GRAPH PROJECTIONS
// -----------------------------------------------------------------------------

const SERVICE_TYPES: Set<NodeType> = new Set(["service", "database", "cache", "queue", "external"]);
const NETWORK_TYPES: Set<NodeType> = new Set(["vnet", "subnet", "nat_gateway", "load_balancer", "firewall", "public_ip"]);

export function isServiceNode(type: NodeType): boolean {
    return SERVICE_TYPES.has(type);
}

export function isNetworkNode(type: NodeType): boolean {
    return NETWORK_TYPES.has(type);
}

export interface ProjectedGraph {
    nodes: CanonicalNode[];
    edges: CanonicalEdge[];
}

/**
 * Project canonical graph to service-only view
 * Keeps only service/database/cache/queue/external nodes
 * Keeps only depends_on edges between visible nodes
 */
export function projectToServiceView(graph: CanonicalGraph): ProjectedGraph {
    const visibleNodes = graph.nodes.filter(n => isServiceNode(n.type));
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    const visibleEdges = graph.edges.filter(e =>
        e.type === "depends_on" &&
        visibleNodeIds.has(e.from) &&
        visibleNodeIds.has(e.to)
    );

    return { nodes: visibleNodes, edges: visibleEdges };
}

/**
 * Project canonical graph to full network view
 * Shows all nodes and edges
 */
export function projectToNetworkView(graph: CanonicalGraph): ProjectedGraph {
    return { nodes: [...graph.nodes], edges: [...graph.edges] };
}

/**
 * Get impacted service nodes from blast radius result
 */
export function getImpactedServices(
    graph: CanonicalGraph,
    blastResult: BlastRadiusResult
): CanonicalNode[] {
    return graph.nodes.filter(n =>
        isServiceNode(n.type) && blastResult.impactedNodeIds.has(n.id)
    );
}
