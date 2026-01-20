import { useState } from 'react';
import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
    type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useCanvasStore from '../store';
import useSubscriptionResources from '../hooks/useSubscriptionResources';
import useSubscriptionCosts from '../hooks/useSubscriptionCosts';
import AzureResourceNode from './AzureResourceNode';
import ResourceDetailModal from './ResourceDetailModal';
import ArchyLoadingOverlay from './ArchyLoadingOverlay';

type ParentResource = {
    name: string;
    type: string;
    sku?: string;
};

type ResourceDetail = {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    location?: string;
    sku?: string;
    isExternal?: boolean;
    parentResource?: ParentResource | null;
};

export default function Canvas() {
    const store = useCanvasStore();
    const resourcesQuery = useSubscriptionResources();
    const costsQuery = useSubscriptionCosts(); // Fetch all costs once
    const [selectedResource, setSelectedResource] = useState<ResourceDetail | null>(null);
    
    // Check if initial loading is happening
    const isInitialLoading = resourcesQuery.isLoading || costsQuery.isLoading;
    
    const nodeTypes = {
        azureResource: AzureResourceNode,
    };

    const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
        const data = node.data as {
            name?: string;
            resourceType?: string;
            typeLabel?: string;
            location?: string;
            sku?: string;
            parentResource?: ParentResource;
        };
        
        // Try to find cost data with case-insensitive matching
        const costData = costsQuery.data?.get(node.id) || 
                        costsQuery.data?.get(node.id.toLowerCase()) ||
                        null;
        
        console.log('Node clicked:', {
            id: node.id,
            name: data.name,
            hasCostData: !!costData,
            cost: costData?.cost,
            hasParent: !!data.parentResource
        });
        
        const resource: ResourceDetail = {
            id: node.id,
            name: data.name || 'Unknown',
            type: data.resourceType || data.typeLabel || 'Unknown',
            typeLabel: data.typeLabel || 'Unknown',
            location: data.location,
            sku: data.sku,
            isExternal: data.location === 'External',
            parentResource: data.parentResource,
        };
        setSelectedResource(resource);
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <ReactFlow
                nodes={store.nodes}
                edges={store.edges}
                onNodesChange={store.onNodesChange}
                onEdgesChange={store.onEdgesChange}
                onConnect={store.onConnect}
                onNodeClick={handleNodeClick}
                nodeTypes={nodeTypes}
                fitView
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
            
            <ArchyLoadingOverlay isLoading={isInitialLoading} />
            
            {selectedResource && (
                <ResourceDetailModal
                    key={selectedResource.id}
                    resource={selectedResource}
                    costData={
                        costsQuery.data?.get(selectedResource.id) || 
                        costsQuery.data?.get(selectedResource.id.toLowerCase()) ||
                        null
                    }
                    costLoading={costsQuery.isLoading}
                    onClose={() => setSelectedResource(null)}
                />
            )}
        </div>
    );
}