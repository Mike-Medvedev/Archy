import { useState, useMemo } from 'react';
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
import ArchyLoadingOverlay from './ArchyLoadingOverlay';
import ScanReportModal from './ScanReportModal';
import type { CostLeak } from '../lib/canonicalGraph';

type ResourceDetail = {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    monthlyCost?: number;
    isLeaking?: boolean;
    leak?: CostLeak;
};

export default function Canvas() {
    const store = useCanvasStore();
    const resourcesQuery = useSubscriptionResources();
    const scanComplete = useCanvasStore((state) => state.scanComplete);
    const leakingSummary = useCanvasStore((state) => state.leakingSummary);
    const showReport = useCanvasStore((state) => state.showReport);
    const setShowReport = useCanvasStore((state) => state.setShowReport);
    const [selectedResource, setSelectedResource] = useState<ResourceDetail | null>(null);
    
    // Check if initial loading is happening
    const isInitialLoading = resourcesQuery.isLoading;
    
    // Node types
    const nodeTypes = useMemo(() => ({
        azureResource: AzureResourceNode,
    }), []);

    const handleNodeClick = (_event: React.MouseEvent, node: Node) => {
        const data = node.data as {
            name?: string;
            resourceType?: string;
            typeLabel?: string;
            monthlyCost?: number;
            isLeaking?: boolean;
            leak?: CostLeak;
        };
        
        const resource: ResourceDetail = {
            id: node.id,
            name: data.name || 'Unknown',
            type: data.resourceType || 'Unknown',
            typeLabel: data.typeLabel || 'Unknown',
            monthlyCost: data.monthlyCost,
            isLeaking: data.isLeaking,
            leak: data.leak,
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
            
            {/* Scan Summary Panel - only show when scan is complete */}
            {scanComplete && leakingSummary && leakingSummary.leakingCount > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    background: 'white',
                    borderRadius: 12,
                    padding: '16px 20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    border: '1px solid #e2e8f0',
                    zIndex: 10,
                    minWidth: 260,
                }}>
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        marginBottom: 12,
                        color: '#dc2626',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                    }}>
                        <span style={{ fontSize: '1.2rem' }}>💸</span>
                        Cost Leaks Detected
                    </div>
                    
                    <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 8, 
                        marginBottom: 16 
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Monthly Waste:</span>
                            <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '1.1rem' }}>
                                ${leakingSummary.totalMonthlyLeak.toFixed(0)}/mo
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Leaking Resources:</span>
                            <span style={{ color: '#475569', fontWeight: 600 }}>
                                {leakingSummary.leakingCount} of {leakingSummary.totalResources}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Yearly Impact:</span>
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>
                                ${(leakingSummary.totalMonthlyLeak * 12).toLocaleString()}/yr
                            </span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowReport(true)}
                        style={{
                            width: '100%',
                            padding: '10px 16px',
                            background: 'linear-gradient(135deg, #0078d4 0%, #00a4ef 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 8,
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 120, 212, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        View Full Report
                    </button>
                </div>
            )}
            
            <ArchyLoadingOverlay isLoading={isInitialLoading} />
            
            {selectedResource && (
                <ResourceDetailModal
                    key={selectedResource.id}
                    resource={selectedResource}
                    onClose={() => setSelectedResource(null)}
                />
            )}
            
            {showReport && (
                <ScanReportModal onClose={() => setShowReport(false)} />
            )}
        </div>
    );
}
