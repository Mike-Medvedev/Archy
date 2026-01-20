import type { Node, NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import styles from "./SubnetGroupNode.module.css";

type SubnetGroupNodeData = {
    name: string;
    subnetType?: "frontend" | "backend" | "data" | "web" | "compute" | "app" | "default";
    isImpacted?: boolean;
};

type SubnetGroupNodeType = Node<SubnetGroupNodeData, "subnetGroup">;

const SUBNET_COLORS: Record<string, { bg: string; border: string; headerBg: string }> = {
    frontend: { bg: "rgba(34, 197, 94, 0.03)", border: "#22c55e", headerBg: "rgba(34, 197, 94, 0.1)" },
    web: { bg: "rgba(34, 197, 94, 0.03)", border: "#22c55e", headerBg: "rgba(34, 197, 94, 0.1)" },
    backend: { bg: "rgba(168, 85, 247, 0.03)", border: "#a855f7", headerBg: "rgba(168, 85, 247, 0.1)" },
    compute: { bg: "rgba(168, 85, 247, 0.03)", border: "#a855f7", headerBg: "rgba(168, 85, 247, 0.1)" },
    app: { bg: "rgba(168, 85, 247, 0.03)", border: "#a855f7", headerBg: "rgba(168, 85, 247, 0.1)" },
    data: { bg: "rgba(249, 115, 22, 0.03)", border: "#f97316", headerBg: "rgba(249, 115, 22, 0.1)" },
    default: { bg: "rgba(56, 189, 248, 0.03)", border: "#38bdf8", headerBg: "rgba(56, 189, 248, 0.1)" },
};

export default function SubnetGroupNode({
    data,
}: NodeProps<SubnetGroupNodeType>) {
    const colors = SUBNET_COLORS[data.subnetType || "default"] || SUBNET_COLORS.default;
    
    return (
        <div 
            className={`${styles.subnetContainer} ${data.isImpacted ? styles.impacted : ''}`}
            style={{
                background: data.isImpacted ? "rgba(239, 68, 68, 0.03)" : colors.bg,
                borderColor: data.isImpacted ? "#ef4444" : colors.border,
            }}
        >
            <Handle type="target" position={Position.Top} className={styles.handle} />
            <Handle type="source" position={Position.Bottom} className={styles.handle} />
            
            <div 
                className={styles.header}
                style={{ background: data.isImpacted ? "rgba(239, 68, 68, 0.1)" : colors.headerBg }}
            >
                <div className={styles.icon} style={{ color: data.isImpacted ? "#ef4444" : colors.border }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="1" width="14" height="14" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M1 6h14M1 11h14M6 1v14M11 1v14" stroke="currentColor" strokeWidth="0.5" opacity="0.5"/>
                    </svg>
                </div>
                <span className={styles.label} style={{ color: data.isImpacted ? "#ef4444" : colors.border }}>
                    Subnet
                </span>
                <span className={styles.name}>{data.name}</span>
            </div>
            
            {data.isImpacted && (
                <div className={styles.impactedBadge}>Impacted</div>
            )}
        </div>
    );
}
