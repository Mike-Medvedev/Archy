/**
 * Resource type filtering for diagram display
 * Only shows resources users care about, hides infrastructure/parent resources
 */

// Resource types to SHOW on diagram (whitelist)
const VISIBLE_RESOURCE_TYPES = new Set([
    // Web Apps
    'Microsoft.Web/sites',
    
    // Databases
    'Microsoft.Sql/servers/databases',
    'Microsoft.Sql/servers', // SQL Server (parent of databases)
    'Microsoft.DBforPostgreSQL/servers',
    'Microsoft.DBforPostgreSQL/flexibleServers',
    'Microsoft.DBforMySQL/servers',
    'Microsoft.DBforMySQL/flexibleServers',
    'Microsoft.DocumentDB/databaseAccounts', // Cosmos DB
    
    // Message Queues
    'Microsoft.ServiceBus/namespaces',
    'Microsoft.ServiceBus/namespaces/queues',
    'Microsoft.ServiceBus/namespaces/topics',
    'Microsoft.EventHub/namespaces',
    
    // Storage
    'Microsoft.Storage/storageAccounts',
    
    // Cache
    'Microsoft.Cache/redis',
    'Microsoft.Cache/Redis',
    
    // Networking (only major components)
    'Microsoft.Network/loadBalancers',
    'Microsoft.Network/virtualNetworks',
    'Microsoft.Network/applicationGateways',
    
    // Containers
    'Microsoft.ContainerRegistry/registries',
    'Microsoft.ContainerService/managedClusters', // AKS
    'Microsoft.App/containerApps',
    'Microsoft.App/managedEnvironments',
]);

/**
 * Check if a resource type should be displayed on the diagram
 */
export function shouldShowResource(resourceType: string): boolean {
    return VISIBLE_RESOURCE_TYPES.has(resourceType);
}

/**
 * Get a friendly category name for grouping resources
 */
export function getResourceCategory(resourceType: string): string {
    if (resourceType.includes('Web/sites')) return 'Web Apps';
    if (resourceType.includes('Sql') || resourceType.includes('Postgre') || resourceType.includes('MySQL') || resourceType.includes('DocumentDB')) return 'Databases';
    if (resourceType.includes('ServiceBus') || resourceType.includes('EventHub')) return 'Messaging';
    if (resourceType.includes('Storage')) return 'Storage';
    if (resourceType.includes('Cache') || resourceType.includes('Redis')) return 'Cache';
    if (resourceType.includes('Network')) return 'Networking';
    if (resourceType.includes('Container') || resourceType.includes('App/')) return 'Containers';
    return 'Other';
}
