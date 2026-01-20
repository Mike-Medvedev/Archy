import {
    Background,
    BackgroundVariant,
    Controls,
    ReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import useCanvasStore from '../store';
import useSubscriptionResources from '../hooks/useSubscriptionResources';



export default function Canvas() {
    const store = useCanvasStore()
    useSubscriptionResources()

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <ReactFlow
                nodes={store.nodes}
                edges={store.edges}
                onNodesChange={store.onNodesChange}
                onEdgesChange={store.onEdgesChange}
                onConnect={store.onConnect}
                fitView
            >
                <Controls />
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            </ReactFlow>
        </div>
    );
}