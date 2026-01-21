import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import styles from "./AzureResourceNode.module.css";
import type { CostLeak } from "../lib/canonicalGraph";

type AzureResourceNodeData = {
    name: string;
    typeLabel: string;
    resourceType?: string;
    iconDataUri?: string;
    monthlyCost?: number;
    isLeaking?: boolean;
    leakAmount?: number;
    leak?: CostLeak;
};

type AzureResourceNodeType = Node<AzureResourceNodeData, "azureResource">;

export default function AzureResourceNode({
    data,
}: NodeProps<AzureResourceNodeType>) {
    const nodeClass = `${styles.node} ${data.isLeaking ? styles.leaking : ''}`;
    
    return (
        <div className={nodeClass}>
            <Handle type="target" position={Position.Top} />
            <Handle type="source" position={Position.Bottom} />
            
            <div className={styles.titleRow}>
                {data.iconDataUri ? (
                    <img className={styles.icon} src={data.iconDataUri} alt="" />
                ) : null}
                <div className={styles.name}>{data.typeLabel}</div>
            </div>
            <div className={styles.meta}>
                <div className={styles.resourceName}>{data.name}</div>
                {data.monthlyCost !== undefined && (
                    <div className={styles.costRow}>
                        <span className={styles.costLabel}>Cost:</span>
                        <span className={styles.costValue}>${data.monthlyCost}/mo</span>
                    </div>
                )}
            </div>
            
            {/* Leak chip badge */}
            {data.isLeaking && data.leakAmount && (
                <div className={styles.leakChip}>
                    -${data.leakAmount}/mo
                </div>
            )}
            
            {/* Leak warning badge */}
            {data.isLeaking && (
                <div className={styles.leakBadge}>
                    {data.leak?.type === 'zombie' && '💀'}
                    {data.leak?.type === 'underutilized' && '📉'}
                    {data.leak?.type === 'misconfigured' && '⚙️'}
                    {data.leak?.type === 'oversized' && '📦'}
                    {' '}Leaking
                </div>
            )}
        </div>
    );
}
