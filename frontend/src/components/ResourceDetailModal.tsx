import { useState } from "react";
import styles from "./ResourceDetailModal.module.css";
import { LEAK_TYPE_LABELS, type CostLeak } from "../lib/canonicalGraph";

type ResourceDetail = {
    id: string;
    name: string;
    type: string;
    typeLabel: string;
    monthlyCost?: number;
    isLeaking?: boolean;
    leak?: CostLeak;
};

type Props = {
    resource: ResourceDetail | null;
    onClose: () => void;
};

export default function ResourceDetailModal({ resource, onClose }: Props) {
    const [remediating, setRemediating] = useState(false);
    const [remediationComplete, setRemediationComplete] = useState(false);

    if (!resource) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleRemediate = async () => {
        setRemediating(true);
        // Simulate remediation action
        await new Promise(resolve => setTimeout(resolve, 2000));
        setRemediating(false);
        setRemediationComplete(true);
    };

    const leakTypeInfo = resource.leak?.type ? LEAK_TYPE_LABELS[resource.leak.type] : null;

    return (
        <div className={styles.backdrop} onClick={handleBackdropClick}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>{resource.name}</h2>
                        <p className={styles.subtitle}>{resource.typeLabel}</p>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={styles.content}>
                    {/* Cost Leak Alert - Show prominently if leaking */}
                    {resource.isLeaking && resource.leak && !remediationComplete && (
                        <section className={styles.leakAlert}>
                            <div className={styles.leakHeader}>
                                <span className={styles.leakIcon}>
                                    {leakTypeInfo?.icon}
                                </span>
                                <div>
                                    <div className={styles.leakTitle}>
                                        {leakTypeInfo?.label}
                                    </div>
                                    <div className={styles.leakSeverity} data-severity={resource.leak.severity}>
                                        {resource.leak.severity.toUpperCase()} SEVERITY
                                    </div>
                                </div>
                                <div className={styles.leakAmount}>
                                    -${resource.leak.monthlyLeak}/mo
                                </div>
                            </div>
                            
                            <p className={styles.leakDescription}>
                                {resource.leak.description}
                            </p>
                            
                            <div className={styles.remediationSection}>
                                <h4 className={styles.remediationTitle}>Recommended Action</h4>
                                <p className={styles.remediationText}>
                                    {resource.leak.remediation}
                                </p>
                                
                                <button 
                                    className={styles.remediateButton}
                                    onClick={handleRemediate}
                                    disabled={remediating}
                                >
                                    {remediating ? (
                                        <>
                                            <span className={styles.spinner}></span>
                                            Applying Fix...
                                        </>
                                    ) : (
                                        <>
                                            Fix This Issue
                                        </>
                                    )}
                                </button>
                            </div>
                        </section>
                    )}

                    {/* Remediation Success Message */}
                    {remediationComplete && (
                        <section className={styles.successAlert}>
                            <div className={styles.successIcon}>✓</div>
                            <div>
                                <div className={styles.successTitle}>Remediation Queued</div>
                                <p className={styles.successText}>
                                    The fix has been queued for deployment. Changes will take effect within 5-10 minutes.
                                    Estimated monthly savings: <strong>${resource.leak?.monthlyLeak}/mo</strong>
                                </p>
                            </div>
                        </section>
                    )}

                    {/* Basic Info */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Resource Details</h3>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Type:</span>
                                <span className={styles.detailValue}>{resource.type}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <span className={styles.detailLabel}>Resource ID:</span>
                                <span className={styles.detailValue} style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                                    {resource.id}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Cost Information */}
                    <section className={styles.section}>
                        <h3 className={styles.sectionTitle}>Cost Analysis</h3>
                        <div className={styles.costGrid}>
                            <div className={styles.costCard}>
                                <div className={styles.costCardLabel}>Current Monthly Cost</div>
                                <div className={styles.costCardValue}>
                                    ${resource.monthlyCost ?? 0}
                                </div>
                            </div>
                            
                            {resource.isLeaking && resource.leak && (
                                <>
                                    <div className={styles.costCard} data-type="waste">
                                        <div className={styles.costCardLabel}>Monthly Waste</div>
                                        <div className={styles.costCardValue}>
                                            -${resource.leak.monthlyLeak}
                                        </div>
                                    </div>
                                    
                                    <div className={styles.costCard} data-type="savings">
                                        <div className={styles.costCardLabel}>Potential Cost</div>
                                        <div className={styles.costCardValue}>
                                            ${(resource.monthlyCost ?? 0) - resource.leak.monthlyLeak}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        {resource.isLeaking && resource.leak && (
                            <div className={styles.savingsNote}>
                                You could save <strong>${(resource.leak.monthlyLeak * 12).toLocaleString()}/year</strong> by fixing this issue.
                            </div>
                        )}
                    </section>

                    {/* Healthy Resource Message */}
                    {!resource.isLeaking && (
                        <section className={styles.healthySection}>
                            <div className={styles.healthyIcon}>✓</div>
                            <div className={styles.healthyText}>
                                This resource is healthy and properly configured. No cost optimization issues detected.
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
