import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import styles from "./VNetGroupNode.module.css";

type VNetGroupNodeData = {
    name: string;
    environment?: string;
    isImpacted?: boolean;
};

type VNetGroupNodeType = Node<VNetGroupNodeData, "vnetGroup">;

export default function VNetGroupNode({
    data,
}: NodeProps<VNetGroupNodeType>) {
    const nodeClass = `${styles.vnetContainer} ${data.isImpacted ? styles.impacted : ''}`;
    
    return (
        <div className={nodeClass}>
            <Handle type="target" position={Position.Top} className={styles.handle} />
            <Handle type="source" position={Position.Bottom} className={styles.handle} />
            
            <div className={styles.header}>
                <div className={styles.icon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
                        <circle cx="5" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="11" cy="5" r="1.5" fill="currentColor"/>
                        <circle cx="8" cy="11" r="1.5" fill="currentColor"/>
                        <path d="M5 5L11 5M5 5L8 11M11 5L8 11" stroke="currentColor" strokeWidth="0.75"/>
                    </svg>
                </div>
                <span className={styles.label}>VNet</span>
                <span className={styles.name}>{data.name}</span>
                {data.environment && (
                    <span className={`${styles.envBadge} ${data.environment === 'prod' ? styles.prod : styles.staging}`}>
                        {data.environment}
                    </span>
                )}
            </div>
            
            {data.isImpacted && (
                <div className={styles.impactedBadge}>Impacted</div>
            )}
        </div>
    );
}
