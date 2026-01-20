import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import useAzureAuth from "./useAzureAuth";
import { useAppStore } from "../store";
import useCanvasStore from "../store";
import type { Node, Edge } from "@xyflow/react";
import { shouldShowResource } from "../utils/resourceFilters";

type ArmResource = {
    id: string;
    name: string;
    type: string;
    location?: string;
    sku?: {
        name?: string;
        tier?: string;
    };
};

type ResourcesResponse = {
    value: ArmResource[];
};

type AppSettings = {
    properties?: Record<string, string>;
};

type ConnectionStringItem = {
    name: string;
    value: string;
    type: string;
};

type ConnectionStringsResponse = {
    properties?: Record<string, ConnectionStringItem>;
};

const API_VERSION = "2021-04-01";
const WEB_API_VERSION = "2022-03-01";

const ICONS: Record<string, { label: string; iconDataUri: string }> = {
    "Microsoft.ServiceBus/namespaces": {
        label: "Service Bus Namespace",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><path d='M18 24h28v6H18zm0 10h28v6H18zm0 10h18v6H18z' fill='white'/></svg>",
    },
    "Microsoft.ServiceBus/namespaces/queues": {
        label: "Service Bus Queue",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><circle cx='22' cy='24' r='4' fill='white'/><circle cx='32' cy='24' r='4' fill='white'/><circle cx='42' cy='24' r='4' fill='white'/><rect x='18' y='34' width='28' height='8' fill='white'/></svg>",
    },
    "Microsoft.Sql/servers": {
        label: "SQL Server",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><ellipse cx='32' cy='20' rx='16' ry='6' fill='white'/><path d='M16 20v20c0 3.3 7.2 6 16 6s16-2.7 16-6V20' fill='none' stroke='white' stroke-width='4'/></svg>",
    },
    "Microsoft.Sql/servers/databases": {
        label: "SQL Database",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><ellipse cx='32' cy='18' rx='16' ry='6' fill='white'/><path d='M16 18v16c0 3.3 7.2 6 16 6s16-2.7 16-6V18' fill='none' stroke='white' stroke-width='4'/><rect x='20' y='40' width='24' height='8' fill='white'/></svg>",
    },
    "Microsoft.Web/serverfarms": {
        label: "App Service Plan",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><rect x='14' y='18' width='36' height='28' fill='white'/><path d='M14 28h36' stroke='%230078d4' stroke-width='4'/></svg>",
    },
    "Microsoft.Web/sites": {
        label: "App Service",
        iconDataUri:
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><rect x='16' y='18' width='32' height='22' fill='white'/><path d='M20 44h24' stroke='white' stroke-width='4'/></svg>",
    },
};

const DEFAULT_ICON =
    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%230078d4'/><path d='M18 40l8-16 6 10 6-12 10 18H18z' fill='white'/></svg>";

const toFriendlyLabel = (type: string) => {
    const mapped = ICONS[type];
    if (mapped) return mapped.label;
    const last = type.split("/").pop() ?? type;
    const spaced = last.replace(/([a-z])([A-Z])/g, "$1 $2");
    return spaced.replace(/_/g, " ").replace(/-/g, " ");
};

const getIconDataUri = (type: string) => ICONS[type]?.iconDataUri ?? DEFAULT_ICON;

// Parse connection strings and detect relationships
const detectRelationships = (
    connectionString: string,
    resources: ArmResource[],
): string[] => {
    const matches: string[] = [];

    // Check for Azure Service Bus
    if (connectionString.includes("servicebus.windows.net")) {
        const match = connectionString.match(/(?:Endpoint=sb:\/\/)([^.]+)\.servicebus\.windows\.net/);
        if (match) {
            const serviceBusName = match[1];
            const resource = resources.find(
                (r) => r.type === "Microsoft.ServiceBus/namespaces" && r.name === serviceBusName
            );
            if (resource) matches.push(resource.id);
        }
    }

    // Check for Azure SQL
    if (connectionString.includes("database.windows.net")) {
        const match = connectionString.match(/(?:Server=tcp:)([^.]+)\.database\.windows\.net/);
        if (match) {
            const serverName = match[1];
            const resource = resources.find(
                (r) => r.type === "Microsoft.Sql/servers" && r.name === serverName
            );
            if (resource) matches.push(resource.id);
        }
    }

    // Check for Redis
    if (connectionString.includes("redis.cache.windows.net")) {
        const match = connectionString.match(/([^.]+)\.redis\.cache\.windows\.net/);
        if (match) {
            const redisName = match[1];
            const resource = resources.find(
                (r) => r.type === "Microsoft.Cache/redis" && r.name === redisName
            );
            if (resource) matches.push(resource.id);
        }
    }

    // Check for Storage Account
    if (connectionString.includes("blob.core.windows.net") || connectionString.includes("AccountName=")) {
        const match = connectionString.match(/AccountName=([^;]+)/);
        if (match) {
            const storageAccountName = match[1];
            const resource = resources.find(
                (r) => r.type === "Microsoft.Storage/storageAccounts" && r.name === storageAccountName
            );
            if (resource) matches.push(resource.id);
        }
    }

    return matches;
};

// Fetch app settings for a Web App or Function App
const fetchAppSettings = async (
    resourceId: string,
    token: string,
): Promise<Record<string, string>> => {
    try {
        const appSettingsResponse = await fetch(
            `https://management.azure.com${resourceId}/config/appsettings/list?api-version=${WEB_API_VERSION}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!appSettingsResponse.ok) {
            console.warn(`Failed to fetch app settings for ${resourceId}`);
            return {};
        }

        const appSettings: AppSettings = await appSettingsResponse.json();
        return appSettings.properties ?? {};
    } catch (error) {
        console.warn(`Error fetching app settings for ${resourceId}:`, error);
        return {};
    }
};

// Fetch connection strings for a Web App or Function App
const fetchConnectionStrings = async (
    resourceId: string,
    token: string,
): Promise<Record<string, string>> => {
    try {
        const connStringsResponse = await fetch(
            `https://management.azure.com${resourceId}/config/connectionstrings/list?api-version=${WEB_API_VERSION}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );

        if (!connStringsResponse.ok) {
            console.warn(`Failed to fetch connection strings for ${resourceId}`);
            return {};
        }

        const connStrings: ConnectionStringsResponse = await connStringsResponse.json();
        const result: Record<string, string> = {};

        if (connStrings.properties) {
            for (const [key, value] of Object.entries(connStrings.properties)) {
                result[key] = value.value;
            }
        }

        return result;
    } catch (error) {
        console.warn(`Error fetching connection strings for ${resourceId}:`, error);
        return {};
    }
};

type DeducedService = {
    identifier: string;
    displayName: string;
    type: string;
    category: "database" | "cache" | "queue" | "storage" | "other";
};

type AppServiceConnection = {
    appName: string;
    serviceIdentifier: string;
    connectionKeys: string[]; // The env variable keys that reference this service
};

type DeductionResult = {
    services: DeducedService[];
    connections: AppServiceConnection[];
};

// Use OpenAI to analyze and deduplicate external services from env variables
const deduceExternalServices = async (
    envVariables: Record<string, Record<string, string>>,
): Promise<DeductionResult> => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("Missing VITE_OPENAI_API_KEY, skipping external service detection");
        return { services: [], connections: [] };
    }

    // Format env variables for the prompt
    const formattedEnvVars = Object.entries(envVariables)
        .map(([appName, vars]) => {
            const varsList = Object.entries(vars)
                .map(([key, value]) => `  ${key}: ${value}`)
                .join("\n");
            return `App: ${appName}\n${varsList}`;
        })
        .join("\n\n");

    const prompt = `You are analyzing environment variables from Azure Web Apps to identify external services and which apps connect to which services.

Environment Variables:
${formattedEnvVars}

Task: 
1. Identify unique external services (databases, caches, queues, etc.)
2. Deduplicate: If multiple env vars in the SAME app point to the same service (e.g., POSTGRES_HOST + POSTGRES_PORT + DATABASE_URL), that's ONE service
3. Deduplicate: If a database has both a main host and a pooler host (e.g., abc.supabase.co and pooler.abc.supabase.co), that's ONE service
4. Track which apps connect to which services
5. IMPORTANT: Different apps can connect to DIFFERENT databases, even if they're both Supabase/Postgres. Look at the actual connection strings to determine if they're the same database or different ones.

Return ONLY valid JSON with this structure:
{
  "services": [
    {
      "identifier": "unique-id-for-service",
      "displayName": "Human readable name",
      "type": "postgres|mongodb|redis|mysql|etc",
      "category": "database|cache|queue|storage|other"
    }
  ],
  "connections": [
    {
      "appName": "exact-app-name-from-above",
      "serviceIdentifier": "matches-a-service-identifier",
      "connectionKeys": ["env-var-key-1", "env-var-key-2"]
    }
  ]
}

Rules:
- Only include external services (not Azure services like .windows.net or .azure.com)
- Each unique database/service gets ONE entry in services array
- For connections, list each app and which services it connects to
- Use project IDs or hostnames to create identifiers (e.g., "supabase-projectid" or "mongodb-cluster123")
- Return empty arrays if no external services found`;

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant that analyzes connection strings and environment variables to identify external services and their relationships. Always respond with valid JSON only, no markdown.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.1,
                response_format: { type: "json_object" },
            }),
        });

        if (!response.ok) {
            console.error(`OpenAI error: ${response.status}`);
            return { services: [], connections: [] };
        }

        const data: {
            choices?: { message?: { content?: string } }[];
        } = await response.json();

        const content = data.choices?.[0]?.message?.content ?? "{}";
        const result: DeductionResult = JSON.parse(content);
        
        return {
            services: result.services || [],
            connections: result.connections || [],
        };
    } catch (error) {
        console.error("Error deducing external services:", error);
        return { services: [], connections: [] };
    }
};

// Build edges and external nodes from resource relationships
const buildEdgesFromRelationships = async (
    resources: ArmResource[],
    token: string,
): Promise<{ edges: Edge[]; externalNodes: Node[] }> => {
    const edges: Edge[] = [];
    const edgeSet = new Set<string>(); // To avoid duplicates

    // Create a map of resource ID to type for quick lookup
    const resourceTypeMap = new Map<string, string>();
    for (const resource of resources) {
        resourceTypeMap.set(resource.id, resource.type);
    }

    // Get Web Apps and Function Apps (only if they're visible)
    const webApps = resources.filter(
        (r) => r.type === "Microsoft.Web/sites" && shouldShowResource(r.type)
    );

    // First pass: Collect all env variables from all web apps
    const allEnvVariables: Record<string, Record<string, string>> = {};
    const appSettings: Map<string, Record<string, string>> = new Map();
    const appIdToName = new Map<string, string>();

    for (const webApp of webApps) {
        const [settings, connectionStrings] = await Promise.all([
            fetchAppSettings(webApp.id, token),
            fetchConnectionStrings(webApp.id, token),
        ]);

        const allSettings = { ...settings, ...connectionStrings };
        appSettings.set(webApp.id, allSettings);
        allEnvVariables[webApp.name] = allSettings;
        appIdToName.set(webApp.id, webApp.name);
    }

    // Use OpenAI to deduce services and connections
    const { services, connections } = await deduceExternalServices(allEnvVariables);

    // Create map of app name to app resource ID
    const appNameToId = new Map<string, string>();
    for (const webApp of webApps) {
        appNameToId.set(webApp.name, webApp.id);
    }

    // Create edges for Azure resource relationships (Service Bus, SQL, Redis, etc.)
    for (const webApp of webApps) {
        const settings = appSettings.get(webApp.id) ?? {};

        for (const [key, value] of Object.entries(settings)) {
            if (!value || typeof value !== "string") continue;

            // Check for Azure resource relationships
            const targetResourceIds = detectRelationships(value, resources);
            for (const targetId of targetResourceIds) {
                // Only create edge if target resource is also visible
                const targetType = resourceTypeMap.get(targetId);
                if (!targetType || !shouldShowResource(targetType)) {
                    continue; // Skip edges to hidden resources
                }
                
                const edgeId = `${webApp.id}->${targetId}`;
                if (!edgeSet.has(edgeId)) {
                    edges.push({
                        id: edgeId,
                        source: webApp.id,
                        target: targetId,
                        animated: true,
                        label: key,
                    });
                    edgeSet.add(edgeId);
                }
            }
        }
    }

    // Create edges for external services based on OpenAI's connections
    for (const connection of connections) {
        const appId = appNameToId.get(connection.appName);
        if (!appId) {
            console.warn(`Could not find app ID for: ${connection.appName}`);
            continue;
        }

        const externalId = `external-${connection.serviceIdentifier}`;
        const edgeId = `${appId}->${externalId}`;

        if (!edgeSet.has(edgeId)) {
            // Use the first connection key as the label
            const label = connection.connectionKeys[0] || "connection";
            edges.push({
                id: edgeId,
                source: appId,
                target: externalId,
                animated: true,
                label,
                style: { strokeDasharray: "5,5" },
            });
            edgeSet.add(edgeId);
        }
    }

    // Create nodes for external services
    const externalNodes: Node[] = services.map((service) => {
        const categoryLabel = 
            service.category === "database" ? "Database" :
            service.category === "cache" ? "Cache" :
            service.category === "queue" ? "Message Queue" :
            service.category === "storage" ? "Storage" :
            "External Service";

        return {
            id: `external-${service.identifier}`,
            type: "azureResource",
            position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
            data: {
                name: service.displayName,
                typeLabel: categoryLabel,
                location: "External",
                iconDataUri:
                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='8' fill='%23666'/><path d='M32 16l-16 12h10v16h12V28h10L32 16z' fill='white'/></svg>",
            },
        };
    });

    return { edges, externalNodes };
};

// Find connected components in the graph
const findConnectedComponents = (
    allNodeIds: string[],
    edges: Edge[],
): Set<string>[] => {
    const adjacency = new Map<string, Set<string>>();
    
    // Build adjacency list (undirected graph)
    for (const nodeId of allNodeIds) {
        adjacency.set(nodeId, new Set());
    }
    for (const edge of edges) {
        adjacency.get(edge.source)?.add(edge.target);
        adjacency.get(edge.target)?.add(edge.source);
    }

    const visited = new Set<string>();
    const components: Set<string>[] = [];

    const dfs = (nodeId: string, component: Set<string>) => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        component.add(nodeId);
        
        const neighbors = adjacency.get(nodeId) ?? new Set();
        for (const neighbor of neighbors) {
            dfs(neighbor, component);
        }
    };

    for (const nodeId of allNodeIds) {
        if (!visited.has(nodeId)) {
            const component = new Set<string>();
            dfs(nodeId, component);
            components.push(component);
        }
    }

    return components;
};

// Layout nodes within a connected component (hierarchical layout)
const layoutComponent = (
    nodeIds: Set<string>,
    edges: Edge[],
    startX: number,
    startY: number,
): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Find root nodes (nodes with no incoming edges within this component)
    const hasIncoming = new Set<string>();
    for (const edge of edges) {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
            hasIncoming.add(edge.target);
        }
    }
    
    const roots = Array.from(nodeIds).filter(id => !hasIncoming.has(id));
    if (roots.length === 0 && nodeIds.size > 0) {
        // Circular reference or single node, just pick first
        roots.push(Array.from(nodeIds)[0]);
    }

    // Build adjacency for this component
    const adjacency = new Map<string, string[]>();
    for (const id of nodeIds) {
        adjacency.set(id, []);
    }
    for (const edge of edges) {
        if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
            adjacency.get(edge.source)?.push(edge.target);
        }
    }

    // Layout using BFS from roots
    const visited = new Set<string>();
    let currentLevel: string[] = roots;
    let y = startY;
    const levelGap = 220; // Increased vertical spacing to prevent overlap
    const nodeGap = 350; // Increased horizontal spacing to prevent overlap

    while (currentLevel.length > 0) {
        const nextLevel: string[] = [];
        const levelWidth = currentLevel.length * nodeGap;
        let x = startX - levelWidth / 2;

        for (const nodeId of currentLevel) {
            if (!visited.has(nodeId)) {
                positions.set(nodeId, { x, y });
                visited.add(nodeId);

                // Add children to next level
                const children = adjacency.get(nodeId) ?? [];
                for (const child of children) {
                    if (!visited.has(child)) {
                        nextLevel.push(child);
                    }
                }
            }
            x += nodeGap;
        }

        currentLevel = nextLevel;
        y += levelGap;
    }

    return positions;
};

// Position all nodes with intelligent grouping
const positionNodes = (
    azureNodes: Node[],
    externalNodes: Node[],
    edges: Edge[],
): { azureNodes: Node[]; externalNodes: Node[] } => {
    const allNodeIds = [...azureNodes.map(n => n.id), ...externalNodes.map(n => n.id)];
    const components = findConnectedComponents(allNodeIds, edges);

    // Separate connected components from standalone nodes
    const connectedComponents = components.filter(c => c.size > 1);
    const standaloneNodes = components.filter(c => c.size === 1);

    const positionedNodes = new Map<string, { x: number; y: number }>();

    // Layout connected components
    let currentX = 0;
    let maxY = 0; // Track the maximum Y position of connected components
    const componentGap = 500; // Increased gap between components to prevent overlap
    
    for (const component of connectedComponents) {
        const componentPositions = layoutComponent(component, edges, currentX, 0);
        
        // Find the rightmost and bottommost positions in this component
        let maxX = currentX;
        for (const pos of componentPositions.values()) {
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y > maxY) maxY = pos.y;
        }
        
        // Merge positions
        for (const [id, pos] of componentPositions.entries()) {
            positionedNodes.set(id, pos);
        }
        
        currentX = maxX + componentGap;
    }

    // Layout standalone nodes in a separate "unused" section below connected components
    const standaloneY = maxY + 300; // Place below connected systems with clearance
    const standaloneStartX = 0;
    const standaloneGap = 320; // Increased gap to prevent overlap
    const standaloneColumns = 5;
    const standaloneRowGap = 200; // Increased vertical gap between rows

    let standaloneIndex = 0;
    for (const component of standaloneNodes) {
        const nodeId = Array.from(component)[0];
        const col = standaloneIndex % standaloneColumns;
        const row = Math.floor(standaloneIndex / standaloneColumns);
        
        positionedNodes.set(nodeId, {
            x: standaloneStartX + col * standaloneGap,
            y: standaloneY + row * standaloneRowGap,
        });
        standaloneIndex++;
    }

    // Apply positions to nodes, with fallback to prevent all nodes at (0,0)
    let fallbackIndex = 0;
    const positionedAzureNodes = azureNodes.map(node => {
        const position = positionedNodes.get(node.id);
        if (position) {
            return { ...node, position };
        }
        // Fallback: spread nodes in a grid if positioning failed
        const col = fallbackIndex % 5;
        const row = Math.floor(fallbackIndex / 5);
        fallbackIndex++;
        return {
            ...node,
            position: { x: col * 320, y: row * 200 },
        };
    });

    const positionedExternalNodes = externalNodes.map(node => {
        const position = positionedNodes.get(node.id);
        if (position) {
            return { ...node, position };
        }
        // Fallback for external nodes
        const col = fallbackIndex % 5;
        const row = Math.floor(fallbackIndex / 5);
        fallbackIndex++;
        return {
            ...node,
            position: { x: col * 320, y: row * 200 },
        };
    });

    console.log('Positioned nodes:', {
        total: positionedNodes.size,
        azure: positionedAzureNodes.length,
        external: positionedExternalNodes.length,
        components: components.length,
        connected: connectedComponents.length,
        standalone: standaloneNodes.length,
    });

    return { azureNodes: positionedAzureNodes, externalNodes: positionedExternalNodes };
};

// Find parent resource (e.g., Server Farm for Web App)
const findParentResource = (resource: ArmResource, allResources: ArmResource[]): { name: string; type: string; sku?: string } | null => {
    // For Web Apps, find their Server Farm (App Service Plan)
    if (resource.type === 'Microsoft.Web/sites') {
        // Server farm is typically in the same resource group
        // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Web/serverfarms/{name}
        const rgMatch = resource.id.match(/resourceGroups\/([^/]+)\//);
        if (rgMatch) {
            const resourceGroup = rgMatch[1];
            const serverFarm = allResources.find(r => 
                r.type === 'Microsoft.Web/serverfarms' && 
                r.id.includes(`resourceGroups/${resourceGroup}/`)
            );
            if (serverFarm) {
                return {
                    name: serverFarm.name,
                    type: 'App Service Plan',
                    sku: serverFarm.sku?.name ?? serverFarm.sku?.tier
                };
            }
        }
    }
    
    // Add more parent-child relationships as needed
    return null;
};

const buildNodesFromResources = (resources: ArmResource[], allResources: ArmResource[]): Node[] => {
    // Filter to only show resources users care about
    const visibleResources = resources.filter(r => shouldShowResource(r.type));
    
    console.log('Resource filtering:', {
        total: resources.length,
        visible: visibleResources.length,
        filtered: resources.length - visibleResources.length
    });
    
    return visibleResources.map((resource) => {
        const sku = resource.sku?.name ?? resource.sku?.tier;
        const parentResource = findParentResource(resource, allResources);
        
        return {
            id: resource.id,
            type: "azureResource",
            position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
            data: {
                name: resource.name,
                resourceType: resource.type, // Store the actual Azure resource type
                typeLabel: toFriendlyLabel(resource.type),
                location: resource.location,
                sku,
                iconDataUri: getIconDataUri(resource.type),
                parentResource, // Store parent resource info for modal display
            },
        };
    });
};

export default function useSubscriptionResources() {
    const { isAuthenticated, getAccessToken, account } = useAzureAuth();
    const selectedSubscriptionId = useAppStore(
        (state) => state.selectedSubscriptionId,
    );
    const setNodes = useCanvasStore((state) => state.setNodes);
    const setEdges = useCanvasStore((state) => state.setEdges);

    const queryKey = useMemo(
        () => ["subscriptionResources", account?.homeAccountId, selectedSubscriptionId],
        [account?.homeAccountId, selectedSubscriptionId],
    );

    const query = useQuery({
        queryKey,
        enabled: isAuthenticated && Boolean(selectedSubscriptionId),
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
        gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false, // Don't refetch on network reconnect
        queryFn: async () => {
            if (!selectedSubscriptionId) return { resources: [], edges: [], externalNodes: [] };
            const token = await getAccessToken();
            const response = await fetch(
                `https://management.azure.com/subscriptions/${selectedSubscriptionId}/resources?api-version=${API_VERSION}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            if (!response.ok) {
                throw new Error(`ARM error: ${response.status}`);
            }

            const data: ResourcesResponse = await response.json();
            const resources = data.value ?? [];

            // Build edges and external nodes from relationships
            const { edges, externalNodes } = await buildEdgesFromRelationships(resources, token);

            return { resources, edges, externalNodes };
        },
    });

    useEffect(() => {
        if (!query.data) return;
        // Pass full resources list for parent lookup, but only visible ones are built into nodes
        const azureNodes = buildNodesFromResources(query.data.resources, query.data.resources);
        
        // Apply intelligent positioning
        const { azureNodes: positionedAzure, externalNodes: positionedExternal } = 
            positionNodes(azureNodes, query.data.externalNodes, query.data.edges);
        
        const allNodes = [...positionedExternal, ...positionedAzure];
        setNodes(allNodes);
        setEdges(query.data.edges);
    }, [query.data, setEdges, setNodes]);

    return query;
}
