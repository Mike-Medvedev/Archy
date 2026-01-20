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
import AzureResourceNode from './AzureResourceNode';
import ResourceDetailModal from './ResourceDetailModal';

type ResourceDetail = {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    location?: string;
    sku?: string;
    isExternal?: boolean;
};

export default function Canvas() {
    const store = useCanvasStore();
    useSubscriptionResources();
    const [selectedResource, setSelectedResource] = useState<ResourceDetail | null>(null);
    
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
        };
        
        const resource: ResourceDetail = {
            id: node.id,
            name: data.name || 'Unknown',
            type: data.resourceType || data.typeLabel || 'Unknown',
            typeLabel: data.typeLabel || 'Unknown',
            location: data.location,
            sku: data.sku,
            isExternal: data.location === 'External',
        };
        setSelectedResource(resource);
    };

    return (
        <div style={{ width: '100%', height: '100%' }}>
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
            
            {selectedResource && (
                <ResourceDetailModal
                    key={selectedResource.id}
                    resource={selectedResource}
                    onClose={() => setSelectedResource(null)}
                />
            )}
        </div>
    );
}