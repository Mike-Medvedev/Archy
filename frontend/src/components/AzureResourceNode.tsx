import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import styles from "./AzureResourceNode.module.css";

type AzureResourceNodeData = {
    name: string;
    typeLabel: string;
    location?: string;
    sku?: string;
    iconDataUri?: string;
};

type AzureResourceNodeType = Node<AzureResourceNodeData, "azureResource">;

export default function AzureResourceNode({
    data,
}: NodeProps<AzureResourceNodeType>) {
    return (
        <div className={styles.node}>
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
                {data.location ? <div>Location: {data.location}</div> : null}
                {data.sku ? <div>SKU: {data.sku}</div> : null}
            </div>
        </div>
    );
}
